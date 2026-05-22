// POST /api/grant-consent { token }
// Public — parent approves their child's account. Validates the token,
// flips parent_consent_status='granted', records granted_at + IP for audit,
// switches access_level to 'trial' and starts the 14-day countdown.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
             req.headers['x-real-ip'] ||
             req.socket?.remoteAddress ||
             null

  try {
    const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString()
    const { data, error } = await admin
      .from('profiles')
      .update({
        parent_consent_status:     'granted',
        parent_consent_granted_at: new Date().toISOString(),
        parent_consent_granted_ip: ip,
        access_level:              'trial',
        trial_ends_at:             trialEnd,
      })
      .eq('parent_consent_token', token)
      .eq('parent_consent_required', true)
      .select('id, full_name, parent_consent_status, access_level')
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data)  return res.status(404).json({ error: 'Approval link not found or already used.' })
    return res.status(200).json({ ok: true, profile: data })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'grant failed' })
  }
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export const config = { runtime: 'nodejs' }
