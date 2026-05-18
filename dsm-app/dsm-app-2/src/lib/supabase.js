import { createClient } from '@supabase/supabase-js'

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

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── ACTION STEPS ────────────────────────────────────────────
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
export async function saveHabits(userId, habits) {
  const week = getWeekKey()
  const { data, error } = await supabase
    .from('habits')
    .upsert([{ user_id: userId, week, habits: JSON.stringify(habits) }], { onConflict: 'user_id,week' })
  return { data, error }
}

export async function getHabits(userId) {
  const week = getWeekKey()
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('week', week)
    .single()
  return { data, error }
}

// ─── STREAKS ─────────────────────────────────────────────────
export async function getStreak(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('streak, last_logged')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function logDay(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data: profile } = await supabase.from('profiles').select('streak, last_logged').eq('id', userId).single()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  let newStreak = 1
  if (profile?.last_logged === yesterday) newStreak = (profile.streak || 0) + 1
  else if (profile?.last_logged === today) return { streak: profile.streak }
  const { error } = await supabase.from('profiles').update({ streak: newStreak, last_logged: today }).eq('id', userId)
  return { streak: newStreak, error }
}

// ─── PROFILES ────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
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
  const { data, error } = await supabase
    .from('chat_history')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return { data: data || [], error }
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
  // Increments counter by 1 — wrapped in upsert so first row creation is safe
  const { data: existing } = await supabase
    .from('coach_memory')
    .select('messages_since_consolidation')
    .eq('user_id', userId)
    .maybeSingle()
  const current = existing?.messages_since_consolidation ?? 0
  const { data, error } = await supabase
    .from('coach_memory')
    .upsert({
      user_id: userId,
      messages_since_consolidation: current + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  return { data, error, newCount: current + 1 }
}

export async function consolidateCoachMemory(userId, newSummary) {
  const { data, error } = await supabase
    .from('coach_memory')
    .upsert({
      user_id: userId,
      athlete_summary: newSummary,
      messages_since_consolidation: 0,
      last_consolidated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  return { data, error }
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
  const [profileRes, actionRes, ballRes, checkinRes, journalRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('action_steps').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
    supabase.from('ball_mastery').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
    supabase.from('weekly_checkins').select('*').eq('user_id', userId).order('week', { ascending: false }).limit(1),
    supabase.from('voice_journal').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(3),
  ])
  return {
    profile: profileRes.data,
    recentActionSteps: actionRes.data || [],
    recentBallMastery: ballRes.data || [],
    lastCheckin: checkinRes.data?.[0],
    recentJournal: journalRes.data || [],
  }
}

// ─── UTILS ───────────────────────────────────────────────────
function getWeekKey() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}
