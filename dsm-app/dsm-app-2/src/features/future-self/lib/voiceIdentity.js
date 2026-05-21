import { supabase } from '../../../lib/supabase.js'

// Returns the active (not soft-deleted) voice_identity row for an athlete, or null.
export async function getVoiceIdentity(userId) {
  const { data, error } = await supabase
    .from('voice_identity')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  return { data, error }
}

// Records consent. Upserts the voice_identity row (consent always re-grants —
// updated_at is bumped by trigger). `consentingActorId` = self for adults,
// linking parent for minors. Also writes a 'consent_granted' audit event.
export async function recordConsent({ userId, consentingActorId }) {
  if (!userId || !consentingActorId) {
    return { data: null, error: new Error('userId and consentingActorId required') }
  }
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('voice_identity')
    .upsert({
      user_id: userId,
      consent_given_at: nowIso,
      consent_given_by: consentingActorId,
      deleted_at: null,
    }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) return { data: null, error }
  await logAudit({ userId, actorId: consentingActorId, event: 'consent_granted' })
  return { data, error: null }
}

// Append-only audit log writer. Safe to call from any feature surface.
export async function logAudit({ userId, actorId = null, event, refId = null, metadata = {} }) {
  if (!userId || !event) return { error: new Error('userId and event required') }
  const { error } = await supabase
    .from('voice_audit_log')
    .insert([{ user_id: userId, actor_id: actorId, event, ref_id: refId, metadata }])
  return { error }
}

// Pure helper — single source of truth for the minor gate. Treats unknown age
// as a minor to fail safe (consent must be explicit).
export function isMinor(profile) {
  const age = Number(profile?.age)
  if (!Number.isFinite(age)) return true
  return age < 13
}
