// POST /api/decline-consent { token }
// Public — parent declines. Status flips to 'declined', account stays locked.

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

  try {
    const { data, error } = await admin
      .from('profiles')
      .update({
        parent_consent_status: 'declined',
        access_level:          'locked',
        trial_ends_at:         null,
      })
      .eq('parent_consent_token', token)
      .eq('parent_consent_required', true)
      .select('id, parent_consent_status')
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data)  return res.status(404).json({ error: 'Approval link not found.' })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'decline failed' })
  }
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export const config = { runtime: 'nodejs' }
