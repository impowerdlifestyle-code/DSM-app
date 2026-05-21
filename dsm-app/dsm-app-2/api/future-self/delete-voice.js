// Vercel serverless — full voice-identity wipe.
//
// Pipeline:
//   1. Read voice_identity (must exist and not already deleted)
//   2. Call ElevenLabs DELETE /v1/voices/{voice_id} (best-effort; non-fatal)
//   3. Hard-delete every future_self_clips row for this user
//   4. List + remove every object under future-self-audio/{userId}/
//   5. Soft-delete voice_identity (deleted_at = now, null the voice_id)
//   6. Audit 'voice_deleted'
//
// Body: { userId, actorId? }

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

  const elevenKey = process.env.ELEVENLABS_API_KEY
  const supaUrl = process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !supaKey) return err(res, 500, 'env', 'Supabase server credentials missing')

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return err(res, 400, 'bad_json', 'Invalid JSON') }

  const { userId, actorId } = body || {}
  if (!userId) return err(res, 400, 'missing_user', 'userId required')

  const admin = createClient(supaUrl, supaKey)
  const events = { elevenlabs_deleted: false, clips_removed: 0, storage_removed: 0 }

  try {
    const { data: identity, error: idErr } = await admin
      .from('voice_identity').select('*').eq('user_id', userId).maybeSingle()
    if (idErr) return err(res, 500, 'db', 'Read failed', { detail: idErr.message })
    if (!identity || identity.deleted_at) {
      return err(res, 404, 'not_found', 'No active voice identity for this user')
    }

    // 1. ElevenLabs voice deletion (best-effort; deletion proceeds even on 404/network err)
    if (identity.elevenlabs_voice_id && elevenKey) {
      try {
        const r = await fetch(`https://api.elevenlabs.io/v1/voices/${identity.elevenlabs_voice_id}`, {
          method: 'DELETE',
          headers: { 'xi-api-key': elevenKey },
        })
        events.elevenlabs_deleted = r.ok
        if (!r.ok) console.warn('[delete-voice] ElevenLabs delete returned', r.status)
      } catch (e) {
        console.warn('[delete-voice] ElevenLabs delete threw:', e?.message)
      }
    }

    // 2. Hard-delete all clip rows (RLS bypassed via service role)
    const { data: removedClips, error: clipsErr } = await admin
      .from('future_self_clips').delete().eq('user_id', userId).select('id')
    if (clipsErr) console.warn('[delete-voice] clips delete failed:', clipsErr.message)
    else events.clips_removed = removedClips?.length || 0

    // 3. Storage cleanup — list + remove everything under {userId}/
    try {
      const allPaths = []
      const stack = ['']            // empty = root of {userId}/
      while (stack.length) {
        const sub = stack.pop()
        const prefix = sub ? `${userId}/${sub}` : `${userId}`
        const { data: entries } = await admin.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1000 })
        for (const entry of entries || []) {
          if (entry.id == null) {
            // folder
            stack.push(sub ? `${sub}/${entry.name}` : entry.name)
          } else {
            allPaths.push(sub ? `${userId}/${sub}/${entry.name}` : `${userId}/${entry.name}`)
          }
        }
      }
      if (allPaths.length) {
        const { error: rmErr } = await admin.storage.from(STORAGE_BUCKET).remove(allPaths)
        if (rmErr) console.warn('[delete-voice] storage remove failed:', rmErr.message)
        else events.storage_removed = allPaths.length
      }
    } catch (e) {
      console.warn('[delete-voice] storage walk failed:', e?.message)
    }

    // 4. Soft-delete identity row
    const { error: updErr } = await admin.from('voice_identity').update({
      deleted_at: new Date().toISOString(),
      elevenlabs_voice_id: null,
      source_sample_url: null,
    }).eq('user_id', userId)
    if (updErr) return err(res, 500, 'db', 'Soft-delete failed', { detail: updErr.message })

    // 5. Audit
    await admin.from('voice_audit_log').insert([{
      user_id: userId, actor_id: actorId || userId, event: 'voice_deleted',
      metadata: { ...events, elevenlabs_voice_id_was: identity.elevenlabs_voice_id },
    }])

    return res.status(200).json({ ok: true, ...events })
  } catch (e) {
    console.error('[api/future-self/delete-voice] error:', e)
    return err(res, 500, 'unhandled', 'Wipe failed', { detail: e?.message })
  }
}

export const config = { runtime: 'nodejs' }
