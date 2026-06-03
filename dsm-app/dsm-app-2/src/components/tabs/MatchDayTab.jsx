import { useState, useEffect } from 'react'
import {
  getMatches, createMatchPre, updateMatchPost, getActiveMatch, awardXp,
} from '../../lib/supabase.js'
import { XP_TABLE } from '../../data/gamification.js'
import { tokens as t, C } from '../../styles.js'
import FutureSelfPlayer from '../../features/future-self/FutureSelfPlayer.jsx'

const COMPETITIONS = [
  { v: 'league', label: 'League' },
  { v: 'cup', label: 'Cup' },
  { v: 'tournament', label: 'Tournament' },
  { v: 'friendly', label: 'Friendly' },
]

const CUES = [
  { v: 'shark',     label: '🦈 Shark' },
  { v: 'goldfish',  label: '🐠 Goldfish' },
  { v: 'selftalk',  label: '💬 Self-talk' },
  { v: 'tuneout',   label: '🔇 Tune-out' },
  { v: 'visualize', label: '🎬 Visualize' },
]

const s = {
  card: { ...C.card, padding: 18 },
  bigCard: {
    background: t.color.surface2,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.xl,
    padding: 22, marginBottom: 14,
    boxShadow: t.shadow.raised,
  },
  sub: { ...C.sub, marginBottom: 12 },
  title: { ...C.title, fontSize: 36 },
  lbl: { ...C.lbl },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: (on) => ({
    padding: '8px 12px',
    border: `1px solid ${on ? t.color.text : t.color.line2}`,
    background: on ? t.color.text : 'transparent',
    color: on ? t.color.bg : t.color.text,
    borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: 1,
    cursor: 'pointer', textTransform: 'uppercase',
  }),
  scaleRow: { display: 'flex', gap: 4, marginBottom: 12 },
  scaleBtn: (on) => ({
    flex: 1, minHeight: 36, borderRadius: 8,
    border: `1px solid ${on ? t.color.text : t.color.line2}`,
    background: on ? t.color.text : 'transparent',
    color: on ? t.color.bg : t.color.text,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  }),
  segRow: { display: 'flex', gap: 6, marginBottom: 14 },
  segBtn: (on) => ({
    flex: 1, padding: '12px 8px',
    border: `1px solid ${on ? t.color.text : t.color.line2}`,
    background: on ? t.color.text : 'transparent',
    color: on ? t.color.bg : t.color.text,
    borderRadius: t.radius.md, fontSize: 12, fontWeight: 700, letterSpacing: 1,
    cursor: 'pointer', textTransform: 'uppercase',
  }),
  identityBox: {
    background: 'rgba(255,255,255,0.04)',
    border: `1px dashed ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: 14, marginBottom: 14,
    fontSize: 13, color: t.color.textDim, lineHeight: 1.45,
  },
  matchRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: `1px solid ${t.color.line}`,
    cursor: 'pointer',
  },
  matchResult: (r) => ({
    fontFamily: t.font.athletic, fontSize: 18, fontWeight: 400,
    padding: '4px 10px', borderRadius: 8, letterSpacing: 1,
    background: r === 'W' ? 'rgba(74,222,128,0.15)' :
                r === 'L' ? 'rgba(248,113,113,0.15)' :
                            'rgba(255,255,255,0.08)',
    color: r === 'W' ? t.color.ok :
           r === 'L' ? t.color.err : t.color.textDim,
  }),
  err: { fontSize: 12, color: t.color.err, marginTop: 8 },
  ok:  { fontSize: 12, color: t.color.ok,  marginTop: 8 },
}

const BreathDot = ({ phase }) => (
  <div style={{
    width: phase === 'in' ? 140 : phase === 'hold' ? 140 : 60,
    height: phase === 'in' ? 140 : phase === 'hold' ? 140 : 60,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(var(--dsm-glow-rgb),0.18) 0%, rgba(var(--dsm-glow-rgb),0.02) 70%)',
    border: '1px solid rgba(var(--dsm-glow-rgb),0.25)',
    transition: 'all 4s ease',
    margin: '0 auto',
  }} />
)

function BreathTimer({ onDone }) {
  // 4-7-8 box-breath, 3 cycles
  const [phase, setPhase] = useState('in')   // in | hold | out
  const [cycle, setCycle] = useState(1)
  useEffect(() => {
    const seq = [['in', 4000], ['hold', 7000], ['out', 8000]]
    let alive = true
    let i = 0, c = 1
    let timer
    function step() {
      if (!alive) return
      const [p, dur] = seq[i]
      setPhase(p); setCycle(c)
      timer = setTimeout(() => {
        if (!alive) return
        i++
        if (i >= seq.length) { i = 0; c++ }
        if (c > 3) { onDone?.(); return }
        step()
      }, dur)
    }
    step()
    return () => { alive = false; clearTimeout(timer) }
  }, [onDone])
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontFamily: t.font.athletic, fontSize: 28, letterSpacing: 2, marginBottom: 16 }}>
        {phase === 'in' ? 'BREATHE IN' : phase === 'hold' ? 'HOLD' : 'BREATHE OUT'}
      </div>
      <BreathDot phase={phase} />
      <div style={{ marginTop: 16, fontSize: 11, letterSpacing: 2, color: t.color.textMute }}>
        CYCLE {cycle} / 3
      </div>
    </div>
  )
}

export default function MatchDayTab({ user, profile }) {
  const PRE_KEY = `dsm_pre_match_${user.id}`
  const [mode, setMode] = useState('home')    // home | pre | live | post
  const [active, setActive] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [showBreath, setShowBreath] = useState(false)

  // pre-match form — restore from localStorage if user navigated away mid-fill
  const [pre, setPre] = useState(() => {
    try {
      const saved = localStorage.getItem(PRE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      matchDate: new Date().toISOString().split('T')[0],
      opponent: '', competition: 'league', isHome: true,
      preMood: 7, preIntention: profile?.identity_goal || '',
      preFocusCue: '', preTactical: '',
    }
  })

  // persist pre-match draft on every change so nav doesn't lose it
  useEffect(() => {
    if (mode === 'pre') {
      try { localStorage.setItem(PRE_KEY, JSON.stringify(pre)) } catch {}
    }
  }, [pre, mode, PRE_KEY])

  // post-match form
  const [post, setPost] = useState({
    result: 'W', scoreFor: '', scoreAgainst: '',
    minutesPlayed: '', goals: 0, assists: 0,
    performance: 7, wentWell: '', toFix: '', cuesUsed: [],
  })

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)
    const [activeRes, histRes] = await Promise.all([
      getActiveMatch(user.id),
      getMatches(user.id, 10),
    ])
    setActive(activeRes.data || null)
    setHistory(histRes.data || [])
    setLoading(false)
    if (activeRes.data) setMode('live')
  }

  async function submitPre() {
    setErr(''); setOk('')
    const { data, error } = await createMatchPre(user.id, pre)
    if (error) return setErr(error.message)
    try { localStorage.removeItem(PRE_KEY) } catch {}
    setActive(data); setMode('live'); setOk('Locked in. Go warm up.')
    setHistory(h => [data, ...h])
  }

  async function submitPost() {
    if (!active) return
    setErr(''); setOk('')
    const { data, error } = await updateMatchPost(active.id, post)
    if (error) return setErr(error.message)
    // Reward the reflection, not the result — XP for showing up to process the
    // game mentally regardless of W/L/D. Consistency over outcome.
    await awardXp(user.id, 'match_reflection', XP_TABLE.matchReflection, active.id, 'post-game reflection')
    // H4: pre-fetch fresh history BEFORE clearing local state. The old order
    // (clear, then refetch) would empty "recent matches" forever if the
    // refetch failed — because the active match was already wiped from
    // both UI state and the post_logged_at IS NULL filter.
    const histRes = await getMatches(user.id, 10)
    if (histRes?.data) setHistory(histRes.data)
    setOk('Match logged. Coach V sees this now.')
    setActive(null); setMode('home')
  }

  // ── HOME ──────────────────────────────────────────────────────
  if (mode === 'home') {
    return (
      <div style={C.scroll}>
        <div style={s.title}>MATCH DAY</div>
        <div style={s.sub}>Mental performance · per game</div>

        {profile?.identity_goal && (
          <div style={s.identityBox}>
            <div style={{ fontSize: 9, letterSpacing: 2.4, color: t.color.textMute, marginBottom: 6 }}>YOUR IDENTITY</div>
            "{profile.identity_goal}"
          </div>
        )}

        <button style={{ ...C.btn, marginBottom: 14 }} onClick={() => setMode('pre')}>
          Pre-Match Lock-In →
        </button>

        <div style={s.card}>
          <div style={s.lbl}>Recent matches</div>
          {loading && <div style={{ color: t.color.textMute, fontSize: 13 }}>Loading…</div>}
          {!loading && history.length === 0 && (
            <div style={{ color: t.color.textMute, fontSize: 13 }}>
              No matches logged yet. Log your first pre-match to start.
            </div>
          )}
          {history.filter(m => m.post_logged_at).map(m => (
            <div key={m.id} style={s.matchRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.opponent || 'Opponent'}</div>
                <div style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1 }}>
                  {m.match_date} · {m.competition || '—'} · perf {m.performance || '—'}/10
                </div>
              </div>
              <div style={s.matchResult(m.result)}>
                {m.result || '—'} {m.score_for != null ? `${m.score_for}-${m.score_against}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── PRE-MATCH ─────────────────────────────────────────────────
  if (mode === 'pre') {
    return (
      <div style={C.scroll}>
        <div style={s.title}>LOCK IN</div>
        <div style={s.sub}>Pre-match · mental warmup</div>

        <FutureSelfPlayer user={user} context="pre_match" />

        <div style={s.bigCard}>
          <div style={s.lbl}>Date</div>
          <input style={{ ...C.inp, marginBottom: 12 }} type="date" value={pre.matchDate} onChange={e => setPre({ ...pre, matchDate: e.target.value })} />

          <div style={s.lbl}>Opponent</div>
          <input style={{ ...C.inp, marginBottom: 12 }} placeholder="Tampa Bay Rowdies U17" value={pre.opponent} onChange={e => setPre({ ...pre, opponent: e.target.value })} />

          <div style={s.lbl}>Competition</div>
          <div style={s.chipRow}>
            {COMPETITIONS.map(c => (
              <button key={c.v} style={s.chip(pre.competition === c.v)} onClick={() => setPre({ ...pre, competition: c.v })}>{c.label}</button>
            ))}
          </div>

          <div style={s.lbl}>Home / Away</div>
          <div style={s.segRow}>
            <button style={s.segBtn(pre.isHome === true)}  onClick={() => setPre({ ...pre, isHome: true })}>Home</button>
            <button style={s.segBtn(pre.isHome === false)} onClick={() => setPre({ ...pre, isHome: false })}>Away</button>
          </div>
        </div>

        <div style={s.bigCard}>
          <div style={s.lbl}>Mood right now (1-10)</div>
          <div style={s.scaleRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} style={s.scaleBtn(pre.preMood === n)} onClick={() => setPre({ ...pre, preMood: n })}>{n}</button>
            ))}
          </div>

          <div style={s.lbl}>Intention — "I am the player who…"</div>
          <textarea style={{ ...C.ta, minHeight: 80, marginBottom: 12 }} value={pre.preIntention} onChange={e => setPre({ ...pre, preIntention: e.target.value })} />

          <div style={s.lbl}>One mental cue for the game</div>
          <input style={{ ...C.inp, marginBottom: 12 }} placeholder="Shark on every 50-50" value={pre.preFocusCue} onChange={e => setPre({ ...pre, preFocusCue: e.target.value })} />

          <div style={s.lbl}>One tactical reminder</div>
          <input style={C.inp} placeholder="Stay tight to my marker on set pieces" value={pre.preTactical} onChange={e => setPre({ ...pre, preTactical: e.target.value })} />
        </div>

        <div style={s.bigCard}>
          <div style={s.lbl}>4-7-8 breath · 3 cycles</div>
          {!showBreath && (
            <button style={{ ...C.btn, marginBottom: 0 }} onClick={() => setShowBreath(true)}>Start breath</button>
          )}
          {showBreath && <BreathTimer onDone={() => setShowBreath(false)} />}
        </div>

        {err && <div style={s.err}>{err}</div>}

        <button style={{ ...C.btn, marginTop: 4 }} onClick={submitPre}>Lock it in</button>
        <button style={{ ...C.btn, background: 'transparent', color: t.color.textDim, border: `1px solid ${t.color.line2}` }} onClick={() => setMode('home')}>
          Cancel
        </button>
      </div>
    )
  }

  // ── LIVE (sideline reference) ─────────────────────────────────
  if (mode === 'live') {
    return (
      <div style={C.scroll}>
        <div style={s.title}>SIDELINE</div>
        <div style={s.sub}>{active?.opponent || 'Today'} · {active?.match_date}</div>

        <div style={s.bigCard}>
          <div style={s.lbl}>Identity</div>
          <div style={{ fontFamily: t.font.athletic, fontSize: 22, letterSpacing: 1, lineHeight: 1.2, marginBottom: 16, textTransform: 'uppercase' }}>
            {active?.pre_intention || 'Play your game.'}
          </div>

          {active?.pre_focus_cue && (
            <>
              <div style={s.lbl}>Mental cue</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{active.pre_focus_cue}</div>
            </>
          )}

          {active?.pre_tactical && (
            <>
              <div style={s.lbl}>Tactical</div>
              <div style={{ fontSize: 16, color: t.color.textDim, marginBottom: 4 }}>{active.pre_tactical}</div>
            </>
          )}
        </div>

        <button style={C.btn} onClick={() => setMode('post')}>Final whistle → log it</button>
        <button style={{ ...C.btn, background: 'transparent', color: t.color.textDim, border: `1px solid ${t.color.line2}` }} onClick={() => setMode('home')}>
          Back
        </button>
      </div>
    )
  }

  // ── POST-MATCH ────────────────────────────────────────────────
  if (mode === 'post') {
    return (
      <div style={C.scroll}>
        <div style={s.title}>FINAL WHISTLE</div>
        <div style={s.sub}>Post-match reflection</div>

        <div style={s.bigCard}>
          <div style={s.lbl}>Result</div>
          <div style={s.segRow}>
            <button style={s.segBtn(post.result === 'W')} onClick={() => setPost({ ...post, result: 'W' })}>Win</button>
            <button style={s.segBtn(post.result === 'D')} onClick={() => setPost({ ...post, result: 'D' })}>Draw</button>
            <button style={s.segBtn(post.result === 'L')} onClick={() => setPost({ ...post, result: 'L' })}>Loss</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={s.lbl}>Goals for</div>
              <input style={C.inp} type="number" min="0" value={post.scoreFor} onChange={e => setPost({ ...post, scoreFor: e.target.value ? +e.target.value : '' })} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.lbl}>Against</div>
              <input style={C.inp} type="number" min="0" value={post.scoreAgainst} onChange={e => setPost({ ...post, scoreAgainst: e.target.value ? +e.target.value : '' })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={s.lbl}>Minutes</div>
              <input style={C.inp} type="number" min="0" max="120" value={post.minutesPlayed} onChange={e => setPost({ ...post, minutesPlayed: e.target.value ? +e.target.value : '' })} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.lbl}>Goals</div>
              <input style={C.inp} type="number" min="0" value={post.goals} onChange={e => setPost({ ...post, goals: +e.target.value || 0 })} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.lbl}>Assists</div>
              <input style={C.inp} type="number" min="0" value={post.assists} onChange={e => setPost({ ...post, assists: +e.target.value || 0 })} />
            </div>
          </div>
        </div>

        <div style={s.bigCard}>
          <div style={s.lbl}>Your performance (1-10)</div>
          <div style={s.scaleRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} style={s.scaleBtn(post.performance === n)} onClick={() => setPost({ ...post, performance: n })}>{n}</button>
            ))}
          </div>

          <div style={s.lbl}>Mental cues that fired</div>
          <div style={s.chipRow}>
            {CUES.map(c => {
              const on = post.cuesUsed.includes(c.v)
              return (
                <button key={c.v} style={s.chip(on)} onClick={() => setPost({
                  ...post,
                  cuesUsed: on ? post.cuesUsed.filter(x => x !== c.v) : [...post.cuesUsed, c.v],
                })}>{c.label}</button>
              )
            })}
          </div>

          <div style={s.lbl}>What went well</div>
          <textarea style={{ ...C.ta, minHeight: 70, marginBottom: 12 }} value={post.wentWell} onChange={e => setPost({ ...post, wentWell: e.target.value })} />

          <div style={s.lbl}>What to fix</div>
          <textarea style={{ ...C.ta, minHeight: 70 }} value={post.toFix} onChange={e => setPost({ ...post, toFix: e.target.value })} />
        </div>

        {err && <div style={s.err}>{err}</div>}
        {ok && <div style={s.ok}>{ok}</div>}

        <button style={C.btn} onClick={submitPost}>Save match</button>
        <button style={{ ...C.btn, background: 'transparent', color: t.color.textDim, border: `1px solid ${t.color.line2}` }} onClick={() => setMode('live')}>
          Back
        </button>
      </div>
    )
  }

  return null
}
