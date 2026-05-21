// Vercel serverless — delete a single future_self_clips row + its storage object.
// Body: { userId, clipId, actorId? }   // actorId = parent UUID if a linked parent
//                                       //          is deleting on a minor's behalf
// Auth model: matches existing endpoints (trust the body). Service-role only.

import { createClient } from '@supabase/supabase-js'

const STORAGE_BUCKET = 'future-self-audio'

function err(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra })
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return err(res, 405, 'method', 'Method not allowed')

  const supaUrl = process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !supaKey) return err(res, 500, 'env', 'Supabase server credentials missing')

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return err(res, 400, 'bad_json', 'Invalid JSON') }

  const { userId, clipId, actorId } = body || {}
  if (!userId || !clipId) return err(res, 400, 'missing_field', 'userId and clipId required')

  const admin = createClient(supaUrl, supaKey)

  try {
    const { data: clip, error: readErr } = await admin
      .from('future_self_clips').select('*').eq('id', clipId).maybeSingle()
    if (readErr) return err(res, 500, 'db', 'Read failed', { detail: readErr.message })
    if (!clip) return err(res, 404, 'not_found', 'Clip not found')
    if (clip.user_id !== userId) return err(res, 403, 'forbidden', 'Clip does not belong to that user')

    if (clip.audio_url) {
      const { error: stErr } = await admin.storage.from(STORAGE_BUCKET).remove([clip.audio_url])
      if (stErr) console.warn('[delete-clip] storage remove failed:', stErr.message)
    }

    const { error: delErr } = await admin.from('future_self_clips').delete().eq('id', clipId)
    if (delErr) return err(res, 500, 'db', 'Delete failed', { detail: delErr.message })

    await admin.from('voice_audit_log').insert([{
      user_id: userId, actor_id: actorId || userId, event: 'clip_deleted', ref_id: clipId,
      metadata: { context: clip.context, audio_url: clip.audio_url },
    }])

    return res.status(200).json({ ok: true, clipId })
  } catch (e) {
    console.error('[api/future-self/delete-clip] error:', e)
    return err(res, 500, 'unhandled', 'Delete failed', { detail: e?.message })
  }
}

export const config = { runtime: 'nodejs' }
