import { createClient } from '@supabase/supabase-js'
import { isNativeApp } from './platform'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── AUTH HELPERS ───────────────────────────────────────────
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  })
  return { data, error }
}

// ─── ACCESS GATE ─────────────────────────────────────────────
// Single source of truth for whether a logged-in user can use the app.
// Returns { ok, reason, trialDaysLeft }.
//   reason ∈ 'paid' | 'elite' | 'trial' | 'coach' | 'parent' | 'admin'
//          | 'trial-expired' | 'locked' | 'unknown'
export function evaluateAccess(profile) {
  // Native iOS/Android apps ship free — no paywall, no purchase (per Apple
  // 3.1.1; we don't sell digital access in the native build).
  if (isNativeApp()) return { ok: true, reason: 'native' }
  if (!profile) return { ok: false, reason: 'unknown' }
  if (profile.role === 'coach' || profile.role === 'parent' || profile.is_admin) {
    return { ok: true, reason: profile.is_admin ? 'admin' : profile.role }
  }
  const level = profile.access_level
  if (level === 'paid')            return { ok: true, reason: 'paid' }
  if (level === 'mentoring_elite') return { ok: true, reason: 'elite' }
  if (level === 'locked')          return { ok: false, reason: 'locked' }
  if (level === 'trial') {
    const ends = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
    if (!ends) return { ok: true, reason: 'trial', trialDaysLeft: null }
    const ms   = ends.getTime() - Date.now()
    const days = Math.ceil(ms / 86400000)
    if (ms > 0) return { ok: true, reason: 'trial', trialDaysLeft: days, trialEndsAt: ends }
    return { ok: false, reason: 'trial-expired', trialEndsAt: ends }
  }
  return { ok: false, reason: 'unknown' }
}

// ─── PROGRAM TRACK (age-based feature gates) ────────────────
// 'youth' = under 13 — workouts/body/nutrition/voice-journal/future-self HIDDEN.
// 'teen'  = 13+ — full program. Default 'teen' for unknown to avoid hiding things from real teens.
export function getProgramTrack(profile) {
  if (!profile) return 'teen'
  if (profile.program_track === 'youth' || profile.program_track === 'teen') return profile.program_track
  if (typeof profile.age === 'number') return profile.age >= 13 ? 'teen' : 'youth'
  return 'teen'
}

const YOUTH_GATED_SURFACES = new Set([
  'workouts', 'body', 'nutrition', 'voice', 'future',
])

export function isSurfaceAllowed(surface, profile) {
  if (getProgramTrack(profile) === 'youth' && YOUTH_GATED_SURFACES.has(surface)) return false
  return true
}

// ─── COPPA PARENT CONSENT ───────────────────────────────────
// Under-13 athletes can't use the app until a parent approves. The approval
// link lives at /?consent=<uuid>. Server endpoints validate the token via
// service-role and flip the status; the app reads the resulting profile
// state to decide whether to render the WaitingForParent gate.
export async function savePendingConsent(userId, parentEmail) {
  const email = (parentEmail || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { data: null, error: { message: 'Valid parent email required.' } }
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({
      parent_consent_required: true,
      parent_consent_email:    email,
      parent_consent_status:   'pending',
      access_level:            'locked',
      trial_ends_at:           null,
    })
    .eq('id', userId)
    .select('id, parent_consent_token, parent_consent_email, parent_consent_status')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Could not save consent state.' } }
  return { data, error: null }
}

export async function getProfileConsentInfo(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, age, parent_consent_required, parent_consent_email, parent_consent_status, parent_consent_token, parent_consent_sent_at, parent_consent_granted_at')
    .eq('id', userId)
    .maybeSingle()
  return { data, error }
}

export async function adminManualGrantConsent(userId) {
  // Admin escape hatch — used when parental consent was verified through
  // some other channel (in-person form, phone call, etc.).
  const { data, error } = await supabase
    .from('profiles')
    .update({
      parent_consent_status:   'granted',
      parent_consent_granted_at: new Date().toISOString(),
      access_level:            'trial',
      trial_ends_at:           new Date(Date.now() + 14 * 86400000).toISOString(),
    })
    .eq('id', userId)
    .select('id, parent_consent_status, access_level')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Update blocked by RLS — your account needs profiles.is_admin = true.' } }
  return { data, error: null }
}

export function buildConsentUrl(token, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://dsm-app-2.vercel.app')
  return `${base}/?consent=${token}`
}

export async function setProgramTrack(userId, track) {
  if (track !== 'youth' && track !== 'teen') {
    return { data: null, error: { message: 'track must be youth or teen' } }
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ program_track: track })
    .eq('id', userId)
    .select('id, program_track')
    .maybeSingle()
  if (error) return { data: null, error }
  // M7: a null row from update().select().maybeSingle() can mean either
  // (a) no matching profile, or (b) RLS blocked the write. Probe to
  // distinguish so the user-facing message is accurate (was always
  // claiming "needs is_admin = true" — misleading for athletes editing
  // their own track).
  if (!data) {
    const { data: exists } = await supabase
      .from('profiles').select('id').eq('id', userId).maybeSingle()
    if (!exists) return { data: null, error: { message: 'Profile not found for this user.' } }
    return { data: null, error: { message: 'Update blocked by RLS — try again or contact an admin.' } }
  }
  return { data, error: null }
}

