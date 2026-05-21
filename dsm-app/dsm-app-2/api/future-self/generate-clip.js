// Vercel serverless — Future Self clip generator.
// Pipeline:
//   1. Load voice_identity (must have elevenlabs_voice_id and not be deleted)
//   2. Load athlete digest (profile + coach_memory + recent journal/matches)
//   3. Claude → 15–30s spoken script
//   4. ElevenLabs TTS → audio bytes
//   5. Supabase Storage upload → 'future-self-audio/{userId}/{clipId}.mp3'
//   6. Insert future_self_clips row
//   7. Insert voice_audit_log 'clip_generated'
//   8. Return { clipId, script, audioUrl } (signed URL good for 1h)
//
// Body: { userId, context, matchId? }
// Errors return JSON with a stable `code` for the client to branch on.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { buildScriptPrompt } from '../../src/features/future-self/lib/scriptPrompt.js'

const MODEL = 'claude-sonnet-4-6'
const TTS_MODEL = 'eleven_monolingual_v1'
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
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return err(res, 405, 'method', 'Method not allowed')

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const elevenKey = process.env.ELEVENLABS_API_KEY
  const supaUrl = process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!anthropicKey) return err(res, 500, 'env', 'ANTHROPIC_API_KEY not configured')
  if (!elevenKey)    return err(res, 500, 'env', 'ELEVENLABS_API_KEY not configured')
  if (!supaUrl || !supaKey) return err(res, 500, 'env', 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured')

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return err(res, 400, 'bad_json', 'Invalid JSON')
  }

  const { userId, context = 'custom', matchId = null } = body || {}
  if (!userId) return err(res, 400, 'missing_user', 'userId is required')

  const admin = createClient(supaUrl, supaKey)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  try {
    // 1. Voice identity gate
    const { data: identity, error: idErr } = await admin
      .from('voice_identity').select('*').eq('user_id', userId).is('deleted_at', null).maybeSingle()
    if (idErr) return err(res, 500, 'db', 'Failed to read voice identity', { detail: idErr.message })
    if (!identity) return err(res, 412, 'not_consented', 'No voice identity on file. Complete consent + capture first.')
    if (!identity.consent_given_at) return err(res, 412, 'not_consented', 'Consent missing.')
    if (!identity.elevenlabs_voice_id) return err(res, 412, 'voice_not_cloned', 'Voice has not been cloned yet. Complete the capture step.')

    // 2. Pull supporting context (athlete digest + optional match)
    const digest = await loadAthleteDigest(admin, userId)
    let matchContext = null
    if (matchId) {
      const { data: m } = await admin.from('match_log').select('*').eq('id', matchId).maybeSingle()
      matchContext = m || null
    } else if (context === 'pre_match') {
      const upcoming = digest.recentMatches.find(m => !m.result) // no result yet = upcoming
      matchContext = upcoming || null
    }
    const journalContext = context === 'post_mistake' ? digest.recentJournal[0] : null
    const monthlyContext = context === 'monthly_check'
      ? { recentMatches: digest.recentMatches, actionStepsCount: digest.monthActionSteps }
      : null

    // 3. Build prompt + call Claude
    const { system, user, maxTokens } = buildScriptPrompt({
      context,
      identityStatement: identity.identity_statement,
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

    // 4. ElevenLabs TTS
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${identity.elevenlabs_voice_id}`, {
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

    // 5. Upload to storage
    const clipId = crypto.randomUUID()
    const path = `${userId}/${clipId}.mp3`
    const { error: upErr } = await admin.storage.from(STORAGE_BUCKET).upload(path, audioBuf, {
      contentType: 'audio/mpeg', upsert: false,
    })
    if (upErr) return err(res, 500, 'storage', 'Failed to upload clip', { detail: upErr.message })

    // 6. Insert clip row (store the storage path in audio_url; client gets signed URL below)
    const { data: clipRow, error: insErr } = await admin.from('future_self_clips').insert([{
      id: clipId, user_id: userId, context, script, audio_url: path, match_id: matchId,
    }]).select().single()
    if (insErr) return err(res, 500, 'db', 'Failed to record clip', { detail: insErr.message })

    // 7. Audit
    await admin.from('voice_audit_log').insert([{
      user_id: userId, actor_id: null, event: 'clip_generated', ref_id: clipId,
      metadata: { context, match_id: matchId, model: MODEL, tts_model: TTS_MODEL, tokens: resp.usage },
    }])

    // 8. Signed URL for immediate playback
    const { data: signed } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC)

    return res.status(200).json({
      clipId,
      script,
      audioUrl: signed?.signedUrl || null,
      context: clipRow.context,
    })
  } catch (e) {
    console.error('[api/future-self/generate-clip] error:', e)
    return err(res, 500, 'unhandled', 'Clip generation failed', { detail: e?.message })
  }
}

export const config = { runtime: 'nodejs' }
