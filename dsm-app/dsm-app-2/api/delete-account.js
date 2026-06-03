// In-app account deletion (Apple App Store Guideline 5.1.1(v) requirement).
// Verifies the caller's JWT, then service-role-deletes their auth user.
// All per-user tables reference auth.users(id) ON DELETE CASCADE, so the
// profile + every row of their data is removed in one shot.

import { authGuard } from './_auth.js'

export default async function handler(req, res) {
  // No paywall gate — a locked/expired/trial user must still be able to delete.
  const auth = await authGuard(req, res)
  if (!auth.ok) return
  const { user, admin } = auth

  try {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[delete-account] deleteUser failed:', error)
      return res.status(500).json({ error: 'Could not delete account. Try again or email support.' })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[delete-account] error:', err)
    return res.status(500).json({ error: 'Could not delete account. Try again or email support.' })
  }
}

export const config = { runtime: 'nodejs' }
