// Vercel serverless — Future Self monthly check-in writer.
// Pipeline:
//   1. Insert future_self_checkins row (handles UNIQUE(user_id, month) conflict)
//   2. Load digest (identity_statement, themes, 30d action steps, recent matches)
//   3. Claude → ai_reflection (gap analysis: stated identity vs actual behavior)
//   4. Update row with ai_reflection
//   5. Award XP (xp_log insert, source='future_self_checkin', xp=250)
//   6. Audit 'checkin_completed'
//   7. Return { id, ai_reflection }
//
// Body: { userId, month, prompt, transcript }

import Anthropic from '@anthropic-ai/sdk'
import { authGuard } from '../_auth.js'

const MODEL = 'claude-sonnet-4-6'
const XP_AMOUNT = 250

const REFLECTION_SYSTEM = `
You are this athlete's quiet observer — not Coach V, not their future self.
You read their stated identity, what they've actually done this month, and
what they just said to themselves out loud. You name the gap (or the
alignment) in 2-3 sentences. Athlete-voice. No motivational filler. No
prescription. No "you should". Just: here's what I see between what you
said you wanted and what your behavior shows. Plain text only.
`.trim()

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra })
}

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { requirePaidAccess: true })
  if (!auth.ok) return
  const { user: caller, admin } = auth
  const userId = caller.id  // verified — body userId is ignored

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return err(res, 500, 'env', 'ANTHROPIC_API_KEY not configured')

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return err(res, 400, 'bad_json', 'Invalid JSON')
  }

  const { month, prompt, transcript } = body || {}
  if (!month || !prompt) {
    return err(res, 400, 'missing_field', 'month and prompt required')
  }
  const responseText = (transcript || '').trim()
  if (!responseText) return err(res, 400, 'empty_response', 'response transcript is empty')

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  try {
    // 1. Insert row (handle dup-month gracefully)
    const { data: inserted, error: insErr } = await admin
      .from('future_self_checkins')
      .insert([{ user_id: userId, month, prompt, response_transcript: responseText }])
      .select().single()
    if (insErr) {
      if (insErr.code === '23505') return err(res, 409, 'already_done', 'Already checked in this month')
      return err(res, 500, 'db', 'Failed to record check-in', { detail: insErr.message })
    }

    // 2. Build reflection digest
    const monthStart = `${month}-01`
    const [memoryRes, actionRes, matchRes, profileRes] = await Promise.all([
      admin.from('coach_memory').select('athlete_summary, themes').eq('user_id', userId).maybeSingle(),
      admin.from('action_steps').select('date, mental, did_action_steps').eq('user_id', userId).gte('date', monthStart).order('date', { ascending: false }).limit(30),
      admin.from('match_log').select('match_date, opponent, result, performance, went_well, to_fix').eq('user_id', userId).gte('match_date', monthStart).order('match_date', { ascending: false }).limit(10),
      admin.from('profiles').select('full_name, identity_goal, position').eq('id', userId).maybeSingle(),
    ])

    // Identity comes from profiles.identity_goal — the deprecated voice_identity
    // table is intentionally not a dependency of the monthly ritual.
    const identityLine = profileRes.data?.identity_goal || '(no stated identity on file)'
    const themes = memoryRes.data?.themes || {}
    const actions = actionRes.data || []
    const matches = matchRes.data || []

    const userPayload = JSON.stringify({
      month,
      stated_identity: identityLine,
      themes,
      monthly_action_steps_count: actions.length,
      monthly_action_steps_mental_avg: actions.length
        ? Math.round(actions.reduce((a, r) => a + (r.mental || 0), 0) / actions.length * 10) / 10
        : null,
      monthly_matches: matches.map(m => ({
        date: m.match_date, opponent: m.opponent, result: m.result,
        perf: m.performance, well: (m.went_well || '').slice(0, 120), fix: (m.to_fix || '').slice(0, 120),
      })),
      future_self_question: prompt,
      athlete_response: responseText,
    }, null, 2)

    // 3. Claude reflection
    let aiReflection = ''
    try {
      const resp = await anthropic.messages.create({
        model: MODEL, max_tokens: 220, system: REFLECTION_SYSTEM,
        messages: [{ role: 'user', content: userPayload }],
      })
      aiReflection = (resp.content?.[0]?.text || '').trim()
    } catch (e) {
      // Soft-fail: row is saved, reflection can be regenerated later
      console.error('[save-checkin] claude failed:', e?.message)
    }

    // 4. Update with reflection (best-effort)
    if (aiReflection) {
      await admin.from('future_self_checkins')
        .update({ ai_reflection: aiReflection })
        .eq('id', inserted.id)
    }

    // 5. Award XP (best-effort — never fail the check-in over the log)
    await admin.from('xp_log').insert([{
      user_id: userId, source: 'future_self_checkin', xp: XP_AMOUNT,
      ref_id: inserted.id, note: month,
    }]).then(({ error }) => { if (error) console.error('[save-checkin] xp_log:', error.message) })

    // 6. Audit (best-effort — optional table)
    await admin.from('voice_audit_log').insert([{
      user_id: userId, actor_id: userId, event: 'checkin_completed', ref_id: inserted.id,
      metadata: { month, xp_awarded: XP_AMOUNT, reflection_generated: !!aiReflection },
    }]).then(({ error }) => { if (error) console.error('[save-checkin] audit:', error.message) })

    return res.status(200).json({
      id: inserted.id, month, ai_reflection: aiReflection, xp_awarded: XP_AMOUNT,
    })
  } catch (e) {
    console.error('[api/future-self/save-checkin] error:', e)
    return err(res, 500, 'unhandled', 'Save check-in failed', { detail: e?.message })
  }
}

export const config = { runtime: 'nodejs' }
