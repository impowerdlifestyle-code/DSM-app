import { useState, useEffect, useRef } from 'react'
import { supabase, signOut, submitActionSteps, getActionSteps, saveHabits, getHabits, logDay, getStreak, getAllProfiles, getAllActionSteps, updateAccessLevel } from '../lib/supabase.js'

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
  { title: "Elite Program Continuation", desc: "Advanced program for elite athletes — unlocks after 3 months", url: "https://docs.google.com/document/d/1qS1XaBc3dUyWIjtyG1EeeycCGSryj5qyc6p6RVRbZOo/edit?usp=sharing", locked: true },
  { title: "Action Steps Feedback Form", desc: "Original form template", url: "https://docs.google.com/document/d/15LZfqewpb-BSPUx9eSyBzaNmkHRaSb-Bx3V3tckwMS0/edit?tab=t.0", locked: false },
]

const AI_SYSTEM = `You are Coach V — the AI version of Valentino DiLorenzo, founder of DiLorenzo Soccer Mindset (DSM). You coach youth soccer athletes on mental performance. Your style is direct, energetic, and motivating. You believe mindset comes BEFORE skill. You teach: Shark Mentality (taking risks, aggressive, fearless), Goldfish Mentality (short term memory for mistakes — forget and move on), and Positive Self Talk. Use phrases like "lock in", "dominate", "elite mindset", "process over outcome", "be a shark not a fish". Always end with an action step. You're tough but caring. Keep responses concise and punchy. Never say you're an AI — you ARE Coach V.`

const ELEVEN_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const ELEVEN_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID

const emptyForm = {
  playerName: '', sessionType: 'Practice',
  date: new Date().toISOString().split('T')[0],
  dayOfWeek: WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
  didSteps: '', usedSteps: {}, occasions: {}, comments: {},
  conditioning: 7, strength: 7, technical: 7, mental: 7,
}

