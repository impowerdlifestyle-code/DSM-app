import React, { useState, useEffect, useRef, useCallback } from 'react'
import { WEEKDAYS } from '../lib/constants.js'
import { tokens as t } from '../styles.js'

const StepCard = React.memo(({ icon, title, desc, k, usedSteps, occasions, comments, onToggle, onOccasion, onComment }) => {
  const [occ, setOcc] = useState(occasions[k] || '')
  const [com, setCom] = useState(comments[k] || '')
  const used = usedSteps[k]
  const occRef = useRef(onOccasion)
  const comRef = useRef(onComment)
  useEffect(() => { occRef.current = onOccasion }, [onOccasion])
  useEffect(() => { comRef.current = onComment }, [onComment])
  return (
    <div style={{
      background: used ? t.color.pitchSoft : t.color.surface,
      borderRadius:12, padding:14, marginBottom:8,
      border:`2px solid ${used ? t.color.pitch : t.color.line2}`,
      transition:'background 150ms, border-color 150ms',
    }}>
      <button onClick={() => onToggle(k)} aria-label={used ? `Uncheck ${title}` : `Check ${title}`}
        style={{ display:'flex', alignItems:'center', gap:12, width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
        <span style={{ width:34, height:34, borderRadius:9, flexShrink:0, border:`2px solid ${used ? t.color.pitch : t.color.line2}`, background: used ? t.color.pitch : 'transparent', color:'#fff', fontSize:20, fontWeight:900, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {used ? '✓' : ''}
        </span>
        <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
        <span style={{ flex:1, minWidth:0 }}>
          <span style={{ display:'block', fontSize:13, fontWeight:800, color:t.color.text }}>{title}</span>
          <span style={{ display:'block', fontSize:10, color:t.color.textMute }}>{desc}</span>
        </span>
      </button>
      {used && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:9, letterSpacing:3, color:t.color.textMute, fontWeight:700, marginBottom:7 }}>OCCASION</div>
          <input style={{ width:'100%', background:t.color.surface, border:`1px solid ${t.color.line}`, borderRadius:10, padding:'12px 14px', fontSize:14, color: t.color.text, fontFamily:'inherit', outline:'none', boxSizing:'border-box', marginBottom:8 }}
            placeholder="When did you use this?" value={occ}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            onChange={e => { const v = e.target.value; setOcc(v); occRef.current(k, v) }} />
          <div style={{ fontSize:9, letterSpacing:3, color:t.color.textMute, fontWeight:700, marginBottom:7 }}>COMMENTS</div>
          <textarea style={{ width:'100%', background:t.color.surface, border:`1px solid ${t.color.line}`, borderRadius:10, padding:'12px 14px', fontSize:13, color: t.color.text, fontFamily:'inherit', outline:'none', resize:'none', boxSizing:'border-box', height:55 }}
            placeholder="How did it help?" value={com}
            onChange={e => { const v = e.target.value; setCom(v); comRef.current(k, v) }} />
        </div>
      )}
    </div>
  )
})

export default function ActionForm({ playerName, onSubmit, initialSubmissions }) {
  const [form, setForm] = useState({
    playerName: playerName || '',
    sessionType: 'Practice',
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
    didSteps: '', usedSteps: {}, occasions: {}, comments: {},
    conditioning: 7, strength: 7, technical: 7, mental: 7,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const handleToggle = useCallback((k) => setForm(p => ({ ...p, usedSteps: { ...p.usedSteps, [k]: !p.usedSteps[k] } })), [])
  const handleOccasion = useCallback((k, v) => setForm(p => ({ ...p, occasions: { ...p.occasions, [k]: v } })), [])
  const handleComment = useCallback((k, v) => setForm(p => ({ ...p, comments: { ...p.comments, [k]: v } })), [])

  const handleSubmit = async () => {
    if (!form.didSteps) return alert('Did you do the action steps?')
    setSaving(true)
    try {
      await onSubmit({ ...form, playerName: playerName || form.playerName })
      setForm({
        playerName: playerName || '',
        sessionType: 'Practice',
        date: new Date().toISOString().split('T')[0],
        dayOfWeek: WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1],
        didSteps: '', usedSteps: {}, occasions: {}, comments: {},
        conditioning: 7, strength: 7, technical: 7, mental: 7,
      })
    } catch {
      alert('Something went wrong. Try again.')
    }
    setSaving(false)
  }

  const inp = { width:'100%', background:t.color.surface, border:`1px solid ${t.color.line2}`, borderRadius:10, padding:'12px 14px', fontSize:14, color: t.color.text, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:10, letterSpacing:2.4, color:t.color.textMute, fontWeight:600, marginBottom:8, display:'block', textTransform:'uppercase' }
  const btn = { background:t.color.text, border:'none', borderRadius:10, padding:'14px 18px', fontSize:13, fontWeight:700, letterSpacing:1.6, color:t.color.bg, cursor:'pointer', width:'100%', fontFamily:'inherit', marginBottom:8, textTransform:'uppercase' }
  const card = { background:t.color.surface, borderRadius:14, padding:16, marginBottom:10, border:`1px solid ${t.color.line}` }

  return (
    <div style={{ padding:'18px 22px 56px' }}>
      <div style={{ fontSize:10, letterSpacing:2.4, color:t.color.textDim, fontWeight:600, textTransform:'uppercase' }}>After every practice & game</div>
      <h1 style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:42, fontWeight:400,
        letterSpacing:1.5, lineHeight:0.95, color:t.color.text,
        marginTop:6, marginBottom:14, textTransform:'uppercase',
      }}>Action Steps</h1>

      {/* Callout — dark surface with white left accent, replaces the old orange gradient */}
      <div style={{
        position:'relative',
        background:t.color.surface2, borderRadius:14, padding:'16px 18px 16px 22px',
        marginBottom:14, border:`1px solid ${t.color.line}`, overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', top:0, bottom:0, left:0, width:3, background:t.color.text,
        }} />
        <div style={{
          fontSize:10, letterSpacing:2.4, color:t.color.text, fontWeight:700, textTransform:'uppercase',
        }}>Required — no exceptions</div>
        <div style={{
          fontSize:14, fontWeight:500, lineHeight:1.5, color:t.color.text, marginTop:6,
        }}>Fill this out after every practice and game. It goes straight to Coach Valentino.</div>
      </div>
      <div style={card}>
        <span style={lbl}>PLAYER</span>
        <div style={{ ...inp, color: t.color.text, fontWeight:800, background:t.color.surface, cursor:'default', marginBottom:10 }}>
          {playerName || '—'}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
          <div>
            <span style={lbl}>SESSION</span>
            <select value={form.sessionType} onChange={e => set('sessionType', e.target.value)}
              style={{ background:t.color.surface, border:`1px solid ${t.color.line}`, borderRadius:10, padding:'12px 14px', color: t.color.text, fontFamily:'inherit', fontSize:14, outline:'none', width:'100%' }}>
              <option>Practice</option><option>Game</option>
            </select>
          </div>
          <div>
            <span style={lbl}>DATE</span>
            <input type="date" style={inp} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>
        <span style={lbl}>DAY</span>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {WEEKDAYS.map(d => (
            <button key={d} onClick={() => set('dayOfWeek', d)}
              style={{ background: form.dayOfWeek===d ? t.color.text : t.color.surface2, border:'none', borderRadius:8, padding:'12px 14px', minHeight:44, minWidth:44, fontSize:11, fontWeight:700, letterSpacing:1.2, color: form.dayOfWeek===d ? t.color.bg : t.color.text, cursor:'pointer', fontFamily:'inherit' }}>
              {d.slice(0,3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div style={card}>
        <span style={lbl}>DID YOU DO THE ACTION STEPS?</span>
        <div style={{ display:'flex', gap:8 }}>
          {['Yes','No'].map(opt => (
            <button key={opt} onClick={() => set('didSteps', opt)}
              style={{ flex:1, background: form.didSteps===opt ? t.color.text : t.color.surface2, border:'none', borderRadius:10, padding:12, fontSize:14, fontWeight:800, color: form.didSteps===opt ? t.color.bg : t.color.text, cursor:'pointer', fontFamily:'inherit' }}>
              {opt==='Yes' ? '✅ YES' : '❌ NO'}
            </button>
          ))}
        </div>
      </div>
      <span style={lbl}>WHICH DID YOU USE?</span>
      {[
        { icon:'🦈', title:'SHARK MENTALITY', desc:'Taking risks, aggressive, fearless', k:'shark' },
        { icon:'🐠', title:'GOLDFISH MENTALITY', desc:'Short term memory for mistakes', k:'goldfish' },
        { icon:'💬', title:'POSITIVE SELF TALK', desc:'Control your inner voice', k:'selftalk' },
        { icon:'🔇', title:'TUNE OUT COACH YELLING', desc:'Stay focused under pressure', k:'tuneout' },
      ].map(s => (
        <StepCard key={s.k} {...s}
          usedSteps={form.usedSteps}
          occasions={form.occasions}
          comments={form.comments}
          onToggle={handleToggle}
          onOccasion={handleOccasion}
          onComment={handleComment}
        />
      ))}
      <div style={{ ...card, opacity:0.4, marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:20 }}>👁️</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:t.color.textMute }}>VISUALIZATION</div>
              <div style={{ fontSize:10, color:t.color.line2 }}>Unlocks at Lesson 5</div>
            </div>
          </div>
          <div style={{ background:t.color.surface2, borderRadius:20, padding:'4px 10px', fontSize:9, fontWeight:800, color:t.color.textMute }}>🔒 LOCKED</div>
        </div>
      </div>
      <div style={card}>
        <span style={lbl}>RATE MY PERFORMANCE (1-10)</span>
        {['conditioning','strength','technical','mental'].map(k => (
          <div key={k} style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, color:t.color.textDim, textTransform:'capitalize' }}>{k}</span>
              <span style={{ fontSize:14, fontWeight:900, color:t.color.text }}>{form[k]}/10</span>
            </div>
            <input type="range" min="1" max="10" value={form[k]} onChange={e => set(k, parseInt(e.target.value))}
              style={{ accentColor:t.color.text, width:'100%' }} />
          </div>
        ))}
      </div>
      <button style={btn} onClick={handleSubmit} disabled={saving}>
        {saving ? 'SAVING...' : '📤 SUBMIT'}
      </button>
      {initialSubmissions?.length > 0 && (
        <>
          <span style={{ ...lbl, marginTop:16 }}>PAST SUBMISSIONS</span>
          {initialSubmissions.slice(0,5).map((s,i) => (
            <div key={i} style={card}>
              <div style={{ fontSize:10, color:t.color.text, fontWeight:700, letterSpacing:2 }}>{s.day_of_week}, {s.date} · {s.session_type}</div>
              <div style={{ fontSize:14, fontWeight:800, marginTop:2 }}>{s.player_name}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
