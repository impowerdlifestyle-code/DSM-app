import { useState, useEffect, useRef } from 'react'
import { supabase, signOut, submitActionSteps, getActionSteps, saveHabits, getHabits, logDay, getAllProfiles, getAllActionSteps, updateAccessLevel } from '../lib/supabase.js'

const QUOTES = [
  "The body achieves what the mind believes. Train your mind first.",
  "Champions aren't born. They're built — one mental rep at a time.",
  "Pressure is a privilege. You're in a game worth playing.",
  "Process over outcome. Lock in, and the scoreboard takes care of itself.",
  "Mistakes are feedback, not failure. Learn and move forward.",
  "Your identity as an athlete starts in your mind before it shows on the pitch.",
]

const HABITS_LIST = ["Morning visualization", "Pre-match mental routine", "Post-session reflection", "Read DSM lesson", "Recovery protocol"]
const DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const BALL_MASTERY_SKILLS = [
  { id: "toe_taps", label: "Toe Taps", icon: "⚽" },
  { id: "inside_outside", label: "Inside/Outside", icon: "🦶" },
  { id: "pullbacks", label: "Pull Backs", icon: "↩️" },
  { id: "scissors", label: "Scissors", icon: "✂️" },
  { id: "v_moves", label: "V Moves", icon: "✌️" },
  { id: "dribbling", label: "Dribbling", icon: "🏃" },
  { id: "passing", label: "Passing", icon: "➡️" },
  { id: "shooting", label: "Shooting", icon: "🥅" },
  { id: "first_touch", label: "First Touch", icon: "🎯" },
  { id: "juggling", label: "Juggling", icon: "🔄" },
]

const PARENT_GUIDE = [
  { icon: "⚽", title: "Before The Match", content: "Say: 'I love watching you play.' Avoid adding pressure about performance. Your child needs unconditional support, not conditional love based on results." },
  { icon: "🏁", title: "After The Match", content: "Wait 30 minutes before discussing the game. Start with: 'How did YOU feel out there?' Let them lead. Avoid immediately pointing out mistakes." },
  { icon: "💪", title: "Handling Losses", content: "Losses are the greatest teachers. Ask: 'What did you learn today?' Never blame teammates, referees, or coaches. Model resilience and perspective." },
  { icon: "🔥", title: "Building Confidence", content: "Catch them doing things RIGHT. Praise effort over outcome. Say: 'I noticed how hard you worked on that' — not just 'great game.'" },
  { icon: "🧠", title: "Avoiding Pressure", content: "Your child can feel your anxiety. Stay calm in the stands. Cheering is great — coaching from the sidelines creates confusion and anxiety." },
  { icon: "📋", title: "Weekly Check-In", content: "Ask every week: 'What's one thing you're proud of?' and 'What's one thing you want to improve?' Keep it positive and forward-focused." },
]

const RESOURCES = [
  { title: "DSM Program Guide", desc: "Core program curriculum and methodology", url: "https://docs.google.com/document/d/1fgrgpzgj5L4qPvpbZBdFW2O3LFs6MvI1hv7k46nq23g/edit?usp=sharing", locked: false },
  { title: "Elite Program Continuation", desc: "Advanced program for elite athletes", url: "https://docs.google.com/document/d/1qS1XaBc3dUyWIjtyG1EeeycCGSryj5qyc6p6RVRbZOo/edit?usp=sharing", locked: true },
  { title: "Action Steps Feedback Form", desc: "Original form template", url: "https://docs.google.com/document/d/15LZfqewpb-BSPUx9eSyBzaNmkHRaSb-Bx3V3tckwMS0/edit?tab=t.0", locked: false },
]

const AI_SYSTEM = `You are Coach Valentino — the AI version of Valentino DiLorenzo, founder of DiLorenzo Soccer Mindset (DSM). You coach youth soccer athletes on mental performance. Your style is direct, energetic, and motivating. You believe mindset comes BEFORE skill. You teach: Shark Mentality (taking risks, aggressive, fearless), Goldfish Mentality (short term memory for mistakes — forget and move on), and Positive Self Talk. Use phrases like "lock in", "dominate", "elite mindset", "process over outcome", "be a shark not a fish". Always end with an action step. You're tough but caring. Keep responses concise and punchy. Never say you're an AI — you ARE Coach Valentino.`

const ELEVEN_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const ELEVEN_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID

const emptyForm = {
  playerName: '', sessionType: 'Practice',
  date: new Date().toISOString().split('T')[0],
  dayOfWeek: WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
  didSteps: '', usedSteps: {}, occasions: {}, comments: {},
  conditioning: 7, strength: 7, technical: 7, mental: 7,
}

const emptyCheckin = {
  biggestWin: '', biggestChallenge: '',
  sharkMoment: '', goldfishMoment: '', selfTalkMoment: '',
  energyLevel: 7, confidenceLevel: 7, sessionsCompleted: 3,
  goalNextWeek: '', messageToCoach: '',
}

function getWeekKey() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}


// ── COACH VALENTINO RESPONSES (built-in) ──
const SUGGESTED_QUESTIONS = [
  "How do I stop being scared in 1v1s?",
  "I keep dwelling on my mistakes",
  "I'm nervous before big games",
  "Explain the Mental Loop",
  "How do I build confidence?",
  "I had a bad game today",
  "What is Shark Mentality?",
  "What is Goldfish Mentality?",
  "How often should I train?",
  "I don't feel motivated today",
]

