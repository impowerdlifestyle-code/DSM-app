// GET /api/consent-info?token=<uuid>
// Public — used by the parent consent landing page.
// Returns minimum info needed for the parent to make an informed decision:
// athlete name, age, current consent status. No email or other PII surfaced.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    return res.status(200).end()
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const token = (req.query?.token || '').trim()
  if (!isUuid(token)) return res.status(400).json({ error: 'Invalid token.' })

  try {
    const { data, error } = await admin
      .from('profiles')
      .select('full_name, age, parent_consent_status, parent_consent_required, parent_consent_granted_at')
      .eq('parent_consent_token', token)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data)  return res.status(404).json({ error: 'Approval link not found or expired.' })
    if (!data.parent_consent_required) {
      return res.status(400).json({ error: 'This account does not require parental consent.' })
    }
    return res.status(200).json({
      profile: {
        full_name: data.full_name,
        age:       data.age,
        status:    data.parent_consent_status || 'pending',
        granted_at: data.parent_consent_granted_at,
      },
    })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'lookup failed' })
  }
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export const config = { runtime: 'nodejs' }
