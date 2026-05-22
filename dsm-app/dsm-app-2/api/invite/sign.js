// Mint a signed coach-invite token. Coach or admin only.
//
// Body: { coachLabel: string, ttlDays?: number = 30 }
// Returns: { token, url }
//   token format: base64url(payload).base64url(hmac)
//   payload: { coachLabel, exp (epoch ms), v: 1 }
//   hmac:    HMAC-SHA256(payload, INVITE_SIGNING_SECRET)

import { createHmac, randomBytes } from 'node:crypto'
import { authGuard } from '../_auth.js'

function b64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { loadProfile: true })
  if (!auth.ok) return
  const { profile } = auth

  // Only coaches + admins can mint invites.
  if (!profile || (!profile.is_admin && profile.role !== 'coach')) {
    return res.status(403).json({ error: 'Coach or admin role required to mint invites' })
  }

  const secret = process.env.INVITE_SIGNING_SECRET
  if (!secret || secret.length < 32) {
    return res.status(500).json({ error: 'INVITE_SIGNING_SECRET not configured (need ≥32 chars)' })
  }

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const coachLabel = (body?.coachLabel || '').toString().trim().slice(0, 80)
  if (!coachLabel) return res.status(400).json({ error: 'coachLabel required' })
  const ttlDays = Math.min(Math.max(Number(body?.ttlDays) || 30, 1), 90)

  const payload = {
    coachLabel,
    exp: Date.now() + ttlDays * 86400000,
    v: 1,
    n: b64url(randomBytes(6)), // nonce, makes identical invites distinguishable
  }
  const payloadEncoded = b64url(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(payloadEncoded).digest()
  const token = `${payloadEncoded}.${b64url(sig)}`

  // Build the share URL. Origin comes from request (Vercel sets x-forwarded-host).
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host  = req.headers['x-forwarded-host'] || req.headers.host || 'dsm-app-2.vercel.app'
  const url = `${proto}://${host}/?invite=${token}`

  return res.status(200).json({ token, url, expiresAt: new Date(payload.exp).toISOString() })
}

export const config = { runtime: 'nodejs' }
