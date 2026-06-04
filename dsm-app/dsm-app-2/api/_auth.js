// Shared auth + CORS helper for Vercel serverless endpoints.
//
// Use at the top of every authenticated handler:
//
//   import { authGuard } from './_auth.js'
//
//   export default async function handler(req, res) {
//     const auth = await authGuard(req, res, { requirePaidAccess: true })
//     if (!auth.ok) return  // authGuard already wrote the response
//     const { user, profile, admin } = auth
//     ...
//   }
//
// - Verifies the Supabase JWT in `Authorization: Bearer <token>` using anon key.
// - Optionally fetches profile and enforces evaluateAccess() (server-side paywall).
// - Sets CORS headers and handles OPTIONS preflight against an explicit allowlist.
// - Returns `admin` (service-role client) for downstream mutations.

import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://dsm-app-2.vercel.app,http://localhost:5173,http://localhost:3000,capacitor://localhost,https://localhost,http://localhost')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
)

function applyCors(req, res) {
  const origin = req.headers?.origin
  // Allow exact match against the allowlist, plus any *.vercel.app preview URL
  // for the dsm-app-2 project so QA deploys keep working.
  const isAllowed =
    (origin && ALLOWED_ORIGINS.has(origin)) ||
    (typeof origin === 'string' && /^https:\/\/dsm-app-2[-a-z0-9]*\.vercel\.app$/.test(origin))
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-DSM-Native')
}

// Mirror of src/lib/supabase.js evaluateAccess() — keep in sync.
function evaluateAccess(profile) {
  if (!profile) return { ok: false, reason: 'unknown' }
  if (profile.role === 'coach' || profile.role === 'parent' || profile.is_admin) {
    return { ok: true, reason: profile.is_admin ? 'admin' : profile.role }
  }
  const level = profile.access_level
  if (level === 'paid') return { ok: true, reason: 'paid' }
  if (level === 'mentoring_elite') return { ok: true, reason: 'elite' }
  if (level === 'locked') return { ok: false, reason: 'locked' }
  if (level === 'trial') {
    const ends = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
    if (!ends) return { ok: true, reason: 'trial' }
    if (ends.getTime() > Date.now()) return { ok: true, reason: 'trial' }
    return { ok: false, reason: 'trial-expired' }
  }
  return { ok: false, reason: 'unknown' }
}

export async function authGuard(req, res, opts = {}) {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return { ok: false, handled: true }
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return { ok: false, handled: true }
  }

  const supaUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !anonKey || !serviceKey) {
    res.status(500).json({ error: 'Supabase server credentials missing' })
    return { ok: false, handled: true }
  }

  const authHeader = req.headers?.authorization || ''
  const m = authHeader.match(/^Bearer (.+)$/i)
  if (!m) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <token>' })
    return { ok: false, handled: true }
  }
  const token = m[1]

  // Verify the JWT by calling auth.getUser on the anon client with the token.
  const userClient = createClient(supaUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return { ok: false, handled: true }
  }
  const user = userData.user

  const admin = createClient(supaUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let profile = null
  if (opts.requirePaidAccess || opts.loadProfile) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, role, is_admin, access_level, trial_ends_at, full_name')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: 'Profile lookup failed', detail: error.message })
      return { ok: false, handled: true }
    }
    profile = data
    // Native apps ship free (no IAP per Apple 3.1.1) — skip the paywall when
    // the request comes from the native shell. The header is best-effort; the
    // web paywall isn't a hard revenue gate today, so the spoof risk is low.
    const isNative = (req.headers['x-dsm-native'] || req.headers['X-DSM-Native']) === '1'
    if (opts.requirePaidAccess && !isNative) {
      const access = evaluateAccess(profile)
      if (!access.ok) {
        res.status(403).json({ error: 'Subscription required', reason: access.reason })
        return { ok: false, handled: true }
      }
    }
  }

  return { ok: true, user, profile, admin }
}