// Removed: updateProfileAssignedCoach client write. Replaced by the signed
// /api/invite/redeem flow — the client can't directly set assigned_coach
// anymore (server enforces the HMAC + expiry on the invite token).

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// In-app account deletion (Apple 5.1.1(v)). Hits the JWT-gated endpoint that
// service-role-deletes the auth user; cascades remove all their data.
export async function deleteAccount() {
  const { authFetch } = await import('./authFetch.js')
  const res = await authFetch('/api/delete-account', { method: 'POST', body: '{}' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: new Error(body.error || `Delete failed (${res.status})`) }
  }
  await supabase.auth.signOut()
  return { error: null }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?reset=1`,
  })
  return { error }
}

// ─── ACTION STEPS ────────────────────────────────────────────
// M4 (verified 2026-05-24): column names below match the canonical
// action_steps schema after migrations 008_fix_recursion_and_columns
// (renames did_steps → did_action_steps) and 015_action_steps_columns_fix
// (renames *_comment → *_comments + adds visualization_*). The earlier
// drift between 001_schema.sql and 003_full_migration.sql is reconciled
// by those migrations. Audit M4 verification: see audit-findings memory.
export async function submitActionSteps(formData, userId) {
  const { data, error } = await supabase
    .from('action_steps')
    .insert([{
      user_id: userId,
      player_name: formData.playerName,
      session_type: formData.sessionType,
      date: formData.date,
      day_of_week: formData.dayOfWeek,
      did_action_steps: formData.didSteps,
      shark_used: formData.usedSteps.shark || false,
      shark_occasion: formData.occasions.shark || '',
      shark_comments: formData.comments.shark || '',
      goldfish_used: formData.usedSteps.goldfish || false,
      goldfish_occasion: formData.occasions.goldfish || '',
      goldfish_comments: formData.comments.goldfish || '',
      selftalk_used: formData.usedSteps.selftalk || false,
      selftalk_occasion: formData.occasions.selftalk || '',
      selftalk_comments: formData.comments.selftalk || '',
      tuneout_used: formData.usedSteps.tuneout || false,
      tuneout_occasion: formData.occasions.tuneout || '',
      tuneout_comments: formData.comments.tuneout || '',
      visualization_used: formData.usedSteps.visualization || false,
      visualization_occasion: formData.occasions.visualization || '',
      visualization_comments: formData.comments.visualization || '',
      conditioning: formData.conditioning,
      strength: formData.strength,
      technical: formData.technical,
      mental: formData.mental,
    }])
  return { data, error }
}

export async function getActionSteps(userId) {
  const { data, error } = await supabase
    .from('action_steps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getAllActionSteps() {
  const { data, error } = await supabase
    .from('action_steps')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
  return { data, error }
}

// ─── HABITS ──────────────────────────────────────────────────
// habits is one row per athlete (no week column) — the blob gets overwritten
// each save. Reverse-engineered from the live voxsrn- schema after the
// week-keyed writes were silently rejecting for every athlete.
export async function saveHabits(userId, habits) {
  const { data, error } = await supabase
    .from('habits')
    .upsert([{ user_id: userId, habits: JSON.stringify(habits), updated_at: new Date().toISOString() }], { onConflict: 'user_id' })
  return { data, error }
}

export async function getHabits(userId) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}

// ─── STREAKS ─────────────────────────────────────────────────
export async function getStreak(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('streak, last_logged')
    .eq('id', userId)
    .maybeSingle()
  return { data, error }
}

export async function logDay(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: profile, error: readErr } = await supabase
    .from('profiles').select('streak, last_logged').eq('id', userId).maybeSingle()
  if (readErr) return { streak: null, error: readErr }
  if (!profile) return { streak: null, error: { message: 'No profile row to update' } }
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  let newStreak = 1
  if (profile.last_logged === yesterday) newStreak = (profile.streak || 0) + 1
  else if (profile.last_logged === today) return { streak: profile.streak }
  const { error } = await supabase.from('profiles').update({ streak: newStreak, last_logged: today }).eq('id', userId)
  return { streak: newStreak, error }
}

// ─── PROFILES ────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return { data, error }
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('streak', { ascending: false })
  return { data, error }
}

export async function updateAccessLevel(userId, level) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ access_level: level })
    .eq('id', userId)
  return { data, error }
}

// ─── CHAT HISTORY (Coach V) ──────────────────────────────────
export async function saveChatMessage(userId, role, content) {
  const { data, error } = await supabase
    .from('chat_history')
    .insert([{ user_id: userId, role, content }])
    .select()
    .single()
  return { data, error }
}

export async function getChatHistory(userId, limit = 50) {
  // Pull the newest N messages, then reverse so callers still get
  // chronological order (oldest → newest) for normal chat rendering.
  const { data, error } = await supabase
    .from('chat_history')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data: (data || []).reverse(), error }
}

// ─── COACH MEMORY (per-user persistent summary) ──────────────
export async function getCoachMemory(userId) {
  const { data, error } = await supabase
    .from('coach_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}

export async function bumpMessagesSinceConsolidation(userId) {
  // Atomic via Postgres RPC (migrations/022_bump_consolidation_rpc.sql).
  // Was a read-then-upsert that lost increments under concurrent Coach V
  // message saves (H1 fix from 2026-05-21 audit).
  const { data, error } = await supabase
    .rpc('bump_messages_since_consolidation', { p_user_id: userId })
  return { data, error, newCount: typeof data === 'number' ? data : null }
}

export async function consolidateCoachMemory(userId, newSummary, themes = null) {
  const payload = {
    user_id: userId,
    athlete_summary: newSummary,
    messages_since_consolidation: 0,
    last_consolidated: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (themes && typeof themes === 'object') payload.themes = themes
  const { data, error } = await supabase
    .from('coach_memory')
    .upsert(payload, { onConflict: 'user_id' })
  return { data, error }
}

export async function updateCoachMemoryThemes(userId, themes) {
  const { data, error } = await supabase
    .from('coach_memory')
    .upsert({
      user_id: userId,
      themes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  return { data, error }
}

// ─── SQUADS ──────────────────────────────────────────────────
// Uses crypto.getRandomValues — Math.random is predictable and inadequate
// for security-relevant codes (M1 from 2026-05-21 audit).
function randomInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[buf[i] % chars.length]
  return s
}

export async function createSquad(userId, name) {
  let code = randomInviteCode()
  for (let i = 0; i < 5; i++) {
    const { data: hit } = await supabase.from('squads').select('id').eq('invite_code', code).maybeSingle()
    if (!hit) break
    code = randomInviteCode()
  }
  const { data: squad, error } = await supabase
    .from('squads')
    .insert([{ name, invite_code: code, created_by: userId }])
    .select()
    .single()
  if (error) return { data: null, error }
  await supabase.from('squad_members').insert([{ squad_id: squad.id, user_id: userId }])
  return { data: squad, error: null }
}

export async function joinSquadByCode(userId, code) {
  const cleaned = String(code || '').trim().toUpperCase()
  const { data: squad, error: sqErr } = await supabase
    .from('squads')
    .select('*')
    .eq('invite_code', cleaned)
    .maybeSingle()
  if (sqErr || !squad) return { data: null, error: sqErr || new Error('Squad code not found') }
  const { error: memErr } = await supabase
    .from('squad_members')
    .upsert({ squad_id: squad.id, user_id: userId }, { onConflict: 'squad_id,user_id' })
  if (memErr) return { data: null, error: memErr }
  return { data: squad, error: null }
}

export async function getMySquads(userId) {
  const { data: memberships, error } = await supabase
    .from('squad_members')
    .select('squad_id, joined_at, squads(*)')
    .eq('user_id', userId)
  if (error) return { data: [], error }
  return { data: (memberships || []).map(m => ({ ...m.squads, joined_at: m.joined_at })), error: null }
}

export async function leaveSquad(userId, squadId) {
  const { data, error } = await supabase
    .from('squad_members')
    .delete()
    .eq('squad_id', squadId)
    .eq('user_id', userId)
  return { data, error }
}

export async function getSquadLeaderboard(squadId) {
  const { data: members } = await supabase
    .from('squad_members')
    .select('user_id, profiles(id, full_name, email, streak)')
    .eq('squad_id', squadId)
  if (!members?.length) return { data: [], error: null }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const rows = await Promise.all(members.map(async (m) => {
    const profile = m.profiles || {}
    const { data: xpRows } = await supabase
      .from('xp_log')
      .select('xp')
      .eq('user_id', m.user_id)
      .gte('created_at', weekStart.toISOString())
    const weeklyXp = (xpRows || []).reduce((a, r) => a + (r.xp || 0), 0)
    const { data: allXp } = await supabase
      .from('xp_log')
      .select('xp')
      .eq('user_id', m.user_id)
    const totalXp = (allXp || []).reduce((a, r) => a + (r.xp || 0), 0)
    return {
      user_id: m.user_id,
      full_name: profile.full_name || profile.email || 'Athlete',
      streak: profile.streak || 0,
      weeklyXp,
      totalXp,
    }
  }))
  rows.sort((a, b) => b.weeklyXp - a.weeklyXp || b.totalXp - a.totalXp)
  return { data: rows, error: null }
}

// ─── COACH NUDGES ────────────────────────────────────────────
export async function getActiveNudge(userId) {
  const { data, error } = await supabase
    .from('coach_nudges')
    .select('*')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { data, error }
}

export async function getRecentNudges(userId, limit = 10) {
  const { data, error } = await supabase
    .from('coach_nudges')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}

export async function createNudge(userId, { kind, message, signal }) {
  const { data, error } = await supabase
    .from('coach_nudges')
    .insert([{ user_id: userId, kind, message, signal, shown_at: new Date().toISOString() }])
    .select()
    .single()
  return { data, error }
}

// M10: prefer the server-clock RPC (migration 024) so timestamps are
// consistent regardless of device clock. Falls back to a direct client-clock
// update if the RPC isn't applied yet, so this is safe either way.
export async function dismissNudge(nudgeId) {
  const { data, error } = await supabase.rpc('dismiss_nudge', { p_nudge_id: nudgeId, p_acted: false })
  if (!error) return { data, error: null }
  return supabase.from('coach_nudges').update({ dismissed_at: new Date().toISOString() }).eq('id', nudgeId)
}

export async function markNudgeActedOn(nudgeId) {
  const { data, error } = await supabase.rpc('dismiss_nudge', { p_nudge_id: nudgeId, p_acted: true })
  if (!error) return { data, error: null }
  return supabase.from('coach_nudges')
    .update({ acted_on_at: new Date().toISOString(), dismissed_at: new Date().toISOString() })
    .eq('id', nudgeId)
}

export async function nudgeCreatedToday(userId) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  // L11: surface RLS denials. The old code dropped { error } and treated
  // count=null as "no nudge today", which triggered another nudge insert
  // every page load when RLS was misconfigured.
  const { count, error } = await supabase
    .from('coach_nudges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
  if (error) {
    console.warn('[nudgeCreatedToday] count failed — assuming created to avoid duplicate nudge spam:', error.message)
    return true
  }
  return (count || 0) > 0
}

// ─── LOCKER ROOM NOTES (admin/coach) ─────────────────────────
export async function getLockerRoomNotes(athleteId) {
  const { data, error } = await supabase
    .from('locker_room_notes')
    .select('*, profiles!locker_room_notes_author_id_fkey(full_name, email)')
    .eq('athlete_id', athleteId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function addLockerRoomNote(authorId, athleteId, note, pinned = false) {
  const { data, error } = await supabase
    .from('locker_room_notes')
    .insert([{ author_id: authorId, athlete_id: athleteId, note, pinned }])
    .select()
    .single()
  return { data, error }
}

export async function deleteLockerRoomNote(noteId) {
  const { error } = await supabase.from('locker_room_notes').delete().eq('id', noteId)
  return { error }
}

// ─── LOCKER ROOM AGGREGATOR ──────────────────────────────────
// Pulls EVERYTHING about an athlete in one shot. Used by both the athlete's
// own Locker Room tab and the admin dashboard.
export async function getLockerRoomData(athleteId, { isAdmin = false } = {}) {
  // Each query is per-query-tolerant: a missing table, RLS denial, or schema
  // drift on any one source degrades that section to empty instead of blowing
  // up the whole locker room load. The `console.warn` calls also feed
  // BugReporter's consoleBuffer ring (see components/BugReporter.jsx), so
  // when users submit a bug report the failed table names ride along (M11).
  const safe = (label, p) => p.then(
    r => (r?.error ? (console.warn(`[locker] ${label}:`, r.error.message), { data: r.data ?? null }) : r),
  ).catch(err => { console.warn(`[locker] ${label}:`, err?.message || err); return { data: null } })

  const [
    profileRes, memoryRes, actionRes, ballRes, checkinRes, voiceRes,
    chatRes, workoutRes, foodRes, bodyRes, xpRes, badgeRes, nudgeRes,
    squadRes, notesRes, questRes, matchRes,
    habitsRes, futureSelfRes, nutritionTgtRes, feedbackRes, parentsRes,
    recapsRes,
  ] = await Promise.all([
    safe('profiles',        supabase.from('profiles').select('*').eq('id', athleteId).maybeSingle()),
    safe('coach_memory',    supabase.from('coach_memory').select('*').eq('user_id', athleteId).maybeSingle()),
    safe('action_steps',    supabase.from('action_steps').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(20)),
    safe('ball_mastery',    supabase.from('ball_mastery').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(20)),
    safe('weekly_checkins', supabase.from('weekly_checkins').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(10)),
    safe('voice_journal',   supabase.from('voice_journal').select('*').eq('user_id', athleteId).order('recorded_at', { ascending: false }).limit(20)),
    safe('chat_history',    supabase.from('chat_history').select('id, role, content, created_at').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(30)),
    safe('workouts_log',    supabase.from('workouts_log').select('*').eq('user_id', athleteId).order('completed_at', { ascending: false }).limit(15)),
    safe('food_log',        supabase.from('food_log').select('*').eq('user_id', athleteId).order('logged_at', { ascending: false }).limit(20)),
    safe('body_stats',      supabase.from('body_stats').select('*').eq('user_id', athleteId).order('measured_at', { ascending: false }).limit(15)),
    safe('xp_log',          supabase.from('xp_log').select('xp, source, created_at').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(50)),
    safe('badges_earned',   supabase.from('badges_earned').select('badge_id, earned_at').eq('user_id', athleteId)),
    safe('coach_nudges',    supabase.from('coach_nudges').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(15)),
    safe('squad_members',   supabase.from('squad_members').select('squad_id, joined_at, squads(*)').eq('user_id', athleteId)),
    isAdmin ? safe('locker_room_notes', supabase.from('locker_room_notes').select('*, profiles!locker_room_notes_author_id_fkey(full_name, email)').eq('athlete_id', athleteId).order('pinned', { ascending: false }).order('created_at', { ascending: false })) : Promise.resolve({ data: [] }),
    safe('daily_quests',    supabase.from('daily_quests').select('*').eq('user_id', athleteId).order('quest_date', { ascending: false }).limit(30)),
    safe('match_log',       supabase.from('match_log').select('*').eq('user_id', athleteId).order('match_date', { ascending: false }).limit(20)),
    safe('habits',          supabase.from('habits').select('*').eq('user_id', athleteId).maybeSingle()),
    safe('future_self_checkins', supabase.from('future_self_checkins').select('*').eq('user_id', athleteId).order('month', { ascending: false }).limit(12)),
    safe('nutrition_targets', supabase.from('nutrition_targets').select('*').eq('user_id', athleteId).maybeSingle()),
    safe('message_feedback', supabase.from('message_feedback').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(30)),
    isAdmin
      ? safe('parent_links', supabase.from('parent_links').select('parent_id, created_at, profiles!parent_links_parent_id_fkey(full_name, email)').eq('athlete_id', athleteId))
      : Promise.resolve({ data: [] }),
    safe('recap_log',       supabase.from('recap_log')
      .select('id, week_key, highlights, created_at, sent_at')
      .eq('user_id', athleteId).eq('audience', 'athlete')
      .order('created_at', { ascending: false }).limit(12)),
  ])

  // Progress photos need signed URLs — fetch separately so failures don't block the rest.
  let photos = []
  try {
    const { data: photoRows } = await supabase
      .from('progress_photos').select('*').eq('user_id', athleteId)
      .order('taken_at', { ascending: false }).limit(12)
    photos = await Promise.all((photoRows || []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(p.storage_path, 3600)
      return { ...p, url: signed?.signedUrl || null }
    }))
  } catch { /* progress-photos bucket may not exist yet; skip silently */ }

  const totalXp = (xpRes.data || []).reduce((a, r) => a + (r.xp || 0), 0)
  return {
    profile:    profileRes.data,
    memory:     memoryRes.data,
    actionSteps: actionRes.data || [],
    ballMastery: ballRes.data || [],
    checkins:   checkinRes.data || [],
    voiceJournal: voiceRes.data || [],
    chat:       (chatRes.data || []).reverse(),
    workouts:   workoutRes.data || [],
    food:       foodRes.data || [],
    body:       bodyRes.data || [],
    xpRows:     xpRes.data || [],
    totalXp,
    badges:     badgeRes.data || [],
    nudges:     nudgeRes.data || [],
    squads:     (squadRes.data || []).map(m => ({ ...m.squads, joined_at: m.joined_at })),
    notes:      notesRes.data || [],
    dailyQuests: questRes.data || [],
    matches:    matchRes.data || [],
    habits:     habitsRes.data || null,
    futureSelf: futureSelfRes.data || [],
    nutritionTargets: nutritionTgtRes.data || null,
    messageFeedback: feedbackRes.data || [],
    parents:    parentsRes.data || [],
    photos,
    recaps:     recapsRes.data || [],
  }
}

// ─── ADMIN: list all athletes with quick stats ───────────────
export async function getAdminAthleteList() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, access_level, streak, last_logged, program_week, created_at, assigned_coach, coach_tier, program_track, age, parent_consent_required, parent_consent_status, parent_consent_email, parent_consent_token')
    .order('created_at', { ascending: false })
  if (!profiles) return { data: [], error: null }

  const enriched = await Promise.all(profiles.map(async (p) => {
    const [actionCnt, voiceCnt, lastChat, xpRows] = await Promise.all([
      supabase.from('action_steps').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
      supabase.from('voice_journal').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
      supabase.from('chat_history').select('created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('xp_log').select('xp').eq('user_id', p.id),
    ])
    const totalXp = (xpRows.data || []).reduce((a, r) => a + (r.xp || 0), 0)
    return {
      ...p,
      actionCount: actionCnt.count || 0,
      voiceCount:  voiceCnt.count || 0,
      lastChatAt:  lastChat.data?.created_at || null,
      totalXp,
    }
  }))
  return { data: enriched, error: null }
}

// ─── ADMIN: COACHES ──────────────────────────────────────────
export async function assignCoachToAthlete(athleteId, coachLabel) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ assigned_coach: coachLabel })
    .eq('id', athleteId)
    .select('id, assigned_coach')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Update blocked by RLS — your account needs profiles.is_admin = true.' } }
  return { data, error: null }
}

export async function unassignAthleteCoach(athleteId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ assigned_coach: null })
    .eq('id', athleteId)
    .select('id')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Update blocked by RLS — your account needs profiles.is_admin = true.' } }
  return { data, error: null }
}

export async function promoteUserToCoach(email) {
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized) return { data: null, error: { message: 'Email is required' } }
  const { data: existing, error: lookupErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .ilike('email', normalized)
    .maybeSingle()
  if (lookupErr) return { data: null, error: lookupErr }
  if (!existing) {
    return { data: null, error: { message: `No account found for ${normalized}. Have them sign up first.` } }
  }
  if (existing.role === 'coach') return { data: existing, error: null }
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'coach' })
    .eq('id', existing.id)
    .select('id, email, full_name, role')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Update blocked by RLS — your account needs profiles.is_admin = true.' } }
  return { data, error: null }
}

export async function demoteCoach(coachId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'athlete', coach_tier: null })
    .eq('id', coachId)
    .select('id, role')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Update blocked by RLS — your account needs profiles.is_admin = true.' } }
  return { data, error: null }
}

export async function setCoachTier(coachId, tier) {
  const value = tier === null || tier === '' ? null : Number(tier)
  const { data, error } = await supabase
    .from('profiles')
    .update({ coach_tier: value })
    .eq('id', coachId)
    .select('id, coach_tier')
    .maybeSingle()
  if (error) return { data: null, error }
  if (!data)  return { data: null, error: { message: 'Update blocked by RLS — your account needs profiles.is_admin = true.' } }
  return { data, error: null }
}

// ─── ADMIN: COACH TASKS ──────────────────────────────────────
export async function createCoachTask({ athleteId, assignedBy, title, description, dueDate, priority }) {
  const { data, error } = await supabase
    .from('coach_tasks')
    .insert([{
      athlete_id:  athleteId,
      assigned_by: assignedBy,
      title:       (title || '').trim(),
      description: (description || '').trim() || null,
      due_date:    dueDate || null,
      priority:    priority || 'medium',
    }])
    .select()
    .single()
  return { data, error }
}

export async function getAthleteTasks(athleteId, { status } = {}) {
  let q = supabase.from('coach_tasks')
    .select('*, assigner:profiles!coach_tasks_assigned_by_fkey(full_name, email)')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  return { data: data || [], error }
}

export async function getMyOpenTasks(userId) {
  const { data, error } = await supabase
    .from('coach_tasks')
    .select('*')
    .eq('athlete_id', userId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function markCoachTaskDone(taskId) {
  const { data, error } = await supabase
    .from('coach_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  return { data, error }
}

export async function deleteCoachTask(taskId) {
  const { error } = await supabase.from('coach_tasks').delete().eq('id', taskId)
  return { error }
}

// ─── ADMIN: COACHING GROUPS ──────────────────────────────────
export async function listCoachingGroups() {
  const { data, error } = await supabase
    .from('coaching_groups')
    .select('id, name, description, lead_coach_id, created_at, join_code, lead:profiles!coaching_groups_lead_coach_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createCoachingGroup({ name, description, leadCoachId }) {
  let code = randomInviteCode()
  for (let i = 0; i < 5; i++) {
    const { data: hit } = await supabase.from('coaching_groups').select('id').eq('join_code', code).maybeSingle()
    if (!hit) break
    code = randomInviteCode()
  }
  const { data, error } = await supabase
    .from('coaching_groups')
    .insert([{
      name:          (name || '').trim(),
      description:   (description || '').trim() || null,
      lead_coach_id: leadCoachId,
      join_code:     code,
    }])
    .select()
    .single()
  return { data, error }
}

// Athlete self-joins a coaching group with the coach's 6-char code.
export async function joinGroupByCode(code) {
  const { data, error } = await supabase.rpc('join_coaching_group', { p_code: String(code || '').trim().toUpperCase() })
  return { data, error }
}

// Coach assigns one activity to every athlete member of a group (bulk tasks).
export async function assignActivityToGroup({ groupId, assignedBy, title, description, dueDate, priority }) {
  const { data: members } = await supabase
    .from('coaching_group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('role_in_group', 'athlete')
  const ids = (members || []).map(m => m.user_id)
  if (!ids.length) return { data: { count: 0 }, error: null }
  const rows = ids.map(id => ({
    athlete_id: id, assigned_by: assignedBy,
    title: (title || '').trim(), description: (description || '').trim() || null,
    due_date: dueDate || null, priority: priority || 'medium',
  }))
  const { error } = await supabase.from('coach_tasks').insert(rows)
  return { data: { count: ids.length }, error }
}

// Per-day activity counts for an athlete over the last `days` days.
// Returns [{ date:'YYYY-MM-DD', count, parts:{action,ball,checkin,voice,coach,task} }] oldest→newest.
export async function getPlayerDailyActivity(athleteId, days = 28) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const day = (iso) => (iso || '').slice(0, 10)
  const [actions, ball, checkins, voice, chat, tasks] = await Promise.all([
    supabase.from('action_steps').select('created_at').eq('user_id', athleteId).gte('created_at', since),
    supabase.from('ball_mastery').select('created_at').eq('user_id', athleteId).gte('created_at', since),
    supabase.from('weekly_checkins').select('created_at').eq('user_id', athleteId).gte('created_at', since),
    supabase.from('voice_journal').select('created_at').eq('user_id', athleteId).gte('created_at', since),
    supabase.from('chat_history').select('created_at').eq('user_id', athleteId).eq('role', 'user').gte('created_at', since),
    supabase.from('coach_tasks').select('completed_at').eq('athlete_id', athleteId).not('completed_at', 'is', null).gte('completed_at', since),
  ])
  const map = new Map()
  const bump = (iso, key) => {
    const d = day(iso); if (!d) return
    if (!map.has(d)) map.set(d, { date: d, count: 0, parts: { action: 0, ball: 0, checkin: 0, voice: 0, coach: 0, task: 0 } })
    const e = map.get(d); e.count++; e.parts[key]++
  }
  for (const r of (actions.data  || [])) bump(r.created_at, 'action')
  for (const r of (ball.data     || [])) bump(r.created_at, 'ball')
  for (const r of (checkins.data || [])) bump(r.created_at, 'checkin')
  for (const r of (voice.data    || [])) bump(r.created_at, 'voice')
  for (const r of (chat.data     || [])) bump(r.created_at, 'coach')
  for (const r of (tasks.data    || [])) bump(r.completed_at, 'task')

  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    out.push(map.get(d) || { date: d, count: 0, parts: { action: 0, ball: 0, checkin: 0, voice: 0, coach: 0, task: 0 } })
  }
  return { data: out, error: null }
}

export async function deleteCoachingGroup(groupId) {
  const { error } = await supabase.from('coaching_groups').delete().eq('id', groupId)
  return { error }
}

export async function listGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('coaching_group_members')
    .select('group_id, user_id, role_in_group, added_at, user:profiles!coaching_group_members_user_id_fkey(id, full_name, email, role)')
    .eq('group_id', groupId)
  return { data: data || [], error }
}

export async function addGroupMember(groupId, userId, roleInGroup = 'athlete') {
  const { data, error } = await supabase
    .from('coaching_group_members')
    .insert([{ group_id: groupId, user_id: userId, role_in_group: roleInGroup }])
    .select()
    .single()
  return { data, error }
}

export async function removeGroupMember(groupId, userId) {
  const { error } = await supabase
    .from('coaching_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  return { error }
}

// ─── GROUP CHAT + MEMBER-FACING GROUPS ───────────────────────
// Groups the signed-in user belongs to (athlete or coach-member).
export async function getMyGroups(userId) {
  const { data, error } = await supabase
    .from('coaching_group_members')
    .select('role_in_group, group:coaching_groups!coaching_group_members_group_id_fkey(id, name, description, lead_coach_id)')
    .eq('user_id', userId)
  const groups = (data || [])
    .filter(r => r.group)
    .map(r => ({ ...r.group, role_in_group: r.role_in_group }))
  return { data: groups, error }
}

export async function getGroupMessages(groupId, limit = 120) {
  const { data, error } = await supabase
    .from('group_messages')
    .select('id, group_id, user_id, body, created_at, sender:profiles!group_messages_user_id_fkey(full_name, role)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data: (data || []).reverse(), error }
}

export async function sendGroupMessage(groupId, userId, body) {
  const clean = (body || '').trim().slice(0, 2000)
  if (!clean) return { data: null, error: { message: 'empty message' } }
  const { data, error } = await supabase
    .from('group_messages')
    .insert([{ group_id: groupId, user_id: userId, body: clean }])
    .select('id, created_at')
    .maybeSingle()
  return { data, error }
}

export async function deleteGroupMessage(messageId) {
  const { error } = await supabase.from('group_messages').delete().eq('id', messageId)
  return { error }
}

// ─── UGC MODERATION (report / block / EULA) ──────────────────
export async function reportMessage(reporterId, { messageId, groupId, reportedUserId, messageText, reason }) {
  const { error } = await supabase.from('message_reports').insert([{
    message_id: messageId, group_id: groupId, reporter_id: reporterId,
    reported_user_id: reportedUserId || null, message_text: (messageText || '').slice(0, 2000),
    reason: reason || null,
  }])
  return { error }
}

export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from('user_blocks')
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
  return { error }
}

export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
  return { error }
}

export async function getMyBlocks(userId) {
  const { data } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId)
  return new Set((data || []).map(r => r.blocked_id))
}

export async function getGroupReports(groupId) {
  const { data, error } = await supabase.from('message_reports')
    .select('id, message_id, reported_user_id, message_text, reason, status, created_at, reporter:profiles!message_reports_reporter_id_fkey(full_name), reported:profiles!message_reports_reported_user_id_fkey(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function resolveReport(reportId, status, reviewerId) {
  const { error } = await supabase.from('message_reports')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', reportId)
  return { error }
}

export async function acceptTerms(userId) {
  const { error } = await supabase.from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('id', userId)
  return { error }
}

// Activity feed scoped to one group's athlete members. Mirrors getRecentActivity.
export async function getGroupActivity(groupId, { limit = 60 } = {}) {
  const { data: members } = await supabase
    .from('coaching_group_members')
    .select('user_id, role_in_group, user:profiles!coaching_group_members_user_id_fkey(id, full_name, email)')
    .eq('group_id', groupId)
  const athletes = (members || []).filter(m => m.role_in_group === 'athlete')
  const ids = athletes.map(m => m.user_id)
  if (!ids.length) return { data: [], error: null }
  const nameById = new Map(athletes.map(m => [m.user_id, m.user?.full_name || m.user?.email || 'Athlete']))
  const nameFor = (id) => nameById.get(id) || 'Athlete'

  const [actions, checkins, voice, chat, tasks] = await Promise.all([
    supabase.from('action_steps').select('id, user_id, created_at, mental').in('user_id', ids).order('created_at', { ascending: false }).limit(limit),
    supabase.from('weekly_checkins').select('id, user_id, created_at, mood, week_number').in('user_id', ids).order('created_at', { ascending: false }).limit(limit),
    supabase.from('voice_journal').select('id, user_id, created_at, title').in('user_id', ids).order('created_at', { ascending: false }).limit(limit),
    supabase.from('chat_history').select('id, user_id, created_at, role').in('user_id', ids).eq('role', 'user').order('created_at', { ascending: false }).limit(limit),
    supabase.from('coach_tasks').select('id, athlete_id, created_at, completed_at, status, title').in('athlete_id', ids).order('completed_at', { ascending: false, nullsFirst: false }).limit(limit),
  ])

  const events = []
  for (const r of (actions.data  || [])) events.push({ id: `as-${r.id}`, at: r.created_at, athleteId: r.user_id, athlete: nameFor(r.user_id), kind: 'action_step', summary: `Logged action step · mental ${r.mental ?? '—'}` })
  for (const r of (checkins.data || [])) events.push({ id: `ck-${r.id}`, at: r.created_at, athleteId: r.user_id, athlete: nameFor(r.user_id), kind: 'checkin',     summary: `Weekly check-in · mood ${r.mood ?? '—'} · wk ${r.week_number ?? '—'}` })
  for (const r of (voice.data    || [])) events.push({ id: `vj-${r.id}`, at: r.created_at, athleteId: r.user_id, athlete: nameFor(r.user_id), kind: 'voice',       summary: `Voice journal · ${r.title || 'untitled'}` })
  for (const r of (chat.data     || [])) events.push({ id: `ch-${r.id}`, at: r.created_at, athleteId: r.user_id, athlete: nameFor(r.user_id), kind: 'chat',        summary: 'Messaged Coach V' })
  for (const r of (tasks.data    || [])) { if (r.completed_at) events.push({ id: `tk-${r.id}`, at: r.completed_at, athleteId: r.athlete_id, athlete: nameFor(r.athlete_id), kind: 'task_done', summary: `Completed task · ${r.title}` }) }
  events.sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  return { data: events.slice(0, limit), error: null }
}

// ─── ADMIN: RECENT ACTIVITY (coached athletes only) ──────────
export async function getRecentActivity({ limit = 60 } = {}) {
  const { data: coached } = await supabase
    .from('profiles')
    .select('id, full_name, email, assigned_coach')
    .not('assigned_coach', 'is', null)
  const { data: groupMembers } = await supabase
    .from('coaching_group_members')
    .select('user_id')
    .eq('role_in_group', 'athlete')

  const coachedById = new Map()
  for (const p of (coached || [])) coachedById.set(p.id, p)
  if (groupMembers) {
    const extraIds = groupMembers.map(m => m.user_id).filter(id => !coachedById.has(id))
    if (extraIds.length) {
      const { data: extras } = await supabase
        .from('profiles')
        .select('id, full_name, email, assigned_coach')
        .in('id', extraIds)
      for (const p of (extras || [])) coachedById.set(p.id, p)
    }
  }
  const ids = [...coachedById.keys()]
  if (!ids.length) return { data: [], error: null }

  const [actions, checkins, voice, chat, tasks] = await Promise.all([
    supabase.from('action_steps')
      .select('id, user_id, created_at, did_action_steps, mental, date')
      .in('user_id', ids)
      .order('created_at', { ascending: false }).limit(limit),
    supabase.from('weekly_checkins')
      .select('id, user_id, created_at, mood, week_number')
      .in('user_id', ids)
      .order('created_at', { ascending: false }).limit(limit),
    supabase.from('voice_journal')
      .select('id, user_id, created_at, title')
      .in('user_id', ids)
      .order('created_at', { ascending: false }).limit(limit),
    supabase.from('chat_history')
      .select('id, user_id, created_at, role')
      .in('user_id', ids)
      .eq('role', 'user')
      .order('created_at', { ascending: false }).limit(limit),
    supabase.from('coach_tasks')
      .select('id, athlete_id, created_at, completed_at, status, title')
      .in('athlete_id', ids)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(limit),
  ])

  const events = []
  const nameFor = (id) => {
    const p = coachedById.get(id)
    return p?.full_name || p?.email || 'Athlete'
  }
  const coachFor = (id) => coachedById.get(id)?.assigned_coach || null

  for (const r of (actions.data   || [])) events.push({ id: `as-${r.id}`,  at: r.created_at, athleteId: r.user_id,  athlete: nameFor(r.user_id),  coach: coachFor(r.user_id),  kind: 'action_step', summary: `Logged action step · mental ${r.mental ?? '—'}` })
  for (const r of (checkins.data  || [])) events.push({ id: `ck-${r.id}`,  at: r.created_at, athleteId: r.user_id,  athlete: nameFor(r.user_id),  coach: coachFor(r.user_id),  kind: 'checkin',     summary: `Weekly check-in · mood ${r.mood ?? '—'} · wk ${r.week_number ?? '—'}` })
  for (const r of (voice.data     || [])) events.push({ id: `vj-${r.id}`,  at: r.created_at, athleteId: r.user_id,  athlete: nameFor(r.user_id),  coach: coachFor(r.user_id),  kind: 'voice',       summary: `Voice journal · ${r.title || 'untitled'}` })
  for (const r of (chat.data      || [])) events.push({ id: `ch-${r.id}`,  at: r.created_at, athleteId: r.user_id,  athlete: nameFor(r.user_id),  coach: coachFor(r.user_id),  kind: 'chat',        summary: 'Messaged Coach V' })
  for (const r of (tasks.data     || [])) {
    if (r.completed_at) events.push({ id: `tk-${r.id}`, at: r.completed_at, athleteId: r.athlete_id, athlete: nameFor(r.athlete_id), coach: coachFor(r.athlete_id), kind: 'task_done', summary: `Completed task · ${r.title}` })
  }

  events.sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  return { data: events.slice(0, limit), error: null }
}

// ─── MESSAGE FEEDBACK (👍/👎) ────────────────────────────────
export async function rateMessage(userId, messageId, rating, note = null) {
  const { data, error } = await supabase
    .from('message_feedback')
    .upsert(
      { user_id: userId, message_id: messageId, rating, note },
      { onConflict: 'user_id,message_id' }
    )
    .select()
    .single()
  return { data, error }
}

export async function getRecentFeedback(userId, limit = 20) {
  const { data, error } = await supabase
    .from('message_feedback')
    .select('message_id, rating, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}

// ─── VOICE JOURNAL ───────────────────────────────────────────
export async function saveVoiceJournal(userId, entry) {
  const { data, error } = await supabase
    .from('voice_journal')
    .insert([{
      user_id: userId,
      title: entry.title || null,
      transcript: entry.transcript,
      cues: entry.cues || [],
      sentiment: entry.sentiment || null,
      ai_note: entry.aiNote || entry.ai_note || null,
      duration_seconds: entry.duration || entry.duration_seconds || null,
    }])
    .select()
    .single()
  return { data, error }
}

export async function getVoiceJournalHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('voice_journal')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}

// ─── ATHLETE STATE DIGEST (for AI prompt injection) ──────────
// Pulls a snapshot of everything Coach V should know about this athlete
// right now: profile, recent actions, ball mastery, last check-in, voice journal.
export async function getAthleteStateDigest(userId) {
  const [profileRes, actionRes, ballRes, checkinRes, journalRes, matchRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('action_steps').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
    supabase.from('ball_mastery').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
    supabase.from('weekly_checkins').select('*').eq('user_id', userId).order('week', { ascending: false }).limit(1),
    supabase.from('voice_journal').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(3),
    supabase.from('match_log').select('*').eq('user_id', userId).not('post_logged_at', 'is', null).order('match_date', { ascending: false }).limit(5),
  ])
  return {
    profile: profileRes.data,
    recentActionSteps: actionRes.data || [],
    recentBallMastery: ballRes.data || [],
    lastCheckin: checkinRes.data?.[0],
    recentJournal: journalRes.data || [],
    recentMatches: matchRes.data || [],
  }
}

// ─── XP / GAMIFICATION ───────────────────────────────────────
export async function awardXp(userId, source, xp, refId = null, note = null) {
  if (!userId || !xp) return { data: null, error: new Error('userId and xp required') }
  const { data, error } = await supabase
    .from('xp_log')
    .insert([{ user_id: userId, source, xp, ref_id: refId, note }])
    .select()
    .single()
  return { data, error }
}

export async function getXpTotals(userId) {
  const { data, error } = await supabase
    .from('xp_log')
    .select('xp, source, created_at')
    .eq('user_id', userId)
  const total = (data || []).reduce((a, r) => a + (r.xp || 0), 0)
  return { total, rows: data || [], error }
}

export async function earnBadge(userId, badgeId) {
  const { data, error } = await supabase
    .from('badges_earned')
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' })
    .select()
    .single()
  return { data, error }
}

export async function getEarnedBadges(userId) {
  const { data, error } = await supabase
    .from('badges_earned')
    .select('badge_id, earned_at')
    .eq('user_id', userId)
  return { data: data || [], error }
}

export async function getDailyQuests(userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
  return { data: data || [], error }
}

// Hydrate today's quests, seeding missing defaults from the catalog.
// `defaults` shape: [{ id, target, ... }]. Returns DB rows enriched with catalog fields.
export async function getOrSeedDailyQuests(userId, defaults) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
  const byId = Object.fromEntries((existing || []).map(r => [r.quest_id, r]))
  const toSeed = defaults.filter(d => !byId[d.id])
  if (toSeed.length) {
    const rows = toSeed.map(d => ({
      user_id: userId,
      quest_id: d.id,
      date: today,
      progress: 0,
      target: d.target,
      completed: false,
      claimed: false,
    }))
    const { data: inserted } = await supabase.from('daily_quests').insert(rows).select()
    ;(inserted || []).forEach(r => { byId[r.quest_id] = r })
  }
  // Merge catalog → DB row so UI gets {progress,target,completed} from DB + {icon,title,sub,xp} from catalog.
  return defaults.map(d => {
    const row = byId[d.id] || { progress: 0, target: d.target, completed: false, claimed: false }
    return { ...d, progress: row.progress, target: row.target, completed: row.completed, claimed: row.claimed, _row: row }
  })
}

export async function upsertQuestProgress(userId, questId, progress, target) {
  const today = new Date().toISOString().slice(0, 10)
  const completed = progress >= target
  const { data, error } = await supabase
    .from('daily_quests')
    .upsert(
      { user_id: userId, quest_id: questId, date: today, progress, target, completed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,quest_id,date' }
    )
    .select()
    .single()
  return { data, error }
}

// Bump quest progress by 1 (capped at target). Atomic via Postgres RPC
// (migrations/023_bump_quest_rpc.sql) — was a read-then-update that lost
// increments under concurrent bumps (M6 fix from 2026-05-21 audit).
// Returns { row, justCompleted, error }.
export async function bumpQuest(userId, questId, increment = 1) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase.rpc('bump_daily_quest', {
    p_user_id: userId,
    p_quest_id: questId,
    p_date: today,
    p_increment: increment,
  })
  const row = Array.isArray(data) && data[0] ? data[0] : null
  if (!row) return { row: null, justCompleted: false, error }
  return {
    row: {
      id: row.id, user_id: row.user_id, quest_id: row.quest_id, date: row.date,
      progress: row.progress, target: row.target, completed: row.completed,
    },
    justCompleted: !!row.just_completed,
    error,
  }
}

// ─── WEEKLY CHALLENGES ───────────────────────────────────────
// Hydrate this week's challenges, seeding missing rows. `active` is the
// catalog from getActiveChallenges(): [{ id, target, ... }].
export async function getOrSeedWeeklyChallenges(userId, weekKey, active) {
  const { data: existing } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
  const byId = Object.fromEntries((existing || []).map(r => [r.challenge_id, r]))
  const toSeed = active.filter(c => !byId[c.id])
  if (toSeed.length) {
    const rows = toSeed.map(c => ({
      user_id: userId, challenge_id: c.id, week_key: weekKey,
      progress: 0, target: c.target, completed: false,
    }))
    const { data: inserted } = await supabase.from('challenge_progress').insert(rows).select()
    ;(inserted || []).forEach(r => { byId[r.challenge_id] = r })
  }
  return active.map(c => {
    const row = byId[c.id] || { progress: 0, target: c.target, completed: false }
    return { ...c, progress: row.progress, target: row.target, completed: row.completed }
  })
}

// Bump a challenge by 1 (capped at target). Self-attested, single-user
// sequential taps, so a read-then-upsert is safe here. Returns
// { row, justCompleted, error }.
export async function bumpChallenge(userId, challengeId, weekKey, target, increment = 1) {
  const { data: cur } = await supabase
    .from('challenge_progress')
    .select('progress, completed')
    .eq('user_id', userId).eq('challenge_id', challengeId).eq('week_key', weekKey)
    .maybeSingle()
  const wasCompleted = !!cur?.completed
  const progress = Math.min(target, (cur?.progress || 0) + increment)
  const completed = progress >= target
  const { data, error } = await supabase
    .from('challenge_progress')
    .upsert(
      { user_id: userId, challenge_id: challengeId, week_key: weekKey, progress, target, completed,
        completed_at: completed && !wasCompleted ? new Date().toISOString() : (cur?.completed_at ?? null),
        updated_at: new Date().toISOString() },
      { onConflict: 'user_id,challenge_id,week_key' }
    )
    .select()
    .maybeSingle()
  return { row: data, justCompleted: completed && !wasCompleted, error }
}

// ─── TEAM COMPETITIONS ───────────────────────────────────────
// All read through SECURITY DEFINER RPCs (migration 026) so leaderboards
// can aggregate other athletes' XP without leaking private data.
function monthStartIso() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

// scope: 'global' | 'team' | 'league' | 'country'; period: 'all' | 'month'
export async function getLeaderboard({ scope = 'global', value = null, period = 'all' } = {}) {
  const { data, error } = await supabase.rpc('dsm_leaderboard', {
    p_scope: scope,
    p_value: value,
    p_since: period === 'month' ? monthStartIso() : null,
  })
  return { data: data || [], error }
}

export async function getTeamStandings({ period = 'all' } = {}) {
  const { data, error } = await supabase.rpc('dsm_team_standings', {
    p_since: period === 'month' ? monthStartIso() : null,
  })
  return { data: data || [], error }
}

// Self-update of non-privileged competition fields (allowed by RLS).
export async function setTeamLeague(userId, { clubTeam, league, country }) {
  const patch = {}
  if (clubTeam !== undefined) patch.club_team = clubTeam || null
  if (league !== undefined)   patch.league = league || null
  if (country !== undefined)  patch.country = country || null
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('id, club_team, league, country')
    .maybeSingle()
  return { data, error }
}

// ─── WORKOUTS ────────────────────────────────────────────────
export async function finishWorkout(userId, workout) {
  const { name, workoutId, block, durationSeconds, sets } = workout
  const totalSets = sets.length
  const doneSets = sets.filter(s => s.completed).length
  const { data: logRow, error: logErr } = await supabase
    .from('workouts_log')
    .insert([{
      user_id: userId,
      workout_id: workoutId || null,
      name,
      block: block || null,
      duration_seconds: durationSeconds || null,
      total_sets: totalSets,
      done_sets: doneSets,
    }])
    .select()
    .single()
  if (logErr) return { data: null, error: logErr }

  const setRows = sets.map((s, i) => ({
    user_id: userId,
    workout_log_id: logRow.id,
    exercise_id: s.exerciseId,
    exercise_name: s.exerciseName || null,
    set_index: i,
    weight: s.weight ?? null,
    reps: s.reps ?? null,
    rpe: s.rpe ?? null,
    completed: !!s.completed,
  }))
  if (setRows.length) {
    const { error: setErr } = await supabase.from('workout_sets').insert(setRows)
    if (setErr) return { data: logRow, error: setErr }
  }
  return { data: logRow, error: null }
}

export async function getRecentWorkouts(userId, limit = 10) {
  const { data, error } = await supabase
    .from('workouts_log')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}

// ─── NUTRITION ───────────────────────────────────────────────
export async function logFood(userId, entry) {
  const { data, error } = await supabase
    .from('food_log')
    .insert([{
      user_id: userId,
      food_id: entry.foodId || null,
      food_name: entry.name,
      serving: entry.serving || null,
      cal: entry.cal,
      protein_g: entry.p,
      carbs_g: entry.c,
      fat_g: entry.f,
      qty: entry.qty || 1,
      meal: entry.meal || null,
    }])
    .select()
    .single()
  return { data, error }
}

export async function removeFood(userId, id) {
  const { data, error } = await supabase
    .from('food_log')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  return { data, error }
}

export async function getFoodLogToday(userId) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', start.toISOString())
    .order('logged_at', { ascending: true })
  return { data: data || [], error }
}

export async function getFoodLogRange(userId, days = 7) {
  const start = new Date(); start.setDate(start.getDate() - (days - 1)); start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('food_log')
    .select('cal, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', start.toISOString())
  return { data: data || [], error }
}

export async function getNutritionTargets(userId) {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}

export async function setNutritionTargets(userId, targets) {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .upsert({
      user_id: userId,
      cal: targets.cal,
      protein_g: targets.p,
      carbs_g: targets.c,
      fat_g: targets.f,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()
  return { data, error }
}

// ─── BODY STATS ──────────────────────────────────────────────
export async function logBodyStats(userId, stats) {
  const { data, error } = await supabase
    .from('body_stats')
    .insert([{
      user_id: userId,
      weight: stats.weight ?? null,
      body_fat: stats.bodyFat ?? null,
      chest: stats.chest ?? null,
      waist: stats.waist ?? null,
      arm: stats.arm ?? null,
      thigh: stats.thigh ?? null,
      resting_hr: stats.resting_hr ?? null,
      vo2: stats.vo2 ?? null,
    }])
    .select()
    .single()
  return { data, error }
}

export async function getBodyStatsHistory(userId, limit = 24) {
  const { data, error } = await supabase
    .from('body_stats')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: true })
    .limit(limit)
  return { data: data || [], error }
}

// ─── PROGRESS PHOTOS (Supabase Storage) ──────────────────────
export async function uploadProgressPhoto(userId, angle, file) {
  const ts = Date.now()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${angle.toLowerCase()}-${ts}.${ext}`
  const { error: upErr } = await supabase.storage.from('progress-photos').upload(path, file, { upsert: false })
  if (upErr) return { data: null, error: upErr }
  const { data, error } = await supabase
    .from('progress_photos')
    .insert([{ user_id: userId, angle, storage_path: path }])
    .select()
    .single()
  return { data, error }
}