function matchMsg(msg, keywords) {
  return keywords.some(k => msg.includes(k))
}
function randomMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getCoachVResponse(input) {
  const msg = input.toLowerCase()
  if (matchMsg(msg, ['hello','hi','hey','sup','coach'])) return randomMsg([
    "Yo! Coach Valentino here. Let's lock in — what's on your mind today? 🔥",
    "What's up athlete! Talk to me. What do you need to work on? 💪",
    "Coach Valentino in the building. Ready to work on that mindset? Let's go. 🦈",
  ])
  if (matchMsg(msg, ['mental loop','loop','system','process'])) return randomMsg([
    "The Mental Loop is your reset system:\n\n1️⃣ SHARK MENTALITY — go in aggressive, fearless, hungry\n2️⃣ GOLDFISH MENTALITY — mistake? Gone in 1-2 seconds\n3️⃣ POSITIVE SELF TALK — say next play and mean it\n4️⃣ Back to SHARK — re-engage, attack again\n\nRuns on repeat the entire game. Master it and nothing can stop you. 🦈",
  ])
  if (matchMsg(msg, ['1v1','scared','afraid','fear','bigger','defender','physical','tackle','challenge'])) return randomMsg([
    "I hear this all the time. Bigger defender and your brain says don't do it. That's your amygdala firing. Here's the truth: when you go in HESITANT, you're more likely to get hurt. When you commit fully — shark mentality — you're in control. Aggressive is safe. Hesitant is dangerous. Action step: Next 1v1, commit fully before you even touch the ball. 🦈",
    "Fear in 1v1s comes from focusing on what you DON'T want. Flip it. Focus on winning the ball. Shark mentality means you WANT the 1v1. Action step: In your next practice, seek out 1v1 situations instead of avoiding them.",
    "Bigger defenders aren't scarier — they're just bigger. Speed beats size. Confidence beats size. The only thing holding you back is the story you're telling yourself. Change the story. You're a shark. 🦈",
  ])
  if (matchMsg(msg, ['shark','aggressive','fearless','attack','risk'])) return randomMsg([
    "Shark Mentality means one thing: you keep moving forward. Sharks don't swim backwards. They don't hesitate. On that pitch, you take risks. You challenge for balls you're not sure you'll win. Action step: Make 3 aggressive decisions you'd normally avoid in your next session. 🦈",
    "Shark Mentality is an identity, not just a strategy. You don't DO shark mentality — you ARE a shark. Before your next game say out loud: I am a shark. I am aggressive. I am fearless. I move forward. Say it 3 times. 🦈",
  ])
  if (matchMsg(msg, ['goldfish','mistake','forget','error','bad pass','miss','messed up','reset'])) return randomMsg([
    "Goldfish forget in 1-2 seconds. That's your superpower. Bad touch? Gone. Missed shot? Gone. Lost the 1v1? GONE. The best players in the world have short memories. Action step: Every mistake today — shake your hands out and say next play. 🐠",
    "The mistake already happened. You can't change it. The ONLY thing you control is the next play. 1-2 seconds to process, then switch fully to what's in front of you. Goldfish mentality is elite mental skill. 🐠",
  ])
  if (matchMsg(msg, ['self talk','voice','head','negative','positive','inner'])) return randomMsg([
    "Your inner voice is either coaching you or destroying you. Replace I can't do this with next play and I'm a shark. Simple phrases that reset your brain. Action step: Write down 3 power phrases you'll use in your next game. 💬",
  ])
  if (matchMsg(msg, ['growth','fixed','mindset','improve','better','develop'])) return randomMsg([
    "Fixed mindset: I'm either good at this or I'm not. Growth mindset: I'm not good at this YET. That one word — YET — changes everything. Your abilities grow with effort. Every rep of ball mastery, every action step you log — that's you growing. 💪",
  ])
  if (matchMsg(msg, ['confidence','confident','believe','doubt','unsure'])) return randomMsg([
    "Confidence isn't something you wait to feel — it's something you BUILD. Every rep of ball mastery. Every action step you complete. You're building confidence brick by brick. You don't find it. You earn it. 💪",
    "Your brain focuses on what you tell it. Flip it. I am a shark. I take risks. I move forward. Your body follows your mind. Train your mind first.",
  ])
  if (matchMsg(msg, ['nervous','nerves','anxiety','worried','stress','pressure'])) return randomMsg([
    "Nerves mean you care. Use them. Channel that energy into aggression, into your pre-match routine. 5 deep breaths. Shark mentality phrase. Visualize one aggressive action in the first 5 minutes. Then go compete. 🔥",
    "Reframe the nerves. Instead of I'm so nervous say I'm so ready. Same physical feeling — completely different mental response. Your brain believes what you tell it. Tell it you're a shark.",
  ])
  if (matchMsg(msg, ['lost','lose','bad game','terrible','played bad'])) return randomMsg([
    "One bad game doesn't define you. What defines you is how you RESPOND. Goldfish mentality applies to games too. Process it, learn from it, move on. What's one thing you'll fix this week? 🐠",
    "Losses hurt. Good. That means you care. Now use that hurt. Name ONE thing that went wrong and ONE thing you'll do in training to fix it. That's how champions are built. 💪",
  ])
  if (matchMsg(msg, ['ball mastery','weak foot','technical','skills','training'])) return randomMsg([
    "15 minutes of ball mastery every single day. No exceptions. Daily technical work on weak foot, first touch, moves. It compounds. 15 mins for 6 months straight? That's elite technical ability. Log it. ⚽",
    "Weak foot work is non-negotiable. Your strong foot is already good — your weak foot is where your next level lives. Every day, at least 50% of your ball mastery should be weak foot. That discomfort is growth. 🔥",
  ])
  if (matchMsg(msg, ['motivat','tired','lazy','hard','struggle','dont want'])) return randomMsg([
    "You don't need motivation — you need discipline. Motivation comes and goes. Discipline shows up every day whether you feel like it or not. Show up anyway. 🔥",
    "On the days you don't feel like it — those are the most important days. That's where champions separate themselves. 15 minutes of ball mastery even when you're tired. That's the work. 💪",
  ])
  if (matchMsg(msg, ['schedule','program','daily','how often'])) return randomMsg([
    "Your program: DAILY — 15 min ball mastery + weak foot. PRACTICE DAYS — Action steps form after every session. WEEKLY — Check-in form before Tuesday. DAILY HABIT — Morning visualization, pre-match routine, reflection. Stay consistent. In 3 months you won't recognize yourself. 💪",
  ])
  return randomMsg([
    "Lock in. Whatever you're going through — shark mentality. Keep moving forward. What specific challenge do you want to work on today? 🦈",
    "Talk to me. Give me more details and I'll give you a specific action step you can use today. 💪",
    "Process over outcome. Don't focus on the result — focus on the work. What's one thing you can do TODAY to get better? ⚽",
    "Every challenge has a solution. Tell me exactly what's happening and we'll break it down. Shark, Goldfish, or Self Talk — which one do you need right now? 🔥",
  ])
}

