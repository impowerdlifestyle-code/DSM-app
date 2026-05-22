// POST /api/send-consent-email { token }
// Sends the parent the approval URL. Uses Resend if RESEND_API_KEY is set,
// otherwise returns 503 with the URL in the body so admins/athletes can share manually.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const APP_ORIGIN  = process.env.PUBLIC_APP_URL || 'https://dsm-app-2.vercel.app'
const FROM_EMAIL  = process.env.CONSENT_FROM_EMAIL || 'Coach Valentino <coach@voreli.ai>'
const ADMIN_BCC   = process.env.CONSENT_ADMIN_BCC  || 'valentino@dilorenzosoccermindset.com'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let payload
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch { return res.status(400).json({ error: 'invalid json' }) }

  const token = (payload?.token || '').trim()
  if (!isUuid(token)) return res.status(400).json({ error: 'Invalid token.' })

  const { data: profile, error: lookupErr } = await admin
    .from('profiles')
    .select('full_name, parent_consent_email, parent_consent_token, parent_consent_status')
    .eq('parent_consent_token', token)
    .maybeSingle()
  if (lookupErr) return res.status(500).json({ error: lookupErr.message })
  if (!profile)  return res.status(404).json({ error: 'Token not found.' })
  if (!profile.parent_consent_email) {
    return res.status(400).json({ error: 'No parent email on file.' })
  }
  if (profile.parent_consent_status === 'granted') {
    return res.status(400).json({ error: 'Account already approved.' })
  }

  const consentUrl = `${APP_ORIGIN}/?consent=${token}`
  const athleteName = profile.full_name || 'your child'

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({
      error: 'Email delivery is not configured. Share this link with the parent manually.',
      consentUrl,
    })
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   [profile.parent_consent_email],
        bcc:  [ADMIN_BCC],
        subject: `Approve ${athleteName}'s DSM account`,
        html: emailHtml({ athleteName, consentUrl }),
        text: emailText({ athleteName, consentUrl }),
      }),
    })
    const json = await resp.json().catch(() => ({}))
    if (!resp.ok) return res.status(502).json({ error: json.message || 'Resend send failed', consentUrl })

    // Mark sent_at so we can rate-limit / show "last sent" in admin.
    await admin
      .from('profiles')
      .update({ parent_consent_sent_at: new Date().toISOString() })
      .eq('parent_consent_token', token)

    return res.status(200).json({ ok: true, consentUrl })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'send failed', consentUrl })
  }
}

function emailHtml({ athleteName, consentUrl }) {
  return `<!doctype html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0a0a0a; color:#fafafa; padding:32px 16px; margin:0;">
  <div style="max-width:560px; margin:0 auto; background:#111; border:1px solid #252528; border-radius:18px; padding:28px;">
    <div style="font-size:10px; letter-spacing:2.4px; color:#888; font-weight:700; text-transform:uppercase; margin-bottom:8px;">DSM · Parental Approval</div>
    <h1 style="font-size:24px; line-height:1.2; margin:0 0 12px; color:#fafafa;">${escapeHtml(athleteName)} signed up for DiLorenzo Soccer Mindset.</h1>
    <p style="font-size:14px; color:#ccc; line-height:1.55; margin:0 0 16px;">
      Because they're under 13, U.S. law (COPPA) requires your OK before they can start. Tap below to review what we collect and approve their account.
    </p>
    <p style="margin:24px 0;">
      <a href="${consentUrl}" style="display:inline-block; background:#fafafa; color:#000; text-decoration:none; padding:14px 22px; border-radius:12px; font-size:13px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">Review &amp; approve →</a>
    </p>
    <p style="font-size:11px; color:#888; line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br><span style="color:#666; word-break:break-all;">${consentUrl}</span></p>
    <hr style="border:none; border-top:1px solid #252528; margin:24px 0;">
    <p style="font-size:11px; color:#666; line-height:1.5;">Sent by Coach Valentino DiLorenzo · DSM. Reply to this email if you have any questions.</p>
  </div>
</body></html>`
}

function emailText({ athleteName, consentUrl }) {
  return `${athleteName} signed up for DiLorenzo Soccer Mindset.

Because they're under 13, U.S. law (COPPA) requires your OK before they can start.

Review what we collect and approve their account here:
${consentUrl}

— Coach Valentino DiLorenzo, DSM`
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export const config = { runtime: 'nodejs' }
