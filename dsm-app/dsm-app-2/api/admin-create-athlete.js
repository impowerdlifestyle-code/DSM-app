// Admin/coach manually creates an athlete account (no self-signup).
// JWT-gated; caller must be admin or coach. Creates a confirmed auth user
// (so they can sign in immediately with the temp password the admin shares)
// + an athlete profile. The BEFORE INSERT trial trigger handles trial setup.

import { authGuard } from './_auth.js'

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { loadProfile: true })
  if (!auth.ok) return
  const { profile, admin } = auth
  if (!profile?.is_admin && profile?.role !== 'coach') {
    return res.status(403).json({ error: 'Admin or coach access required' })
  }

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  const email = (body?.email || '').trim().toLowerCase()
  const name = (body?.name || '').trim()
  const password = body?.password || ''
  const age = body?.age
  const assignedCoach = (body?.assignedCoach || '').trim()

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' })
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (cErr) {
    const dup = /already.*registered|exists/i.test(cErr.message)
    return res.status(dup ? 409 : 400).json({ error: dup ? 'An account with that email already exists.' : cErr.message })
  }

  const row = { id: created.user.id, email, full_name: name, role: 'athlete' }
  if (age !== undefined && age !== null && age !== '') row.age = Number(age)
  if (assignedCoach) row.assigned_coach = assignedCoach

  const { error: pErr } = await admin.from('profiles').upsert(row, { onConflict: 'id' })
  if (pErr) return res.status(500).json({ error: 'Account created but profile setup failed: ' + pErr.message })

  return res.status(200).json({ ok: true, id: created.user.id, email })
}

export const config = { runtime: 'nodejs' }