export default function Main({ user }) {
  const [tab, setTab] = useState('home')
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [streak, setStreak] = useState(0)
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState(HABITS_LIST.map(h => ({ label: h, days: [false,false,false,false,false,false,false] })))
  const [form, setForm] = useState(emptyForm)
  const [submissions, setSubmissions] = useState([])
  const [messages, setMessages] = useState([{ role: 'assistant', content: "What's up! I'm Coach V 🔥 Ask me anything about mindset, match prep, or your action steps!" }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [allAthletes, setAllAthletes] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [savingForm, setSavingForm] = useState(false)
  const chatEnd = useRef(null)

  // Load user data
  useEffect(() => {
    loadUserData()
  }, [user])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadUserData() {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)
    setStreak(profileData?.streak || 0)
    const { data: habitsData } = await getHabits(user.id)
    if (habitsData?.habits) setHabits(JSON.parse(habitsData.habits))
    const { data: stepsData } = await getActionSteps(user.id)
    if (stepsData) setSubmissions(stepsData)
    if (profileData?.role === 'coach') {
      const { data: athletes } = await getAllProfiles()
      setAllAthletes(athletes || [])
      const { data: allSteps } = await getAllActionSteps()
      setAllSubmissions(allSteps || [])
    }
  }

  const toggleHabit = async (hi, di) => {
    const updated = habits.map((h, i) => i === hi ? { ...h, days: h.days.map((d, j) => j === di ? !d : d) } : h)
    setHabits(updated)
    await saveHabits(user.id, updated)
  }

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const completedHabits = habits.reduce((a, h) => a + h.days.filter(Boolean).length, 0)
  const totalHabits = habits.length * 7
  const pct = Math.round((completedHabits / totalHabits) * 100)

  const handleLogDay = async () => {
    const { streak: newStreak } = await logDay(user.id)
    setStreak(newStreak || streak + 1)
  }

  const handleSubmitForm = async () => {
    if (!form.playerName) return alert('Enter your name!')
    if (!form.didSteps) return alert('Did you do the action steps?')
    setSavingForm(true)
    const { error } = await submitActionSteps(form, user.id)
    if (error) { alert('Error saving: ' + error.message); setSavingForm(false); return }
    // Also download as txt
    const steps = ['shark','goldfish','selftalk','tuneout'].filter(k => form.usedSteps[k])
    const text = `DSM ACTION STEPS FEEDBACK\nDiLorenzo Soccer Mindset\n${'='.repeat(40)}\nPLAYER: ${form.playerName}\nDAY: ${form.dayOfWeek}, ${form.date}\nSESSION: ${form.sessionType}\nDID ACTION STEPS: ${form.didSteps}\n\n${steps.map(k => `✅ ${k.toUpperCase()}\n   Occasion: ${form.occasions[k]||'—'}\n   Comments: ${form.comments[k]||'—'}`).join('\n\n')}\n\nPERFORMANCE:\nConditioning: ${form.conditioning}/10\nStrength: ${form.strength}/10\nTechnical: ${form.technical}/10\nMental: ${form.mental}/10\n${'='.repeat(40)}\nDiLorenzoSoccerMindset.com`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.download = `DSM-${form.playerName}-${form.date}.txt`
    a.click()
    const { data: updated } = await getActionSteps(user.id)
    setSubmissions(updated || [])
    setForm(emptyForm)
    setSavingForm(false)
    alert('✅ Saved to database & downloaded! Send file to coach.')
  }

  async function speakText(text) {
    if (!voiceMode) return
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
        method: 'POST',
        headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true } })
      })
      if (!res.ok) throw new Error('ElevenLabs error')
      const blob = await res.blob()
      new Audio(URL.createObjectURL(blob)).play()
    } catch {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.1; u.pitch = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  const sendChat = async (msgOverride) => {
    const msg = msgOverride || chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: AI_SYSTEM, messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Keep pushing! 🔥'
      setMessages(p => [...p, { role: 'assistant', content: reply }])
      speakText(reply)
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Stay locked in! 💪' }])
    }
    setChatLoading(false)
  }

  const startVoiceInput = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) return alert('Voice not supported. Try Chrome!')
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.onstart = () => setIsRecording(true)
      recognition.onend = () => setIsRecording(false)
      recognition.onresult = e => { const t = e.results[0][0].transcript; sendChat(t) }
      recognition.onerror = () => setIsRecording(false)
      recognition.start()
    } catch { alert('Voice not supported on this browser.') }
  }

  const isCoach = profile?.role === 'coach'
  const isEliteLocked = profile?.access_level !== 'paid' && profile?.access_level !== 'mentoring_elite'

  const C = {
    app: { fontFamily: "'Arial Narrow', Arial, sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#fff', maxWidth: 430, margin: '0 auto', paddingBottom: 80 },
    hdr: { padding: '18px 22px 14px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 100 },
    scroll: { padding: '18px 22px 40px' },
    card: { background: '#111', borderRadius: 12, padding: 18, marginBottom: 12, border: '1px solid #1e1e1e' },
    orange: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', borderRadius: 12, padding: '20px 18px', marginBottom: 14 },
    lbl: { fontSize: 9, letterSpacing: 3, color: '#555', fontWeight: 700, marginBottom: 7, display: 'block' },
    olbl: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginBottom: 7, display: 'block' },
    title: { fontSize: 28, fontWeight: 900, letterSpacing: 2, marginBottom: 3 },
    sub: { fontSize: 9, color: '#555', letterSpacing: 3, fontWeight: 700, marginBottom: 14 },
    btn: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', border: 'none', borderRadius: 10, padding: '14px 18px', fontSize: 13, fontWeight: 800, letterSpacing: 2, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: 'inherit' },
    bsm: { background: '#ff3d00', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
    inp: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '13px 16px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    ta: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '13px 16px', fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' },
    nav: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#0d0d0d', borderTop: '1px solid #1a1a1a', display: 'flex', padding: '6px 0 12px', zIndex: 200 },
    nb: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' },
  }

  const navTabs = [
    { id: 'home', icon: '⚡', label: 'HOME' },
    { id: 'actions', icon: '✅', label: 'ACTIONS' },
    { id: 'tracker', icon: '📊', label: 'TRACK' },
    { id: 'bot', icon: '🤖', label: 'COACH V' },
    { id: 'parents', icon: '👨‍👩‍👧', label: 'PARENTS' },
    { id: 'course', icon: '🎥', label: 'COURSE' },
    ...(isCoach ? [{ id: 'dashboard', icon: '🏆', label: 'COACH' }] : []),
  ]

  const ActionStep = ({ icon, title, desc, k }) => (
    <div style={{ ...C.card, borderColor: form.usedSteps[k] ? '#ff3d00' : '#1e1e1e', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.usedSteps[k] ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 11, color: '#555' }}>{desc}</div>
          </div>
        </div>
        <button onClick={() => setF('usedSteps', { ...form.usedSteps, [k]: !form.usedSteps[k] })}
          style={{ background: form.usedSteps[k] ? '#ff3d00' : '#1e1e1e', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 10, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          {form.usedSteps[k] ? '✓ USED' : 'MARK'}
        </button>
      </div>
      {form.usedSteps[k] && (
        <div>
          <span style={C.lbl}>OCCASION</span>
          <input style={{ ...C.inp, marginBottom: 8 }} placeholder="When did you use this?" value={form.occasions[k] || ''} onChange={e => setF('occasions', { ...form.occasions, [k]: e.target.value })} />
          <span style={C.lbl}>COMMENTS</span>
          <textarea style={{ ...C.ta, height: 60 }} placeholder="How did it help?" value={form.comments[k] || ''} onChange={e => setF('comments', { ...form.comments, [k]: e.target.value })} />
        </div>
      )}
    </div>
  )

  return (
    <div style={C.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .fade { animation: fadeIn 0.2s ease; }
        input::placeholder, textarea::placeholder { color: #333; }
        input[type=range] { accent-color: #ff3d00; width: 100%; }
        a { text-decoration: none; }
        select { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 13px 16px; color: #fff; font-family: inherit; font-size: 14px; outline: none; width: 100%; }
      `}</style>

      {/* HEADER */}
      <div style={C.hdr}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, lineHeight: 1 }}>DSM</div>
          <div style={{ fontSize: 8, letterSpacing: 2.5, color: '#ff3d00', fontWeight: 700, marginTop: 2 }}>DILORENZO SOCCER MINDSET</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3d00', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 22, fontWeight: 900, color: '#ff3d00', lineHeight: 1 }}>{streak}</span>
            </div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: '#555', fontWeight: 700 }}>STREAK</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', fontSize: 10, color: '#555', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>OUT</button>
        </div>
      </div>

      {/* HOME */}
      {tab === 'home' && (
        <div style={C.scroll} className="fade">
          <div style={C.orange}>
            <span style={C.olbl}>TODAY'S MINDSET FUEL</span>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>"{quote}"</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>— Coach V</div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>WEEKLY PROGRESS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 66, height: 66, flexShrink: 0 }}>
                <svg width="66" height="66" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="33" cy="33" r="26" fill="none" stroke="#1e1e1e" strokeWidth="6" />
                  <circle cx="33" cy="33" r="26" fill="none" stroke="#ff3d00" strokeWidth="6"
                    strokeDasharray={`${2*Math.PI*26}`} strokeDashoffset={`${2*Math.PI*26*(1-pct/100)}`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 15, fontWeight: 900, color: '#ff3d00' }}>{pct}%</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{completedHabits}<span style={{ fontSize: 12, color: '#555' }}>/{totalHabits}</span></div>
                <div style={{ fontSize: 11, color: '#666' }}>habits this week</div>
                <div style={{ fontSize: 10, color: '#ff3d00', fontWeight: 800, letterSpacing: 1, marginTop: 4 }}>{pct>=70?'🔥 ELITE':pct>=40?'⚡ BUILDING':'💪 LET\'S GO'}</div>
              </div>
            </div>
          </div>
          <span style={C.lbl}>DSM CORE CONCEPTS</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[['🦈','SHARK','Fearless'],['🐠','GOLDFISH','Forget fast'],['💬','SELF TALK','Your voice']].map(([icon,label,sub]) => (
              <div key={label} style={{ background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'14px 8px',textAlign:'center' }}>
                <div style={{ fontSize:26,marginBottom:5 }}>{icon}</div>
                <div style={{ fontSize:10,fontWeight:800,letterSpacing:1 }}>{label}</div>
                <div style={{ fontSize:10,color:'#555',marginTop:2 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[['✅','ACTIONS','Submit feedback','actions'],['🤖','COACH V','AI coach','bot'],['📊','TRACKER','Your habits','tracker'],['🎥','COURSE','Video lessons','course']].map(([icon,label,sub,t]) => (
              <button key={t} onClick={() => setTab(t)} style={{ background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'16px 12px',textAlign:'left',cursor:'pointer' }}>
                <div style={{ fontSize:22,marginBottom:6 }}>{icon}</div>
                <div style={{ fontSize:11,fontWeight:800,letterSpacing:2,color:'#fff' }}>{label}</div>
                <div style={{ fontSize:10,color:'#555',marginTop:2 }}>{sub}</div>
              </button>
            ))}
          </div>
          <div style={{ ...C.card, borderColor:'#ff3d00', marginBottom:14 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:9,color:'#ff3d00',letterSpacing:3,fontWeight:700,marginBottom:3 }}>FOR PARENTS</div>
                <div style={{ fontSize:16,fontWeight:800 }}>Parent Best Practices</div>
              </div>
              <button onClick={() => setTab('parents')} style={C.bsm}>VIEW →</button>
            </div>
          </div>
          <button style={C.btn} onClick={handleLogDay}>+ LOG TODAY ⚡</button>
          {profile && (
            <div style={{ textAlign:'center',marginTop:14,fontSize:11,color:'#333' }}>
              Logged in as {profile.full_name || user.email}
              {isCoach && <span style={{ color:'#ff3d00',marginLeft:8,fontWeight:800 }}>· COACH</span>}
            </div>
          )}
        </div>
      )}

      {/* ACTION STEPS */}
      {tab === 'actions' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>ACTION STEPS</div>
          <div style={C.sub}>COMPLETE AFTER EVERY PRACTICE & GAME</div>
          <div style={{ ...C.orange, border: '2px solid rgba(255,255,255,0.3)' }}>
            <span style={C.olbl}>⚠️ REQUIRED — NO EXCEPTIONS</span>
            <div style={{ fontSize:15,fontWeight:800,lineHeight:1.4,marginBottom:8 }}>Fill this out after EVERY practice and game. Saved to database + downloaded for coach. 🦈</div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>PLAYER NAME</span>
            <input style={{ ...C.inp, marginBottom: 12 }} placeholder="Your name" value={form.playerName} onChange={e => setF('playerName', e.target.value)} />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
              <div>
                <span style={C.lbl}>SESSION</span>
                <select value={form.sessionType} onChange={e => setF('sessionType', e.target.value)}>
                  <option>Practice</option><option>Game</option>
                </select>
              </div>
              <div>
                <span style={C.lbl}>DATE</span>
                <input type="date" style={C.inp} value={form.date} onChange={e => setF('date', e.target.value)} />
              </div>
            </div>
            <span style={C.lbl}>DAY OF WEEK</span>
            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
              {WEEKDAYS.map(d => (
                <button key={d} onClick={() => setF('dayOfWeek', d)}
                  style={{ background:form.dayOfWeek===d?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'7px 10px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
                  {d.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>HAVE YOU DONE THE ACTION STEPS?</span>
            <div style={{ display:'flex',gap:8 }}>
              {['Yes','No'].map(opt => (
                <button key={opt} onClick={() => setF('didSteps', opt)}
                  style={{ flex:1,background:form.didSteps===opt?'#ff3d00':'#1e1e1e',border:'none',borderRadius:10,padding:13,fontSize:14,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
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
          <div style={{ ...C.card, opacity:0.5, marginBottom:12 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ fontSize:22 }}>👁️</div>
                <div>
                  <div style={{ fontSize:14,fontWeight:800,color:'#555' }}>VISUALIZATION</div>
                  <div style={{ fontSize:11,color:'#444' }}>Unlocks at Lesson 5</div>
                </div>
              </div>
              <div style={{ background:'#1e1e1e',borderRadius:20,padding:'5px 12px',fontSize:9,fontWeight:800,color:'#555' }}>🔒 LOCKED</div>
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>RATE MY PERFORMANCE (1–10)</span>
            {['conditioning','strength','technical','mental'].map(k => (
              <div key={k} style={{ marginBottom:14 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                  <span style={{ fontSize:12,color:'#aaa',textTransform:'capitalize' }}>{k}</span>
                  <span style={{ fontSize:15,fontWeight:900,color:'#ff3d00' }}>{form[k]}/10</span>
                </div>
                <input type="range" min="1" max="10" value={form[k]} onChange={e => setF(k, parseInt(e.target.value))} />
              </div>
            ))}
          </div>
          <button style={C.btn} onClick={handleSubmitForm} disabled={savingForm}>
            {savingForm ? 'SAVING...' : '📤 SUBMIT & DOWNLOAD'}
          </button>
          {submissions.length > 0 && (
            <div style={{ marginTop:20 }}>
              <span style={C.lbl}>PAST SUBMISSIONS ({submissions.length})</span>
              {submissions.slice(0,5).map((s,i) => (
                <div key={i} style={C.card}>
                  <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{s.day_of_week}, {s.date} · {s.session_type}</div>
                  <div style={{ fontSize:16,fontWeight:800,marginTop:3 }}>{s.player_name}</div>
                  <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
                    {s.shark_used && <span style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 9px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>🦈</span>}
                    {s.goldfish_used && <span style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 9px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>🐠</span>}
                    {s.selftalk_used && <span style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 9px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>💬</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRACKER */}
      {tab === 'tracker' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>TRACKER</div>
          <div style={C.sub}>WEEKLY HABIT TRACKER</div>
          <div style={C.card}>
            <div style={{ display:'flex',alignItems:'center',gap:14 }}>
              <div style={{ fontSize:52,fontWeight:900,color:'#ff3d00',lineHeight:1 }}>{streak}</div>
              <div>
                <div style={{ fontSize:15,fontWeight:800 }}>DAY STREAK</div>
                <div style={{ fontSize:11,color:'#555',marginTop:2 }}>Keep showing up every day.</div>
                <button style={{ ...C.bsm,marginTop:8 }} onClick={handleLogDay}>+ LOG DAY</button>
              </div>
            </div>
          </div>
          <div style={{ ...C.card, overflowX:'auto' }}>
            <div style={{ display:'flex',minWidth:300,marginBottom:8 }}>
              <div style={{ width:115,flexShrink:0 }} />
              {DAYS.map((d,i) => <div key={i} style={{ flex:1,textAlign:'center',fontSize:10,fontWeight:700,color:'#555' }}>{d}</div>)}
            </div>
            {habits.map((habit,hi) => (
              <div key={hi} style={{ display:'flex',alignItems:'center',marginBottom:7,minWidth:300 }}>
                <div style={{ width:115,fontSize:10,color:'#aaa',fontWeight:600,paddingRight:6,flexShrink:0 }}>{habit.label}</div>
                {habit.days.map((done,di) => (
                  <div key={di} onClick={() => toggleHabit(hi,di)}
                    style={{ flex:1,height:28,borderRadius:5,background:done?'#ff3d00':'#1e1e1e',margin:'0 2px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:800,transition:'background 0.2s' }}>
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
                <div style={{ fontSize:30,fontWeight:900 }}>{completedHabits}<span style={{ fontSize:13,color:'#555' }}>/{totalHabits}</span></div>
              </div>
              <div style={{ background:pct>=70?'#ff3d00':'#1e1e1e',padding:'9px 16px',borderRadius:8,fontSize:13,fontWeight:800 }}>
                {pct>=70?'🔥 ELITE':pct>=40?'⚡ GOOD':'📈 GROW'}
              </div>
            </div>
            <div style={{ height:5,background:'#1e1e1e',borderRadius:3,marginTop:12,overflow:'hidden' }}>
              <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#ff3d00,#ff6d00)',borderRadius:3 }} />
            </div>
          </div>
        </div>
      )}

      {/* COACH V BOT */}
      {tab === 'bot' && (
        <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 120px)' }} className="fade">
          <div style={{ padding:'14px 22px 10px',borderBottom:'1px solid #1a1a1a',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <div style={C.title}>COACH V</div>
              <div style={C.sub}>YOUR AI MINDSET COACH</div>
            </div>
            <button onClick={() => setVoiceMode(p=>!p)}
              style={{ background:voiceMode?'#ff3d00':'#1e1e1e',border:'none',borderRadius:20,padding:'8px 12px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>
              {voiceMode?'🎙️ ON':'🎙️ OFF'}
            </button>
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'14px 22px' }}>
            {messages.map((msg,i) => (
              <div key={i} style={{ display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',marginBottom:10 }}>
                {msg.role==='assistant' && <div style={{ width:30,height:30,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,marginRight:7,flexShrink:0,alignSelf:'flex-end' }}>🤖</div>}
                <div style={{ maxWidth:'76%',padding:'11px 14px',borderRadius:13,background:msg.role==='user'?'#ff3d00':'#1a1a1a',fontSize:13,lineHeight:1.5,borderBottomRightRadius:msg.role==='user'?4:13,borderBottomLeftRadius:msg.role==='assistant'?4:13 }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                <div style={{ width:30,height:30,borderRadius:'50%',background:'#ff3d00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🤖</div>
                <div style={{ background:'#1a1a1a',padding:'11px 14px',borderRadius:13,fontSize:12,color:'#666' }}>Coach V is thinking... 💭</div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>
          <div style={{ padding:'10px 22px 14px',borderTop:'1px solid #1a1a1a' }}>
            {voiceMode && (
              <div style={{ textAlign:'center',marginBottom:10 }}>
                <button onClick={startVoiceInput}
                  style={{ width:64,height:64,borderRadius:'50%',background:isRecording?'linear-gradient(135deg,#ff3d00,#ff6d00)':'#1e1e1e',border:`3px solid ${isRecording?'#ff6d00':'#333'}`,fontSize:24,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:isRecording?'0 0 20px rgba(255,61,0,0.5)':'none' }}>
                  {isRecording?'⏹️':'🎙️'}
                </button>
                <div style={{ fontSize:10,color:isRecording?'#ff3d00':'#555',fontWeight:800,letterSpacing:2,marginTop:6 }}>
                  {isRecording?'● RECORDING...':'TAP TO SPEAK'}
                </div>
              </div>
            )}
            <div style={{ display:'flex',gap:8 }}>
              <input style={{ ...C.inp,flex:1 }} placeholder="Ask Coach V anything..." value={chatInput}
                onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&sendChat()} />
              {!voiceMode && <button onClick={startVoiceInput} style={{ background:'#1e1e1e',border:'none',borderRadius:10,padding:'0 14px',fontSize:18,cursor:'pointer' }}>🎙️</button>}
              <button onClick={() => sendChat()} style={{ background:'#ff3d00',border:'none',borderRadius:10,padding:'0 16px',fontSize:18,cursor:'pointer' }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* PARENTS */}
      {tab === 'parents' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>PARENTS</div>
          <div style={C.sub}>BEST PRACTICES GUIDE</div>
          <div style={C.orange}>
            <span style={C.olbl}>FROM COACH V</span>
            <div style={{ fontSize:16,fontWeight:700,lineHeight:1.4 }}>"Parents are the most influential people in a young athlete's mental development. Here's how to help — not hurt."</div>
          </div>
          {PARENT_GUIDE.map((item,i) => (
            <div key={i} style={C.card}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:9 }}>
                <div style={{ fontSize:24 }}>{item.icon}</div>
                <div style={{ fontSize:16,fontWeight:800 }}>{item.title}</div>
              </div>
              <div style={{ fontSize:13,color:'#bbb',lineHeight:1.6 }}>{item.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* COURSE */}
      {tab === 'course' && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>MY COURSE</div>
          <div style={C.sub}>VIDEO LESSONS & RESOURCES</div>
          <div style={C.orange}>
            <span style={C.olbl}>FULL PROGRAM ACCESS</span>
            <div style={{ fontSize:20,fontWeight:800,marginBottom:10 }}>DiLorenzo Soccer Mindset Course</div>
            <a href="https://dilorenzomindsetcourse.app.clientclub.net/" target="_blank" rel="noopener noreferrer"
              style={{ display:'block',background:'#fff',borderRadius:8,padding:14,textAlign:'center',fontSize:13,fontWeight:800,letterSpacing:2,color:'#ff3d00' }}>
              OPEN MY COURSE →
            </a>
          </div>
          <span style={C.lbl}>PROGRAM RESOURCES</span>
          {RESOURCES.map((r,i) => (
            <div key={i} style={{ ...C.card, opacity:r.locked&&isEliteLocked?0.5:1 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                <div style={{ fontSize:9,color:'#ff3d00',letterSpacing:3,fontWeight:700 }}>GOOGLE DOC</div>
                {r.locked && isEliteLocked && <div style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 10px',fontSize:9,fontWeight:800,color:'#ffaa00' }}>🔒 MONTH 3+</div>}
              </div>
              <div style={{ fontSize:17,fontWeight:800,marginBottom:4 }}>{r.title}</div>
              <div style={{ fontSize:12,color:'#555',marginBottom:12 }}>{r.desc}</div>
              {r.locked && isEliteLocked ? (
                <div style={{ background:'#1e1e1e',borderRadius:8,padding:12,textAlign:'center',fontSize:11,fontWeight:800,color:'#555' }}>🔒 UNLOCKS AFTER 3 MONTHS</div>
              ) : (
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block',background:'#1e1e1e',borderRadius:8,padding:12,textAlign:'center',fontSize:11,fontWeight:800,letterSpacing:2,color:'#fff' }}>
                  OPEN DOCUMENT →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* COACH DASHBOARD */}
      {tab === 'dashboard' && isCoach && !selectedAthlete && (
        <div style={C.scroll} className="fade">
          <div style={C.title}>DASHBOARD</div>
          <div style={C.sub}>COACH VIEW — ALL ATHLETES</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16 }}>
            {[
              [allAthletes.filter(a=>a.role==='athlete').length,'','ATHLETES'],
              [allAthletes.length>0?Math.round(allAthletes.reduce((a,b)=>a+(b.streak||0),0)/allAthletes.length):0,'d','AVG STREAK'],
              [allSubmissions.length,'','SUBMISSIONS'],
            ].map(([n,s,l],i) => (
              <div key={i} style={{ ...C.card,textAlign:'center',padding:12 }}>
                <div style={{ fontSize:24,fontWeight:900,color:'#ff3d00' }}>{n}{s}</div>
                <div style={{ fontSize:8,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
          <span style={C.lbl}>ATHLETE ROSTER</span>
          {allAthletes.filter(a=>a.role==='athlete').map((a,i) => (
            <div key={i} style={{ ...C.card,cursor:'pointer' }} onClick={() => setSelectedAthlete(a)}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:17,fontWeight:800,marginBottom:3 }}>{a.full_name||a.email}</div>
                  <div style={{ fontSize:10,color:'#555' }}>🔥 {a.streak||0} day streak · {a.access_level}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22,fontWeight:900,color:'#ff3d00' }}>{a.streak||0}</div>
                  <div style={{ fontSize:8,color:'#555',letterSpacing:1,fontWeight:700 }}>STREAK</div>
                </div>
              </div>
            </div>
          ))}
          <span style={{ ...C.lbl,marginTop:16 }}>RECENT SUBMISSIONS</span>
          {allSubmissions.slice(0,10).map((s,i) => (
            <div key={i} style={C.card}>
              <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700,letterSpacing:2 }}>{s.day_of_week}, {s.date} · {s.session_type}</div>
              <div style={{ fontSize:15,fontWeight:800,marginTop:3 }}>{s.player_name}</div>
              <div style={{ display:'flex',gap:6,marginTop:6,flexWrap:'wrap' }}>
                {s.shark_used&&<span style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 9px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>🦈 Shark</span>}
                {s.goldfish_used&&<span style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 9px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>🐠 Goldfish</span>}
                {s.selftalk_used&&<span style={{ background:'#1e1e1e',borderRadius:20,padding:'3px 9px',fontSize:9,fontWeight:700,color:'#ff3d00' }}>💬 Self Talk</span>}
              </div>
              <div style={{ display:'flex',gap:12,marginTop:8 }}>
                {['conditioning','strength','technical','mental'].map(k=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15,fontWeight:900,color:'#ff3d00' }}>{s[k]}</div>
                    <div style={{ fontSize:8,color:'#555',letterSpacing:1,fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dashboard' && isCoach && selectedAthlete && (
        <div style={C.scroll} className="fade">
          <button onClick={() => setSelectedAthlete(null)} style={{ background:'none',border:'none',color:'#ff3d00',fontSize:12,fontWeight:800,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',marginBottom:14,padding:0 }}>← BACK</button>
          <div style={C.title}>{selectedAthlete.full_name||selectedAthlete.email}</div>
          <div style={C.sub}>ATHLETE PROFILE</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
            <div style={{ ...C.card,textAlign:'center' }}>
              <div style={{ fontSize:28,fontWeight:900,color:'#ff3d00' }}>{selectedAthlete.streak||0}</div>
              <div style={{ fontSize:9,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>DAY STREAK</div>
            </div>
            <div style={{ ...C.card,textAlign:'center' }}>
              <div style={{ fontSize:14,fontWeight:800,color:'#ff3d00',marginTop:4 }}>{selectedAthlete.access_level?.toUpperCase()}</div>
              <div style={{ fontSize:9,color:'#555',letterSpacing:2,fontWeight:700,marginTop:3 }}>ACCESS</div>
            </div>
          </div>
          <div style={C.card}>
            <span style={C.lbl}>GRANT ACCESS</span>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {['trial','mentoring','paid','locked'].map(level => (
                <button key={level} onClick={async () => { await updateAccessLevel(selectedAthlete.id, level); setSelectedAthlete({...selectedAthlete,access_level:level}); loadUserData(); }}
                  style={{ background:selectedAthlete.access_level===level?'#ff3d00':'#1e1e1e',border:'none',borderRadius:8,padding:'8px 12px',fontSize:10,fontWeight:800,color:'#fff',cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase' }}>
                  {level}
                </button>
              ))}
            </div>
          </div>
          <span style={C.lbl}>THEIR SUBMISSIONS</span>
          {allSubmissions.filter(s=>s.player_name===selectedAthlete.full_name).slice(0,10).map((s,i)=>(
            <div key={i} style={C.card}>
              <div style={{ fontSize:10,color:'#ff3d00',fontWeight:700 }}>{s.day_of_week}, {s.date} · {s.session_type}</div>
              <div style={{ display:'flex',gap:12,marginTop:8 }}>
                {['conditioning','strength','technical','mental'].map(k=>(
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15,fontWeight:900,color:'#ff3d00' }}>{s[k]}</div>
                    <div style={{ fontSize:8,color:'#555',letterSpacing:1,fontWeight:700 }}>{k.slice(0,4).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NAV */}
      <div style={C.nav}>
        {navTabs.map(t => (
          <button key={t.id} style={C.nb} onClick={() => { setTab(t.id); setSelectedAthlete(null); }}>
            <div style={{ fontSize:15,opacity:tab===t.id?1:0.3 }}>{t.icon}</div>
            <div style={{ fontSize:7,fontWeight:800,letterSpacing:1,color:tab===t.id?'#ff3d00':'#555' }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
