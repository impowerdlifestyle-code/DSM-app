// Redeem a signed coach-invite token. Must be called by the authenticated
// athlete (auth.uid()) — token signature + expiry are verified server-side
// before writing profiles.assigned_coach.
//
// Body: { token }
// Returns: { ok, coachLabel } or { error }

import { createHmac, timingSafeEqual } from 'node:crypto'
import { authGuard } from '../_auth.js'

function verifyToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' }
  }
  const [payloadEncoded, sigEncoded] = token.split('.', 2)
  let expected, given
  try {
    expected = createHmac('sha256', secret).update(payloadEncoded).digest()
    given = Buffer.from(sigEncoded, 'base64url')
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'bad_signature' }
  }
  let payload
  try { payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString()) }
  catch { return { ok: false, reason: 'malformed' } }
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'malformed' }
  if (!payload.coachLabel || typeof payload.coachLabel !== 'string') {
    return { ok: false, reason: 'malformed' }
  }
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, payload }
}

export default async function handler(req, res) {
  const auth = await authGuard(req, res, {})
  if (!auth.ok) return
  const { user, admin } = auth

  const secret = process.env.INVITE_SIGNING_SECRET
  if (!secret || secret.length < 32) {
    return res.status(500).json({ error: 'INVITE_SIGNING_SECRET not configured' })
  }

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const token = (body?.token || '').toString()
  if (!token) return res.status(400).json({ error: 'token required' })

  const v = verifyToken(token, secret)
  if (!v.ok) return res.status(400).json({ error: 'Invalid token', reason: v.reason })

  // First-touch wins: only set assigned_coach if it's empty.
  const { data: existing, error: readErr } = await admin
    .from('profiles').select('assigned_coach').eq('id', user.id).maybeSingle()
  if (readErr) return res.status(500).json({ error: 'Profile lookup failed', detail: readErr.message })

  if (existing?.assigned_coach) {
    return res.status(200).json({ ok: true, already: true, coachLabel: existing.assigned_coach })
  }

  const { error: upErr } = await admin
    .from('profiles')
    .update({ assigned_coach: v.payload.coachLabel })
    .eq('id', user.id)
  if (upErr) return res.status(500).json({ error: 'Failed to write assigned_coach', detail: upErr.message })

  return res.status(200).json({ ok: true, coachLabel: v.payload.coachLabel })
}

export const config = { runtime: 'nodejs' }
