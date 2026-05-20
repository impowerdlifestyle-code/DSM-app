// Vercel serverless — weekly recap cron
// Runs Monday 8am via vercel.json crons. For each onboarded athlete,
// builds a 7-day summary, generates copy with Claude, emails via Resend,
// and records the send in recap_log (idempotent per user/week/audience).
//
// Required env vars:
//   ANTHROPIC_API_KEY
//   RESEND_API_KEY
//   RECAP_FROM_EMAIL          (e.g. "Coach Valentino <coach@voreli.ai>")
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (server-only key, bypasses RLS)
//   CRON_SECRET               (compared against Authorization header)

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const MODEL = 'claude-sonnet-4-6'

const RECAP_PROMPT = `
You are Coach Valentino DiLorenzo writing a personal weekly recap email to an athlete.

Inputs include: name, identity goal, streak, 7-day action steps, recent matches, last weekly check-in, top win, top struggle.

Output STRICT JSON: {
  "subject": "...",      // ≤60 chars, athletic voice, name a real signal from the week
  "headline": "...",     // 1 sentence, opening hook
  "wins": ["...","..."], // 2-3 concrete wins from the data
  "fix":  "...",         // 1 thing to work on next week, specific
  "cta":  "...",         // 1 imperative call to action for the week ahead
  "closing": "..."       // 1 sentence sign-off in coach voice
}

Rules:
- Reference real numbers/dates/opponents from the inputs.
- No motivational filler. Direct, athlete-voice.
- If the week was light (few entries), call that out honestly.
- No prose outside the JSON.
`.trim()

function weekKey(d = new Date()) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function parseJson(raw, fallback) {
  if (!raw) return fallback
  const cleaned = String(raw).trim().replace(/^```json\s*|\s*```$/g, '')
  try { return JSON.parse(cleaned) } catch { return fallback }
}

async function generateRecap(client, inputs) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: RECAP_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(inputs, null, 2) }],
  })
  const raw = resp.content?.[0]?.text || '{}'
  return parseJson(raw, {
    subject: `${inputs.name?.split(' ')[0] || 'Athlete'} — weekly recap`,
    headline: 'Quiet week. Pick one thing to lock in.',
    wins: [], fix: '', cta: 'Get one solid session in this week.',
    closing: '— V',
  })
}

function renderHtml(recap, athleteName) {
  const wins = (recap.wins || []).map(w => `<li style="margin:6px 0">${w}</li>`).join('')
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#000;font-family:'Inter','Helvetica',sans-serif;color:#fafafa">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:11px;letter-spacing:3px;color:#777;text-transform:uppercase;margin-bottom:8px">DiLorenzo Soccer Mindset</div>
    <h1 style="font-family:'Bebas Neue','Oswald',sans-serif;font-size:36px;font-weight:400;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 16px">Weekly recap</h1>
    <p style="font-size:16px;color:#ddd;line-height:1.5;margin:0 0 20px">${recap.headline || ''}</p>
    ${wins ? `<div style="background:#0e0e0e;border:1px solid #222;border-radius:14px;padding:16px 18px;margin-bottom:16px">
      <div style="font-size:10px;letter-spacing:2.4px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:8px">Wins</div>
      <ul style="margin:0;padding-left:18px;color:#eaeaea;font-size:14px;line-height:1.5">${wins}</ul>
    </div>` : ''}
    ${recap.fix ? `<div style="background:#0e0e0e;border:1px solid #222;border-radius:14px;padding:16px 18px;margin-bottom:16px">
      <div style="font-size:10px;letter-spacing:2.4px;color:#888;text-transform:uppercase;font-weight:600;margin-bottom:8px">Fix this week</div>
      <div style="font-size:14px;color:#eaeaea;line-height:1.5">${recap.fix}</div>
    </div>` : ''}
    ${recap.cta ? `<div style="background:#fafafa;color:#000;border-radius:14px;padding:18px;text-align:center;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;font-size:13px;margin-bottom:20px">${recap.cta}</div>` : ''}
    <p style="font-size:14px;color:#aaa;line-height:1.5;margin:0 0 24px">${recap.closing || '— V'}</p>
    <div style="font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase">Sent to ${athleteName}</div>
  </div>
</body></html>`
}

function renderParentHtml(recap, athleteName) {
  const wins = (recap.wins || []).map(w => `<li style="margin:6px 0">${w}</li>`).join('')
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fff;font-family:'Inter','Helvetica',sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:11px;letter-spacing:3px;color:#666;text-transform:uppercase;margin-bottom:8px">DiLorenzo Soccer Mindset · Parent update</div>
    <h1 style="font-family:'Bebas Neue','Oswald',sans-serif;font-size:32px;font-weight:400;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 12px">${athleteName} · This week</h1>
    <p style="font-size:15px;color:#333;line-height:1.5;margin:0 0 18px">${recap.headline || ''}</p>
    ${wins ? `<div style="background:#f6f6f6;border:1px solid #eee;border-radius:12px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase;font-weight:600;margin-bottom:6px">Wins</div>
      <ul style="margin:0;padding-left:18px;color:#222;font-size:14px;line-height:1.5">${wins}</ul>
    </div>` : ''}
    ${recap.fix ? `<div style="background:#f6f6f6;border:1px solid #eee;border-radius:12px;padding:14px 16px;margin-bottom:14px">
      <div style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase;font-weight:600;margin-bottom:6px">Focus next week</div>
      <div style="font-size:14px;color:#222;line-height:1.5">${recap.fix}</div>
    </div>` : ''}
    <p style="font-size:13px;color:#666;line-height:1.5;margin:18px 0 0">${recap.closing || '— Coach V'}</p>
  </div>
</body></html>`
}

