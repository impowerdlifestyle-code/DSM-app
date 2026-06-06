// Vercel serverless — delete a single future_self_clips row + its storage object.
// Body: { clipId }
// Auth: requires Supabase JWT. Caller can only delete their own clips.
// (Parent-acting-on-behalf flow lives in a separate endpoint — TODO.)

import { authGuard } from '../_auth.js'

const STORAGE_BUCKET = 'future-self-audio'

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra })
}

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { requirePaidAccess: true })
  if (!auth.ok) return
  const { user, admin } = auth

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return err(res, 400, 'bad_json', 'Invalid JSON') }

  const { clipId } = body || {}
  if (!clipId) return err(res, 400, 'missing_field', 'clipId required')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clipId)) {
    return err(res, 400, 'bad_id', 'clipId must be a UUID')
  }

  try {
    const { data: clip, error: readErr } = await admin
      .from('future_self_clips').select('*').eq('id', clipId).maybeSingle()
    if (readErr) return err(res, 500, 'db', 'Read failed', { detail: readErr.message })
    if (!clip) return err(res, 404, 'not_found', 'Clip not found')
    if (clip.user_id !== user.id) return err(res, 403, 'forbidden', 'Clip does not belong to caller')

    if (clip.audio_url) {
      const { error: stErr } = await admin.storage.from(STORAGE_BUCKET).remove([clip.audio_url])
      if (stErr) console.warn('[delete-clip] storage remove failed:', stErr.message)
    }

    const { error: delErr } = await admin.from('future_self_clips').delete().eq('id', clipId)
    if (delErr) return err(res, 500, 'db', 'Delete failed', { detail: delErr.message })

    await admin.from('voice_audit_log').insert([{
      user_id: user.id, actor_id: user.id, event: 'clip_deleted', ref_id: clipId,
      metadata: { context: clip.context, audio_url: clip.audio_url },
    }])

    return res.status(200).json({ ok: true, clipId })
  } catch (e) {
    console.error('[api/future-self/delete-clip] error:', e)
    return err(res, 500, 'unhandled', 'Delete failed', { detail: e?.message })
  }
}

export const config = { runtime: 'nodejs' }