export async function getProgressPhotos(userId, limit = 12) {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(limit)
  if (error) return { data: [], error }
  const withUrls = await Promise.all((data || []).map(async (p) => {
    const { data: signed } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(p.storage_path, 3600)
    return { ...p, url: signed?.signedUrl || null }
  }))
  return { data: withUrls, error: null }
}

// ─── UTILS ───────────────────────────────────────────────────
function getWeekKey() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}

// Evaluate trackable badge conditions and earn any that have crossed the
// threshold. Returns array of badge_ids newly earned. Safe to call after every
// XP-awarding action — upsert ignores already-earned.
export async function evaluateBadges(userId) {
  const newly = []
  if (!userId) return newly

  // Pull everything we need in parallel
  const [profileRes, actionRes, ballRes, voiceRes, workoutRes, sharkRes, earnedRes] = await Promise.all([
    supabase.from('profiles').select('streak').eq('id', userId).maybeSingle(),
    supabase.from('action_steps').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('ball_mastery').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('voice_journal').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('workouts_log').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('action_steps').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('shark_used', true),
    supabase.from('badges_earned').select('badge_id').eq('user_id', userId),
  ])

  // M5: surface RLS-denied count queries. count=null from a denied head
  // request used to silently degrade to 0, which meant valid streaks
  // never earned their badge. Log and bail; caller will retry on the
  // next XP event once RLS is healthy.
  const countErrors = [
    ['action_steps', actionRes], ['ball_mastery', ballRes],
    ['voice_journal', voiceRes], ['workouts_log', workoutRes],
    ['shark_used', sharkRes],
  ].filter(([, r]) => r.error || r.count == null)
  if (countErrors.length) {
    console.warn('[evaluateBadges] count queries failed — skipping evaluation this pass:',
      countErrors.map(([name, r]) => `${name}:${r.error?.message || 'count=null'}`).join(', '))
    return newly
  }

  const streak       = profileRes.data?.streak || 0
  const actionsCount = actionRes.count || 0
  const ballCount    = ballRes.count || 0
  const voiceCount   = voiceRes.count || 0
  const workoutCount = workoutRes.count || 0
  const sharkCount   = sharkRes.count || 0
  const owned        = new Set((earnedRes.data || []).map(r => r.badge_id))

  const rules = [
    { id: 'week-streak',     when: streak >= 7 },
    { id: 'month-streak',    when: streak >= 30 },
    { id: 'century',         when: streak >= 100 },
    { id: 'shark-mentality', when: sharkCount >= 20 },
    { id: 'mental-rep-50',   when: voiceCount >= 50 },
    { id: 'first-pr',        when: workoutCount >= 1 },          // first workout finished
    { id: 'triple-crown',    when: actionsCount >= 25 && workoutCount >= 10 && voiceCount >= 5 },
  ]

  for (const r of rules) {
    if (r.when && !owned.has(r.id)) {
      const { error } = await earnBadge(userId, r.id)
      if (!error) newly.push(r.id)
    }
  }
  return newly
}

