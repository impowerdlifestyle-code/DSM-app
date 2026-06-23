// Vercel serverless — Coach V voice-clip generator.
// Pipeline:
//   1. Load athlete digest (profile + coach_memory + recent journal/matches)
//   2. Claude → 15–30s Coach V spoken script
//   3. ElevenLabs TTS using ELEVENLABS_VOICE_ID (Valentino's cloned voice)
//   4. Supabase Storage upload → 'future-self-audio/{userId}/{clipId}.mp3'
//   5. Insert future_self_clips row
//   6. Insert voice_audit_log 'clip_generated'
//   7. Return { clipId, script, audioUrl } (signed URL good for 1h)
//
// Body: { userId, context, matchId? }
// Errors return JSON with a stable `code` for the client to branch on.
//
// Setup: clone Coach V's voice in ElevenLabs once, set ELEVENLABS_VOICE_ID
// in Vercel. Per-athlete cloning is intentionally NOT part of this design —
// kids hear their actual coach, not themselves.

import Anthropic from '@anthropic-ai/sdk'
import { authGuard } from '../_auth.js'
import { buildScriptPrompt } from '../../src/features/future-self/lib/scriptPrompt.js'

const MODEL = 'claude-sonnet-4-6'
const TTS_MODEL = 'eleven_multilingual_v2'
const SIGNED_URL_TTL_SEC = 3600
const STORAGE_BUCKET = 'future-self-audio'

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra })
}

async function loadAthleteDigest(admin, userId) {
  const [profileRes, memoryRes, journalRes, matchRes, actionRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    admin.from('coach_memory').select('athlete_summary, themes').eq('user_id', userId).maybeSingle(),
    admin.from('voice_journal').select('transcript, sentiment, ai_note, recorded_at').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(3),
    admin.from('match_log').select('match_date, opponent, competition, result, score_for, score_against, performance, is_home, pre_intention, pre_focus_cue').eq('user_id', userId).order('match_date', { ascending: false }).limit(5),
    admin.from('action_steps').select('id, date').eq('user_id', userId).gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
  ])
  return {
    profile: profileRes.data,
    memory: memoryRes.data,
    recentJournal: journalRes.data || [],
    recentMatches: matchRes.data || [],
    monthActionSteps: (actionRes.data || []).length,
  }
}

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { requirePaidAccess: true })
  if (!auth.ok) return
  const { user: caller, admin } = auth
  const userId = caller.id  // verified — body userId is ignored

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const elevenKey = process.env.ELEVENLABS_API_KEY
  const coachVoiceId = process.env.ELEVENLABS_VOICE_ID
  if (!anthropicKey) return err(res, 500, 'env', 'ANTHROPIC_API_KEY not configured')
  if (!elevenKey)    return err(res, 500, 'env', 'ELEVENLABS_API_KEY not configured')
  if (!coachVoiceId) return err(res, 503, 'voice_not_configured', "Coach V's voice isn't configured yet — admin task pending.")

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return err(res, 400, 'bad_json', 'Invalid JSON')
  }

  const { context = 'custom', matchId = null } = body || {}

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  try {
    // 1. Pull supporting context (athlete digest + optional match)
    const digest = await loadAthleteDigest(admin, userId)
    if (!digest.profile) return err(res, 404, 'no_profile', 'Athlete profile not found')

    let matchContext = null
    if (matchId) {
      const { data: m } = await admin.from('match_log').select('*').eq('id', matchId).eq('user_id', userId).maybeSingle()
      matchContext = m || null
    } else if (context === 'pre_match') {
      const upcoming = digest.recentMatches.find(m => !m.result) // no result yet = upcoming
      matchContext = upcoming || null
    }
    const journalContext = context === 'post_mistake' ? digest.recentJournal[0] : null
    const monthlyContext = context === 'monthly_check'
      ? { recentMatches: digest.recentMatches, actionStepsCount: digest.monthActionSteps }
      : null

    // 2. Build prompt + call Claude
    const { system, user, maxTokens } = buildScriptPrompt({
      context,
      profile: digest.profile,
      themes: digest.memory?.themes,
      matchContext, journalContext, monthlyContext,
    })
    const resp = await anthropic.messages.create({
      model: MODEL, max_tokens: maxTokens, system,
      messages: [{ role: 'user', content: user }],
    })
    const script = (resp.content?.[0]?.text || '').trim().replace(/^["']|["']$/g, '')
    if (!script) return err(res, 502, 'empty_script', 'Claude returned empty script')

    // 3. ElevenLabs TTS
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${coachVoiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: script, model_id: TTS_MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.25, use_speaker_boost: true },
      }),
    })
    if (!ttsRes.ok) {
      const detail = await ttsRes.text().catch(() => '')
      return err(res, 502, 'tts_failed', 'ElevenLabs TTS failed', { detail: detail.slice(0, 400) })
    }
    const audioBuf = Buffer.from(await ttsRes.arrayBuffer())

    // 4. Upload to storage
    const clipId = crypto.randomUUID()
    const path = `${userId}/${clipId}.mp3`
    const { error: upErr } = await admin.storage.from(STORAGE_BUCKET).upload(path, audioBuf, {
      contentType: 'audio/mpeg', upsert: false,
    })
    if (upErr) return err(res, 500, 'storage', 'Failed to upload clip', { detail: upErr.message })

    // 5. Insert clip row (audio_url stores the storage PATH; signed URL returned separately)
    // Persisting the clip is best-effort: the audio is already uploaded and a
    // signed URL is returned below, so Coach V plays even if the history table
    // isn't present. Don't fail the whole ritual over clip history.
    const { error: insErr } = await admin.from('future_self_clips').insert([{
      id: clipId, user_id: userId, context, script, audio_url: path, match_id: matchId,
    }])
    if (insErr) console.error('[generate-clip] clip persist skipped:', insErr.message)

    // 6. Audit (best-effort — optional table, never fail the clip over the log)
    await admin.from('voice_audit_log').insert([{
      user_id: userId, actor_id: null, event: 'clip_generated', ref_id: clipId,
      metadata: { context, match_id: matchId, model: MODEL, tts_model: TTS_MODEL, tokens: resp.usage },
    }]).then(({ error }) => { if (error) console.error('[generate-clip] audit:', error.message) })

    // 7. Signed URL for immediate playback
    const { data: signed } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC)

    return res.status(200).json({
      clipId,
      script,
      audioUrl: signed?.signedUrl || null,
      context,
    })
  } catch (e) {
    console.error('[api/future-self/generate-clip] error:', e)
    return err(res, 500, 'unhandled', 'Clip generation failed', { detail: e?.message })
  }
}

export const config = { runtime: 'nodejs' }