async function sendEmail({ from, to, subject, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Resend ${r.status}: ${text.slice(0, 200)}`)
  }
  return r.json()
}

export default async function handler(req, res) {
  // auth: cron header OR Authorization bearer
  const secret = process.env.CRON_SECRET
  const provided = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
    || req.headers['x-cron-secret']
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const missing = ['ANTHROPIC_API_KEY','RESEND_API_KEY','RECAP_FROM_EMAIL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']
    .filter(k => !process.env[k])
  if (missing.length) return res.status(500).json({ error: `missing env: ${missing.join(',')}` })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const FROM = process.env.RECAP_FROM_EMAIL
  const wk = weekKey()

  // Optional ?dryRun=1 returns the planned sends without emitting them.
  const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true'
  // Optional ?userId=<uuid> limits to one athlete (manual triggers).
  const onlyUserId = req.query?.userId

  // 1. pick onboarded athletes
  let q = supabase
    .from('profiles')
    .select('id, email, full_name, role, identity_goal, streak, onboarded_at')
    .not('onboarded_at', 'is', null)
    .neq('access_level', 'locked')
  if (onlyUserId) q = q.eq('id', onlyUserId)
  const { data: athletes, error: athErr } = await q
  if (athErr) return res.status(500).json({ error: athErr.message })

  const athletesOnly = (athletes || []).filter(a => (a.role || 'athlete') === 'athlete')

  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0]
  const sends = []
  const skips = []
  const errors = []

  for (const a of athletesOnly) {
    try {
      // idempotency check
      if (!dryRun) {
        const { data: existing } = await supabase
          .from('recap_log')
          .select('id, sent_at')
          .eq('user_id', a.id).eq('audience', 'athlete').eq('week_key', wk)
          .maybeSingle()
        if (existing?.sent_at) { skips.push({ id: a.id, reason: 'already-sent' }); continue }
      }

      // pull last 7 days of signal
      const [actions, matches, checkin] = await Promise.all([
        supabase.from('action_steps').select('date, mental, did_action_steps, shark_used, goldfish_used, selftalk_used, tuneout_used').eq('user_id', a.id).gte('date', since).order('date', { ascending: false }),
        supabase.from('match_log').select('match_date, opponent, result, score_for, score_against, performance, went_well, to_fix').eq('user_id', a.id).not('post_logged_at', 'is', null).gte('match_date', since).order('match_date', { ascending: false }),
        supabase.from('weekly_checkins').select('week, mental, wins, struggles').eq('user_id', a.id).order('created_at', { ascending: false }).limit(1),
      ])

      const inputs = {
        name: a.full_name || 'Athlete',
        identityGoal: a.identity_goal || null,
        streak: a.streak || 0,
        actions: actions.data || [],
        matches: matches.data || [],
        lastCheckin: checkin.data?.[0] || null,
        weekKey: wk,
      }

      const recap = await generateRecap(anthropic, inputs)

      if (dryRun) { sends.push({ id: a.id, recap, audience: 'athlete' }); continue }

      // 1a. log first (so we have a row to update with error if send fails)
      const { data: logRow } = await supabase
        .from('recap_log')
        .insert([{
          user_id: a.id, audience: 'athlete', recipient: a.email, week_key: wk,
          summary: recap.headline, highlights: recap,
        }])
        .select().single()

      try {
        if (a.email) {
          await sendEmail({
            from: FROM, to: a.email,
            subject: recap.subject || `Weekly recap`,
            html: renderHtml(recap, a.full_name || 'Athlete'),
          })
          await supabase.from('recap_log').update({ sent_at: new Date().toISOString() }).eq('id', logRow.id)
        }
      } catch (sendErr) {
        await supabase.from('recap_log').update({ error: String(sendErr.message || sendErr).slice(0, 500) }).eq('id', logRow.id)
        errors.push({ id: a.id, audience: 'athlete', error: sendErr.message })
      }

      // 1b. parents
      const { data: links } = await supabase
        .from('parent_links').select('parent_id').eq('athlete_id', a.id)
      for (const link of links || []) {
        const { data: parent } = await supabase
          .from('profiles').select('id, email, full_name').eq('id', link.parent_id).maybeSingle()
        if (!parent?.email) continue
        const { data: pExisting } = await supabase
          .from('recap_log').select('id, sent_at')
          .eq('user_id', a.id).eq('audience', 'parent').eq('week_key', wk)
          .maybeSingle()
        if (pExisting?.sent_at) continue
        const { data: pLogRow } = await supabase.from('recap_log').insert([{
          user_id: a.id, audience: 'parent', recipient: parent.email, week_key: wk,
          summary: recap.headline, highlights: recap,
        }]).select().single()
        try {
          await sendEmail({
            from: FROM, to: parent.email,
            subject: `${(a.full_name || 'Your athlete').split(' ')[0]} — weekly recap`,
            html: renderParentHtml(recap, a.full_name || 'Your athlete'),
          })
          await supabase.from('recap_log').update({ sent_at: new Date().toISOString() }).eq('id', pLogRow.id)
        } catch (sendErr) {
          await supabase.from('recap_log').update({ error: String(sendErr.message || sendErr).slice(0, 500) }).eq('id', pLogRow.id)
          errors.push({ id: a.id, audience: 'parent', error: sendErr.message })
        }
      }

      sends.push({ id: a.id, email: a.email, parents: (links || []).length })
    } catch (e) {
      errors.push({ id: a.id, error: String(e.message || e) })
    }
  }

  return res.status(200).json({
    weekKey: wk,
    dryRun,
    sent: sends.length,
    skipped: skips.length,
    errors: errors.length,
    detail: { sends, skips, errors },
  })
}

export const config = { runtime: 'nodejs' }
