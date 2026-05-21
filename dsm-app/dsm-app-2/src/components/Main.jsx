/*
 * ══════════════════════════════════════════════════════════════════
 * DSM APP — Main-26.jsx (FULLY DEBUGGED VERSION)
 * ══════════════════════════════════════════════════════════════════
 *
 * BUGS FIXED (search "BUG FIX" for critical DB fixes):
 *
 *   1.  loadAthleteProfile() — Action steps query was replaced with
 *       Promise.resolve({data:[]}) so coach dashboard NEVER loaded
 *       athlete action steps. Restored to getActionSteps(athlete.id).
 *
 *   2.  Leaderboard — asCount was hardcoded to 0 instead of querying
 *       the action_steps table. Restored the Supabase count query.
 *       ⚠️  VERIFY: table name may differ — check supabase.js.
 *
 *   3.  Weekly check-in upsert — missing onConflict parameter.
 *       Added { onConflict: 'user_id,week' }.
 *       ⚠️  REQUIRES in Supabase SQL Editor:
 *         ALTER TABLE weekly_checkins
 *           ADD CONSTRAINT weekly_checkins_user_week_unique
 *           UNIQUE (user_id, week);
 *
 *   4.  mindset_map upsert — same onConflict fix.
 *       ⚠️  REQUIRES:
 *         ALTER TABLE mindset_map
 *           ADD CONSTRAINT mindset_map_user_week_unique
 *           UNIQUE (user_id, week);
 *
 *   5.  downloadReport() called with `user` instead of `profile` —
 *       the user object doesn't have full_name, so reports showed
 *       wrong name. Fixed to pass `profile`.
 *
 *   6.  loadUserData() had zero error handling — one failed query
 *       would silently crash the whole app. Wrapped in try/catch.
 *       Also added null check on profile result.
 *
 *   7.  loadAthleteProfile() — same missing error handling. Wrapped.
 *
 *   8.  Micro reps progress bar counted ALL gameDayChecked items
 *       including gameday checklist entries, inflating the count.
 *       Fixed to only count drill-specific IDs.
 *
 *   9.  Coach dashboard typo: "COACH VALENTINOIEW" → "COACH VALENTINO VIEW"
 *
 *   10. Duplicate matchMsg for "how are you" — second block was dead
 *       code (first match always wins). Removed.
 *
 *   11. Chat send button (→) called sendChat() with no arguments,
 *       so clicking it did nothing. Fixed to read from input ref.
 *
 *   12. Removed dead code: handleSubmitForm (replaced by ActionForm),
 *       form state, savingForm state, setF, microRepDone state.
 *
 *   13. Added error handling to: mistake resets, MAP save, community
 *       post creation. All previously had no error feedback.
 *
 * ──────────────────────────────────────────────────────────────────
 * REMAINING ISSUES (need supabase.js or DB access to fix):
 *
 *   A. Verify submitActionSteps() in lib/supabase.js maps form
 *      fields to the correct database columns.
 *
 *   B. The action_steps table name in leaderboard query (~line 700)
 *      may not match your actual table. Check supabase.js.
 *
 *   C. ElevenLabs API key is exposed client-side via VITE_ env var.
 *      Should be proxied through a Vercel serverless function.
 *
 *   D. N+1 leaderboard query fires one DB call per athlete.
 *      Replace with aggregated query or Supabase RPC.
 *
 *   E. Supabase Site URL must be set to your live domain
 *      (dsm-app-beta.vercel.app) not localhost:3000.
 *
 *   F. This 3300-line file should be split into separate components.
 * ══════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react'
import { supabase, signOut, submitActionSteps, getActionSteps, saveHabits, getHabits, logDay, getAllProfiles, getAllActionSteps, updateAccessLevel,
  saveChatMessage, getChatHistory, getCoachMemory, bumpMessagesSinceConsolidation, consolidateCoachMemory,
  rateMessage, getRecentFeedback, getAthleteStateDigest, awardXp,
  getOrSeedDailyQuests, bumpQuest, evaluateBadges,
  getActiveNudge, createNudge, dismissNudge, markNudgeActedOn, nudgeCreatedToday } from '../lib/supabase.js'
import {
  QUOTES, HABITS_LIST, DAYS, WEEKDAYS, BALL_MASTERY_SKILLS, PARENT_GUIDE, RESOURCES,
  AI_SYSTEM, emptyCheckin,
} from '../lib/constants.js'
import { getWeekKey } from '../lib/dates.js'
import { SUGGESTED_QUESTIONS, getCoachVResponse, consolidateMemory, shouldConsolidate, checkForNudge } from '../lib/coachV.js'
import { speakText as elevenSpeak } from '../lib/elevenlabs.js'
import { downloadReport } from '../lib/reports.js'
import ActionForm from './ActionForm.jsx'
import { C } from '../styles.js'
import ParentsTab from './tabs/ParentsTab.jsx'
import ActionsTab from './tabs/ActionsTab.jsx'
import ActionsSubNav from './tabs/ActionsSubNav.jsx'
import BodySubNav from './tabs/BodySubNav.jsx'
import CoachSubNav from './tabs/CoachSubNav.jsx'
import BotTab from './tabs/BotTab.jsx'
import WorkoutsTab from './tabs/WorkoutsTab.jsx'
import NutritionTab from './tabs/NutritionTab.jsx'
import CalendarTab from './tabs/CalendarTab.jsx'
import BodyStatsTab from './tabs/BodyStatsTab.jsx'
import InboxTab from './tabs/InboxTab.jsx'
import PlayerTab from './tabs/PlayerTab.jsx'
import CourseTab from './tabs/CourseTab.jsx'
import SquadTab from './tabs/SquadTab.jsx'
import LockerRoomTab from './tabs/LockerRoomTab.jsx'
import AdminTab from './tabs/AdminTab.jsx'
import Onboarding from './Onboarding.jsx'
import MatchDayTab from './tabs/MatchDayTab.jsx'
import TiltCard from './widgets/TiltCard.jsx'
import QuestCard from './widgets/QuestCard.jsx'
import VoiceJournal from './widgets/VoiceJournal.jsx'
import WeeklyRecapCard from './widgets/WeeklyRecapCard.jsx'
import { PLAYER, DAILY_QUESTS, XP_TABLE } from '../data/gamification.js'


export default function Main({ user }) {
  const [tab, setTab] = useState('home')
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [streak, setStreak] = useState(0)
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState(HABITS_LIST.map(h => ({ label: h, days: [false,false,false,false,false,false,false] })))
  const [submissions, setSubmissions] = useState([])
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hey! I'm Coach Valentino 🔥 Ask me anything about mindset, match prep, or your training!" }])
  const [chatInput, setChatInput] = useState('')
  const chatInputRef = useRef('')
  const [chatLoading, setChatLoading] = useState(false)
  const [quests, setQuests] = useState(DAILY_QUESTS)
  const [badgeNotice, setBadgeNotice] = useState(null)
  const [activeNudge, setActiveNudge] = useState(null)
  const nudgeCheckedRef = useRef(false)
  const [typingMsg, setTypingMsg] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [allAthletes, setAllAthletes] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [ballMastery, setBallMastery] = useState({})
  const [ballHistory, setBallHistory] = useState([])
  const [savingBall, setSavingBall] = useState(false)
  const [checkin, setCheckin] = useState(emptyCheckin)
  const [checkinHistory, setCheckinHistory] = useState([])
  const [checkinDone, setCheckinDone] = useState(false)
  const [savingCheckin, setSavingCheckin] = useState(false)
  const [allCheckins, setAllCheckins] = useState([])
  const [allBallMastery, setAllBallMastery] = useState([])
  const [athleteProfileTab, setAthleteProfileTab] = useState('overview')
  const [coachFilter, setCoachFilter] = useState('all')
  const [athleteProgramWeek, setAthleteProgramWeek] = useState(1)
  const [gameDayChecked, setGameDayChecked] = useState({})
  const [mistakes, setMistakes] = useState([])
  const [newMistake, setNewMistake] = useState({ situation:'', reset:'', tool:'' })
  const [map, setMap] = useState({ goal:'', focusArea:'', weeklyWin:'', adjustment:'', commitment:'' })
  const [mapSaved, setMapSaved] = useState(false)
  const [mentalTab, setMentalTab] = useState('microreps')
  const [sessionNotes, setSessionNotes] = useState([])
  const [newSessionNote, setNewSessionNote] = useState({ title:'', content:'', fathomLink:'', date: new Date().toISOString().split('T')[0] })
  const [coachNote, setCoachNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [athleteMessages, setAthleteMessages] = useState([])
  const [newCoachMsg, setNewCoachMsg] = useState('')
  const [athleteActionSteps, setAthleteActionSteps] = useState([])
  const [athleteCheckins, setAthleteCheckins] = useState([])
  const [athleteBallMastery, setAthleteBallMastery] = useState([])
  const [communityPosts, setCommunityPosts] = useState([])
  const [newPost, setNewPost] = useState({ type: 'win', content: '' })
  const [postingComment, setPostingComment] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [savingPost, setSavingPost] = useState(false)
  const [communityTab, setCommunityTab] = useState('athletes')
  const [challenges, setChallenges] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', type: 'weekly', target: 7, unit: 'sessions' })
  const [competitionTab, setCompetitionTab] = useState('leaderboard')
  const [progressTab, setProgressTab] = useState('overview')
  const [savingChallenge, setSavingChallenge] = useState(false)
  const chatEnd = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const currentWeek = getWeekKey()

  useEffect(() => { loadUserData() }, [user])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadAthleteProfile(athlete) {
    try {
    const [as, ci, bm, sn, msgs] = await Promise.all([
      // BUG FIX: was Promise.resolve({data:[]}) — action steps were never being fetched
      getActionSteps(athlete.id),
      supabase.from('weekly_checkins').select('*').eq('user_id', athlete.id).order('created_at', {ascending:false}).limit(20),
      supabase.from('ball_mastery').select('*').eq('user_id', athlete.id).order('created_at', {ascending:false}).limit(20),
      supabase.from('session_notes').select('*').eq('athlete_id', athlete.id).order('created_at', {ascending:false}).limit(20),
      supabase.from('coach_messages').select('*, profiles!coach_messages_sender_id_fkey(full_name, role)').or(`athlete_id.eq.${athlete.id}`).order('created_at', {ascending:true}).limit(50),
    ])
    setAthleteActionSteps(as.data || [])
    setAthleteCheckins(ci.data || [])
    setAthleteBallMastery(bm.data || [])
    setSessionNotes(sn.data || [])
    setAthleteMessages(msgs.data || [])
    setAthleteProfileTab('overview')
    } catch(err) { console.error('loadAthleteProfile error:', err) }
  }

  async function loadUserData() {
    try {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p) { console.error('No profile found for user'); return }
    setProfile(p)
    setStreak(p?.streak || 0)
    const { data: hd } = await getHabits(user.id)
    if (hd?.habits) setHabits(JSON.parse(hd.habits))
    const { data: sd } = await getActionSteps(user.id)
    if (sd) setSubmissions(sd)
    const { data: bd } = await supabase.from('ball_mastery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14)
    if (bd) setBallHistory(bd)
    const todayQuests = await getOrSeedDailyQuests(user.id, DAILY_QUESTS)
    setQuests(todayQuests)
    const { data: cd } = await supabase.from('weekly_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    if (cd) {
      setCheckinHistory(cd)
      if (cd.find(c => c.week === currentWeek)) setCheckinDone(true)
    }
    // Load Coach V chat history (persistent across sessions)
    try {
      const { data: chRows } = await getChatHistory(user.id, 100)
      if (chRows && chRows.length > 0) {
        setMessages(chRows.map(r => ({ id: r.id, role: r.role, content: r.content })))
      }
    } catch (err) { console.warn('[chat history load failed]', err) }

    // Load active nudge + trigger nudge check at most once per app open
    try {
      const { data: nudge } = await getActiveNudge(user.id)
      if (nudge) {
        setActiveNudge(nudge)
      } else if (!nudgeCheckedRef.current) {
        nudgeCheckedRef.current = true
        const already = await nudgeCreatedToday(user.id)
        if (!already) maybeCreateNudge()
      }
    } catch (err) { console.warn('[nudge load failed]', err) }
    // Load leaderboard
    const { data: lb } = await supabase
      .from('profiles')
      .select('id, full_name, email, streak, role')
      .eq('role', 'athlete')
      .order('streak', { ascending: false })
      .limit(20)
    if (lb) {
      // Enrich with counts
      const enriched = await Promise.all(lb.map(async (a) => {
        const { count: bmCount } = await supabase.from('ball_mastery').select('id', { count: 'exact' }).eq('user_id', a.id)
        // BUG FIX: was hardcoded to 0 — action steps were never counted in leaderboard scores
        const { count: asCount } = await supabase.from('action_steps').select('id', { count: 'exact' }).eq('user_id', a.id)
        const { count: ciCount } = await supabase.from('weekly_checkins').select('id', { count: 'exact' }).eq('user_id', a.id)
        const score = (a.streak||0)*3 + (bmCount||0)*2 + (asCount||0)*2 + (ciCount||0)*1
        return { ...a, bmCount: bmCount||0, asCount: asCount||0, ciCount: ciCount||0, score }
      }))
      setLeaderboard(enriched.sort((a,b) => b.score - a.score))
    }

    // Load mistake resets
    const { data: mr } = await supabase.from('mistake_resets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (mr) setMistakes(mr)

    // Load MAP
    const { data: mapData } = await supabase.from('mindset_map').select('*').eq('user_id', user.id).eq('week', getWeekKey()).single()
    if (mapData) { setMap({ goal: mapData.goal||'', focusArea: mapData.focus_area||'', weeklyWin: mapData.weekly_win||'', adjustment: mapData.adjustment||'', commitment: mapData.commitment||'' }); setMapSaved(true) }

    // Load challenges
    const { data: ch } = await supabase
      .from('challenges')
      .select('*, challenge_completions(user_id)')
      .order('created_at', { ascending: false })
      .limit(20)
    if (ch) setChallenges(ch)

    // Load community posts
    const { data: posts } = await supabase
      .from('community_posts')
      .select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))')
      .order('created_at', { ascending: false })
      .limit(50)
    if (posts) setCommunityPosts(posts)

    if (p?.role === 'coach') {
      const { data: at } = await getAllProfiles()
      setAllAthletes(at || [])
      const { data: as } = await getAllActionSteps()
      setAllSubmissions(as || [])
      const { data: ac } = await supabase.from('weekly_checkins').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50)
      setAllCheckins(ac || [])
      const { data: ab } = await supabase.from('ball_mastery').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(50)
      setAllBallMastery(ab || [])
    }
    } catch(err) { console.error('loadUserData error:', err) }
  }

  async function maybeCreateNudge() {
    try {
      const digest = await getAthleteStateDigest(user.id)
      const now = Date.now()
      const daysSince = (iso) => iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : 999
      const lastAction = digest.recentActionSteps?.[0]
      const lastBall = digest.recentBallMastery?.[0]
      const lastJournal = digest.recentJournal?.[0]
      const nudgeContext = {
        streak: digest.profile?.streak || 0,
        daysSinceActionStep: lastAction ? daysSince(lastAction.created_at || lastAction.date) : null,
        daysSinceBallMastery: lastBall ? daysSince(lastBall.created_at || lastBall.date) : null,
        daysSinceJournal: lastJournal ? daysSince(lastJournal.recorded_at) : null,
        lastJournalSentiment: lastJournal?.sentiment || null,
        lastWeeklyMental: digest.lastCheckin?.mental || null,
        lastWeeklyStruggles: digest.lastCheckin?.struggles || null,
        accessLevel: digest.profile?.access_level || 'trial',
        nowIso: new Date().toISOString(),
      }
      const result = await checkForNudge({ nudgeContext })
      if (result?.send && result.message) {
        const { data: nudge } = await createNudge(user.id, {
          kind: result.kind || 'streak-risk',
          message: result.message,
          signal: result.signal || '',
        })
        if (nudge) setActiveNudge(nudge)
      }
    } catch (err) {
      console.warn('[nudge check failed]', err)
    }
  }

  async function handleDismissNudge() {
    if (!activeNudge?.id) return
    setActiveNudge(null)
    await dismissNudge(activeNudge.id)
  }

  async function handleActOnNudge() {
    if (!activeNudge?.id) return
    await markNudgeActedOn(activeNudge.id)
    setActiveNudge(null)
    setTab('bot')
  }

  const toggleHabit = async (hi, di) => {
    const updated = habits.map((h, i) => i === hi ? { ...h, days: h.days.map((d, j) => j === di ? !d : d) } : h)
    setHabits(updated)
    await saveHabits(user.id, updated)
  }

  const setCI = (k, v) => setCheckin(p => ({ ...p, [k]: v }))

  const completedHabits = habits.reduce((a, h) => a + h.days.filter(Boolean).length, 0)
  const totalHabits = habits.length * 7
  const pct = Math.round((completedHabits / totalHabits) * 100)
  const todayBMLogged = ballHistory.some(b => b.date === today)
  const todayActionLogged = submissions.some(s => s.date === today)
  const isCoach = profile?.role === 'coach'
  const isAdmin = user?.email === 'valentino@dilorenzosoccermindset.com' || profile?.is_admin === true
  const myName = profile?.full_name || user?.email
  const isEliteLocked = profile?.access_level !== 'paid' && profile?.access_level !== 'mentoring_elite'

  const handleLogDay = async () => {
    const { streak: ns } = await logDay(user.id)
    setStreak(ns || streak + 1)
  }

  const handleSaveBall = async () => {
    const practiced = Object.keys(ballMastery).filter(k => k !== 'notes' && (ballMastery[k]?.reps || 0) > 0)
    if (!practiced.length) return alert('Mark at least one skill!')
    setSavingBall(true)
    const { error } = await supabase.from('ball_mastery').insert([{
      user_id: user.id, date: today,
      skills: JSON.stringify(ballMastery),
      total_skills: practiced.length,
      total_reps: practiced.reduce((a, k) => a + (ballMastery[k]?.reps || 0), 0),
      notes: ballMastery.notes || '',
    }])
    if (error) { alert('Error: ' + error.message); setSavingBall(false); return }
    await awardXp(user.id, 'ball_mastery', XP_TABLE.ballMastery, null, `${practiced.length} skills`)
    await bumpQuestAndRefresh('quest-ball', 3)  // mark complete on save
    const newBadges = await evaluateBadges(user.id)
    if (newBadges.length) showBadgeNotice(newBadges)
    const { data: bd } = await supabase.from('ball_mastery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14)
    setBallHistory(bd || [])
    setBallMastery({})
    setSavingBall(false)
    alert(`✅ Ball mastery logged · +${XP_TABLE.ballMastery} XP`)
  }

  // Bump a quest by N and refresh state. If newly completed, awards quest XP.
  async function bumpQuestAndRefresh(questId, increment = 1) {
    if (!user?.id) return
    const { row, justCompleted } = await bumpQuest(user.id, questId, increment)
    if (!row) return
    if (justCompleted) {
      const catalog = DAILY_QUESTS.find(q => q.id === questId)
      if (catalog?.xp) await awardXp(user.id, 'quest', catalog.xp, null, questId)
    }
    const fresh = await getOrSeedDailyQuests(user.id, DAILY_QUESTS)
    setQuests(fresh)
  }

  function showBadgeNotice(ids) {
    if (!ids?.length) return
    setBadgeNotice(ids.join(', '))
    setTimeout(() => setBadgeNotice(null), 4500)
  }

  const handleSubmitCheckin = async () => {
    if (!checkin.biggestWin) return alert('Fill in your biggest win!')
    setSavingCheckin(true)
    // BUG FIX: Added onConflict so upsert knows to match on user_id+week
    // NOTE FOR DEVELOPER: Ensure weekly_checkins table has a UNIQUE constraint on (user_id, week)
    const { error } = await supabase.from('weekly_checkins').upsert([{
      user_id: user.id, week: currentWeek,
      biggest_win: checkin.biggestWin,
      biggest_challenge: checkin.biggestChallenge,
      shark_moment: checkin.sharkMoment,
      goldfish_moment: checkin.goldfishMoment,
      self_talk_moment: checkin.selfTalkMoment,
      energy_level: checkin.energyLevel,
      confidence_level: checkin.confidenceLevel,
      sessions_completed: checkin.sessionsCompleted,
      goal_next_week: checkin.goalNextWeek,
      message_to_coach: checkin.messageToCoach,
      smart_goal: checkin.smartGoal,
      goal_progress: checkin.goalProgress,
      did_visualization: checkin.didVisualization,
      visualization_notes: checkin.visualizationNotes,
      did_morning_routine: checkin.didMorningRoutine,
      morning_routine_notes: checkin.morningRoutineNotes,
    }], { onConflict: 'user_id,week' })
    if (error) { alert('Error: ' + error.message); setSavingCheckin(false); return }
    await awardXp(user.id, 'weekly_checkin', XP_TABLE.weeklyCheckin, null, currentWeek)
    const newBadges = await evaluateBadges(user.id)
    if (newBadges.length) showBadgeNotice(newBadges)
    setCheckinDone(true)
    setSavingCheckin(false)
    const { data: cd } = await supabase.from('weekly_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    setCheckinHistory(cd || [])
    alert(`✅ Weekly check-in submitted · +${XP_TABLE.weeklyCheckin} XP`)
  }

  const sendChat = async (msgOverride) => {
    const msg = msgOverride || (chatInputRef.current?.value || chatInput).trim()
    if (!msg) return
    if (chatInputRef.current) chatInputRef.current.value = ''
    setChatInput('')

    // 1) Optimistically append user message
    setMessages(p => [...p, { role: 'user', content: msg }])
    setChatLoading(true)

    // 2) Persist user message — get back the row with id
    const { data: userRow } = await saveChatMessage(user.id, 'user', msg)
    if (userRow?.id) {
      setMessages(p => p.map((m, i) =>
        i === p.length - 1 && m.role === 'user' && m.content === msg ? { ...m, id: userRow.id } : m
      ))
    }

    try {
      // 3) Pull athlete state + memory in parallel
      const [stateDigest, memRes] = await Promise.all([
        getAthleteStateDigest(user.id),
        getCoachMemory(user.id),
      ])

      // 4) Build the message thread for the API (last ~12 messages including the new one)
      const recent = [...messages, { role: 'user', content: msg }].slice(-12)
      const apiMessages = recent.map(m => ({ role: m.role, content: m.content }))

      // 5) Call Coach V
      const { content: reply } = await getCoachVResponse({
        messages: apiMessages,
        athleteContext: stateDigest,
        memorySummary: memRes?.data?.athlete_summary || '',
        memoryThemes: memRes?.data?.themes || null,
      })

      // 6) Persist assistant reply
      const { data: assistantRow } = await saveChatMessage(user.id, 'assistant', reply)
      const assistantId = assistantRow?.id

      // Daily quest: asked Coach V
      bumpQuestAndRefresh('quest-coach', 1)

      // 7) Typing animation, then commit the final message
      setChatLoading(false)
      const words = reply.split(' ')
      let i = 0
      setTypingMsg('')
      const interval = setInterval(() => {
        i++
        setTypingMsg(words.slice(0, i).join(' '))
        if (i >= words.length) {
          clearInterval(interval)
          setMessages(p => [...p, { id: assistantId, role: 'assistant', content: reply }])
          setTypingMsg('')
          if (voiceMode) elevenSpeak(reply)
        }
      }, 28)

      // 8) Bump counter, consolidate memory if threshold hit
      const { newCount } = await bumpMessagesSinceConsolidation(user.id)
      if (shouldConsolidate(newCount)) {
        try {
          const { data: fbRows } = await getRecentFeedback(user.id, 20)
          const { data: histRows } = await getChatHistory(user.id, 30)
          const { summary, themes } = await consolidateMemory({
            messages: histRows || [],
            memorySummary: memRes?.data?.athlete_summary || '',
            memoryThemes: memRes?.data?.themes || null,
            recentFeedback: fbRows || [],
          })
          if (summary || themes) await consolidateCoachMemory(user.id, summary || memRes?.data?.athlete_summary || '', themes || null)
        } catch (err) {
          console.warn('[coach memory consolidation failed]', err)
        }
      }
    } catch (err) {
      console.error('[Coach V error]', err)
      setChatLoading(false)
      setTypingMsg('')
      setMessages(p => [...p, { role: 'assistant', content: '⚠️ Coach V is offline — try again in a moment.' }])
    }
  }

  // Submit a 👍/👎 rating on a Coach V message
  const rateCoachMessage = async (messageId, rating) => {
    if (!messageId) return
    await rateMessage(user.id, messageId, rating)
    setMessages(p => p.map(m => m.id === messageId ? { ...m, rating } : m))
  }


  const startVoice = () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) return alert('Try Chrome!')
      const r = new SR(); r.lang = 'en-US'
      r.onstart = () => setIsRecording(true)
      r.onend = () => setIsRecording(false)
      r.onresult = e => sendChat(e.results[0][0].transcript)
      r.onerror = () => setIsRecording(false)
      r.start()
    } catch { alert('Voice not supported.') }
  }

  // PAYWALL CHECK
  const isLocked = profile && profile.role !== 'coach' && profile.access_level === 'locked'
  const isPending = profile && profile.role !== 'coach' && !profile.access_level

  if (isLocked || isPending) {
    return (
      <div style={C.app}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body, #root { background: #0a0a0a; min-height: 100vh; }
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          .fade { animation: fadeIn 0.3s ease; }
        `}</style>
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px 24px', textAlign:'center' }} className="fade">
          <img src="/dsm-logo.png" alt="Di Lorenzo Mindset" style={{ width: 160, height: 160, objectFit: 'contain', marginBottom: 28, filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.10))' }} />
          <div style={{ fontSize:60, marginBottom:20 }}>🔒</div>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:2, marginBottom:12 }}>UNLOCK YOUR ACCESS</div>
          <div style={{ fontSize:14, color:'#888', lineHeight:1.6, marginBottom:32, maxWidth:320 }}>
            You're one step away from the full DSM program. Join now to unlock Coach Valentino, Ball Mastery tracking, Weekly Check-ins and more.
          </div>
          <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, padding:'20px 18px', marginBottom:24, width:'100%', maxWidth:340 }}>
            <div style={{ fontSize:9, letterSpacing:3, color:'#555', fontWeight:700, marginBottom:12 }}>WHAT YOU GET</div>
            {[['🤖','Coach Valentino AI'],['⚽','Daily Ball Mastery Log'],['📋','Weekly Check-In'],['✅','Action Steps Tracker'],['📊','Habit Tracker'],['🦈','Full DSM Program']].map(([icon,label])=>(
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#ccc' }}>{label}</div>
                <div style={{ marginLeft:'auto', fontSize:11, color:'#fafafa', fontWeight:800 }}>✓</div>
              </div>
            ))}
          </div>
          <a href="https://www.fanbasis.com" target="_blank" rel="noreferrer"
            style={{ display:'block', width:'100%', maxWidth:340, background:'#fafafa', border:'none', borderRadius:12, padding:'16px 18px', fontSize:15, fontWeight:900, letterSpacing:2, color:'#000', cursor:'pointer', textDecoration:'none', marginBottom:14 }}>
            JOIN NOW -- FANBASIS 🔥
          </a>
          <div style={{ fontSize:11, color:'#444', lineHeight:1.6, maxWidth:300, marginBottom:24 }}>
            After payment, your coach will activate your account within 24 hours.
          </div>
          <button onClick={signOut} style={{ background:'none', border:'1px solid #333', borderRadius:8, padding:'8px 16px', fontSize:11, color:'#555', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
            SIGN OUT
          </button>
        </div>
      </div>
    )
  }

  const navTabs = [
    { id: 'home',      label: 'Home',   matches: ['home', 'weekly', 'tracker', 'parents', 'course'] },
    { id: 'actions',   label: 'Train',  matches: ['actions', 'ball', 'workouts', 'calendar', 'mental', 'match'] },
    { id: 'nutrition', label: 'Body',   matches: ['nutrition', 'body'] },
    { id: 'bot',       label: 'Coach',  matches: ['bot', 'inbox'] },
    { id: 'squad',     label: 'Squad' },
    ...(isCoach && !isAdmin ? [{ id: 'dashboard', label: 'Mode' }] : []),
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  const needsOnboarding = profile
    && !profile.onboarded_at
    && (profile.role === 'athlete' || !profile.role)

  return (
    <div style={C.app}>
      {needsOnboarding && (
        <Onboarding
          user={user}
          profile={profile}
          onDone={() => loadUserData()}
        />
      )}
      {badgeNotice && (
        <div style={{
          position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, padding: '12px 18px',
          background: 'rgba(0,0,0,0.92)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'Bebas Neue, sans-serif', letterSpacing: 1.2,
          maxWidth: 'calc(100% - 28px)',
        }}>
          <span style={{ fontSize: 18 }}>🏅</span>
          <span style={{ fontSize: 13, color: '#fafafa', textTransform: 'uppercase' }}>
            Badge unlocked · {badgeNotice}
          </span>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { background: #08090b; min-height: 100vh; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .fade { animation: fadeIn 0.28s cubic-bezier(.2,.7,.2,1); }
        input::placeholder, textarea::placeholder { color: #54565c; }
        input, textarea, select { -webkit-user-select: text; user-select: text; }
        input:focus, textarea:focus { outline: none; border-color: rgba(255,255,255,0.6) !important; -webkit-tap-highlight-color: transparent; }
        input[type=range] { accent-color: #fafafa; width: 100%; }
        a { text-decoration: none; }
        button { font-family: inherit; }
        button:active { transform: scale(0.97); }
        select { background: #08090b; border: 1px solid #2a2d36; border-radius: 12px; padding: 13px 14px; color: #f4f3ef; font-family: inherit; font-size: 14px; outline: none; width: 100%; }
      `}</style>

      {/* HEADER */}
      <div style={C.hdr}>
        <button onClick={() => setTab('player')} style={{
          display: 'flex', alignItems: 'center', gap: 11,
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src="/dsm-logo.png" alt="Di Lorenzo Mindset" style={{
              width: 42, height: 42, objectFit: 'contain', display: 'block',
            }} />
            <div style={{
              position: 'absolute', bottom: -3, right: -5,
              minWidth: 18, height: 18, borderRadius: '50%',
              background: '#fafafa', color: '#000',
              border: '2px solid #000', padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: 0.5, fontWeight: 400,
            }}>{PLAYER.level}</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, fontWeight: 400, letterSpacing: 2.5, color: '#fafafa', lineHeight: 0.9, textTransform: 'uppercase' }}>Di Lorenzo</div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: '#8e8e8e', fontWeight: 600, marginTop: 3, textTransform: 'uppercase' }}>{PLAYER.levelTitle} · {PLAYER.xp.toLocaleString()} XP</div>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 12px', background: '#fafafa',
            border: '1px solid #fafafa', borderRadius: 999,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#000', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, fontWeight: 400, color: '#000', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5 }}>{streak}</span>
            <span style={{ fontSize: 9, letterSpacing: 1.6, color: '#000', fontWeight: 700, textTransform: 'uppercase' }}>day</span>
          </div>
          <button onClick={() => { setTab('locker'); setSelectedAthlete(null); }} style={{
            background: tab === 'locker' ? '#fafafa' : 'transparent',
            border: '1px solid #1c1c1c',
            borderRadius: 8, padding: '6px 10px', fontSize: 10,
            color: tab === 'locker' ? '#000' : '#8e8e8e', cursor: 'pointer', fontWeight: 600,
            letterSpacing: 1.4, textTransform: 'uppercase',
          }}>Locker</button>
          <button onClick={signOut} style={{
            background: 'transparent', border: '1px solid #1c1c1c',
            borderRadius: 8, padding: '6px 10px', fontSize: 10,
            color: '#8e8e8e', cursor: 'pointer', fontWeight: 600,
            letterSpacing: 1.4, textTransform: 'uppercase',
          }}>Out</button>
        </div>
      </div>

      {/* ── COACH NUDGE BANNER (shows above home content when active) ── */}
      {activeNudge && tab === 'home' && (
        <div style={{
          margin: '14px 22px 0', padding: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid #36363c',
          borderRadius: 14,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#000', border: '1px solid #36363c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
            fontStyle: 'italic', color: '#fafafa', fontWeight: 500, flexShrink: 0,
          }}>V</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.6, color: '#4a4a4a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              Coach V · {activeNudge.kind}
            </div>
            <div style={{ fontSize: 13, color: '#fafafa', lineHeight: 1.45, marginBottom: 10 }}>
              {activeNudge.message}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleActOnNudge} style={{
                padding: '6px 12px', background: '#fafafa', color: '#000',
                border: 'none', borderRadius: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Reply</button>
              <button onClick={handleDismissNudge} style={{
                padding: '6px 12px', background: 'transparent', color: '#8e8e8e',
                border: '1px solid #36363c', borderRadius: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HOME ── */}
      {tab === 'home' && (() => {
        const todayTasks = [
          { glyph: 'B', label: 'Ball Mastery', sub: 'Daily skills log', done: todayBMLogged, tab: 'ball' },
          { glyph: 'A', label: 'Action Steps', sub: 'After practice or game', done: todayActionLogged, tab: 'actions' },
          { glyph: 'W', label: 'Weekly Check-In', sub: currentWeek, done: checkinDone, tab: 'weekly' },
        ]
        const doneCount = todayTasks.filter(t => t.done).length
        const streakLabel = pct >= 70 ? 'Elite cadence' : pct >= 40 ? 'Building rhythm' : 'Get going'

        return (
        <div style={C.scroll} className="fade">
          {/* Greeting + name */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.4, color: '#8e8e8e', fontWeight: 600, textTransform: 'uppercase' }}>
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()}
            </div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 56, fontWeight: 400, letterSpacing: 1.5,
              color: '#fafafa', lineHeight: 0.95, marginTop: 6,
              textTransform: 'uppercase',
            }}>
              {profile?.full_name?.split(' ')[0] || 'Athlete'}<span style={{ color: '#4a4a4a' }}>.</span>
            </div>
          </div>

          <WeeklyRecapCard user={user} />

          {/* Mindset fuel — athletic pull quote */}
          <TiltCard tiltLimit={10} scale={1.02} style={{ borderRadius: 16, marginBottom: 14 }}>
          <div style={{ ...C.orange, marginBottom: 0 }}>
            <div style={{
              position: 'absolute', top: 16, right: 18,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 76, lineHeight: 0.75,
              color: '#1c1c1c', letterSpacing: 0,
            }}>&ldquo;</div>
            <span style={C.olbl}>Today&rsquo;s fuel</span>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28, fontWeight: 400, lineHeight: 1.05,
              letterSpacing: 0.5, color: '#fafafa',
              marginTop: 6, marginBottom: 14, paddingRight: 50,
              textTransform: 'uppercase',
            }}>{quote}</div>
            <div style={{
              fontSize: 10, color: '#8e8e8e', fontWeight: 600,
              letterSpacing: 2.4, textTransform: 'uppercase',
            }}>— Coach Valentino</div>
          </div>
          </TiltCard>

          {/* Daily quests */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={C.lbl}>Daily quests</span>
              <span style={{ fontSize: 10, letterSpacing: 1.4, color: '#fafafa', fontWeight: 600, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
                {quests.filter(q => q.progress >= q.target).length}/{quests.length} done
              </span>
            </div>
            {quests.map(q => (
              <QuestCard key={q.id} quest={q} onClick={() => {
                if (q.id === 'quest-coach') setTab('bot')
                else if (q.id === 'quest-action-2') setTab('actions')
                else if (q.id === 'quest-ball') setTab('ball')
              }} />
            ))}
          </div>

          {/* Voice journal */}
          <div style={{ marginBottom: 16 }}>
            <VoiceJournal user={user} />
          </div>

          {/* Today progress strip */}
          <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
          <div style={{ ...C.card, padding: 18, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={C.lbl}>Today</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fafafa', letterSpacing: 1.4, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
                {doneCount}/{todayTasks.length} complete
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {todayTasks.map((task, i) => (
                <button key={task.tab}
                  onClick={() => setTab(task.tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 4px',
                    background: 'transparent', border: 'none',
                    borderBottom: i < todayTasks.length - 1 ? '1px solid #1f2128' : 'none',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: task.done ? '1px solid rgba(74,222,128,0.4)' : '1px solid #2a2d36',
                    background: task.done ? 'rgba(74,222,128,0.10)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 14, fontStyle: 'italic', fontWeight: 600,
                    color: task.done ? '#4ade80' : '#8a8b8f',
                    flexShrink: 0,
                  }}>
                    {task.done ? '✓' : task.glyph}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f3ef', letterSpacing: -0.1 }}>{task.label}</div>
                    <div style={{ fontSize: 11, color: '#8a8b8f', marginTop: 2 }}>{task.sub}</div>
                  </div>
                  <div style={{ fontSize: 16, color: task.done ? '#4ade80' : '#54565c' }}>{task.done ? '' : '→'}</div>
                </button>
              ))}
            </div>
          </div>
          </TiltCard>

          {/* Weekly habits stat card */}
          <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
          <div style={{ ...C.card, padding: 20, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#1c1c1c" strokeWidth="3" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#fafafa" strokeWidth="3"
                    strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={`${2*Math.PI*30*(1-pct/100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)' }} />
                </svg>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, fontWeight: 400, color: '#fafafa',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: 1,
                }}>{pct}<span style={{ fontSize: 11, color: '#8e8e8e', marginLeft: 2 }}>%</span></div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: 2.4, color: '#4a4a4a', fontWeight: 600, textTransform: 'uppercase' }}>Week habits</div>
                <div style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 40, fontWeight: 400, color: '#fafafa',
                  marginTop: 4, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums', letterSpacing: 1,
                }}>
                  {completedHabits}<span style={{ fontSize: 22, color: '#4a4a4a' }}> / {totalHabits}</span>
                </div>
                <div style={{ fontSize: 11, color: '#fafafa', fontWeight: 600, marginTop: 6, letterSpacing: 1.4, textTransform: 'uppercase' }}>{streakLabel}</div>
              </div>
            </div>
          </div>
          </TiltCard>

          {/* Explore — reference items only. Nav-bar tabs surface everything else. */}
          <div style={{ marginTop: 18, marginBottom: 14 }}>
            <span style={C.lbl}>More</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Calendar',        'Workouts & games',      'calendar'],
                ['Mental Tools',    'Train your mind',        'mental'],
                ['Habit Tracker',   'Deep streak history',    'tracker'],
                ['Weekly Check-In', 'Sunday reflection',      'weekly'],
                ['Course',          'Video lessons',          'course'],
                ['For Parents',     'Best-practices guide',   'parents'],
              ].map(([label, sub, target]) => (
                <TiltCard key={target} tiltLimit={14} scale={1.04} style={{ borderRadius: 14 }}>
                <button onClick={() => setTab(target)} style={{
                  width: '100%',
                  background: '#0a0a0a', border: '1px solid #1c1c1c',
                  borderRadius: 14, padding: '14px 14px', textAlign: 'left',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  fontFamily: 'inherit', color: 'inherit',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa', letterSpacing: -0.1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#8e8e8e', marginTop: 3 }}>{sub}</div>
                  <div style={{
                    position: 'absolute', bottom: 12, right: 12,
                    fontSize: 12, color: '#54565c',
                  }}>→</div>
                </button>
                </TiltCard>
              ))}
            </div>
          </div>

          <button style={C.btn} onClick={handleLogDay}>Log today</button>

          {profile && (
            <div style={{
              textAlign: 'center', marginTop: 18,
              padding: '14px 0',
              fontSize: 11, color: '#54565c',
              letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
            }}>
              {profile.full_name || user.email}
              {isCoach && <span style={{ color: '#fafafa', marginLeft: 8 }}>· Coach</span>}
              {profile.assigned_coach && !isCoach && (
                <div style={{ marginTop: 6, color: '#8a8b8f' }}>
                  Mentor — <span style={{ color: '#fafafa' }}>{profile.assigned_coach}</span>
                </div>
              )}
            </div>
          )}
        </div>
        )
      })()}

      {/* ── ACTION STEPS ── */}
      {tab === 'actions' && (
        <ActionsTab user={user} profile={profile} submissions={submissions} setSubmissions={setSubmissions} setTab={setTab}
          onActionSaved={async () => {
            await bumpQuestAndRefresh('quest-action-2', 1)
            const newBadges = await evaluateBadges(user.id)
            if (newBadges.length) showBadgeNotice(newBadges)
          }} />
      )}

      {/* ── BALL MASTERY ── */}
      {tab === 'ball' && (
        <div className="fade">
        <ActionsSubNav active="ball" setTab={setTab} />
        <div style={C.scroll}>
          <div style={C.title}>Ball Mastery</div>
          <div style={C.sub}>DAILY SKILLS LOG</div>
          {todayBMLogged ? (
            <div style={{ ...C.card, borderColor:'#1a4a1a', textAlign:'center', padding:36 }}>
              <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
              <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>TODAY LOGGED!</div>
              <div style={{ fontSize:13,color:'#555' }}>Ball mastery done. Come back tomorrow! 🔥</div>
            </div>
          ) : <>
            <div style={C.orange}>
              <span style={C.olbl}>LOG TODAY'S TRAINING</span>
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Tap each skill you trained. Set your reps. Be honest -- this is YOUR progress. 🦈</div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>SKILLS PRACTICED</span>
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                {BALL_MASTERY_SKILLS.map(skill => (
                  <div key={skill.id} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <button onClick={() => setBallMastery(p => ({ ...p, [skill.id]: (p[skill.id]?.reps||0)>0 ? {reps:0} : {reps:50} }))}
                      style={{ width:34,height:34,borderRadius:'50%',background:(ballMastery[skill.id]?.reps||0)>0?'#fafafa':'#1e1e1e',border:'none',fontSize:15,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:(ballMastery[skill.id]?.reps||0)>0?'#000':'#fff' }}>
                      {(ballMastery[skill.id]?.reps||0)>0?'✓':skill.icon}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:13,fontWeight:800 }}>{skill.label}</div>
                        {(skill.videos||[]).map((v,vi)=>(
                          <a key={vi} href={v.url} target="_blank" rel="noreferrer"
                            style={{ fontSize:9, color:'#fafafa', fontWeight:800, letterSpacing:1, textDecoration:'none', background:'#1e1e1e', borderRadius:6, padding:'2px 6px' }}>
                            ▶ {v.label}
                          </a>
                        ))}
                      </div>
                      {(ballMastery[skill.id]?.reps||0)>0 && (
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
                          <span style={{ fontSize:10,color:'#555' }}>Reps:</span>
                          <input type="number" min="1" max="9999"
                            style={{ ...C.inp,width:80,padding:'4px 8px',fontSize:13 }}
                            value={ballMastery[skill.id]?.reps||50}
                            onChange={e => setBallMastery(p => ({ ...p, [skill.id]:{...p[skill.id],reps:parseInt(e.target.value)||0} }))} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>NOTES</span>
              <textarea style={{ ...C.ta,height:70 }} placeholder="How did it go? What to improve tomorrow?"
                value={ballMastery.notes||''} onChange={e => setBallMastery(p => ({ ...p,notes:e.target.value }))} />
            </div>
            <div style={{ ...C.card,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:9,color:'#555',letterSpacing:3,fontWeight:700,marginBottom:4 }}>SKILLS</div>
                <div style={{ fontSize:26,fontWeight:900,color:'#fafafa' }}>{Object.keys(ballMastery).filter(k=>k!=='notes'&&(ballMastery[k]?.reps||0)>0).length}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:9,color:'#555',letterSpacing:3,fontWeight:700,marginBottom:4 }}>TOTAL REPS</div>
                <div style={{ fontSize:26,fontWeight:900,color:'#fafafa' }}>{Object.entries(ballMastery).filter(([k])=>k!=='notes').reduce((a,[,v])=>a+(v?.reps||0),0)}</div>
              </div>
            </div>
            <button style={C.btn} onClick={handleSaveBall} disabled={savingBall}>
              {savingBall?'SAVING...':'⚽ LOG TODAY\'S TRAINING'}
            </button>
          </>}
          {ballHistory.length > 0 && <>
            <span style={{ ...C.lbl,marginTop:16 }}>RECENT SESSIONS</span>
            {ballHistory.slice(0,7).map((b,i) => (
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div style={{ fontSize:10,color:'#fafafa',fontWeight:700,letterSpacing:2 }}>{b.date}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{b.total_skills} skills · {b.total_reps} reps</div>
                </div>
                {b.notes && <div style={{ fontSize:11,color:'#555',marginTop:5 }}>{b.notes}</div>}
              </div>
            ))}
          </>}
        </div>
        </div>
      )}

      {/* ── WORKOUTS (Trainerize-style) ── */}
      {tab === 'workouts' && (
        <div>
          <ActionsSubNav active="workouts" setTab={setTab} />
          <WorkoutsTab user={user} />
        </div>
      )}

      {/* ── NUTRITION (Body / Nutrition) ── */}
      {tab === 'nutrition' && (
        <div>
          <BodySubNav active="nutrition" setTab={setTab} />
          <NutritionTab user={user} />
        </div>
      )}

      {/* ── CALENDAR ── */}
      {tab === 'calendar' && <CalendarTab />}

      {/* ── BODY STATS (Body / Stats) ── */}
      {tab === 'body' && (
        <div>
          <BodySubNav active="body" setTab={setTab} />
          <BodyStatsTab user={user} />
        </div>
      )}

      {/* ── INBOX (Coach / Inbox) ── */}
      {tab === 'inbox' && (
        <div>
          <CoachSubNav active="inbox" setTab={setTab} />
          <InboxTab />
        </div>
      )}

      {/* ── PLAYER (gamification hub) ── */}
      {tab === 'player' && <PlayerTab profile={profile} user={user} />}

      {/* ── COURSE (video lessons) ── */}
      {tab === 'course' && <CourseTab />}

      {/* ── WEEKLY CHECK-IN ── */}
      {tab === 'weekly' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>WEEKLY CHECK-IN</div>
          <div style={C.sub}>{currentWeek} -- REFLECT & LOCK IN</div>
          {checkinDone ? (
            <div>
              <div style={{ ...C.card,borderColor:'#1a4a1a',textAlign:'center',padding:36,marginBottom:16 }}>
                <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
                <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>THIS WEEK SUBMITTED!</div>
                <div style={{ fontSize:13,color:'#555',marginBottom:16 }}>Coach Valentino has your check-in. See you next week. 🔥</div>
                <button onClick={()=>setCheckinDone(false)}
                  style={{ background:'#1e1e1e',border:'1px solid #333',borderRadius:10,padding:'10px 18px',fontSize:11,fontWeight:800,color:'#aaa',cursor:'pointer',fontFamily:'inherit',letterSpacing:1 }}>
                  ✏️ EDIT / RE-SUBMIT THIS WEEK
                </button>
              </div>
              {checkinHistory.length > 0 && <>
                <span style={C.lbl}>PAST CHECK-INS</span>
                {checkinHistory.map((c,i) => (
                  <div key={i} style={C.card}>
                    <div style={{ fontSize:10,color:'#fafafa',fontWeight:700,letterSpacing:2,marginBottom:8 }}>{c.week}</div>
                    <div style={{ display:'flex',gap:16,marginBottom:8 }}>
                      {[['energy_level','⚡ ENERGY'],['confidence_level','💪 CONFIDENCE'],['sessions_completed','🏃 SESSIONS']].map(([k,l])=>(
                        <div key={k} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:18,fontWeight:900,color:'#fafafa' }}>{c[k]}</div>
                          <div style={{ fontSize:8,color:'#555',letterSpacing:1,fontWeight:700 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:12,color:'#aaa' }}>🏆 {c.biggest_win}</div>
                    {c.goal_next_week && <div style={{ fontSize:12,color:'#666',marginTop:4 }}>🎯 {c.goal_next_week}</div>}
                  </div>
                ))}
              </>}
            </div>
          ) : <>
            <div style={C.orange}>
              <span style={C.olbl}>WEEK: {currentWeek} · PROGRAM WEEK {profile?.program_week||1}</span>
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Time to reflect. Be real with yourself -- that's how you grow. 🦈</div>
            </div>

            {/* ALWAYS VISIBLE: Confidence + Energy + Sessions */}
            <div style={C.card}>
              <span style={C.lbl}>RATE YOUR WEEK</span>
              {[['energyLevel','⚡ Energy Level',1,10],['confidenceLevel','💪 Confidence 1-10',1,10],['sessionsCompleted','🏃 Sessions Completed',0,14]].map(([k,l,min,max])=>(
                <div key={k} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:12,color:'#aaa' }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:900,color:'#fafafa' }}>{checkin[k]}{k==='sessionsCompleted'?'':'/10'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={checkin[k]} onChange={e=>setCI(k,parseInt(e.target.value))} style={{ accentColor:'#fafafa',width:'100%' }} />
                </div>
              ))}
            </div>

            {/* ALWAYS VISIBLE: Wins + Challenge */}
            <div style={C.card}>
              <span style={C.lbl}>🏆 BIGGEST WIN THIS WEEK *</span>
              <textarea style={{ ...C.ta,height:65,marginBottom:12 }} placeholder="What are you most proud of?" value={checkin.biggestWin} onChange={e=>setCI('biggestWin',e.target.value)} />
              <span style={C.lbl}>💥 BIGGEST CHALLENGE</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="What was hardest this week?" value={checkin.biggestChallenge} onChange={e=>setCI('biggestChallenge',e.target.value)} />
            </div>

            {/* ALWAYS VISIBLE: Action Steps */}
            <div style={C.card}>
              <span style={C.lbl}>✅ ACTION STEPS THIS WEEK</span>
              <div style={{ fontSize:12,color:'#555',marginBottom:10 }}>How many times did you use the DSM tools?</div>
              {[['sharkMoment','🦈 SHARK MOMENT','When did you take a fearless risk?'],['goldfishMoment','🐠 GOLDFISH MOMENT','When did you forget a mistake fast?'],['selfTalkMoment','💬 SELF TALK MOMENT','When did you control your inner voice?']].map(([k,l,p])=>(
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9,color:'#fafafa',letterSpacing:2,fontWeight:700,marginBottom:5 }}>{l}</div>
                  <textarea style={{ ...C.ta,height:55 }} placeholder={p} value={checkin[k]} onChange={e=>setCI(k,e.target.value)} />
                </div>
              ))}
            </div>

            {/* ALWAYS VISIBLE: Ball Mastery */}
            <div style={C.card}>
              <span style={C.lbl}>⚽ BALL MASTERY THIS WEEK</span>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                <span style={{ fontSize:12,color:'#aaa' }}>Sessions completed</span>
                <span style={{ fontSize:14,fontWeight:900,color:'#fafafa' }}>{checkin.sessionsCompleted}</span>
              </div>
              <div style={{ fontSize:11,color:'#555',marginBottom:8 }}>Log your sessions in the Ball Mastery tab after each training.</div>
              <div style={{ display:'flex',gap:6 }}>
                {[0,1,2,3,4,5,6,7].map(n=>(
                  <button key={n} onClick={()=>setCI('sessionsCompleted',n)}
                    style={{ flex:1,background:checkin.sessionsCompleted===n?'#fafafa':'#1e1e1e',border:'none',borderRadius:6,padding:'8px 4px',fontSize:11,fontWeight:800,color:checkin.sessionsCompleted===n?'#000':'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* WEEK 4+: Goal Setting */}
            {(profile?.program_week||1) >= 4 ? (
              <div style={{ ...C.card,borderColor:'#e5e5e5' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                  <div style={{ background:'#fafafa',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#000' }}>WEEK 4+</div>
                  <span style={C.lbl}>🎯 GOAL SETTING</span>
                </div>
                <span style={C.lbl}>MY SMART GOAL THIS WEEK</span>
                <textarea style={{ ...C.ta,height:65,marginBottom:10 }} placeholder="Specific, Measurable, Achievable goal for this week..." value={checkin.smartGoal} onChange={e=>setCI('smartGoal',e.target.value)} />
                <span style={C.lbl}>PROGRESS ON LAST WEEK'S GOAL</span>
                <textarea style={{ ...C.ta,height:55,marginBottom:10 }} placeholder="How did you do on last week's goal?" value={checkin.goalProgress} onChange={e=>setCI('goalProgress',e.target.value)} />
                <span style={C.lbl}>🎯 GOAL FOR NEXT WEEK</span>
                <textarea style={{ ...C.ta,height:65 }} placeholder="What's your #1 mental focus next week?" value={checkin.goalNextWeek} onChange={e=>setCI('goalNextWeek',e.target.value)} />
              </div>
            ) : (
              <div style={{ ...C.card,opacity:0.4 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ background:'#333',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff' }}>WEEK 4</div>
                  <span style={{ fontSize:12,fontWeight:800,color:'#555' }}>🎯 Goal Setting -- Unlocks at Week 4</span>
                  <div style={{ marginLeft:'auto',fontSize:12 }}>🔒</div>
                </div>
              </div>
            )}

            {/* WEEK 5+: Visualization + Morning Routine */}
            {(profile?.program_week||1) >= 5 ? (
              <div style={{ ...C.card,borderColor:'#ffaa00' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
                  <div style={{ background:'#ffaa00',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#000' }}>WEEK 5+</div>
                  <span style={C.lbl}>👁️ VISUALIZATION & MORNING ROUTINE</span>
                </div>

                {/* Visualization */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:13,fontWeight:800 }}>👁️ Did you visualize this week?</span>
                    <div style={{ display:'flex',gap:6 }}>
                      {[['Yes',true],['No',false]].map(([l,v])=>(
                        <button key={l} onClick={()=>setCI('didVisualization',v)}
                          style={{ background:checkin.didVisualization===v?'#fafafa':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:800,color:checkin.didVisualization===v?'#000':'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {checkin.didVisualization && (
                    <textarea style={{ ...C.ta,height:55 }} placeholder="What did you visualize? How did it feel?"
                      value={checkin.visualizationNotes} onChange={e=>setCI('visualizationNotes',e.target.value)} />
                  )}
                </div>

                {/* Morning Routine */}
                <div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <span style={{ fontSize:13,fontWeight:800 }}>🌅 Did you do your morning routine?</span>
                    <div style={{ display:'flex',gap:6 }}>
                      {[['Yes',true],['No',false]].map(([l,v])=>(
                        <button key={l} onClick={()=>setCI('didMorningRoutine',v)}
                          style={{ background:checkin.didMorningRoutine===v?'#fafafa':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:800,color:checkin.didMorningRoutine===v?'#000':'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {checkin.didMorningRoutine && (
                    <textarea style={{ ...C.ta,height:55 }} placeholder="Describe your routine..."
                      value={checkin.morningRoutineNotes} onChange={e=>setCI('morningRoutineNotes',e.target.value)} />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ ...C.card,opacity:0.4 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <div style={{ background:'#333',borderRadius:6,padding:'2px 8px',fontSize:9,fontWeight:800,color:'#fff' }}>WEEK 5</div>
                  <span style={{ fontSize:12,fontWeight:800,color:'#555' }}>👁️ Visualization & Morning Routine -- Unlocks at Week 5</span>
                  <div style={{ marginLeft:'auto',fontSize:12 }}>🔒</div>
                </div>
              </div>
            )}

            {/* ALWAYS: Message to coach */}
            <div style={C.card}>
              <span style={C.lbl}>💬 MESSAGE TO COACH VALENTINO</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="Anything you want Coach Valentino to know?" value={checkin.messageToCoach} onChange={e=>setCI('messageToCoach',e.target.value)} />
            </div>

            <button style={C.btn} onClick={handleSubmitCheckin} disabled={savingCheckin}>
              {savingCheckin?'SUBMITTING...':'📋 SUBMIT WEEKLY CHECK-IN'}
            </button>
          </>}
        </div>
      )}

      {/* ── TRACKER ── */}
      {tab === 'tracker' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>TRACKER</div>
          <div style={C.sub}>WEEKLY HABIT TRACKER</div>
          <div style={C.card}>
            <div style={{ display:'flex',alignItems:'center',gap:14 }}>
              <div style={{ fontSize:48,fontWeight:900,color:'#fafafa',lineHeight:1 }}>{streak}</div>
              <div>
                <div style={{ fontSize:14,fontWeight:800 }}>DAY STREAK</div>
                <div style={{ fontSize:11,color:'#555',marginTop:2 }}>Keep showing up every day.</div>
                <button style={{ ...C.bsm,marginTop:8 }} onClick={handleLogDay}>+ LOG DAY</button>
              </div>
            </div>
          </div>
          <div style={{ ...C.card,overflowX:'auto' }}>
            <div style={{ display:'flex',minWidth:290,marginBottom:8 }}>
              <div style={{ width:110,flexShrink:0 }}/>
              {DAYS.map((d,i)=><div key={i} style={{ flex:1,textAlign:'center',fontSize:10,fontWeight:700,color:'#555' }}>{d}</div>)}
            </div>
            {habits.map((habit,hi)=>(
              <div key={hi} style={{ display:'flex',alignItems:'center',marginBottom:6,minWidth:290 }}>
                <div style={{ width:110,fontSize:10,color:'#aaa',fontWeight:600,paddingRight:6,flexShrink:0 }}>{habit.label}</div>
                {habit.days.map((done,di)=>(
                  <div key={di} onClick={()=>toggleHabit(hi,di)}
                    style={{ flex:1,height:26,borderRadius:5,background:done?'#fafafa':'#1e1e1e',margin:'0 2px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:done?'#000':'#fff',fontWeight:800 }}>
                    {done?'✓':''}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={C.card}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <span style={C.lbl}>THIS WEEK</span>
                <div style={{ fontSize:28,fontWeight:900 }}>{completedHabits}<span style={{ fontSize:12,color:'#555' }}>/{totalHabits}</span></div>
              </div>
              <div style={{ background:pct>=70?'#fafafa':'#1e1e1e',padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:800,color:pct>=70?'#000':'#fafafa' }}>
                {pct>=70?'🔥 ELITE':pct>=40?'⚡ GOOD':'📈 GROW'}
              </div>
            </div>
            <div style={{ height:4,background:'#1e1e1e',borderRadius:3,marginTop:10,overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${pct}%`,background:'#fafafa',borderRadius:3 }}/>
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESS ── */}
      {tab === 'progress' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>PROGRESS</div>
          <div style={C.sub}>YOUR JOURNEY OVER TIME</div>

          {/* PDF DOWNLOAD */}
          {(submissions.length > 0 || checkinHistory.length > 0) && (
            <button onClick={()=>downloadReport(profile, submissions, checkinHistory, ballHistory)}
              style={{ ...C.btn, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              📥 SAVE PROGRESS REPORT PDF
            </button>
          )}

          {/* SECTION TABS */}
          {(() => {
            const hasAny = submissions.length > 0 || checkinHistory.length > 0 || ballHistory.length > 0
            if (!hasAny) return (
              <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                <div style={{ fontSize:44, marginBottom:12 }}>📈</div>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO DATA YET</div>
                <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>Start logging action steps, weekly check-ins, and ball mastery to see your full progress here. 🦈</div>
              </div>
            )

            const progTabs = [
              { id:'overview', label:'📊 Overview' },
              { id:'actions', label:'✅ Actions' },
              { id:'checkins', label:'📋 Check-Ins' },
              { id:'ball', label:'⚽ Ball' },
            ]

            return (
              <>
                {/* Tab selector */}
                <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto' }}>
                  {progTabs.map(t=>(
                    <button key={t.id} onClick={()=>setProgressTab(t.id)}
                      style={{ flexShrink:0, background:progressTab===t.id?'#fafafa':'#1e1e1e', border:'none', borderRadius:10, padding:'8px 12px', fontSize:10, fontWeight:800, color:progressTab===t.id?'#000':'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── OVERVIEW TAB ── */}
                {progressTab==='overview' && <>
                  {/* Stats summary */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                    {[
                      ['✅', submissions.length, 'ACTIONS'],
                      ['📋', checkinHistory.length, 'CHECK-INS'],
                      ['⚽', ballHistory.length, 'BALL SESSIONS'],
                    ].map(([icon,val,lbl])=>(
                      <div key={lbl} style={{ ...C.card, textAlign:'center', padding:12 }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                        <div style={{ fontSize:26, fontWeight:900, color:'#fafafa' }}>{val}</div>
                        <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Performance trend from action steps */}
                  {submissions.length > 0 && (()=>{
                    const avg = key => (submissions.reduce((a,s)=>a+(s[key]||0),0)/submissions.length).toFixed(1)
                    return (<>
                      <span style={C.lbl}>AVG PERFORMANCE RATINGS</span>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:14 }}>
                        {[['conditioning','💪','COND'],['strength','🏋️','STR'],['technical','⚽','TECH'],['mental','🧠','MNT']].map(([k,icon,lbl])=>(
                          <div key={k} style={{ ...C.card, textAlign:'center', padding:10 }}>
                            <div style={{ fontSize:16 }}>{icon}</div>
                            <div style={{ fontSize:22, fontWeight:900, color:'#fafafa' }}>{avg(k)}</div>
                            <div style={{ fontSize:7, color:'#555', fontWeight:700, letterSpacing:1 }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </>)
                  })()}

                  {/* Energy & Confidence chart */}
                  {checkinHistory.length > 0 && <>
                    <span style={C.lbl}>ENERGY & CONFIDENCE OVER TIME</span>
                    <div style={{ ...C.card, padding:16, marginBottom:14 }}>
                      <div style={{ display:'flex', gap:14, marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8,height:8,borderRadius:'50%',background:'#fafafa' }}/><span style={{ fontSize:9,color:'#aaa',fontWeight:700 }}>ENERGY</span></div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8,height:8,borderRadius:'50%',background:'#ff8c00' }}/><span style={{ fontSize:9,color:'#aaa',fontWeight:700 }}>CONFIDENCE</span></div>
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100 }}>
                        {[...checkinHistory].reverse().map((c,i)=>(
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:80 }}>
                              <div style={{ flex:1, background:'#fafafa', borderRadius:'2px 2px 0 0', height:`${(c.energy_level/10)*100}%`, minHeight:3 }}/>
                              <div style={{ flex:1, background:'#ff8c00', borderRadius:'2px 2px 0 0', height:`${(c.confidence_level/10)*100}%`, minHeight:3 }}/>
                            </div>
                            <div style={{ fontSize:6,color:'#555',fontWeight:700 }}>W{c.week?.split('-W')[1]||''}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Week over week */}
                    {checkinHistory.length >= 2 && (()=>{
                      const latest = checkinHistory[0], prev = checkinHistory[1]
                      const eUp = latest.energy_level >= prev.energy_level
                      const cUp = latest.confidence_level >= prev.confidence_level
                      return (
                        <div style={{ ...C.card, borderColor: eUp&&cUp?'#1a4a1a':'#1e1e1e', marginBottom:14 }}>
                          <span style={C.lbl}>WEEK OVER WEEK TREND</span>
                          <div style={{ display:'flex', gap:16 }}>
                            <div><div style={{ fontSize:13,fontWeight:800 }}>{eUp?'⬆️':'⬇️'} Energy {eUp?'+':''}{latest.energy_level-prev.energy_level}</div><div style={{ fontSize:10,color:'#555' }}>vs last week</div></div>
                            <div><div style={{ fontSize:13,fontWeight:800 }}>{cUp?'⬆️':'⬇️'} Confidence {cUp?'+':''}{latest.confidence_level-prev.confidence_level}</div><div style={{ fontSize:10,color:'#555' }}>vs last week</div></div>
                          </div>
                        </div>
                      )
                    })()}
                  </>}

                  {/* Mental tools overview */}
                  {submissions.length > 0 && <>
                    <span style={C.lbl}>MENTAL TOOLS USAGE</span>
                    <div style={{ ...C.card, marginBottom:14 }}>
                      {[['shark','🦈','Shark Mentality'],['goldfish','🐠','Goldfish Mentality'],['selftalk','💬','Self Talk'],['tuneout','🔇','Tune Out']].map(([k,icon,lbl])=>{
                        const cnt = submissions.filter(s=>s[k+'_used']).length
                        const pct = Math.round((cnt/submissions.length)*100)
                        return (
                          <div key={k} style={{ marginBottom:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:12, fontWeight:700 }}>{icon} {lbl}</span>
                              <span style={{ fontSize:12, fontWeight:900, color:'#fafafa' }}>{pct}% <span style={{ fontSize:9,color:'#555' }}>({cnt}/{submissions.length})</span></span>
                            </div>
                            <div style={{ height:5, background:'#1e1e1e', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:'#fafafa', borderRadius:3 }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>}

                  {/* Badges */}
                  {(()=>{
                    const badges = [
                      { icon:'🦈', label:'FIRST SHARK', desc:'Submitted first action step', earned:submissions.length>=1 },
                      { icon:'🔥', label:'7 DAY STREAK', desc:'Logged 7 days in a row', earned:streak>=7 },
                      { icon:'⚡', label:'30 DAY LEGEND', desc:'Logged 30 days in a row', earned:streak>=30 },
                      { icon:'⚽', label:'BALL MASTER', desc:'Logged 10 ball mastery sessions', earned:ballHistory.length>=10 },
                      { icon:'📋', label:'CHECK-IN PRO', desc:'Completed 4 weekly check-ins', earned:checkinHistory.length>=4 },
                      { icon:'💪', label:'ACTION HERO', desc:'Submitted 10 action steps', earned:submissions.length>=10 },
                      { icon:'🏆', label:'DSM ELITE', desc:'Completed 8 weekly check-ins', earned:checkinHistory.length>=8 },
                      { icon:'🧠', label:'MINDSET ATHLETE', desc:'Used all 4 mental tools', earned:submissions.some(s=>s.shark_used&&s.goldfish_used&&s.selftalk_used&&s.tuneout_used) },
                    ]
                    const earned = badges.filter(b=>b.earned), locked = badges.filter(b=>!b.earned)
                    return (<>
                      <span style={C.lbl}>🏅 BADGES ({earned.length}/{badges.length})</span>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                        {earned.map((b,i)=>(
                          <div key={i} style={{ ...C.card, borderColor:'#fafafa', textAlign:'center', padding:14 }}>
                            <div style={{ fontSize:28, marginBottom:5 }}>{b.icon}</div>
                            <div style={{ fontSize:9, fontWeight:900, letterSpacing:1, color:'#fafafa', marginBottom:3 }}>{b.label}</div>
                            <div style={{ fontSize:8, color:'#555' }}>{b.desc}</div>
                          </div>
                        ))}
                        {locked.map((b,i)=>(
                          <div key={i} style={{ ...C.card, textAlign:'center', padding:14, opacity:0.3 }}>
                            <div style={{ fontSize:28, marginBottom:5 }}>🔒</div>
                            <div style={{ fontSize:9, fontWeight:900, letterSpacing:1, color:'#555', marginBottom:3 }}>{b.label}</div>
                            <div style={{ fontSize:8, color:'#444' }}>{b.desc}</div>
                          </div>
                        ))}
                      </div>
                    </>)
                  })()}
                </>}

                {/* ── ACTION STEPS TAB ── */}
                {progressTab==='actions' && <>
                  {submissions.length === 0 ? (
                    <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                      <div style={{ fontSize:13, color:'#555' }}>No action steps logged yet. Hit the Actions tab to log your first session! ✅</div>
                    </div>
                  ) : <>
                    {/* Summary stats */}
                    <div style={{ ...C.card, marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Total Sessions</div>
                        <div style={{ fontSize:28, fontWeight:900, color:'#fafafa' }}>{submissions.length}</div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6 }}>
                        {[['conditioning','💪','COND'],['strength','🏋️','STR'],['technical','⚽','TECH'],['mental','🧠','MNT']].map(([k,icon,lbl])=>{
                          const avg = (submissions.reduce((a,s)=>a+(s[k]||0),0)/submissions.length).toFixed(1)
                          return (
                            <div key={k} style={{ background:'#0a0a0a', borderRadius:8, padding:'8px 4px', textAlign:'center' }}>
                              <div style={{ fontSize:14 }}>{icon}</div>
                              <div style={{ fontSize:18, fontWeight:900, color:'#fafafa' }}>{avg}</div>
                              <div style={{ fontSize:7, color:'#555', fontWeight:700, letterSpacing:1 }}>{lbl} AVG</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* All sessions list */}
                    <span style={C.lbl}>ALL SESSIONS ({submissions.length})</span>
                    {submissions.map((s,i)=>(
                      <div key={i} style={{ ...C.card, marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:11, color:'#fafafa', fontWeight:800, letterSpacing:1 }}>{s.date}</div>
                            <div style={{ fontSize:9, color:'#555', fontWeight:700 }}>{s.day_of_week} · {s.session_type}</div>
                          </div>
                          <div style={{ fontSize:13, fontWeight:800 }}>{s.did_action_steps==='Yes'?'✅':'❌'}</div>
                        </div>
                        <div style={{ display:'flex', gap:10, marginBottom:8 }}>
                          {['conditioning','strength','technical','mental'].map(k=>(
                            <div key={k} style={{ textAlign:'center' }}>
                              <div style={{ fontSize:18, fontWeight:900, color:'#fafafa' }}>{s[k]}</div>
                              <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                            </div>
                          ))}
                          <div style={{ textAlign:'center', marginLeft:'auto' }}>
                            <div style={{ fontSize:18, fontWeight:900, color:'#ff8c00' }}>{((( s.conditioning||0)+(s.strength||0)+(s.technical||0)+(s.mental||0))/4).toFixed(1)}</div>
                            <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>AVG</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {[['shark','🦈'],['goldfish','🐠'],['selftalk','💬'],['tuneout','🔇']].map(([k,icon])=>s[k+'_used']&&(
                            <span key={k} style={{ background:'#1a1a1a', border:'1px solid #fafafa', borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:700, color:'#fafafa' }}>{icon} {k.toUpperCase()}</span>
                          ))}
                        </div>
                        {(s.shark_comments||s.goldfish_comments||s.selftalk_comments||s.tuneout_comments) && (
                          <div style={{ marginTop:8, fontSize:11, color:'#666', lineHeight:1.5 }}>
                            {s.shark_comments && <div>🦈 {s.shark_comments}</div>}
                            {s.goldfish_comments && <div>🐠 {s.goldfish_comments}</div>}
                            {s.selftalk_comments && <div>💬 {s.selftalk_comments}</div>}
                            {s.tuneout_comments && <div>🔇 {s.tuneout_comments}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </>}
                </>}

                {/* ── CHECK-INS TAB ── */}
                {progressTab==='checkins' && <>
                  {checkinHistory.length === 0 ? (
                    <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                      <div style={{ fontSize:13, color:'#555' }}>No weekly check-ins yet. Complete your first one from the Weekly tab! 📋</div>
                    </div>
                  ) : <>
                    {/* Summary averages */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {[
                        ['⚡','ENERGY AVG',(checkinHistory.reduce((a,c)=>a+c.energy_level,0)/checkinHistory.length).toFixed(1)],
                        ['💪','CONF AVG',(checkinHistory.reduce((a,c)=>a+c.confidence_level,0)/checkinHistory.length).toFixed(1)],
                        ['🏃','SESSIONS AVG',(checkinHistory.reduce((a,c)=>a+c.sessions_completed,0)/checkinHistory.length).toFixed(1)],
                      ].map(([icon,lbl,val])=>(
                        <div key={lbl} style={{ ...C.card, textAlign:'center', padding:12 }}>
                          <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                          <div style={{ fontSize:22, fontWeight:900, color:'#fafafa' }}>{val}</div>
                          <div style={{ fontSize:7, color:'#555', letterSpacing:1, fontWeight:700 }}>{lbl}</div>
                        </div>
                      ))}
                    </div>

                    {/* All check-ins list */}
                    <span style={C.lbl}>ALL WEEKLY CHECK-INS ({checkinHistory.length})</span>
                    {checkinHistory.map((c,i)=>(
                      <div key={i} style={{ ...C.card, marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ fontSize:11, color:'#fafafa', fontWeight:800, letterSpacing:1 }}>{c.week}</div>
                          <div style={{ display:'flex', gap:12 }}>
                            {[['⚡',c.energy_level],['💪',c.confidence_level],['🏃',c.sessions_completed]].map(([icon,val],j)=>(
                              <div key={j} style={{ textAlign:'center' }}>
                                <div style={{ fontSize:16, fontWeight:900, color:'#fafafa' }}>{val}</div>
                                <div style={{ fontSize:9 }}>{icon}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {c.biggest_win && <div style={{ fontSize:12, color:'#aaa', marginBottom:5 }}>🏆 <strong style={{ color:'#ccc' }}>Win:</strong> {c.biggest_win}</div>}
                        {c.biggest_challenge && <div style={{ fontSize:12, color:'#aaa', marginBottom:5 }}>💥 <strong style={{ color:'#ccc' }}>Challenge:</strong> {c.biggest_challenge}</div>}
                        {c.shark_moment && <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>🦈 {c.shark_moment}</div>}
                        {c.goldfish_moment && <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>🐠 {c.goldfish_moment}</div>}
                        {c.self_talk_moment && <div style={{ fontSize:11, color:'#666', marginBottom:3 }}>💬 {c.self_talk_moment}</div>}
                        {c.goal_next_week && <div style={{ fontSize:12, color:'#fafafa', marginTop:6 }}>🎯 Next week: {c.goal_next_week}</div>}
                        {c.message_to_coach && <div style={{ fontSize:11, color:'#888', fontStyle:'italic', marginTop:6, borderTop:'1px solid #1e1e1e', paddingTop:6 }}>"{c.message_to_coach}"</div>}
                      </div>
                    ))}
                  </>}
                </>}

                {/* ── BALL MASTERY TAB ── */}
                {progressTab==='ball' && <>
                  {ballHistory.length === 0 ? (
                    <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                      <div style={{ fontSize:13, color:'#555' }}>No ball mastery sessions yet. Log your first one from the Ball tab! ⚽</div>
                    </div>
                  ) : <>
                    <div style={{ ...C.card, marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Total Sessions</div>
                        <div style={{ fontSize:28, fontWeight:900, color:'#fafafa' }}>{ballHistory.length}</div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontSize:13, fontWeight:800 }}>Total Reps</div>
                        <div style={{ fontSize:28, fontWeight:900, color:'#fafafa' }}>{ballHistory.reduce((a,b)=>a+(b.total_reps||0),0)}</div>
                      </div>
                    </div>
                    <span style={C.lbl}>ALL BALL MASTERY SESSIONS ({ballHistory.length})</span>
                    {ballHistory.map((b,i)=>(
                      <div key={i} style={{ ...C.card, marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <div style={{ fontSize:11, color:'#fafafa', fontWeight:800 }}>{b.date}</div>
                          <div style={{ display:'flex', gap:12 }}>
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontSize:16, fontWeight:900, color:'#fafafa' }}>{b.total_skills}</div>
                              <div style={{ fontSize:7, color:'#555', fontWeight:700 }}>SKILLS</div>
                            </div>
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontSize:16, fontWeight:900, color:'#ff8c00' }}>{b.total_reps}</div>
                              <div style={{ fontSize:7, color:'#555', fontWeight:700 }}>REPS</div>
                            </div>
                          </div>
                        </div>
                        {b.notes && <div style={{ fontSize:11, color:'#666', marginTop:4 }}>{b.notes}</div>}
                        {b.skills && (()=>{
                          try {
                            const sk = typeof b.skills==='string'?JSON.parse(b.skills):b.skills
                            const practiced = Object.entries(sk).filter(([k,v])=>k!=='notes'&&v?.reps>0)
                            if (!practiced.length) return null
                            return (
                              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
                                {practiced.map(([k,v])=>(
                                  <span key={k} style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:20, padding:'2px 8px', fontSize:9, color:'#aaa', fontWeight:700 }}>
                                    {k.replace(/_/g,' ')} ×{v.reps}
                                  </span>
                                ))}
                              </div>
                            )
                          } catch { return null }
                        })()}
                      </div>
                    ))}
                  </>}
                </>}
              </>
            )
          })()}
        </div>
      )}

      {/* ── MENTAL TOOLS ── */}
      {tab === 'mental' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>MENTAL TOOLS</div>
          <div style={C.sub}>DAILY TRAINING FOR YOUR MIND</div>

          {/* Sub tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
            {[['microreps','⚡ Micro Reps'],['gameday','🎮 Game Day'],['mistakes','🔄 Resets'],['map','🗺️ MAP']].map(([t,l])=>(
              <button key={t} onClick={()=>setMentalTab(t)}
                style={{ flex:1, background:mentalTab===t?'#fafafa':'#1e1e1e', border:'none', borderRadius:10, padding:'9px 6px', fontSize:10, fontWeight:800, color:mentalTab===t?'#000':'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                {l}
              </button>
            ))}
          </div>

          {/* DAILY MICRO REPS */}
          {mentalTab === 'microreps' && (() => {
            const drills = [
              { id:'shark', icon:'🦈', title:'SHARK ACTIVATION', time:'30 sec', instruction:'Stand up straight. Say out loud: "I am aggressive. I am fearless. I move forward." Say it 3 times with full belief. Feel it in your body.' },
              { id:'goldfish', icon:'🐠', title:'MISTAKE RELEASE', time:'30 sec', instruction:'Think of one mistake from your last session. Now shake your hands out, take a strong exhale, and say "Next play." Watch the mistake disappear.' },
              { id:'breath', icon:'💨', title:'RESET BREATH', time:'45 sec', instruction:'Inhale for 4 seconds while clenching your fists. Hold for 2 seconds. Exhale for 6 seconds while releasing your fists. Repeat 3 times.' },
              { id:'selftalk', icon:'💬', title:'SELF TALK REP', time:'30 sec', instruction:'Write down one limiting belief you have about your game. Cross it out. Write the empowering version. Read it out loud twice.' },
              { id:'visualize', icon:'👁️', title:'QUICK VISUALIZATION', time:'60 sec', instruction:'Close your eyes. See yourself in your next game. One aggressive action -- a tackle, a shot, a dribble. Make it vivid. Feel the confidence.' },
              { id:'declaration', icon:'📣', title:'BELIEF DECLARATION', time:'20 sec', instruction:'Say your personal declaration out loud: "I believe I am capable of playing my best while having fun." Say it with conviction.' },
            ]
            const todayKey = today + '-microreps'
            return (
              <>
                <div style={C.orange}>
                  <span style={C.olbl}>TODAY'S MENTAL REPS</span>
                  <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>30-60 seconds each. Do them all. This is your daily mindset training. 🧠</div>
                </div>
                {drills.map((drill, i) => (
                  <div key={drill.id} style={{ ...C.card, borderColor: gameDayChecked[drill.id] ? '#fafafa' : '#1e1e1e', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: gameDayChecked[drill.id] ? 10 : 0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ fontSize:24 }}>{drill.icon}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800 }}>{drill.title}</div>
                          <div style={{ fontSize:10, color:'#555' }}>⏱ {drill.time}</div>
                        </div>
                      </div>
                      <button onClick={() => setGameDayChecked(p => ({...p, [drill.id]: !p[drill.id]}))}
                        style={{ background: gameDayChecked[drill.id] ? '#fafafa' : '#1e1e1e', border:'none', borderRadius:20, padding:'5px 12px', fontSize:10, fontWeight:800, color:gameDayChecked[drill.id]?'#000':'#fff', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                        {gameDayChecked[drill.id] ? '✓ DONE' : 'START'}
                      </button>
                    </div>
                    {gameDayChecked[drill.id] && (
                      <div style={{ background:'#0a0a0a', borderRadius:8, padding:'12px', fontSize:13, color:'#ccc', lineHeight:1.6 }}>
                        {drill.instruction}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ ...C.card, textAlign:'center', padding:20 }}>
                  <div style={{ fontSize:13, color:'#555', marginBottom:8 }}>
                    {['shark','goldfish','breath','selftalk','visualize','declaration'].filter(id => gameDayChecked[id]).length}/{drills.length} completed today
                  </div>
                  <div style={{ height:6, background:'#1e1e1e', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(['shark','goldfish','breath','selftalk','visualize','declaration'].filter(id => gameDayChecked[id]).length/drills.length)*100}%`, background:'#fafafa', borderRadius:3 }} />
                  </div>
                </div>
              </>
            )
          })()}

          {/* GAME DAY ACTIVATION */}
          {mentalTab === 'gameday' && (() => {
            const steps = [
              { id:'eaten', icon:'🍎', label:'I have eaten and hydrated properly' },
              { id:'kit', icon:'👕', label:'My kit and boots are ready' },
              { id:'visualization', icon:'👁️', label:'I did my pre-game visualization' },
              { id:'phrase', icon:'🦈', label:'I said my shark phrase out loud' },
              { id:'breath', icon:'💨', label:'I did my energizing breath' },
              { id:'goldfish', icon:'🐠', label:'I am ready to goldfish any mistake instantly' },
              { id:'selftalk', icon:'💬', label:'My self talk is positive and controlled' },
              { id:'locked', icon:'🔒', label:'I am locked in and ready to compete' },
            ]
            const allDone = steps.every(s => gameDayChecked['gd_'+s.id])
            return (
              <>
                <div style={C.orange}>
                  <span style={C.olbl}>PRE-GAME ACTIVATION</span>
                  <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Go through this checklist before every game. Every single one. 🦈</div>
                </div>
                {steps.map(step => (
                  <div key={step.id} onClick={() => setGameDayChecked(p => ({...p, ['gd_'+step.id]: !p['gd_'+step.id]}))}
                    style={{ ...C.card, borderColor: gameDayChecked['gd_'+step.id] ? '#1a4a1a' : '#1e1e1e', cursor:'pointer', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: gameDayChecked['gd_'+step.id] ? '#00aa44' : '#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                        {gameDayChecked['gd_'+step.id] ? '✓' : step.icon}
                      </div>
                      <div style={{ fontSize:13, fontWeight: gameDayChecked['gd_'+step.id] ? 700 : 600, color: gameDayChecked['gd_'+step.id] ? '#aaa' : '#fff', textDecoration: gameDayChecked['gd_'+step.id] ? 'line-through' : 'none' }}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                ))}
                {allDone && (
                  <div style={{ ...C.card, borderColor:'#1a4a1a', textAlign:'center', padding:24 }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🦈</div>
                    <div style={{ fontSize:18, fontWeight:900, marginBottom:6 }}>YOU ARE READY.</div>
                    <div style={{ fontSize:13, color:'#555' }}>Go compete. Trust your preparation. Lock in from the first whistle.</div>
                  </div>
                )}
              </>
            )
          })()}

          {/* MISTAKE RESET TRACKING */}
          {mentalTab === 'mistakes' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>MISTAKE RESET LOG</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Log your mistakes AND how you reset. This is how you track your mental growth. 🐠</div>
              </div>
              <div style={C.card}>
                <span style={C.lbl}>LOG A RESET</span>
                <span style={C.lbl}>WHAT HAPPENED</span>
                <input style={{ ...C.inp, marginBottom:8 }} placeholder="e.g. Lost the ball under pressure"
                  value={newMistake.situation} onChange={e => setNewMistake(p => ({...p, situation: e.target.value}))} />
                <span style={C.lbl}>WHICH TOOL DID YOU USE</span>
                <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                  {[['shark','🦈 Shark'],['goldfish','🐠 Goldfish'],['selftalk','💬 Self Talk'],['breath','💨 Breath']].map(([t,l]) => (
                    <button key={t} onClick={() => setNewMistake(p => ({...p, tool:t}))}
                      style={{ background: newMistake.tool===t ? '#fafafa' : '#1e1e1e', border:'none', borderRadius:20, padding:'6px 12px', fontSize:10, fontWeight:800, color:newMistake.tool===t?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <span style={C.lbl}>HOW DID YOU RESET</span>
                <input style={{ ...C.inp, marginBottom:10 }} placeholder="e.g. Shook it off and called for the ball"
                  value={newMistake.reset} onChange={e => setNewMistake(p => ({...p, reset: e.target.value}))} />
                <button style={C.btn} onClick={async () => {
                  if (!newMistake.situation || !newMistake.reset) return alert('Fill in what happened and how you reset!')
                  const { error } = await supabase.from('mistake_resets').insert([{ user_id: user.id, situation: newMistake.situation, reset_description: newMistake.reset, tool_used: newMistake.tool, date: today }])
                  if (error) { alert('Error saving: ' + error.message); return }
                  const { data: mr } = await supabase.from('mistake_resets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
                  if (mr) setMistakes(mr)
                  setNewMistake({ situation:'', reset:'', tool:'' })
                }}>LOG RESET ✅</button>
              </div>
              {mistakes.length === 0 ? (
                <div style={{ ...C.card, textAlign:'center', padding:30 }}>
                  <div style={{ fontSize:13, color:'#555' }}>No resets logged yet. Start tracking your mental game! 🐠</div>
                </div>
              ) : <>
                <div style={{ ...C.card, textAlign:'center', padding:16, marginBottom:10 }}>
                  <div style={{ fontSize:9, color:'#555', letterSpacing:3, fontWeight:700, marginBottom:6 }}>TOTAL RESETS LOGGED</div>
                  <div style={{ fontSize:36, fontWeight:900, color:'#fafafa' }}>{mistakes.length}</div>
                  <div style={{ fontSize:11, color:'#555', marginTop:4 }}>Every reset is mental growth 🧠</div>
                </div>
                {mistakes.map((m, i) => (
                  <div key={i} style={C.card}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ fontSize:10, color:'#fafafa', fontWeight:700 }}>{m.date}</div>
                      {m.tool_used && <span style={{ background:'#1e1e1e', borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:700, color:'#fafafa' }}>
                        {m.tool_used==='shark'?'🦈':m.tool_used==='goldfish'?'🐠':m.tool_used==='selftalk'?'💬':'💨'} {m.tool_used.toUpperCase()}
                      </span>}
                    </div>
                    <div style={{ fontSize:12, color:'#aaa', marginBottom:4 }}>💥 {m.situation}</div>
                    <div style={{ fontSize:12, color:'#4aff4a' }}>✓ {m.reset_description}</div>
                  </div>
                ))}
              </>}
            </>
          )}

          {/* WEEKLY MAP */}
          {mentalTab === 'map' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>MINDSET ACTION PLAN -- {currentWeek}</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Your weekly mental roadmap. Review it every Monday. Adjust every week. 🗺️</div>
              </div>
              <div style={C.card}>
                <span style={C.lbl}>🎯 MENTAL GOAL THIS WEEK</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="e.g. Reset within 2 seconds of every mistake"
                  value={map.goal} onChange={e => setMap(p => ({...p, goal: e.target.value}))} />
                <span style={C.lbl}>🔍 FOCUS AREA</span>
                <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                  {['Shark Mentality','Goldfish Mentality','Self Talk','Visualization','Confidence','Consistency'].map(f => (
                    <button key={f} onClick={() => setMap(p => ({...p, focusArea: f}))}
                      style={{ background: map.focusArea===f ? '#fafafa' : '#1e1e1e', border:'none', borderRadius:20, padding:'6px 12px', fontSize:10, fontWeight:800, color:map.focusArea===f?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                      {f}
                    </button>
                  ))}
                </div>
                <span style={C.lbl}>🏆 BIGGEST WIN LAST WEEK</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="What went well mentally?"
                  value={map.weeklyWin} onChange={e => setMap(p => ({...p, weeklyWin: e.target.value}))} />
                <span style={C.lbl}>🔄 WHAT TO ADJUST</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="What needs to improve this week?"
                  value={map.adjustment} onChange={e => setMap(p => ({...p, adjustment: e.target.value}))} />
                <span style={C.lbl}>💪 MY COMMITMENT</span>
                <input style={{ ...C.inp, marginBottom:12 }} placeholder="e.g. I will log every mistake reset this week"
                  value={map.commitment} onChange={e => setMap(p => ({...p, commitment: e.target.value}))} />
                <button style={C.btn} onClick={async () => {
                  if (!map.goal) return alert('Set your mental goal first!')
                  const { error } = await supabase.from('mindset_map').upsert([{
                    user_id: user.id, week: currentWeek,
                    goal: map.goal, focus_area: map.focusArea,
                    weekly_win: map.weeklyWin, adjustment: map.adjustment, commitment: map.commitment
                  }], { onConflict: 'user_id,week' })
                  if (error) { alert('Error saving: ' + error.message); return }
                  setMapSaved(true)
                  alert('MAP saved! Stay locked in this week. 🦈')
                }}>💾 SAVE MY MAP</button>
              </div>
              {mapSaved && (
                <div style={{ ...C.card, borderColor:'#1a4a1a' }}>
                  <span style={C.lbl}>THIS WEEK'S MAP</span>
                  {map.goal && <div style={{ fontSize:13, marginBottom:8 }}>🎯 <strong>Goal:</strong> {map.goal}</div>}
                  {map.focusArea && <div style={{ fontSize:13, marginBottom:8 }}>🔍 <strong>Focus:</strong> {map.focusArea}</div>}
                  {map.weeklyWin && <div style={{ fontSize:13, marginBottom:8 }}>🏆 <strong>Last week win:</strong> {map.weeklyWin}</div>}
                  {map.adjustment && <div style={{ fontSize:13, marginBottom:8 }}>🔄 <strong>Adjust:</strong> {map.adjustment}</div>}
                  {map.commitment && <div style={{ fontSize:13 }}>💪 <strong>Commitment:</strong> {map.commitment}</div>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── COACH VALENTINO BOT (Coach / Coach V) ── */}
      {tab === 'bot' && (
        <div>
          <CoachSubNav active="bot" setTab={setTab} />
          <BotTab
            messages={messages}
            typingMsg={typingMsg}
            chatLoading={chatLoading}
            chatEnd={chatEnd}
            chatInputRef={chatInputRef}
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            isRecording={isRecording}
            sendChat={sendChat}
            startVoice={startVoice}
            rateCoachMessage={rateCoachMessage}
          />
        </div>
      )}

      {/* ── COMPETE ── */}
      {tab === 'compete' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>COMPETE</div>
          <div style={C.sub}>CHALLENGES & LEADERBOARD</div>

          {/* Tab switcher */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['leaderboard','🏆 Leaderboard'],['challenges','⚡ Challenges'],['team','👥 Team']].map(([t,l])=>(
              <button key={t} onClick={()=>setCompetitionTab(t)}
                style={{ flex:1, background:competitionTab===t?'#fafafa':'#1e1e1e', border:'none', borderRadius:10, padding:'9px 4px', fontSize:10, fontWeight:800, color:competitionTab===t?'#000':'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                {l}
              </button>
            ))}
          </div>

          {/* LEADERBOARD */}
          {competitionTab === 'leaderboard' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>DSM RANKINGS</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>Points = Streak×3 + Ball Mastery×2 + Action Steps×2 + Check-ins×1 🦈</div>
              </div>
              {leaderboard.length === 0 ? (
                <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>🏆</div>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO ATHLETES YET</div>
                  <div style={{ fontSize:13, color:'#555' }}>Leaderboard fills up as athletes join and log their work!</div>
                </div>
              ) : leaderboard.map((a, i) => (
                <div key={i} style={{ ...C.card, borderColor: i===0?'#fafafa':i===1?'#888':i===2?'#cd7f32':'#1e1e1e', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize: i<3?28:18, fontWeight:900, width:36, textAlign:'center', flexShrink:0 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:800 }}>{a.full_name||a.email}</div>
                      <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:9, color:'#fafafa', fontWeight:700 }}>🔥 {a.streak||0} streak</span>
                        <span style={{ fontSize:9, color:'#555', fontWeight:700 }}>⚽ {a.bmCount} BM</span>
                        <span style={{ fontSize:9, color:'#555', fontWeight:700 }}>✅ {a.asCount} AS</span>
                        <span style={{ fontSize:9, color:'#555', fontWeight:700 }}>📋 {a.ciCount} CI</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:22, fontWeight:900, color:'#fafafa' }}>{a.score}</div>
                      <div style={{ fontSize:8, color:'#555', letterSpacing:2, fontWeight:700 }}>PTS</div>
                    </div>
                  </div>
                  {a.id === user.id && <div style={{ marginTop:6, fontSize:9, color:'#fafafa', fontWeight:800, letterSpacing:2 }}>← YOU</div>}
                </div>
              ))}
            </>
          )}

          {/* CHALLENGES */}
          {competitionTab === 'challenges' && (
            <>
              {isCoach && (
                <div style={{ ...C.card, marginBottom:14 }}>
                  <span style={C.lbl}>CREATE CHALLENGE</span>
                  <input style={{ ...C.inp, marginBottom:8 }} placeholder="Challenge title (e.g. 7-Day Shark)" value={newChallenge.title} onChange={e=>setNewChallenge(p=>({...p,title:e.target.value}))} />
                  <textarea style={{ ...C.ta, height:60, marginBottom:8 }} placeholder="Description..." value={newChallenge.description} onChange={e=>setNewChallenge(p=>({...p,description:e.target.value}))} />
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <span style={C.lbl}>TYPE</span>
                      <select value={newChallenge.type} onChange={e=>setNewChallenge(p=>({...p,type:e.target.value}))}>
                        <option value="weekly">Weekly</option>
                        <option value="team">Team</option>
                        <option value="h2h">Head to Head</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={C.lbl}>TARGET</span>
                      <input type="number" style={C.inp} value={newChallenge.target} onChange={e=>setNewChallenge(p=>({...p,target:parseInt(e.target.value)||1}))} />
                    </div>
                  </div>
                  <button style={C.btn} disabled={savingChallenge||!newChallenge.title} onClick={async()=>{
                    setSavingChallenge(true)
                    await supabase.from('challenges').insert([{ ...newChallenge, created_by: user.id }])
                    setNewChallenge({ title:'', description:'', type:'weekly', target:7, unit:'sessions' })
                    const { data: ch } = await supabase.from('challenges').select('*, challenge_completions(user_id)').order('created_at',{ascending:false}).limit(20)
                    if(ch) setChallenges(ch)
                    setSavingChallenge(false)
                  }}>
                    {savingChallenge?'CREATING...':'⚡ CREATE CHALLENGE'}
                  </button>
                </div>
              )}

              {challenges.length === 0 ? (
                <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:44, marginBottom:12 }}>⚡</div>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO CHALLENGES YET</div>
                  <div style={{ fontSize:13, color:'#555' }}>{isCoach?'Create the first challenge above!':'Coach Valentino will post challenges here. Stay ready! 🦈'}</div>
                </div>
              ) : challenges.map((ch, i) => {
                const completed = ch.challenge_completions?.some(c => c.user_id === user.id)
                const completedCount = ch.challenge_completions?.length || 0
                return (
                  <div key={i} style={{ ...C.card, borderColor: completed?'#1a4a1a':'#1e1e1e', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <div style={{ fontSize:9, background: ch.type==='weekly'?'#fafafa':ch.type==='team'?'#36363c':ch.type==='h2h'?'#252528':'#1e1e1e', borderRadius:20, padding:'2px 8px', fontWeight:800, color:ch.type==='weekly'?'#000':'#fff', letterSpacing:1 }}>
                            {ch.type==='weekly'?'⚡ WEEKLY':ch.type==='team'?'👥 TEAM':ch.type==='h2h'?'⚔️ H2H':'🤖 AUTO'}
                          </div>
                          {completed && <div style={{ fontSize:9, background:'#1a4a1a', borderRadius:20, padding:'2px 8px', fontWeight:800, color:'#4aff4a', letterSpacing:1 }}>✅ DONE</div>}
                        </div>
                        <div style={{ fontSize:15, fontWeight:900, marginBottom:4 }}>{ch.title}</div>
                        <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>{ch.description}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:10, color:'#555' }}>👥 {completedCount} completed</div>
                      {!completed && !isCoach && (
                        <button onClick={async()=>{
                          await supabase.from('challenge_completions').insert([{ challenge_id:ch.id, user_id:user.id }])
                          const { data: chd } = await supabase.from('challenges').select('*, challenge_completions(user_id)').order('created_at',{ascending:false}).limit(20)
                          if(chd) setChallenges(chd)
                        }} style={{ background:'#fafafa', border:'none', borderRadius:8, padding:'7px 14px', fontSize:10, fontWeight:900, color:'#000', cursor:'pointer', fontFamily:'inherit' }}>
                          MARK COMPLETE ✅
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* TEAM CHALLENGE */}
          {competitionTab === 'team' && (
            <>
              <div style={C.orange}>
                <span style={C.olbl}>TEAM GOAL</span>
                <div style={{ fontSize:14, fontWeight:800, lineHeight:1.4 }}>The whole DSM team working toward one goal. Every session counts. 🦈</div>
              </div>
              <div style={{ ...C.card, textAlign:'center', padding:24 }}>
                <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>TOTAL TEAM BALL MASTERY SESSIONS</div>
                <div style={{ fontSize:48, fontWeight:900, color:'#fafafa', marginBottom:8 }}>{leaderboard.reduce((a,b)=>a+b.bmCount,0)}</div>
                <div style={{ fontSize:11, color:'#555', marginBottom:16 }}>sessions logged by the whole team</div>
                <div style={{ height:8, background:'#1e1e1e', borderRadius:5, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${Math.min((leaderboard.reduce((a,b)=>a+b.bmCount,0)/100)*100, 100)}%`, background:'#fafafa', borderRadius:5 }} />
                </div>
                <div style={{ fontSize:10, color:'#555' }}>Goal: 100 team sessions 🎯</div>
              </div>
              <div style={{ ...C.card, textAlign:'center', padding:24 }}>
                <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>TOTAL TEAM ACTION STEPS</div>
                <div style={{ fontSize:48, fontWeight:900, color:'#fafafa', marginBottom:8 }}>{leaderboard.reduce((a,b)=>a+b.asCount,0)}</div>
                <div style={{ height:8, background:'#1e1e1e', borderRadius:5, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', width:`${Math.min((leaderboard.reduce((a,b)=>a+b.asCount,0)/50)*100, 100)}%`, background:'#fafafa', borderRadius:5 }} />
                </div>
                <div style={{ fontSize:10, color:'#555' }}>Goal: 50 team action steps 🎯</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COMMUNITY ── */}
      {tab === 'community' && (
        <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 116px)' }} className="fade">
          <div style={{ padding:'12px 20px 0' }}>
            <div style={C.title}>COMMUNITY</div>
            <div style={C.sub}>DSM ATHLETE & PARENT NETWORK</div>
            <div style={{ display:'flex', gap:8, marginTop:10, marginBottom:0 }}>
              {[['athletes','⚽ Athletes'], ['parents','👨‍👩‍👧 Parents']].map(([t,l])=>(
                <button key={t} onClick={()=>setCommunityTab(t)}
                  style={{ flex:1, background:communityTab===t?'#fafafa':'#1e1e1e', border:'none', borderRadius:10, padding:'9px 8px', fontSize:11, fontWeight:800, color:communityTab===t?'#000':'#fff', cursor:'pointer', fontFamily:'inherit', letterSpacing:1 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>

            {/* NEW POST */}
            {((communityTab==='athletes' && !isCoach && profile?.role!=='parent') || (communityTab==='parents' && profile?.role==='parent') || isCoach) && (
              <div style={{ ...C.card, marginBottom:12 }}>
                <span style={C.lbl}>SHARE WITH THE COMMUNITY</span>
                <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
                  {[['win','🏆 Win'],['milestone','📈 Milestone'],['question','❓ Question']].map(([t,l])=>(
                    <button key={t} onClick={()=>setNewPost(p=>({...p,type:t}))}
                      style={{ background:newPost.type===t?'#fafafa':'#1e1e1e', border:'none', borderRadius:20, padding:'5px 12px', fontSize:10, fontWeight:800, color:newPost.type===t?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <textarea style={{ ...C.ta, height:70, marginBottom:8 }}
                  placeholder={newPost.type==='win'?'Share your win with the team! 🏆':newPost.type==='milestone'?'What milestone did you hit? 📈':'Ask Coach Valentino or the community ❓'}
                  value={newPost.content}
                  onChange={e=>setNewPost(p=>({...p,content:e.target.value}))} />
                <button style={C.btn} disabled={savingPost||!newPost.content.trim()}
                  onClick={async()=>{
                    if(!newPost.content.trim()) return
                    setSavingPost(true)
                    const { error } = await supabase.from('community_posts').insert([{
                      user_id: user.id,
                      type: newPost.type,
                      content: newPost.content,
                      community: communityTab,
                    }])
                    if (error) { alert('Error posting: ' + error.message); setSavingPost(false); return }
                    setNewPost({type:'win',content:''})
                    const { data: posts } = await supabase
                      .from('community_posts')
                      .select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))')
                      .order('created_at', { ascending: false }).limit(50)
                    if(posts) setCommunityPosts(posts)
                    setSavingPost(false)
                  }}>
                  {savingPost?'POSTING...':'POST TO COMMUNITY 🔥'}
                </button>
              </div>
            )}

            {/* POSTS FEED */}
            {communityPosts.filter(p=>p.community===communityTab).length === 0 ? (
              <div style={{ ...C.card, textAlign:'center', padding:40 }}>
                <div style={{ fontSize:44, marginBottom:12 }}>{communityTab==='athletes'?'⚽':'👨‍👩‍👧'}</div>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:8 }}>NO POSTS YET</div>
                <div style={{ fontSize:13, color:'#555' }}>Be the first to post in the {communityTab} community! 🔥</div>
              </div>
            ) : communityPosts.filter(p=>p.community===communityTab).map((post,i)=>(
              <div key={i} style={{ ...C.card, marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'#fafafa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, flexShrink:0 }}>
                    {(post.profiles?.full_name||post.profiles?.email||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:800 }}>{post.profiles?.full_name||post.profiles?.email}</div>
                    <div style={{ fontSize:9, color:'#555', marginTop:1 }}>{new Date(post.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ background: post.type==='win'?'#1a3a0a':post.type==='milestone'?'#0a1a3a':'#2a1a0a', borderRadius:20, padding:'3px 10px', fontSize:9, fontWeight:800, color: post.type==='win'?'#4aff4a':post.type==='milestone'?'#4a9fff':'#ffaa4a' }}>
                    {post.type==='win'?'🏆 WIN':post.type==='milestone'?'📈 MILESTONE':'❓ QUESTION'}
                  </div>
                </div>
                <div style={{ fontSize:14, lineHeight:1.6, marginBottom:10 }}>{post.content}</div>

                {/* Comments */}
                {post.community_comments?.length > 0 && (
                  <div style={{ borderTop:'1px solid #1e1e1e', paddingTop:8, marginBottom:8 }}>
                    {post.community_comments.map((c,ci)=>(
                      <div key={ci} style={{ display:'flex', gap:8, marginBottom:6 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:'#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, flexShrink:0 }}>
                          {(c.profiles?.full_name||c.profiles?.email||'?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, background:'#0d0d0d', borderRadius:8, padding:'6px 10px' }}>
                          <div style={{ fontSize:10, fontWeight:800, color:'#fafafa', marginBottom:2 }}>{c.profiles?.full_name||c.profiles?.email}</div>
                          <div style={{ fontSize:12, lineHeight:1.5 }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                {postingComment===post.id ? (
                  <div style={{ display:'flex', gap:6 }}>
                    <input style={{ ...C.inp, flex:1, padding:'8px 12px', fontSize:12 }}
                      placeholder="Add a comment..." value={newComment}
                      onChange={e=>setNewComment(e.target.value)}
                      onKeyDown={async e=>{
                        if(e.key==='Enter' && newComment.trim()) {
                          await supabase.from('community_comments').insert([{ post_id:post.id, user_id:user.id, content:newComment }])
                          setNewComment('')
                          setPostingComment(null)
                          const { data: posts } = await supabase.from('community_posts').select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))').order('created_at',{ascending:false}).limit(50)
                          if(posts) setCommunityPosts(posts)
                        }
                      }} />
                    <button onClick={async()=>{
                      if(!newComment.trim()) return
                      await supabase.from('community_comments').insert([{ post_id:post.id, user_id:user.id, content:newComment }])
                      setNewComment('')
                      setPostingComment(null)
                      const { data: posts } = await supabase.from('community_posts').select('*, profiles(full_name, email, role), community_comments(id, content, created_at, profiles(full_name, email, role))').order('created_at',{ascending:false}).limit(50)
                      if(posts) setCommunityPosts(posts)
                    }} style={{ background:'#fafafa', border:'none', borderRadius:8, padding:'0 12px', fontSize:14, cursor:'pointer' }}>→</button>
                  </div>
                ) : (
                  <button onClick={()=>{ setPostingComment(post.id); setNewComment('') }}
                    style={{ background:'none', border:'1px solid #2a2a2a', borderRadius:8, padding:'5px 12px', fontSize:10, fontWeight:800, color:'#555', cursor:'pointer', fontFamily:'inherit' }}>
                    💬 COMMENT
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MATCH DAY ── */}
      {tab === 'match' && (
        <div className="fade">
          <ActionsSubNav active="match" setTab={setTab} />
          <MatchDayTab user={user} profile={profile} />
        </div>
      )}

      {/* ── PARENTS ── */}
      {tab === 'parents' && <ParentsTab />}

      {/* ── SQUAD ── */}
      {tab === 'squad' && <SquadTab user={user} />}

      {/* ── LOCKER ROOM (athlete-facing) ── */}
      {tab === 'locker' && <LockerRoomTab user={user} adminView={false} />}

      {/* ── ADMIN DASHBOARD ── */}
      {tab === 'admin' && isAdmin && <AdminTab user={user} />}

      {/* ── COACH DASHBOARD ── */}
      {tab === 'dashboard' && isCoach && !selectedAthlete && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>DASHBOARD</div>
          <div style={C.sub}>COACH VALENTINO VIEW</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14 }}>
            {[[allAthletes.filter(a=>a.role==='athlete').length,'ATHLETES'],[allSubmissions.length,'ACTION STEPS'],[allCheckins.length,'CHECK-INS']].map(([n,l],i)=>(
              <div key={i} style={{ ...C.card,textAlign:'center',padding:12 }}>
                <div style={{ fontSize:20,fontWeight:900,color:'#fafafa' }}>{n}</div>
                <div style={{ fontSize:7,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')&&(isAdmin||a.assigned_coach===myName)).length > 0 && <>
            <span style={{ ...C.lbl, color:'#fafafa' }}>⚠️ PENDING ACTIVATION</span>
            {allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')&&(isAdmin||a.assigned_coach===myName)).map((a,i)=>(
              <div key={i} style={{ ...C.card, borderColor:'#fafafa', cursor:'pointer' }} onClick={()=>setSelectedAthlete(a)}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:16,fontWeight:800,marginBottom:2 }}>{a.full_name||a.email}</div>
                    <div style={{ fontSize:10,color:'#fafafa',fontWeight:700 }}>⚠️ WAITING FOR ACTIVATION</div>
                  </div>
                  <button onClick={async(e)=>{ e.stopPropagation(); await updateAccessLevel(a.id,'paid'); loadUserData(); }}
                    style={{ background:'#00aa44',border:'none',borderRadius:8,padding:'8px 12px',fontSize:10,fontWeight:900,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                    UNLOCK
                  </button>
                </div>
              </div>
            ))}
          </>}
          <span style={C.lbl}>ACTIVE ATHLETES</span>
          {/* Coach filter -- admin only */}
          {isAdmin && allAthletes.filter(a=>a.role==='coach').length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              <button onClick={()=>setCoachFilter('all')}
                style={{ background:coachFilter==='all'?'#fafafa':'#1e1e1e', border:'none', borderRadius:20, padding:'6px 14px', fontSize:10, fontWeight:800, color:coachFilter==='all'?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                ALL
              </button>
              <button onClick={()=>setCoachFilter('unassigned')}
                style={{ background:coachFilter==='unassigned'?'#fafafa':'#1e1e1e', border:'none', borderRadius:20, padding:'6px 14px', fontSize:10, fontWeight:800, color:coachFilter==='unassigned'?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                UNASSIGNED
              </button>
              {allAthletes.filter(a=>a.role==='coach').map((c,i)=>(
                <button key={i} onClick={()=>setCoachFilter(c.full_name||c.email)}
                  style={{ background:coachFilter===(c.full_name||c.email)?'#fafafa':'#1e1e1e', border:'none', borderRadius:20, padding:'6px 14px', fontSize:10, fontWeight:800, color:coachFilter===(c.full_name||c.email)?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                  👤 {c.full_name||c.email}
                </button>
              ))}
            </div>
          )}

          {/* Stats bar -- admin only */}
          {isAdmin && <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              [allAthletes.filter(a=>a.role==='athlete').length, 'TOTAL'],
              [allAthletes.filter(a=>a.role==='athlete'&&a.access_level&&a.access_level!=='locked').length, 'ACTIVE'],
              [allAthletes.filter(a=>a.role==='athlete'&&(!a.access_level||a.access_level==='locked')).length, 'PENDING'],
            ].map(([n,l])=>(
              <div key={l} style={{ ...C.card, textAlign:'center', padding:10 }}>
                <div style={{ fontSize:22, fontWeight:900, color:'#fafafa' }}>{n}</div>
                <div style={{ fontSize:8, color:'#555', letterSpacing:2, fontWeight:700 }}>{l}</div>
              </div>
            ))}
          </div>}

          {allAthletes.filter(a=>a.role==='athlete'&&a.access_level&&a.access_level!=='locked'
            &&(isAdmin ? (coachFilter==='all'||(coachFilter==='unassigned'?!a.assigned_coach:a.assigned_coach===coachFilter)) : a.assigned_coach===myName)
          ).map((a,i)=>(
            <div key={i} style={{ ...C.card,cursor:'pointer' }} onClick={()=>{ setSelectedAthlete(a); loadAthleteProfile(a); }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:800,marginBottom:2 }}>{a.full_name||a.email}</div>
                  <div style={{ fontSize:10,color:'#555' }}>🔥 {a.streak||0} streak · {a.access_level}</div>
                  {a.assigned_coach && <div style={{ fontSize:9,color:'#fafafa',fontWeight:700,marginTop:2 }}>👤 {a.assigned_coach}</div>}
                </div>
                <div style={{ fontSize:20,fontWeight:900,color:'#fafafa' }}>{a.streak||0}</div>
              </div>
            </div>
          ))}

          <span style={{ ...C.lbl,marginTop:14 }}>RECENT WEEKLY CHECK-INS</span>
          {allCheckins.slice(0,5).map((c,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                <div style={{ fontSize:14,fontWeight:800 }}>{c.profiles?.full_name||c.profiles?.email}</div>
                <div style={{ fontSize:10,color:'#fafafa',fontWeight:700 }}>{c.week}</div>
              </div>
              <div style={{ display:'flex',gap:14,marginBottom:6 }}>
                {[['energy_level','⚡'],['confidence_level','💪'],['sessions_completed','🏃']].map(([k,icon])=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16,fontWeight:900,color:'#fafafa' }}>{c[k]}</div>
                    <div style={{ fontSize:8,color:'#555' }}>{icon}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12,color:'#aaa' }}>🏆 {c.biggest_win}</div>
              {c.message_to_coach&&<div style={{ fontSize:11,color:'#666',marginTop:4,fontStyle:'italic' }}>"{c.message_to_coach}"</div>}
            </div>
          ))}

          <span style={{ ...C.lbl,marginTop:14 }}>RECENT BALL MASTERY</span>
          {allBallMastery.slice(0,5).map((b,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',justifyContent:'space-between' }}>
                <div style={{ fontSize:14,fontWeight:800 }}>{b.profiles?.full_name||b.profiles?.email}</div>
                <div style={{ fontSize:10,color:'#fafafa',fontWeight:700 }}>{b.date}</div>
              </div>
              <div style={{ fontSize:11,color:'#555',marginTop:4 }}>{b.total_skills} skills · {b.total_reps} reps</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dashboard' && isCoach && selectedAthlete && (
        <div style={C.scroll} className="fade">
          <button onClick={()=>{ setSelectedAthlete(null); setAthleteProfileTab('overview') }}
            style={{ background:'none',border:'none',color:'#fafafa',fontSize:12,fontWeight:800,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',marginBottom:12,padding:0 }}>← BACK</button>

          {/* Header */}
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:14 }}>
            <div style={{ width:52,height:52,borderRadius:'50%',background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,flexShrink:0 }}>
              {(selectedAthlete.full_name||selectedAthlete.email||'?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:20,fontWeight:900 }}>{selectedAthlete.full_name||selectedAthlete.email}</div>
              <div style={{ fontSize:10,color:'#fafafa',fontWeight:700,marginTop:2 }}>🔥 {selectedAthlete.streak||0} streak · {selectedAthlete.access_level}</div>
            </div>
          </div>

          {/* Access buttons */}
          <div style={{ display:'flex',gap:8,marginBottom:12 }}>
            <button onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,'paid'); setSelectedAthlete({...selectedAthlete,access_level:'paid'}); loadUserData(); }}
              style={{ flex:1,background:'#00aa44',border:'none',borderRadius:10,padding:'10px 8px',fontSize:11,fontWeight:900,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              ✅ UNLOCK
            </button>
            <button onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,'locked'); setSelectedAthlete({...selectedAthlete,access_level:'locked'}); loadUserData(); }}
              style={{ flex:1,background:'#aa0000',border:'none',borderRadius:10,padding:'10px 8px',fontSize:11,fontWeight:900,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              🔒 LOCK
            </button>
          </div>

          {/* Profile tabs */}
          <div style={{ display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' }}>
            {[['overview','📊'],['sessions','🎙️'],['feedback','✅'],['checkins','📋'],['ball','⚽'],['messages','💬']].map(([t,icon])=>(
              <button key={t} onClick={()=>setAthleteProfileTab(t)}
                style={{ background:athleteProfileTab===t?'#fafafa':'#1e1e1e',border:'none',borderRadius:8,padding:'7px 10px',fontSize:10,fontWeight:800,color:athleteProfileTab===t?'#000':'#fff',cursor:'pointer',fontFamily:'inherit',letterSpacing:1 }}>
                {icon} {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {athleteProfileTab==='overview' && <>

            {/* DOWNLOAD REPORT BUTTON - COACH */}
            <div style={{ display:'flex',gap:8,marginBottom:12 }}>
              <button onClick={()=>downloadReport(selectedAthlete, athleteActionSteps, athleteCheckins, athleteBallMastery, true)}
                style={{ flex:1,background:'#fafafa',border:'none',borderRadius:10,padding:'12px 8px',fontSize:10,fontWeight:800,color:'#000',cursor:'pointer',fontFamily:'inherit',letterSpacing:1 }}>
                📥 DOWNLOAD PDF + EXCEL
              </button>
            </div>

            {/* STATS ROW */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12 }}>
              {[[selectedAthlete.streak||0,'STREAK','🔥'],[athleteActionSteps.length,'STEPS','✅'],[athleteBallMastery.length,'BALL','⚽'],[athleteCheckins.length,'CHECK-INS','📋']].map(([n,l,icon])=>(
                <div key={l} style={{ ...C.card,textAlign:'center',padding:10 }}>
                  <div style={{ fontSize:10,marginBottom:2 }}>{icon}</div>
                  <div style={{ fontSize:18,fontWeight:900,color:'#fafafa' }}>{n}</div>
                  <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700,marginTop:1 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* ENERGY & CONFIDENCE CHART */}
            {athleteCheckins.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>⚡ ENERGY & 💪 CONFIDENCE OVER TIME</span>
                <div style={{ display:'flex',alignItems:'flex-end',gap:4,height:90,marginBottom:6 }}>
                  {[...athleteCheckins].reverse().map((c,i)=>(
                    <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                      <div style={{ width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:70 }}>
                        <div style={{ flex:1,background:'#fafafa',borderRadius:'3px 3px 0 0',height:`${(c.energy_level/10)*70}px`,minHeight:3 }} />
                        <div style={{ flex:1,background:'#ff8c00',borderRadius:'3px 3px 0 0',height:`${(c.confidence_level/10)*70}px`,minHeight:3 }} />
                      </div>
                      <div style={{ fontSize:7,color:'#444',fontWeight:700 }}>W{c.week?.split('-W')[1]||i+1}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',gap:14,marginTop:4 }}>
                  {[['#fafafa','ENERGY'],['#ff8c00','CONFIDENCE']].map(([color,label])=>(
                    <div key={label} style={{ display:'flex',alignItems:'center',gap:5 }}>
                      <div style={{ width:8,height:8,borderRadius:'50%',background:color }} />
                      <span style={{ fontSize:9,color:'#aaa',fontWeight:700 }}>{label}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft:'auto',fontSize:10,color:'#fafafa',fontWeight:900 }}>
                    avg {athleteCheckins.length ? (athleteCheckins.reduce((a,c)=>a+c.energy_level,0)/athleteCheckins.length).toFixed(1) : 0} / {athleteCheckins.length ? (athleteCheckins.reduce((a,c)=>a+c.confidence_level,0)/athleteCheckins.length).toFixed(1) : 0}
                  </div>
                </div>
              </div>
            )}

            {/* PERFORMANCE RATINGS */}
            {athleteActionSteps.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>📊 PERFORMANCE RATINGS (LAST 6 SESSIONS)</span>
                {['conditioning','strength','technical','mental'].map(metric=>{
                  const recent = [...athleteActionSteps].slice(0,6).reverse()
                  const avg = recent.length ? (recent.reduce((a,s)=>a+(s[metric]||0),0)/recent.length).toFixed(1) : 0
                  const trend = recent.length >= 2 ? (recent[recent.length-1][metric]||0) - (recent[0][metric]||0) : 0
                  return (
                    <div key={metric} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                        <span style={{ fontSize:11,color:'#aaa',textTransform:'capitalize',fontWeight:700 }}>{metric}</span>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <span style={{ fontSize:9,color:'#555' }}>avg {avg}/10</span>
                          <span style={{ fontSize:11,fontWeight:800,color:trend>0?'#4aff4a':trend<0?'#ff4444':'#555' }}>
                            {trend>0?'↑':trend<0?'↓':'→'} {Math.abs(trend)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display:'flex',alignItems:'flex-end',gap:3,height:36 }}>
                        {recent.map((s,i)=>(
                          <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                            <div style={{ fontSize:8,color:'#fafafa',fontWeight:800 }}>{s[metric]}</div>
                            <div style={{ width:'100%',background:'#fafafa',borderRadius:'2px 2px 0 0',height:`${((s[metric]||0)/10)*28}px`,minHeight:2 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MENTAL TOOLS USAGE */}
            {athleteActionSteps.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>🧠 MENTAL TOOLS USAGE</span>
                {[['shark','🦈 Shark'],['goldfish','🐠 Goldfish'],['selftalk','💬 Self Talk'],['tuneout','🔇 Tune Out']].map(([k,label])=>{
                  const used = athleteActionSteps.filter(s=>s[k+'_used']).length
                  const pct = athleteActionSteps.length ? Math.round((used/athleteActionSteps.length)*100) : 0
                  return (
                    <div key={k} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                        <span style={{ fontSize:11,fontWeight:700 }}>{label}</span>
                        <span style={{ fontSize:11,color:'#fafafa',fontWeight:800 }}>{pct}% ({used}/{athleteActionSteps.length})</span>
                      </div>
                      <div style={{ height:6,background:'#1e1e1e',borderRadius:3,overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${pct}%`,background:'#fafafa',borderRadius:3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* BALL MASTERY */}
            {athleteBallMastery.length > 0 && (
              <div style={C.card}>
                <span style={C.lbl}>⚽ BALL MASTERY</span>
                <div style={{ display:'flex',justifyContent:'space-around',marginBottom:10 }}>
                  {[[athleteBallMastery.length,'SESSIONS'],[athleteBallMastery.reduce((a,b)=>a+(b.total_reps||0),0),'TOTAL REPS'],[Math.round(athleteBallMastery.reduce((a,b)=>a+(b.total_reps||0),0)/athleteBallMastery.length)||0,'AVG REPS']].map(([n,l])=>(
                    <div key={l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:20,fontWeight:900,color:'#fafafa' }}>{n}</div>
                      <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',alignItems:'flex-end',gap:3,height:50 }}>
                  {[...athleteBallMastery].reverse().slice(0,12).map((b,i)=>(
                    <div key={i} style={{ flex:1,background:'#fafafa',borderRadius:'2px 2px 0 0',height:`${Math.min((b.total_reps||0)/3,46)}px`,minHeight:3 }} />
                  ))}
                </div>
              </div>
            )}

            {/* LATEST MESSAGE */}
            {athleteCheckins[0]?.message_to_coach && (
              <div style={{ ...C.card,borderColor:'#1a3a2a' }}>
                <span style={C.lbl}>💬 LATEST MESSAGE TO COACH</span>
                <div style={{ fontSize:13,color:'#aaa',fontStyle:'italic',lineHeight:1.6 }}>"{athleteCheckins[0].message_to_coach}"</div>
                <div style={{ fontSize:9,color:'#555',marginTop:6 }}>{athleteCheckins[0].week}</div>
              </div>
            )}

            {/* PROGRAM WEEK TRACKER */}
            <div style={C.card}>
              <span style={C.lbl}>📅 PROGRAM WEEK</span>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {[1,2,3,4,5,6,7,8].map(w=>(
                  <button key={w}
                    onClick={async()=>{
                      setAthleteProgramWeek(w)
                      await supabase.from('profiles').update({ program_week: w }).eq('id', selectedAthlete.id)
                      setSelectedAthlete(p=>({...p, program_week: w}))
                    }}
                    style={{ background:(selectedAthlete.program_week||1)>=w?'#fafafa':'#1e1e1e', border:'none', borderRadius:8, padding:'8px 12px', fontSize:12, fontWeight:800, color:(selectedAthlete.program_week||1)>=w?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                    W{w}
                  </button>
                ))}
              </div>
              {/* Week breakdown */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { week:1, label:'Week 1-3', items:['Confidence 1-10','Action Steps','Ball Mastery'], color:'#fafafa', unlocked: true },
                  { week:4, label:'Week 4', items:['+ Goal Setting'], color:'#e5e5e5', unlocked: (selectedAthlete.program_week||1) >= 4 },
                  { week:5, label:'Week 5', items:['+ Visualization','+ Morning Routine'], color:'#ffaa00', unlocked: (selectedAthlete.program_week||1) >= 5 },
                ].map((phase,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background: phase.unlocked?'#111':'#0a0a0a', borderRadius:8, border:`1px solid ${phase.unlocked?phase.color:'#1e1e1e'}` }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:phase.unlocked?phase.color:'#333', flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:11, fontWeight:800, color:phase.unlocked?'#fff':'#444' }}>{phase.label}</div>
                      <div style={{ fontSize:10, color:phase.unlocked?'#888':'#333' }}>{phase.items.join(' · ')}</div>
                    </div>
                    {phase.unlocked && <div style={{ marginLeft:'auto', fontSize:10, color:phase.color, fontWeight:800 }}>✓ ACTIVE</div>}
                    {!phase.unlocked && <div style={{ marginLeft:'auto', fontSize:10, color:'#333', fontWeight:800 }}>🔒</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* CONFIDENCE TRACKER */}
            <div style={C.card}>
              <span style={C.lbl}>💪 CONFIDENCE LEVEL OVER TIME</span>
              {athleteCheckins.length === 0 ? (
                <div style={{ fontSize:12,color:'#555',textAlign:'center',padding:16 }}>No check-ins yet</div>
              ) : (
                <>
                  <div style={{ display:'flex',alignItems:'flex-end',gap:4,height:80,marginBottom:8 }}>
                    {[...athleteCheckins].reverse().map((c,i)=>(
                      <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                        <div style={{ fontSize:8,color:'#fafafa',fontWeight:900 }}>{c.confidence_level}</div>
                        <div style={{ width:'100%',background:'#fafafa',borderRadius:'3px 3px 0 0',height:`${(c.confidence_level/10)*60}px`,minHeight:3 }} />
                        <div style={{ fontSize:7,color:'#444',fontWeight:700 }}>W{c.week?.split('-W')[1]||i+1}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between' }}>
                    <div style={{ fontSize:11,color:'#555' }}>Start: <span style={{ color:'#fff',fontWeight:800 }}>{[...athleteCheckins].reverse()[0]?.confidence_level}/10</span></div>
                    <div style={{ fontSize:11,color:'#555' }}>Latest: <span style={{ color:'#fafafa',fontWeight:800 }}>{athleteCheckins[0]?.confidence_level}/10</span></div>
                    <div style={{ fontSize:11,color:'#555' }}>Change: <span style={{ fontWeight:800, color: athleteCheckins[0]?.confidence_level - [...athleteCheckins].reverse()[0]?.confidence_level > 0 ? '#4aff4a' : '#ff4444' }}>
                      {athleteCheckins[0]?.confidence_level - [...athleteCheckins].reverse()[0]?.confidence_level > 0 ? '+' : ''}{athleteCheckins[0]?.confidence_level - [...athleteCheckins].reverse()[0]?.confidence_level}
                    </span></div>
                  </div>
                </>
              )}
            </div>

            {/* GOAL SETTING -- Week 4+ */}
            {(selectedAthlete.program_week||1) >= 4 && (
              <div style={C.card}>
                <span style={C.lbl}>🎯 GOAL SETTING (WEEK 4+)</span>
                {athleteCheckins.filter(c=>c.goal_next_week).length === 0 ? (
                  <div style={{ fontSize:12,color:'#555',textAlign:'center',padding:12 }}>No goals set yet</div>
                ) : athleteCheckins.filter(c=>c.goal_next_week).slice(0,5).map((c,i)=>(
                  <div key={i} style={{ borderLeft:'2px solid #fafafa', paddingLeft:10, marginBottom:10 }}>
                    <div style={{ fontSize:9,color:'#fafafa',fontWeight:700,marginBottom:2 }}>{c.week}</div>
                    <div style={{ fontSize:12,color:'#fff',fontWeight:700 }}>🎯 {c.goal_next_week}</div>
                    {c.biggest_win && <div style={{ fontSize:11,color:'#4aff4a',marginTop:3 }}>✓ Win: {c.biggest_win}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* VISUALIZATION & MORNING ROUTINE -- Week 5+ */}
            {(selectedAthlete.program_week||1) >= 5 && (
              <div style={C.card}>
                <span style={C.lbl}>👁️ VISUALIZATION & MORNING ROUTINE (WEEK 5+)</span>
                {athleteActionSteps.length === 0 ? (
                  <div style={{ fontSize:12,color:'#555',textAlign:'center',padding:12 }}>No data yet</div>
                ) : (
                  <>
                    <div style={{ display:'flex',gap:12,marginBottom:12 }}>
                      <div style={{ flex:1,textAlign:'center' }}>
                        <div style={{ fontSize:20,fontWeight:900,color:'#fafafa' }}>
                          {athleteCheckins.filter(c=>c.did_visualization).length}
                        </div>
                        <div style={{ fontSize:9,color:'#555',letterSpacing:1,fontWeight:700 }}>VISUALIZATIONS</div>
                      </div>
                      <div style={{ flex:1,textAlign:'center' }}>
                        <div style={{ fontSize:20,fontWeight:900,color:'#fafafa' }}>
                          {athleteCheckins.filter(c=>c.did_morning_routine).length}
                        </div>
                        <div style={{ fontSize:9,color:'#555',letterSpacing:1,fontWeight:700 }}>MORNING ROUTINES</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11,color:'#555',textAlign:'center' }}>
                      Track these in the weekly check-in form
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={C.card}>
              <span style={C.lbl}>ASSIGNED COACH</span>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                {allAthletes.filter(a=>a.role==='coach').map((coach,i)=>(
                  <button key={i}
                    onClick={async()=>{
                      await supabase.from('profiles').update({ assigned_coach: coach.full_name||coach.email }).eq('id', selectedAthlete.id)
                      setSelectedAthlete(p=>({...p, assigned_coach: coach.full_name||coach.email}))
                      loadUserData()
                    }}
                    style={{ background: selectedAthlete.assigned_coach===(coach.full_name||coach.email)?'#fafafa':'#1e1e1e', border:'none', borderRadius:10, padding:'10px 14px', fontSize:12, fontWeight:800, color:selectedAthlete.assigned_coach===(coach.full_name||coach.email)?'#000':'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                    👤 {coach.full_name||coach.email}
                  </button>
                ))}
                {allAthletes.filter(a=>a.role==='coach').length === 0 && (
                  <div style={{ fontSize:12, color:'#555' }}>No coaches found. Make sure coach accounts have role = "coach" in Supabase.</div>
                )}
              </div>
              {selectedAthlete.assigned_coach && (
                <div style={{ background:'#1a3a0a', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#4aff4a' }}>✓ Assigned to {selectedAthlete.assigned_coach}</div>
                  <button onClick={async()=>{
                    await supabase.from('profiles').update({ assigned_coach: null }).eq('id', selectedAthlete.id)
                    setSelectedAthlete(p=>({...p, assigned_coach: null}))
                    loadUserData()
                  }} style={{ background:'none', border:'none', fontSize:10, color:'#555', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>REMOVE</button>
                </div>
              )}
            </div>
            <div style={C.card}>
              <span style={C.lbl}>COACH NOTES (PRIVATE)</span>
              <textarea style={{ ...C.ta,height:80,marginBottom:8 }} placeholder="Private notes about this athlete..."
                value={coachNote} onChange={e=>setCoachNote(e.target.value)} />
              <button style={C.bsm} onClick={async()=>{
                setSavingNote(true)
                await supabase.from('coach_athlete_notes').upsert([{ coach_id:user.id,athlete_id:selectedAthlete.id,notes:coachNote }])
                setSavingNote(false)
                alert('Notes saved!')
              }}>{savingNote?'SAVING...':'SAVE NOTES'}</button>
            </div>
          </>}

          {/* SESSION NOTES */}
          {athleteProfileTab==='sessions' && <>
            <div style={C.card}>
              <span style={C.lbl}>ADD SESSION NOTES</span>
              <input style={{ ...C.inp,marginBottom:8 }} placeholder="Session title (e.g. Session 3 - Beliefs)"
                value={newSessionNote.title} onChange={e=>setNewSessionNote(p=>({...p,title:e.target.value}))} />
              <input type="date" style={{ ...C.inp,marginBottom:8 }} value={newSessionNote.date}
                onChange={e=>setNewSessionNote(p=>({...p,date:e.target.value}))} />
              <input style={{ ...C.inp,marginBottom:8 }} placeholder="Fathom recording link (optional)"
                value={newSessionNote.fathomLink} onChange={e=>setNewSessionNote(p=>({...p,fathomLink:e.target.value}))} />
              <textarea style={{ ...C.ta,height:140,marginBottom:8 }} placeholder="Paste Fathom notes / key takeaways here..."
                value={newSessionNote.content} onChange={e=>setNewSessionNote(p=>({...p,content:e.target.value}))} />
              <button style={C.btn} disabled={savingNote} onClick={async()=>{
                if(!newSessionNote.title) return alert('Add a title!')
                setSavingNote(true)
                await supabase.from('session_notes').insert([{
                  athlete_id:selectedAthlete.id, coach_id:user.id,
                  title:newSessionNote.title, content:newSessionNote.content,
                  fathom_link:newSessionNote.fathomLink, date:newSessionNote.date,
                }])
                setNewSessionNote({ title:'',content:'',fathomLink:'',date:new Date().toISOString().split('T')[0] })
                await loadAthleteProfile(selectedAthlete)
                setSavingNote(false)
              }}>{savingNote?'SAVING...':'💾 SAVE SESSION NOTES'}</button>
            </div>
            {sessionNotes.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}>
                <div style={{ fontSize:13,color:'#555' }}>No session notes yet. Add above! 🎙️</div>
              </div>
            ) : sessionNotes.map((note,i)=>(
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                  <div style={{ fontSize:14,fontWeight:800 }}>{note.title}</div>
                  <div style={{ fontSize:10,color:'#fafafa',fontWeight:700 }}>{note.date}</div>
                </div>
                {note.fathom_link && (
                  <a href={note.fathom_link} target="_blank" rel="noreferrer"
                    style={{ display:'inline-block',background:'#1e1e1e',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:800,color:'#fafafa',textDecoration:'none',marginBottom:8 }}>
                    🎙️ VIEW RECORDING
                  </a>
                )}
                {note.content && <div style={{ fontSize:12,color:'#aaa',lineHeight:1.6,whiteSpace:'pre-wrap' }}>{note.content}</div>}
              </div>
            ))}
          </>}

          {/* ACTION STEPS */}
          {athleteProfileTab==='feedback' && (
            athleteActionSteps.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}><div style={{ fontSize:13,color:'#555' }}>No action steps yet.</div></div>
            ) : athleteActionSteps.map((s,i)=>(
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
                  <div style={{ fontSize:10,color:'#fafafa',fontWeight:700,letterSpacing:2 }}>{s.date} · {s.session_type}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{s.did_action_steps==='Yes'?'✅':'❌'}</div>
                </div>
                <div style={{ display:'flex',gap:12,marginBottom:8 }}>
                  {['conditioning','strength','technical','mental'].map(k=>(
                    <div key={k} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:16,fontWeight:900,color:'#fafafa' }}>{s[k]}</div>
                      <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {[['shark','🦈'],['goldfish','🐠'],['selftalk','💬'],['tuneout','🔇']].map(([k,icon])=>s[k+'_used']&&(
                    <span key={k} style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 8px',fontSize:9,fontWeight:700,color:'#fafafa' }}>{icon}</span>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* CHECK-INS */}
          {athleteProfileTab==='checkins' && (
            athleteCheckins.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}><div style={{ fontSize:13,color:'#555' }}>No check-ins yet.</div></div>
            ) : athleteCheckins.map((c,i)=>(
              <div key={i} style={C.card}>
                <div style={{ fontSize:10,color:'#fafafa',fontWeight:700,letterSpacing:2,marginBottom:8 }}>{c.week}</div>
                <div style={{ display:'flex',gap:14,marginBottom:8 }}>
                  {[['energy_level','⚡'],['confidence_level','💪'],['sessions_completed','🏃']].map(([k,icon])=>(
                    <div key={k} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:18,fontWeight:900,color:'#fafafa' }}>{c[k]}</div>
                      <div style={{ fontSize:9,color:'#555' }}>{icon}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12,color:'#aaa',marginBottom:4 }}>🏆 {c.biggest_win}</div>
                {c.biggest_challenge && <div style={{ fontSize:12,color:'#666',marginBottom:4 }}>💥 {c.biggest_challenge}</div>}
                {c.goal_next_week && <div style={{ fontSize:12,color:'#555',marginBottom:4 }}>🎯 {c.goal_next_week}</div>}
                {c.message_to_coach && <div style={{ fontSize:11,color:'#fafafa',fontStyle:'italic',marginTop:6 }}>"{c.message_to_coach}"</div>}
              </div>
            ))
          )}

          {/* BALL MASTERY */}
          {athleteProfileTab==='ball' && (
            athleteBallMastery.length===0 ? (
              <div style={{ ...C.card,textAlign:'center',padding:30 }}><div style={{ fontSize:13,color:'#555' }}>No ball mastery sessions yet.</div></div>
            ) : athleteBallMastery.map((b,i)=>(
              <div key={i} style={C.card}>
                <div style={{ display:'flex',justifyContent:'space-between' }}>
                  <div style={{ fontSize:10,color:'#fafafa',fontWeight:700 }}>{b.date}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{b.total_skills} skills · {b.total_reps} reps</div>
                </div>
                {b.notes && <div style={{ fontSize:11,color:'#555',marginTop:4 }}>{b.notes}</div>}
              </div>
            ))
          )}

          {/* MESSAGES */}
          {athleteProfileTab==='messages' && (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              <div style={{ ...C.card,maxHeight:360,overflowY:'auto' }}>
                {athleteMessages.length===0 ? (
                  <div style={{ textAlign:'center',padding:20,fontSize:13,color:'#555' }}>No messages yet. Start the conversation! 💬</div>
                ) : athleteMessages.map((m,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:m.sender_id===user.id?'flex-end':'flex-start',marginBottom:8 }}>
                    <div style={{ maxWidth:'80%',background:m.sender_id===user.id?'#fafafa':'#1e1e1e',borderRadius:10,padding:'8px 12px' }}>
                      <div style={{ fontSize:9,color:'rgba(255,255,255,0.6)',marginBottom:3 }}>{m.profiles?.full_name||'Athlete'}</div>
                      <div style={{ fontSize:13 }}>{m.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex',gap:8 }}>
                <input style={{ ...C.inp,flex:1 }} placeholder="Message athlete..."
                  value={newCoachMsg} onChange={e=>setNewCoachMsg(e.target.value)}
                  onKeyDown={async e=>{
                    if(e.key==='Enter'&&newCoachMsg.trim()){
                      await supabase.from('coach_messages').insert([{ sender_id:user.id,athlete_id:selectedAthlete.id,content:newCoachMsg }])
                      setNewCoachMsg('')
                      await loadAthleteProfile(selectedAthlete)
                    }
                  }} />
                <button onClick={async()=>{
                  if(!newCoachMsg.trim()) return
                  await supabase.from('coach_messages').insert([{ sender_id:user.id,athlete_id:selectedAthlete.id,content:newCoachMsg }])
                  setNewCoachMsg('')
                  await loadAthleteProfile(selectedAthlete)
                }} style={{ background:'#fafafa',border:'none',borderRadius:10,padding:'0 14px',fontSize:16,cursor:'pointer' }}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NAV */}
      <div style={C.nav}>
        {navTabs.map(nt => {
          const active = nt.matches ? nt.matches.includes(tab) : tab === nt.id
          return (
            <button key={nt.id} style={{
              ...C.nb,
              background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
            }} onClick={() => { setTab(nt.id); setSelectedAthlete(null); }}>
              <div style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.4,
                color: active ? '#fafafa' : '#8a8b8f',
                transition: 'color 120ms',
              }}>{nt.label}</div>
              <div style={{
                width: active ? 14 : 0, height: 2, borderRadius: 1,
                background: '#fafafa', marginTop: 2,
                transition: 'width 180ms cubic-bezier(.2,.7,.2,1)',
              }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

