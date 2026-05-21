import { supabase } from '../../../lib/supabase.js'

// Append-only audit log writer. Safe to call from any feature surface.
// Kept after the consent-flow rework so existing call sites (player playback,
// settings deletion) continue to log every event.
export async function logAudit({ userId, actorId = null, event, refId = null, metadata = {} }) {
  if (!userId || !event) return { error: new Error('userId and event required') }
  const { error } = await supabase
    .from('voice_audit_log')
    .insert([{ user_id: userId, actor_id: actorId, event, ref_id: refId, metadata }])
  return { error }
}
