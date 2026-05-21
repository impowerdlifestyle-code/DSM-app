import { useState, useEffect, useMemo } from 'react'
import { tokens as t } from '../../styles.js'
import { EXERCISES, EX_CATEGORIES, TODAYS_WORKOUT, PR_HISTORY } from '../../data/exercises.js'
import { finishWorkout, getRecentWorkouts, awardXp, evaluateBadges } from '../../lib/supabase.js'
import { XP_TABLE } from '../../data/gamification.js'
import RestTimer from '../widgets/RestTimer.jsx'
import TiltCard from '../widgets/TiltCard.jsx'
import ProgressBar from '../widgets/ProgressBar.jsx'

const findEx = (id) => EXERCISES.find(e => e.id === id)

export default function WorkoutsTab({ user }) {
  const [view, setView] = useState('today') // today | library | history

  return (
    <div className="fade">
      <div style={{ padding: '8px 22px 0' }}>
        <ViewPicker view={view} setView={setView} />
      </div>
      <div style={{ padding: '14px 22px 56px' }}>
        {view === 'today' && <TodayView user={user} />}
        {view === 'library' && <LibraryView />}
        {view === 'history' && <HistoryView user={user} />}
      </div>
    </div>
  )
}

function ViewPicker({ view, setView }) {
  const items = [
    { id: 'today',   label: 'Today' },
    { id: 'library', label: 'Library' },
    { id: 'history', label: 'History' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: t.color.surface, border: `1px solid ${t.color.line}`,
      borderRadius: t.radius.full,
    }}>
      {items.map(it => {
        const a = view === it.id
        return (
          <button key={it.id} onClick={() => setView(it.id)} style={{
            flex: 1, padding: '8px 0',
            fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
            color: a ? t.color.bg : t.color.textDim,
            background: a ? t.color.text : 'transparent',
            border: 'none', borderRadius: t.radius.full,
            cursor: 'pointer', fontFamily: t.font.sans,
            transition: `all ${t.motion.fast}`,
          }}>{it.label}</button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   TODAY — workout tracker with set logging
   ────────────────────────────────────────────────────────────────────────── */

function TodayView({ user }) {
  const w = TODAYS_WORKOUT
  const [logs, setLogs] = useState(() =>
    w.exercises.map(ex => ({
      exId: ex.exId,
      sets: Array.from({ length: ex.sets }, () => ({ reps: '', weight: '', rpe: '', done: false })),
    }))
  )
  const [restFor, setRestFor] = useState(null) // { exIdx, restSeconds }
  const [showVideoUpload, setShowVideoUpload] = useState(null) // exIdx
  const [startTime] = useState(() => Date.now())
  const [finishing, setFinishing] = useState(false)
  const [savedMsg, setSavedMsg] = useState(null)

  const totalSets = logs.reduce((a, l) => a + l.sets.length, 0)
  const doneSets = logs.reduce((a, l) => a + l.sets.filter(s => s.done).length, 0)
  const pct = Math.round((doneSets / totalSets) * 100)

  async function onFinish() {
    if (!user?.id) { alert('Sign in to save workouts.'); return }
    if (doneSets === 0) {
      if (!confirm('No sets marked complete. Save anyway?')) return
    }
    setFinishing(true)
    const flatSets = logs.flatMap(l =>
      l.sets.map(s => ({
        exerciseId: l.exId,
        exerciseName: findEx(l.exId)?.name,
        weight: s.weight || null,
        reps: s.reps || null,
        rpe: s.rpe || null,
        completed: s.done,
      }))
    )
    const { data, error } = await finishWorkout(user.id, {
      name: w.name,
      workoutId: w.id,
      block: w.block,
      durationSeconds: Math.round((Date.now() - startTime) / 1000),
      sets: flatSets,
    })
    if (error) {
      setFinishing(false)
      alert(`Save failed: ${error.message}`)
      return
    }
    if (doneSets > 0) {
      await awardXp(user.id, 'workout', XP_TABLE.workoutComplete, data?.id, w.name)
    }
    const newBadges = await evaluateBadges(user.id)
    setFinishing(false)
    const badgeNote = newBadges.length ? ` · 🏅 ${newBadges.join(', ')}` : ''
    setSavedMsg(`Saved · +${doneSets > 0 ? XP_TABLE.workoutComplete : 0} XP${badgeNote}`)
    setTimeout(() => setSavedMsg(null), 3000)
  }

  return (
    <>
      {/* Header card */}
      <TiltCard tiltLimit={9} scale={1.02} style={{ borderRadius: t.radius.lg, marginBottom: 14 }}>
      <div style={{
        background: t.color.surface,
        border: `1px solid ${t.color.line}`,
        borderRadius: t.radius.lg,
        padding: 18,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }} />
        <span style={{
          fontSize: 10, letterSpacing: 2.4, color: t.color.ember,
          fontWeight: 600, textTransform: 'uppercase',
        }}>{w.block}</span>
        <h2 style={{
          fontFamily: t.font.display, fontSize: 28, fontWeight: 500,
          letterSpacing: -0.4, color: t.color.text, marginTop: 6, lineHeight: 1.1,
        }}>{w.name}</h2>
        <div style={{
          display: 'flex', gap: 16, marginTop: 10,
          fontSize: 11, color: t.color.textDim,
        }}>
          <span>{w.duration}</span>
          <span style={{ color: t.color.line2 }}>·</span>
          <span>{w.exercises.length} exercises</span>
          <span style={{ color: t.color.line2 }}>·</span>
          <span>{doneSets}/{totalSets} sets</span>
        </div>
        <ProgressBar pct={pct} height={4} color={t.color.ember} duration={400} style={{ marginTop: 14 }} />
      </div>
      </TiltCard>

      {/* Rest timer (visible only when triggered) */}
      {restFor !== null && (
        <div style={{ marginBottom: 14 }}>
          <RestTimer
            seconds={restFor.seconds}
            onDone={() => setRestFor(null)}
          />
        </div>
      )}

      {/* Exercises */}
      {w.exercises.map((ex, exIdx) => {
        const meta = findEx(ex.exId)
        const log = logs[exIdx]
        const allDone = log.sets.every(s => s.done)
        return (
          <TiltCard key={exIdx} tiltLimit={6} scale={1.015} style={{ borderRadius: t.radius.lg, marginBottom: 12 }}>
          <div style={{
            background: t.color.surface,
            border: `1px solid ${allDone ? 'rgba(74,222,128,0.3)' : t.color.line}`,
            borderRadius: t.radius.lg,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 18px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 9, letterSpacing: 2, color: t.color.textMute,
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>{meta?.category} · {meta?.equipment}</div>
                  <h3 style={{
                    fontFamily: t.font.display, fontSize: 22, fontWeight: 500,
                    color: t.color.text, marginTop: 4, letterSpacing: -0.3, lineHeight: 1.1,
                  }}>{meta?.name}</h3>
                  <div style={{ marginTop: 6, fontSize: 12, color: t.color.textDim }}>
                    Prescription: <span style={{ color: t.color.text }}>{ex.sets} × {ex.reps} @ {ex.weight}</span>
                  </div>
                  {ex.notes && (
                    <div style={{
                      marginTop: 8, padding: '8px 10px',
                      background: 'rgba(255,255,255,0.08)',
                      border: `1px solid rgba(255,255,255,0.2)`,
                      borderRadius: 8,
                      fontSize: 11, color: t.color.text, fontStyle: 'italic',
                    }}>{ex.notes}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {meta?.demo && (
                    <a href={meta.demo} target="_blank" rel="noreferrer" style={iconBtn()} title="Video demo">▶</a>
                  )}
                  <button onClick={() => setShowVideoUpload(showVideoUpload === exIdx ? null : exIdx)} style={iconBtn()} title="Upload form check">⌗</button>
                </div>
              </div>

              {/* Set rows */}
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: `1px solid ${t.color.line}`,
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 1fr 56px 32px',
                  gap: 8, alignItems: 'center', marginBottom: 8,
                  fontSize: 9, letterSpacing: 1.6, color: t.color.textMute,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>
                  <span>Set</span><span>Weight</span><span>Reps</span><span>RPE</span><span></span>
                </div>
                {log.sets.map((set, si) => (
                  <div key={si} style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 1fr 56px 32px',
                    gap: 8, alignItems: 'center', marginBottom: 6,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: set.done ? t.color.ember : t.color.textDim,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{si + 1}</span>
                    <input
                      placeholder={ex.weight}
                      value={set.weight}
                      onChange={(e) => updateSet(setLogs, exIdx, si, 'weight', e.target.value)}
                      style={setInput(set.done)}
                    />
                    <input
                      placeholder={ex.reps}
                      value={set.reps}
                      onChange={(e) => updateSet(setLogs, exIdx, si, 'reps', e.target.value)}
                      style={setInput(set.done)}
                    />
                    <input
                      placeholder="—"
                      value={set.rpe}
                      onChange={(e) => updateSet(setLogs, exIdx, si, 'rpe', e.target.value)}
                      style={{ ...setInput(set.done), textAlign: 'center' }}
                    />
                    <button onClick={() => {
                      toggleSet(setLogs, exIdx, si)
                      if (!set.done && si < log.sets.length - 1) setRestFor({ exIdx, seconds: ex.rest })
                    }} style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: `1px solid ${set.done ? 'rgba(74,222,128,0.5)' : t.color.line2}`,
                      background: set.done ? 'rgba(74,222,128,0.18)' : 'transparent',
                      color: set.done ? '#4ade80' : t.color.textDim,
                      cursor: 'pointer', fontSize: 14, fontWeight: 700,
                    }}>{set.done ? '✓' : '·'}</button>
                  </div>
                ))}
              </div>

              {/* Video form upload — collapses inline */}
              {showVideoUpload === exIdx && (
                <div style={{
                  marginTop: 12, padding: 14,
                  background: t.color.bg, border: `1px dashed ${t.color.line2}`,
                  borderRadius: 12, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                    Form Check
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: t.color.text }}>
                    Tap to record · 15s max
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: t.color.textMute }}>
                    Coach Valentino will review and timestamp comments.
                  </div>
                  <button style={{
                    marginTop: 12, padding: '10px 20px',
                    background: t.color.ember, color: t.color.bg,
                    border: 'none', borderRadius: 999,
                    fontSize: 11, fontWeight: 600, letterSpacing: 1.4,
                    textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.sans,
                  }}>Record video</button>
                </div>
              )}
            </div>
          </div>
          </TiltCard>
        )
      })}

      <button onClick={onFinish} disabled={finishing} style={{
        marginTop: 10, width: '100%',
        background: t.color.ember, color: t.color.bg,
        border: 'none', borderRadius: 12,
        padding: '15px 20px',
        fontSize: 13, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase',
        cursor: finishing ? 'wait' : 'pointer', fontFamily: t.font.sans,
        boxShadow: t.shadow.ember,
        opacity: finishing ? 0.7 : 1,
      }}>{finishing ? 'Saving…' : 'Finish workout'}</button>
      {savedMsg && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.35)',
          borderRadius: 10, color: '#4ade80',
          fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center',
        }}>{savedMsg}</div>
      )}
    </>
  )
}

function updateSet(setLogs, exIdx, si, field, val) {
  setLogs(prev => prev.map((l, i) => i !== exIdx ? l : {
    ...l,
    sets: l.sets.map((s, j) => j !== si ? s : { ...s, [field]: val }),
  }))
}

function toggleSet(setLogs, exIdx, si) {
  setLogs(prev => prev.map((l, i) => i !== exIdx ? l : {
    ...l,
    sets: l.sets.map((s, j) => j !== si ? s : { ...s, done: !s.done }),
  }))
}

function setInput(done) {
  return {
    width: '100%',
    padding: '9px 10px',
    background: done ? 'rgba(74,222,128,0.06)' : t.color.bg,
    border: `1px solid ${done ? 'rgba(74,222,128,0.25)' : t.color.line2}`,
    borderRadius: 8,
    color: t.color.text,
    fontSize: 13, fontFamily: t.font.sans,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

function iconBtn() {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8,
    background: t.color.bg, border: `1px solid ${t.color.line2}`,
    color: t.color.textDim, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none',
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   LIBRARY — searchable exercise list with category filters
   ────────────────────────────────────────────────────────────────────────── */

function LibraryView() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim()
    return EXERCISES.filter(e =>
      (cat === 'All' || e.category === cat) &&
      (!ql || e.name.toLowerCase().includes(ql) || e.primary.toLowerCase().includes(ql))
    )
  }, [q, cat])

  return (
    <>
      <input
        placeholder="Search exercises…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '13px 16px',
          background: t.color.surface, border: `1px solid ${t.color.line2}`,
          borderRadius: 12, color: t.color.text, fontSize: 14,
          fontFamily: t.font.sans, outline: 'none', marginBottom: 12,
        }}
      />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {EX_CATEGORIES.map(c => {
          const a = cat === c
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              flexShrink: 0,
              padding: '8px 13px',
              fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
              color: a ? t.color.bg : t.color.textDim,
              background: a ? t.color.ember : 'transparent',
              border: `1px solid ${a ? t.color.ember : t.color.line2}`,
              borderRadius: 999, cursor: 'pointer', fontFamily: t.font.sans,
              whiteSpace: 'nowrap',
            }}>{c}</button>
          )
        })}
      </div>

      {filtered.map(e => (
        <div key={e.id} style={{
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: 14, padding: 14, marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: t.color.bg, border: `1px solid ${t.color.line2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: t.font.display, fontSize: 19, fontStyle: 'italic',
            color: t.color.ember, fontWeight: 500, flexShrink: 0,
          }}>{e.name[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 9, letterSpacing: 2, color: t.color.textMute,
              fontWeight: 600, textTransform: 'uppercase',
            }}>{e.category} · {e.equipment}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.color.text, marginTop: 2 }}>{e.name}</div>
            <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 2 }}>{e.primary}</div>
          </div>
          {e.demo && (
            <a href={e.demo} target="_blank" rel="noreferrer" style={iconBtn()}>▶</a>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: t.color.textMute, padding: 40 }}>
          No exercises match.
        </div>
      )}
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   HISTORY — recent PRs + completed workouts
   ────────────────────────────────────────────────────────────────────────── */

function HistoryView({ user }) {
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let alive = true
    ;(async () => {
      const { data } = await getRecentWorkouts(user.id, 10)
      if (!alive) return
      setRecent(data || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [user?.id])

  return (
    <>
      <span style={{
        fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
        fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 10,
      }}>Recent Personal Records</span>

      {PR_HISTORY.map((pr, i) => {
        const ex = findEx(pr.exId)
        return (
          <TiltCard key={i} tiltLimit={10} scale={1.025} style={{ borderRadius: 14, marginBottom: 8 }}>
          <div style={{
            background: t.color.surface, border: `1px solid ${t.color.line}`,
            borderRadius: 14, padding: 16,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: `1px solid rgba(255,255,255,0.35)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.font.display, fontSize: 20, fontWeight: 500,
              color: t.color.ember, fontStyle: 'italic', flexShrink: 0,
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.color.text }}>{ex?.name}</div>
              <div style={{
                fontFamily: t.font.display, fontSize: 22, fontWeight: 500,
                color: t.color.ember, marginTop: 2, letterSpacing: -0.3,
                fontVariantNumeric: 'tabular-nums',
              }}>{pr.value}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>{pr.delta}</div>
              <div style={{ fontSize: 10, color: t.color.textMute, marginTop: 3 }}>{pr.date.slice(5)}</div>
            </div>
          </div>
          </TiltCard>
        )
      })}

      <div style={{ marginTop: 22 }}>
        <span style={{
          fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
          fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 10,
        }}>Last sessions {recent.length > 0 ? `· ${recent.length}` : ''}</span>
        {loading && (
          <div style={{ color: t.color.textMute, fontSize: 12, padding: 14 }}>Loading…</div>
        )}
        {!loading && recent.length === 0 && (
          <div style={{ color: t.color.textMute, fontSize: 12, padding: 14, fontStyle: 'italic' }}>
            No workouts logged yet. Finish one to see it here.
          </div>
        )}
        {recent.map((r, i) => {
          const d = new Date(r.completed_at)
          const dateStr = d.toISOString().slice(0, 10)
          const mins = r.duration_seconds ? Math.round(r.duration_seconds / 60) : null
          const meta = `${r.done_sets || 0}/${r.total_sets || 0} sets${mins ? ` · ${mins} min` : ''}`
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 4px',
              borderBottom: i < recent.length - 1 ? `1px solid ${t.color.line}` : 'none',
            }}>
              <div style={{
                fontFamily: t.font.display, fontSize: 18, color: t.color.textDim,
                minWidth: 38, fontVariantNumeric: 'tabular-nums',
              }}>{dateStr.slice(8)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: t.color.text, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 2 }}>{meta}</div>
              </div>
              <div style={{ color: t.color.textMute, fontSize: 12 }}>→</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
