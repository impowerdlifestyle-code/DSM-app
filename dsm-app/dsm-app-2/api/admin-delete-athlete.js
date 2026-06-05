// Admin/coach permanently deletes an athlete account. JWT-gated.
// Service-role deletes the auth user; ON DELETE CASCADE wipes all their data.
// Guards: caller must be admin/coach, can't delete themselves here, and
// can't delete another admin account.

import { authGuard } from './_auth.js'

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { loadProfile: true })
  if (!auth.ok) return
  const { profile, admin, user } = auth
  if (!profile?.is_admin && profile?.role !== 'coach') {
    return res.status(403).json({ error: 'Admin or coach access required' })
  }

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  const targetId = body?.athleteId
  if (!targetId) return res.status(400).json({ error: 'athleteId required' })
  if (targetId === user.id) return res.status(400).json({ error: 'Use account deletion for your own account.' })

  const { data: target } = await admin.from('profiles').select('is_admin').eq('id', targetId).maybeSingle()
  if (target?.is_admin) return res.status(403).json({ error: 'Cannot delete an admin account.' })

  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error) {
    console.error('[admin-delete-athlete] deleteUser failed:', error)
    return res.status(500).json({ error: 'Could not delete account. Try again.' })
  }
  return res.status(200).json({ ok: true })
}

export const config = { runtime: 'nodejs' }
