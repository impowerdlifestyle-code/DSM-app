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
function randomInviteCode() {
  // 6-char alphanumeric, omit ambiguous chars
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
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

export async function dismissNudge(nudgeId) {
  const { data, error } = await supabase
    .from('coach_nudges')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', nudgeId)
  return { data, error }
}

export async function markNudgeActedOn(nudgeId) {
  const { data, error } = await supabase
    .from('coach_nudges')
    .update({ acted_on_at: new Date().toISOString(), dismissed_at: new Date().toISOString() })
    .eq('id', nudgeId)
  return { data, error }
}

export async function nudgeCreatedToday(userId) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('coach_nudges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
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
  const [
    profileRes, memoryRes, actionRes, ballRes, checkinRes, voiceRes,
    chatRes, workoutRes, foodRes, bodyRes, xpRes, badgeRes, nudgeRes,
    squadRes, notesRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', athleteId).maybeSingle(),
    supabase.from('coach_memory').select('*').eq('user_id', athleteId).maybeSingle(),
    supabase.from('action_steps').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(20),
    supabase.from('ball_mastery').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(20),
    supabase.from('weekly_checkins').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(10),
    supabase.from('voice_journal').select('*').eq('user_id', athleteId).order('recorded_at', { ascending: false }).limit(20),
    supabase.from('chat_history').select('id, role, content, created_at').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(30),
    supabase.from('workouts_log').select('*').eq('user_id', athleteId).order('completed_at', { ascending: false }).limit(15),
    supabase.from('food_log').select('*').eq('user_id', athleteId).order('logged_at', { ascending: false }).limit(20),
    supabase.from('body_stats').select('*').eq('user_id', athleteId).order('measured_at', { ascending: false }).limit(15),
    supabase.from('xp_log').select('xp, source, created_at').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(50),
    supabase.from('badges_earned').select('badge_id, earned_at').eq('user_id', athleteId),
    supabase.from('coach_nudges').select('*').eq('user_id', athleteId).order('created_at', { ascending: false }).limit(15),
    supabase.from('squad_members').select('squad_id, joined_at, squads(*)').eq('user_id', athleteId),
    isAdmin ? supabase.from('locker_room_notes').select('*, profiles!locker_room_notes_author_id_fkey(full_name, email)').eq('athlete_id', athleteId).order('pinned', { ascending: false }).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ])
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
  }
}

// ─── ADMIN: list all athletes with quick stats ───────────────
export async function getAdminAthleteList() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, access_level, streak, last_logged, program_week, created_at')
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

// Bump quest progress by 1 (capped at target). Returns { row, justCompleted }.
export async function bumpQuest(userId, questId, increment = 1) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: prior } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .eq('date', today)
    .maybeSingle()
  if (!prior) return { row: null, justCompleted: false }
  if (prior.completed) return { row: prior, justCompleted: false }
  const newProgress = Math.min(prior.target, (prior.progress || 0) + increment)
  const justCompleted = newProgress >= prior.target
  const { data, error } = await supabase
    .from('daily_quests')
    .update({
      progress: newProgress,
      completed: justCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .eq('date', today)
    .select()
    .single()
  return { row: data, error, justCompleted }
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