// ─── ONBOARDING ─────────────────────────────────────────────
export async function saveOnboarding(userId, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      onboarded_at: new Date().toISOString(),
      position:       payload.position || null,
      age:            payload.age || null,
      club_team:      payload.clubTeam || null,
      identity_goal:  payload.identityGoal || null,
      baseline:       payload.baseline || {},
      obstacles:      payload.obstacles || [],
      match_cadence:  payload.matchCadence || null,
      starter_focus:  payload.starterFocus || {},
    })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// ─── MATCH LOG ──────────────────────────────────────────────
export async function getMatches(userId, limit = 20) {
  const { data, error } = await supabase
    .from('match_log').select('*')
    .eq('user_id', userId)
    .order('match_date', { ascending: false })
    .limit(limit)
  return { data, error }
}

export async function createMatchPre(userId, payload) {
  const { data, error } = await supabase
    .from('match_log')
    .insert([{
      user_id: userId,
      match_date:    payload.matchDate,
      opponent:      payload.opponent || null,
      competition:   payload.competition || null,
      is_home:       payload.isHome ?? null,
      pre_mood:      payload.preMood ?? null,
      pre_intention: payload.preIntention || null,
      pre_focus_cue: payload.preFocusCue || null,
      pre_tactical:  payload.preTactical || null,
      pre_logged_at: new Date().toISOString(),
    }])
    .select().single()
  return { data, error }
}