export default function Main({ user }) {
  const [tab, setTab] = useState('home')
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [streak, setStreak] = useState(0)
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState(HABITS_LIST.map(h => ({ label: h, days: [false,false,false,false,false,false,false] })))
  const [form, setForm] = useState(emptyForm)
  const [submissions, setSubmissions] = useState([])
  const [messages, setMessages] = useState([{ role: 'assistant', content: "What's up! I'm Coach Valentinoalentino 🔥 Ask me anything about mindset, match prep, or your action steps!" }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [allAthletes, setAllAthletes] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [savingForm, setSavingForm] = useState(false)
  const [ballMastery, setBallMastery] = useState({})
  const [ballHistory, setBallHistory] = useState([])
  const [savingBall, setSavingBall] = useState(false)
  const [checkin, setCheckin] = useState(emptyCheckin)
  const [checkinHistory, setCheckinHistory] = useState([])
  const [checkinDone, setCheckinDone] = useState(false)
  const [savingCheckin, setSavingCheckin] = useState(false)
  const [allCheckins, setAllCheckins] = useState([])
  const [allBallMastery, setAllBallMastery] = useState([])
  const chatEnd = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const currentWeek = getWeekKey()

  useEffect(() => { loadUserData() }, [user])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadUserData() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setStreak(p?.streak || 0)
    const { data: hd } = await getHabits(user.id)
    if (hd?.habits) setHabits(JSON.parse(hd.habits))
    const { data: sd } = await getActionSteps(user.id)
    if (sd) setSubmissions(sd)
    const { data: bd } = await supabase.from('ball_mastery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14)
    if (bd) setBallHistory(bd)
    const { data: cd } = await supabase.from('weekly_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    if (cd) {
      setCheckinHistory(cd)
      if (cd.find(c => c.week === currentWeek)) setCheckinDone(true)
    }
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
  }

  const toggleHabit = async (hi, di) => {
    const updated = habits.map((h, i) => i === hi ? { ...h, days: h.days.map((d, j) => j === di ? !d : d) } : h)
    setHabits(updated)
    await saveHabits(user.id, updated)
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setCI = (k, v) => setCheckin(p => ({ ...p, [k]: v }))

  const completedHabits = habits.reduce((a, h) => a + h.days.filter(Boolean).length, 0)
  const totalHabits = habits.length * 7
  const pct = Math.round((completedHabits / totalHabits) * 100)
  const todayBMLogged = ballHistory.some(b => b.date === today)
  const todayActionLogged = submissions.some(s => s.date === today)
  const isCoach = profile?.role === 'coach'
  const isEliteLocked = profile?.access_level !== 'paid' && profile?.access_level !== 'mentoring_elite'

  const handleLogDay = async () => {
    const { streak: ns } = await logDay(user.id)
    setStreak(ns || streak + 1)
  }

  const handleSubmitForm = async () => {
    if (!form.playerName) return alert('Enter your name!')
    if (!form.didSteps) return alert('Did you do the action steps?')
    setSavingForm(true)
    const { error } = await submitActionSteps(form, user.id)
    if (error) { alert('Error: ' + error.message); setSavingForm(false); return }
    const steps = ['shark','goldfish','selftalk','tuneout'].filter(k => form.usedSteps[k])
    const txt = `DSM ACTION STEPS\n${'='.repeat(40)}\nPLAYER: ${form.playerName}\nDAY: ${form.dayOfWeek}, ${form.date}\nSESSION: ${form.sessionType}\nDID STEPS: ${form.didSteps}\n\n${steps.map(k=>`✅ ${k.toUpperCase()}\n  Occasion: ${form.occasions[k]||'—'}\n  Comments: ${form.comments[k]||'—'}`).join('\n\n')}\n\nPERFORMANCE:\nConditioning: ${form.conditioning}/10\nStrength: ${form.strength}/10\nTechnical: ${form.technical}/10\nMental: ${form.mental}/10`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
    a.download = `DSM-${form.playerName}-${form.date}.txt`
    a.click()
    const { data: updated } = await getActionSteps(user.id)
    setSubmissions(updated || [])
    setForm(emptyForm)
    setSavingForm(false)
    alert('✅ Saved & downloaded!')
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
    const { data: bd } = await supabase.from('ball_mastery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14)
    setBallHistory(bd || [])
    setBallMastery({})
    setSavingBall(false)
    alert('✅ Ball mastery logged!')
  }

  const handleSubmitCheckin = async () => {
    if (!checkin.biggestWin) return alert('Fill in your biggest win!')
    if (!checkin.goalNextWeek) return alert('Set a goal for next week!')
    setSavingCheckin(true)
    const { error } = await supabase.from('weekly_checkins').insert([{
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
    }])
    if (error) { alert('Error: ' + error.message); setSavingCheckin(false); return }
    setCheckinDone(true)
    setSavingCheckin(false)
    const { data: cd } = await supabase.from('weekly_checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    setCheckinHistory(cd || [])
    alert('✅ Weekly check-in submitted to Coach Valentino!')
  }

  async function speakText(text) {
    if (!voiceMode) return
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true } })
      })
      if (!res.ok) throw new Error()
      new Audio(URL.createObjectURL(await res.blob())).play()
    } catch {
      const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; u.pitch = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  const sendChat = (msgOverride) => {
    const msg = msgOverride || chatInput.trim()
    if (!msg) return
    setChatInput('')
    setMessages(p => [...p, { role: 'user', content: msg }])
    setChatLoading(true)
    setTimeout(() => {
      const reply = getCoachVResponse(msg)
      setMessages(p => [...p, { role: 'assistant', content: reply }])
      speakText(reply)
      setChatLoading(false)
    }, 800)
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

  const C = {
    app: { fontFamily: "'Arial Narrow', Arial, sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#fff', maxWidth: 430, margin: '0 auto', paddingBottom: 80 },
    hdr: { padding: '16px 20px 12px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 100 },
    scroll: { padding: '16px 20px 40px' },
    card: { background: '#111', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid #1e1e1e' },
    orange: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', borderRadius: 12, padding: '18px 16px', marginBottom: 12 },
    lbl: { fontSize: 9, letterSpacing: 3, color: '#555', fontWeight: 700, marginBottom: 7, display: 'block' },
    olbl: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 7, display: 'block' },
    title: { fontSize: 26, fontWeight: 900, letterSpacing: 2, marginBottom: 2 },
    sub: { fontSize: 9, color: '#555', letterSpacing: 3, fontWeight: 700, marginBottom: 12 },
    btn: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', border: 'none', borderRadius: 10, padding: '14px 18px', fontSize: 13, fontWeight: 800, letterSpacing: 2, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: 'inherit', marginBottom: 8 },
    bsm: { background: '#ff3d00', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
    inp: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    ta: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' },
    nav: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#0d0d0d', borderTop: '1px solid #1a1a1a', display: 'flex', padding: '6px 0 10px', zIndex: 200 },
    nb: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' },
  }

  const navTabs = [
    { id: 'home', icon: '⚡', label: 'HOME' },
    { id: 'actions', icon: '✅', label: 'ACTIONS' },
    { id: 'ball', icon: '⚽', label: 'BALL' },
    { id: 'weekly', icon: '📋', label: 'WEEKLY' },
    { id: 'tracker', icon: '📊', label: 'TRACK' },
    { id: 'bot', icon: '🤖', label: 'COACH VALENTINO' },
    { id: 'parents', icon: '👨‍👩‍👧', label: 'PARENTS' },
    ...(isCoach ? [{ id: 'dashboard', icon: '🏆', label: 'COACH' }] : []),
  ]

  const ActionStep = ({ icon, title, desc, k }) => (
    <div style={{ ...C.card, borderColor: form.usedSteps[k] ? '#ff3d00' : '#1e1e1e', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.usedSteps[k] ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{desc}</div>
          </div>
        </div>
        <button onClick={() => setF('usedSteps', { ...form.usedSteps, [k]: !form.usedSteps[k] })}
          style={{ background: form.usedSteps[k] ? '#ff3d00' : '#1e1e1e', border: 'none', borderRadius: 20, padding: '5px 10px', fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          {form.usedSteps[k] ? '✓ USED' : 'MARK'}
        </button>
      </div>
      {form.usedSteps[k] && (
        <div>
          <span style={C.lbl}>OCCASION</span>
          <input style={{ ...C.inp, marginBottom: 8 }} placeholder="When did you use this?" value={form.occasions[k] || ''} onChange={e => setF('occasions', { ...form.occasions, [k]: e.target.value })} />
          <span style={C.lbl}>COMMENTS</span>
          <textarea style={{ ...C.ta, height: 55 }} placeholder="How did it help?" value={form.comments[k] || ''} onChange={e => setF('comments', { ...form.comments, [k]: e.target.value })} />
        </div>
      )}
    </div>
  )

  return (
    <div style={C.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { background: #0a0a0a; min-height: 100vh; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .fade { animation: fadeIn 0.2s ease; }
        input::placeholder, textarea::placeholder { color: #333; }
        input[type=range] { accent-color: #ff3d00; width: 100%; }
        a { text-decoration: none; }
        select { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 14px; outline: none; width: 100%; }
      `}</style>

      {/* HEADER */}
      <div style={C.hdr}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, lineHeight: 1 }}>DSM</div>
          <div style={{ fontSize: 8, letterSpacing: 2, color: '#ff3d00', fontWeight: 700, marginTop: 2 }}>DILORENZO SOCCER MINDSET</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3d00', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 20, fontWeight: 900, color: '#ff3d00' }}>{streak}</span>
            </div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: '#555', fontWeight: 700 }}>STREAK</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '5px 9px', fontSize: 10, color: '#555', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>OUT</button>
        </div>
      </div>

      {/* ── HOME ── */}
      {tab === 'home' && (
        <div style={C.scroll} className="fade">
          <div style={C.orange}>
            <span style={C.olbl}>TODAY'S MINDSET FUEL</span>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>"{quote}"</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>— Coach Valentino</div>
          </div>

          {/* Today checklist */}
          <span style={C.lbl}>TODAY'S CHECKLIST</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[
              { icon: '⚽', label: 'Ball Mastery', sub: 'Log your daily skills', done: todayBMLogged, tab: 'ball' },
              { icon: '✅', label: 'Action Steps', sub: 'After practice or game', done: todayActionLogged, tab: 'actions' },
              { icon: '📋', label: 'Weekly Check-In', sub: currentWeek, done: checkinDone, tab: 'weekly' },
            ].map(task => (
              <div key={task.tab} onClick={() => setTab(task.tab)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: task.done ? '#0d1a0d' : '#111', borderRadius: 12, cursor: 'pointer', border: `1px solid ${task.done ? '#1a4a1a' : '#1e1e1e'}` }}>
                <div style={{ fontSize: 22 }}>{task.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{task.label}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{task.sub}</div>
                </div>
                <div style={{ fontSize: 18 }}>{task.done ? '✅' : '→'}</div>
              </div>
            ))}
          </div>

          {/* Progress ring */}
          <div style={C.card}>
            <span style={C.lbl}>WEEKLY HABITS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#1e1e1e" strokeWidth="5" />
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#ff3d00" strokeWidth="5"
                    strokeDasharray={`${2*Math.PI*24}`} strokeDashoffset={`${2*Math.PI*24*(1-pct/100)}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 13, fontWeight: 900, color: '#ff3d00' }}>{pct}%</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{completedHabits}<span style={{ fontSize: 12, color: '#555' }}>/{totalHabits}</span></div>
                <div style={{ fontSize: 10, color: '#555' }}>habits this week</div>
                <div style={{ fontSize: 10, color: '#ff3d00', fontWeight: 800, letterSpacing: 1, marginTop: 3 }}>{pct>=70?'🔥 ELITE':pct>=40?'⚡ BUILDING':'💪 LET\'S GO'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[['🤖','COACH VALENTINO','AI coach','bot'],['🎥','COURSE','Video lessons','course']].map(([icon,label,sub,t]) => (
              <button key={t} onClick={() => setTab(t)} style={{ background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'14px 12px',textAlign:'left',cursor:'pointer' }}>
                <div style={{ fontSize:22,marginBottom:5 }}>{icon}</div>
                <div style={{ fontSize:11,fontWeight:800,letterSpacing:2,color:'#fff' }}>{label}</div>
                <div style={{ fontSize:10,color:'#555',marginTop:2 }}>{sub}</div>
              </button>
            ))}
          </div>
          <button style={C.btn} onClick={handleLogDay}>+ LOG TODAY ⚡</button>
          {profile && <div style={{ textAlign:'center',fontSize:11,color:'#333',marginTop:8 }}>
            {profile.full_name || user.email}{isCoach && <span style={{ color:'#ff3d00',marginLeft:8,fontWeight:800 }}>· COACH</span>}
          </div>}
        </div>
      )}

      {/* ── ACTION STEPS ── */}
      {tab === 'actions' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>ACTION STEPS</div>
          <div style={C.sub}>AFTER EVERY PRACTICE & GAME</div>
          <div style={{ ...C.orange }}>
            <span style={C.olbl}>⚠️ REQUIRED — NO EXCEPTIONS</span>
            <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Fill this out after EVERY practice and game. It goes straight to Coach Valentino. 🦈</div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>PLAYER NAME</span>
            <input style={{ ...C.inp, marginBottom: 10 }} placeholder="Your name" value={form.playerName} onChange={e => setF('playerName', e.target.value)} />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10 }}>
              <div><span style={C.lbl}>SESSION</span>
                <select value={form.sessionType} onChange={e => setF('sessionType', e.target.value)}>
                  <option>Practice</option><option>Game</option>
                </select>
              </div>
              <div><span style={C.lbl}>DATE</span>
                <input type="date" style={C.inp} value={form.date} onChange={e => setF('date', e.target.value)} />
              </div>
            </div>
            <span style={C.lbl}>DAY</span>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
              {WEEKDAYS.map(d => (
                <button key={d} onClick={() => setF('dayOfWeek', d)}
                  style={{ background:form.dayOfWeek===d?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'6px 10px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                  {d.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>DID YOU DO THE ACTION STEPS?</span>
            <div style={{ display:'flex',gap:8 }}>
              {['Yes','No'].map(opt => (
                <button key={opt} onClick={() => setF('didSteps', opt)}
                  style={{ flex:1,background:form.didSteps===opt?'#ff3d00':'#1e1e1e',border:'none',borderRadius:10,padding:12,fontSize:14,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                  {opt==='Yes'?'✅ YES':'❌ NO'}
                </button>
              ))}
            </div>
          </div>
          <span style={C.lbl}>WHICH DID YOU USE?</span>
          <ActionStep icon="🦈" title="SHARK MENTALITY" desc="Taking risks, aggressive, fearless" k="shark" />
          <ActionStep icon="🐠" title="GOLDFISH MENTALITY" desc="Short term memory for mistakes" k="goldfish" />
          <ActionStep icon="💬" title="POSITIVE SELF TALK" desc="Control your inner voice" k="selftalk" />
          <ActionStep icon="🔇" title="TUNE OUT COACH YELLING" desc="Stay focused under pressure" k="tuneout" />
          <div style={{ ...C.card, opacity:0.4, marginBottom:10 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ fontSize:20 }}>👁️</div>
                <div><div style={{ fontSize:13,fontWeight:800,color:'#555' }}>VISUALIZATION</div>
                  <div style={{ fontSize:10,color:'#444' }}>Unlocks at Lesson 5</div></div>
              </div>
              <div style={{ background:'#1e1e1e',borderRadius:20,padding:'4px 10px',fontSize:9,fontWeight:800,color:'#555' }}>🔒 LOCKED</div>
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>RATE MY PERFORMANCE (1–10)</span>
            {['conditioning','strength','technical','mental'].map(k => (
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                  <span style={{ fontSize:12,color:'#aaa',textTransform:'capitalize' }}>{k}</span>
                  <span style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{form[k]}/10</span>
                </div>
                <input type="range" min="1" max="10" value={form[k]} onChange={e => setF(k, parseInt(e.target.value))} />
              </div>
            ))}
          </div>
          <button style={C.btn} onClick={handleSubmitForm} disabled={savingForm}>
            {savingForm ? 'SAVING...' : '📤 SUBMIT & DOWNLOAD'}
          </button>
          {submissions.length > 0 && <>
            <span style={{ ...C.lbl, marginTop: 16 }}>PAST SUBMISSIONS</span>
            {submissions.slice(0,5).map((s,i) => (
              <div key={i} style={C.card}>
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{s.day_of_week}, {s.date} · {s.session_type}</div>
                <div style={{ fontSize:14,fontWeight:800,marginTop:2 }}>{s.player_name}</div>
                <div style={{ display:'flex',gap:8,marginTop:6,flexWrap:'wrap' }}>
                  {[['shark','🦈'],['goldfish','🐠'],['selftalk','💬'],['tuneout','🔇']].map(([k,icon]) => s[k+'_used'] &&
                    <span key={k} style={{ background:'#1e1e1e',borderRadius:20,padding:'2px 8px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>{icon}</span>
                  )}
                </div>
              </div>
            ))}
          </>}
        </div>
      )}

      {/* ── BALL MASTERY ── */}
      {tab === 'ball' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>BALL MASTERY</div>
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
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Tap each skill you trained. Set your reps. Be honest — this is YOUR progress. 🦈</div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>SKILLS PRACTICED</span>
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                {BALL_MASTERY_SKILLS.map(skill => (
                  <div key={skill.id} style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <button onClick={() => setBallMastery(p => ({ ...p, [skill.id]: (p[skill.id]?.reps||0)>0 ? {reps:0} : {reps:50} }))}
                      style={{ width:34,height:34,borderRadius:'50%',background:(ballMastery[skill.id]?.reps||0)>0?'#ff3d00':'#1e1e1e',border:'none',fontSize:15,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff' }}>
                      {(ballMastery[skill.id]?.reps||0)>0?'✓':skill.icon}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:800 }}>{skill.label}</div>
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
                <div style={{ fontSize:26,fontWeight:900,color:'#ff3d00' }}>{Object.keys(ballMastery).filter(k=>k!=='notes'&&(ballMastery[k]?.reps||0)>0).length}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:9,color:'#555',letterSpacing:3,fontWeight:700,marginBottom:4 }}>TOTAL REPS</div>
                <div style={{ fontSize:26,fontWeight:900,color:'#ff3d00' }}>{Object.entries(ballMastery).filter(([k])=>k!=='notes').reduce((a,[,v])=>a+(v?.reps||0),0)}</div>
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
                  <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{b.date}</div>
                  <div style={{ fontSize:10,color:'#555' }}>{b.total_skills} skills · {b.total_reps} reps</div>
                </div>
                {b.notes && <div style={{ fontSize:11,color:'#555',marginTop:5 }}>{b.notes}</div>}
              </div>
            ))}
          </>}
        </div>
      )}

      {/* ── WEEKLY CHECK-IN ── */}
      {tab === 'weekly' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>WEEKLY CHECK-IN</div>
          <div style={C.sub}>{currentWeek} — REFLECT & LOCK IN</div>
          {checkinDone ? (
            <div>
              <div style={{ ...C.card,borderColor:'#1a4a1a',textAlign:'center',padding:36,marginBottom:16 }}>
                <div style={{ fontSize:44,marginBottom:10 }}>✅</div>
                <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>THIS WEEK SUBMITTED!</div>
                <div style={{ fontSize:13,color:'#555' }}>Coach Valentino has your check-in. See you next week. 🔥</div>
              </div>
              {checkinHistory.length > 0 && <>
                <span style={C.lbl}>PAST CHECK-INS</span>
                {checkinHistory.map((c,i) => (
                  <div key={i} style={C.card}>
                    <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2,marginBottom:8 }}>{c.week}</div>
                    <div style={{ display:'flex',gap:16,marginBottom:8 }}>
                      {[['energy_level','⚡ ENERGY'],['confidence_level','💪 CONFIDENCE'],['sessions_completed','🏃 SESSIONS']].map(([k,l])=>(
                        <div key={k} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:18,fontWeight:900,color:'#ff3d00' }}>{c[k]}</div>
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
              <span style={C.olbl}>WEEK: {currentWeek}</span>
              <div style={{ fontSize:14,fontWeight:800,lineHeight:1.4 }}>Time to reflect. Be real with yourself — that's how you grow. 🦈</div>
            </div>
            <div style={C.card}>
              <span style={C.lbl}>RATE YOUR WEEK</span>
              {[['energyLevel','⚡ Energy Level',1,10],['confidenceLevel','💪 Confidence',1,10],['sessionsCompleted','🏃 Sessions Completed',0,14]].map(([k,l,min,max])=>(
                <div key={k} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                    <span style={{ fontSize:12,color:'#aaa' }}>{l}</span>
                    <span style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{checkin[k]}{k==='sessionsCompleted'?'':'/10'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={checkin[k]} onChange={e=>setCI(k,parseInt(e.target.value))} />
                </div>
              ))}
            </div>
            <div style={C.card}>
              <span style={C.lbl}>🏆 BIGGEST WIN THIS WEEK *</span>
              <textarea style={{ ...C.ta,height:65,marginBottom:12 }} placeholder="What are you most proud of?" value={checkin.biggestWin} onChange={e=>setCI('biggestWin',e.target.value)} />
              <span style={C.lbl}>💥 BIGGEST CHALLENGE</span>
              <textarea style={{ ...C.ta,height:65 }} placeholder="What was hardest this week?" value={checkin.biggestChallenge} onChange={e=>setCI('biggestChallenge',e.target.value)} />
            </div>
            <div style={C.card}>
              <span style={C.lbl}>DSM MOMENTS THIS WEEK</span>
              {[['sharkMoment','🦈 SHARK MOMENT','When did you take a fearless risk?'],['goldfishMoment','🐠 GOLDFISH MOMENT','When did you forget a mistake fast?'],['selfTalkMoment','💬 SELF TALK MOMENT','When did you control your inner voice?']].map(([k,l,p])=>(
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:9,color:'#ff3d00',letterSpacing:2,fontWeight:700,marginBottom:5 }}>{l}</div>
                  <textarea style={{ ...C.ta,height:55 }} placeholder={p} value={checkin[k]} onChange={e=>setCI(k,e.target.value)} />
                </div>
              ))}
            </div>
            <div style={C.card}>
              <span style={C.lbl}>🎯 GOAL FOR NEXT WEEK *</span>
              <textarea style={{ ...C.ta,height:65,marginBottom:12 }} placeholder="What's your #1 focus next week?" value={checkin.goalNextWeek} onChange={e=>setCI('goalNextWeek',e.target.value)} />
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
              <div style={{ fontSize:48,fontWeight:900,color:'#ff3d00',lineHeight:1 }}>{streak}</div>
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
                    style={{ flex:1,height:26,borderRadius:5,background:done?'#ff3d00':'#1e1e1e',margin:'0 2px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:800 }}>
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
              <div style={{ background:pct>=70?'#ff3d00':'#1e1e1e',padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:800 }}>
                {pct>=70?'🔥 ELITE':pct>=40?'⚡ GOOD':'📈 GROW'}
              </div>
            </div>
            <div style={{ height:4,background:'#1e1e1e',borderRadius:3,marginTop:10,overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#ff3d00,#ff6d00)',borderRadius:3 }}/>
            </div>
          </div>
        </div>
      )}

      {/* ── COACH VALENTINO BOT ── */}
      {tab === 'bot' && (
        <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 116px)' }} className="fade">
          <div style={{ padding:'12px 20px 10px',borderBottom:'1px solid #1a1a1a',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div><div style={C.title}>COACH VALENTINO</div><div style={C.sub}>YOUR AI MINDSET COACH</div></div>
            <button onClick={()=>setVoiceMode(p=>!p)}
              style={{ background:voiceMode?'#ff3d00':'#1e1e1e',border:'none',borderRadius:20,padding:'7px 12px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              {voiceMode?'🎙️ ON':'🎙️ OFF'}
            </button>
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'12px 20px' }}>
            {messages.length === 1 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: 3, fontWeight: 700, marginBottom: 10 }}>ASK COACH VALENTINO</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => sendChat(q)}
                      style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 20, padding: '6px 12px', fontSize: 11, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg,i)=>(
              <div key={i} style={{ display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',marginBottom:10 }}>
                {msg.role==='assistant'&&<div style={{ width:28,height:28,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,marginRight:7,flexShrink:0,alignSelf:'flex-end' }}>🤖</div>}
                <div style={{ maxWidth:'76%',padding:'10px 13px',borderRadius:13,background:msg.role==='user'?'#ff3d00':'#1a1a1a',fontSize:13,lineHeight:1.5,borderBottomRightRadius:msg.role==='user'?4:13,borderBottomLeftRadius:msg.role==='assistant'?4:13 }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading&&<div style={{ display:'flex',alignItems:'center',gap:7 }}>
              <div style={{ width:28,height:28,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>🤖</div>
              <div style={{ background:'#1a1a1a',padding:'10px 13px',borderRadius:13,fontSize:12,color:'#666' }}>Thinking... 💭</div>
            </div>}
            <div ref={chatEnd}/>
          </div>
          <div style={{ padding:'10px 20px 12px',borderTop:'1px solid #1a1a1a' }}>
            {voiceMode&&<div style={{ textAlign:'center',marginBottom:10 }}>
              <button onClick={startVoice} style={{ width:58,height:58,borderRadius:'50%',background:isRecording?'linear-gradient(135deg,#ff3d00,#ff6d00)':'#1e1e1e',border:`3px solid ${isRecording?'#ff6d00':'#333'}`,fontSize:22,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:isRecording?'0 0 18px rgba(255,61,0,0.5)':'none' }}>
                {isRecording?'⏹️':'🎙️'}
              </button>
              <div style={{ fontSize:9,color:isRecording?'#ff3d00':'#555',fontWeight:800,letterSpacing:2,marginTop:5 }}>{isRecording?'● RECORDING...':'TAP TO SPEAK'}</div>
            </div>}
            <div style={{ display:'flex',gap:8 }}>
              <input style={{ ...C.inp,flex:1 }} placeholder="Ask Coach Valentino anything..." value={chatInput}
                onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} />
              {!voiceMode&&<button onClick={startVoice} style={{ background:'#1e1e1e',border:'none',borderRadius:10,padding:'0 13px',fontSize:17,cursor:'pointer' }}>🎙️</button>}
              <button onClick={()=>sendChat()} style={{ background:'#ff3d00',border:'none',borderRadius:10,padding:'0 15px',fontSize:17,cursor:'pointer' }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PARENTS ── */}
      {tab === 'parents' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>PARENTS</div>
          <div style={C.sub}>BEST PRACTICES GUIDE</div>
          <div style={C.orange}>
            <span style={C.olbl}>FROM COACH VALENTINO</span>
            <div style={{ fontSize:15,fontWeight:700,lineHeight:1.4 }}>"Parents are the most influential people in a young athlete's mental development. Here's how to help — not hurt."</div>
          </div>
          {PARENT_GUIDE.map((item,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                <div style={{ fontSize:22 }}>{item.icon}</div>
                <div style={{ fontSize:15,fontWeight:800 }}>{item.title}</div>
              </div>
              <div style={{ fontSize:13,color:'#bbb',lineHeight:1.6 }}>{item.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── COACH DASHBOARD ── */}
      {tab === 'dashboard' && isCoach && !selectedAthlete && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>DASHBOARD</div>
          <div style={C.sub}>COACH VALENTINOIEW</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14 }}>
            {[[allAthletes.filter(a=>a.role==='athlete').length,'ATHLETES'],[allSubmissions.length,'ACTION STEPS'],[allCheckins.length,'CHECK-INS']].map(([n,l],i)=>(
              <div key={i} style={{ ...C.card,textAlign:'center',padding:12 }}>
                <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>{n}</div>
                <div style={{ fontSize:7,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          <span style={C.lbl}>ATHLETES</span>
          {allAthletes.filter(a=>a.role==='athlete').map((a,i)=>(
            <div key={i} style={{ ...C.card,cursor:'pointer' }} onClick={()=>setSelectedAthlete(a)}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:800,marginBottom:2 }}>{a.full_name||a.email}</div>
                  <div style={{ fontSize:10,color:'#555' }}>🔥 {a.streak||0} streak · {a.access_level}</div>
                </div>
                <div style={{ fontSize:20,fontWeight:900,color:'#ff3d00' }}>{a.streak||0}</div>
              </div>
            </div>
          ))}

          <span style={{ ...C.lbl,marginTop:14 }}>RECENT WEEKLY CHECK-INS</span>
          {allCheckins.slice(0,5).map((c,i)=>(
            <div key={i} style={C.card}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                <div style={{ fontSize:14,fontWeight:800 }}>{c.profiles?.full_name||c.profiles?.email}</div>
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{c.week}</div>
              </div>
              <div style={{ display:'flex',gap:14,marginBottom:6 }}>
                {[['energy_level','⚡'],['confidence_level','💪'],['sessions_completed','🏃']].map(([k,icon])=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16,fontWeight:900,color:'#ff3d00' }}>{c[k]}</div>
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
                <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{b.date}</div>
              </div>
              <div style={{ fontSize:11,color:'#555',marginTop:4 }}>{b.total_skills} skills · {b.total_reps} reps</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dashboard' && isCoach && selectedAthlete && (
        <div style={C.scroll} className="fade">
          <button onClick={()=>setSelectedAthlete(null)} style={{ background:'none',border:'none',color:'#ff3d00',fontSize:12,fontWeight:800,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',marginBottom:12,padding:0 }}>← BACK</button>
          <div style={C.title}>{selectedAthlete.full_name||selectedAthlete.email}</div>
          <div style={C.sub}>ATHLETE PROFILE</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
            <div style={{ ...C.card,textAlign:'center' }}>
              <div style={{ fontSize:26,fontWeight:900,color:'#ff3d00' }}>{selectedAthlete.streak||0}</div>
              <div style={{ fontSize:9,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>STREAK</div>
            </div>
            <div style={{ ...C.card,textAlign:'center' }}>
              <div style={{ fontSize:13,fontWeight:800,color:'#ff3d00',marginTop:4 }}>{selectedAthlete.access_level?.toUpperCase()}</div>
              <div style={{ fontSize:9,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>ACCESS</div>
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>GRANT ACCESS</span>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {['trial','mentoring','paid','locked'].map(level=>(
                <button key={level} onClick={async()=>{ await updateAccessLevel(selectedAthlete.id,level); setSelectedAthlete({...selectedAthlete,access_level:level}); loadUserData(); }}
                  style={{ background:selectedAthlete.access_level===level?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'7px 11px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase' }}>
                  {level}
                </button>
              ))}
            </div>
          </div>
          <span style={C.lbl}>THEIR ACTION STEPS</span>
          {allSubmissions.filter(s=>s.user_id===selectedAthlete.id).slice(0,5).map((s,i)=>(
            <div key={i} style={C.card}>
              <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{s.date} · {s.session_type}</div>
              <div style={{ display:'flex',gap:10,marginTop:6 }}>
                {['conditioning','strength','technical','mental'].map(k=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:14,fontWeight:900,color:'#ff3d00' }}>{s[k]}</div>
                    <div style={{ fontSize:7,color:'#555',letterSpacing:1,fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NAV */}
      <div style={C.nav}>
        {navTabs.map(t=>(
          <button key={t.id} style={C.nb} onClick={()=>{ setTab(t.id); setSelectedAthlete(null); }}>
            <div style={{ fontSize:13,opacity:tab===t.id?1:0.3 }}>{t.icon}</div>
            <div style={{ fontSize:6,fontWeight:800,letterSpacing:1,color:tab===t.id?'#ff3d00':'#555' }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