export async function updateMatchPost(matchId, payload) {
  const { data, error } = await supabase
    .from('match_log')
    .update({
      result:         payload.result || null,
      score_for:      payload.scoreFor ?? null,
      score_against:  payload.scoreAgainst ?? null,
      minutes_played: payload.minutesPlayed ?? null,
      goals:          payload.goals ?? 0,
      assists:        payload.assists ?? 0,
      performance:    payload.performance ?? null,
      went_well:      payload.wentWell || null,
      to_fix:         payload.toFix || null,
      cues_used:      payload.cuesUsed || [],
      post_logged_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select().single()
  return { data, error }
}

export async function getActiveMatch(userId) {
  // any match with pre logged but no post in the last 3 days — date-tolerant
  // (UTC vs local timezone slop, late-night pre-logging)
  const since = new Date(Date.now() - 3 * 86400 * 1000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('match_log').select('*')
    .eq('user_id', userId)
    .is('post_logged_at', null)
    .gte('match_date', since)
    .order('match_date', { ascending: false })
    .limit(1).maybeSingle()
  return { data, error }
}

// ─── PARENT LINKS ───────────────────────────────────────────
// crypto.getRandomValues per M1 (Math.random isn't secure for invite codes).
function genInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[buf[i] % alphabet.length]
  return s
}

export async function createParentInvite(athleteId) {
  const code = genInviteCode()
  const { data, error } = await supabase
    .from('parent_invites')
    .insert([{ athlete_id: athleteId, code }])
    .select().single()
  return { data, error }
}

export async function listParentInvites(athleteId) {
  const { data, error } = await supabase
    .from('parent_invites').select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function redeemParentInvite(_parentId, code) {
  // All work happens in the SECURITY DEFINER RPC: row-locks the invite,
  // creates the parent_link, flips role. parentId arg kept for backward
  // compatibility but ignored — auth.uid() is the source of truth server-side.
  const { data, error } = await supabase.rpc('redeem_parent_invite', {
    p_code: String(code || '').toUpperCase().trim(),
  })
  if (error) {
    const msg = error.message || ''
    if (msg.includes('not found'))      return { error: new Error('Invite code not found') }
    if (msg.includes('already used'))   return { error: new Error('Invite code already used') }
    if (msg.includes('expired'))        return { error: new Error('Invite code expired') }
    return { error }
  }
  return { athleteId: data }
}

export async function getLinkedAthletes(parentId) {
  const { data: links, error } = await supabase
    .from('parent_links').select('athlete_id, created_at')
    .eq('parent_id', parentId)
  if (error || !links?.length) return { data: [], error }
  const ids = links.map(l => l.athlete_id)
  const { data: profiles } = await supabase
    .from('profiles').select('*').in('id', ids)
  return { data: profiles || [], error: null }
}

export async function getParentDashboard(_parentId, athleteId) {
  // Read through restricted views (parent_visible_profile, parent_visible_themes)
  // so even console-poking parents can't extract email / coach_memory.athlete_summary.
  const [p, as, ci, ml, mem] = await Promise.all([
    supabase.from('parent_visible_profile').select('*').eq('id', athleteId).maybeSingle(),
    supabase.from('action_steps').select('date, mental, did_action_steps').eq('user_id', athleteId).order('date', { ascending: false }).limit(14),
    supabase.from('weekly_checkins').select('week, mental, wins, struggles').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(4),
    supabase.from('match_log').select('match_date, opponent, result, score_for, score_against, performance, went_well').eq('user_id', athleteId).order('match_date', { ascending: false }).limit(5),
    supabase.from('parent_visible_themes').select('themes').eq('user_id', athleteId).maybeSingle(),
  ])
  return {
    profile:  p.data,
    actions:  as.data || [],
    checkins: ci.data || [],
    matches:  ml.data || [],
    themes:   mem.data?.themes || {},
  }
}

// ─── WEEKLY RECAP (in-app surface) ──────────────────────────
export async function getLatestRecap(userId) {
  const { data, error } = await supabase
    .from('recap_log').select('*')
    .eq('user_id', userId)
    .eq('audience', 'athlete')
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  return { data, error }
}

export async function getRecapHistory(userId, limit = 12) {
  const { data, error } = await supabase
    .from('recap_log').select('id, week_key, summary, highlights, created_at, sent_at')
    .eq('user_id', userId)
    .eq('audience', 'athlete')
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

// Derive level from total XP using the LEVELS table in gamification.js
export function levelFromXp(totalXp, levels) {
  if (!levels?.length) return { level: 1, title: 'Rookie', tier: 'Rookie', xp: totalXp, xpToNext: 2500 }
  const sorted = [...levels].sort((a, b) => a.threshold - b.threshold)
  let cur = sorted[0]
  for (const l of sorted) {
    if (totalXp >= l.threshold) cur = l
    else break
  }
  const next = sorted.find(l => l.threshold > totalXp)
  return {
    level: cur.lvl,
    title: cur.title,
    tier: cur.tier,
    xp: totalXp,
    xpToNext: next ? next.threshold : cur.threshold + 10000,
  }
}
