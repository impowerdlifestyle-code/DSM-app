import { useState, useEffect } from 'react'
import { tokens as t } from '../../styles.js'
import {
  getLockerRoomData, updateCoachMemoryThemes,
  addLockerRoomNote, deleteLockerRoomNote,
} from '../../lib/supabase.js'

/**
 * LockerRoom — unified per-athlete memory bank.
 *
 * Modes:
 *   - athleteId provided + adminView=false → "my locker room" (read + edit own memory)
 *   - athleteId provided + adminView=true  → admin reading any athlete (+ private notes)
 */
export default function LockerRoomTab({ user, athleteId, adminView = false, onBack = null, setTab = null }) {
  // Jump-to-source only when viewing own locker. In admin view, jumping out of
  // the athlete's locker would land you in your own tabs — confusing — so we
  // hide the Open buttons and show a PDF export instead.
  const canJump = !adminView && typeof setTab === 'function'
  const jumpTo = (id) => canJump && setTab(id)
  const targetId = athleteId || user?.id
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('overview')
  const [themesDraft, setThemesDraft] = useState({ mindset: '', technique: '', recovery: '', goals: '' })
  const [themesSaving, setThemesSaving] = useState(false)
  const [themesSavedAt, setThemesSavedAt] = useState(null)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => { load() }, [targetId])

  async function load() {
    if (!targetId) return
    setLoading(true)
    const d = await getLockerRoomData(targetId, { isAdmin: adminView })
    setData(d)
    setThemesDraft({
      mindset:   d.memory?.themes?.mindset   || '',
      technique: d.memory?.themes?.technique || '',
      recovery:  d.memory?.themes?.recovery  || '',
      goals:     d.memory?.themes?.goals     || '',
    })
    setLoading(false)
  }

  async function saveThemes() {
    setThemesSaving(true)
    await updateCoachMemoryThemes(targetId, themesDraft)
    setThemesSaving(false)
    setThemesSavedAt(Date.now())
    setTimeout(() => setThemesSavedAt(null), 2000)
  }

  async function handleAddNote() {
    if (!newNote.trim() || !user?.id) return
    setSavingNote(true)
    await addLockerRoomNote(user.id, targetId, newNote.trim())
    setNewNote('')
    setSavingNote(false)
    await load()
  }

  async function handleDeleteNote(noteId) {
    if (!confirm('Delete this note?')) return
    await deleteLockerRoomNote(noteId)
    await load()
  }

  async function handleExportPdf() {
    if (!data) return
    const { exportLockerPdf } = await import('../../lib/lockerPdf.js')
    exportLockerPdf(data)
  }

  if (loading || !data) return (
    <div style={{ padding: '40px 22px', color: t.color.textDim, fontSize: 13 }}>Loading locker room…</div>
  )

  const { profile, memory, actionSteps, ballMastery, checkins, voiceJournal, chat,
          workouts, food, body, badges, nudges, squads, notes, totalXp,
          dailyQuests = [], matches = [] } = data
  const name = profile?.full_name || profile?.email || 'Athlete'

  const sections = [
    { id: 'overview',   label: 'Overview' },
    { id: 'memory',     label: 'Coach memory' },
    { id: 'mental',     label: 'Mental work' },
    { id: 'training',   label: 'Training' },
    { id: 'body',       label: 'Body' },
    { id: 'social',     label: 'Social' },
    ...(adminView ? [{ id: 'notes', label: 'Coach notes' }] : []),
  ]

  return (
    <div style={{ padding: '18px 22px 32px' }}>
      {(onBack || adminView) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          {onBack ? (
            <button onClick={onBack} style={{
              background: 'transparent', border: `1px solid ${t.color.line2}`,
              color: t.color.textDim, padding: '6px 12px',
              fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
              borderRadius: 999, cursor: 'pointer', fontFamily: t.font.sans,
            }}>← Athletes</button>
          ) : <span />}
          {adminView && (
            <button onClick={handleExportPdf} style={{
              background: t.color.text, border: 'none',
              color: t.color.bg, padding: '7px 14px',
              fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
              borderRadius: 999, cursor: 'pointer', fontFamily: t.font.sans,
            }}>📄 Export PDF</button>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          {adminView ? 'Locker Room · Admin view' : 'My Locker Room'}
        </div>
        <h2 style={{
          fontFamily: t.font.athletic, fontSize: 38, fontWeight: 400,
          color: t.color.text, marginTop: 4, letterSpacing: 1.5, lineHeight: 0.95,
          textTransform: 'uppercase',
        }}>{name}</h2>
        <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 6, letterSpacing: 0.4 }}>
          {profile?.role?.toUpperCase() || 'ATHLETE'} · Week {profile?.program_week || 1} · {profile?.access_level || 'trial'}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={pill(section === s.id)}>{s.label}</button>
        ))}
      </div>

      {section === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
            <Stat label="Streak"        value={`${profile?.streak || 0}d`}     onClick={canJump ? () => jumpTo('tracker') : null} />
            <Stat label="Total XP"      value={totalXp.toLocaleString()}        onClick={canJump ? () => jumpTo('player') : null} />
            <Stat label="Action logs"   value={actionSteps.length}              onClick={canJump ? () => jumpTo('actions') : null} />
            <Stat label="Voice entries" value={voiceJournal.length}             onClick={canJump ? () => jumpTo('voice') : null} />
            <Stat label="Ball mastery"  value={ballMastery.length}              onClick={canJump ? () => jumpTo('ball') : null} />
            <Stat label="Workouts"      value={workouts.length}                 onClick={canJump ? () => jumpTo('workouts') : null} />
            <Stat label="Check-ins"     value={checkins.length}                 onClick={canJump ? () => jumpTo('weekly') : null} />
            <Stat label="Badges"        value={badges.length}                   onClick={canJump ? () => jumpTo('player') : null} />
          </div>

          {squads.length > 0 && (
            <Card title="Squads" onJump={canJump ? () => jumpTo('squad') : null}>
              {squads.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.color.line}` }}>
                  <span style={{ fontSize: 13, color: t.color.text }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: t.color.textDim, fontFamily: t.font.mono, letterSpacing: 2 }}>{s.invite_code}</span>
                </div>
              ))}
            </Card>
          )}

          {nudges.length > 0 && (
            <Card title="Recent Coach nudges" onJump={canJump ? () => jumpTo('bot') : null}>
              {nudges.slice(0, 5).map(n => (
                <div key={n.id} style={{ padding: '8px 0', borderBottom: `1px solid ${t.color.line}` }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.4, color: t.color.textMute, textTransform: 'uppercase', fontWeight: 600 }}>{n.kind} · {new Date(n.created_at).toLocaleDateString()}</div>
                  <div style={{ fontSize: 12, color: t.color.text, marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {section === 'memory' && (
        <Card title="Coach memory — themes" onJump={canJump ? () => jumpTo('bot') : null}>
          <div style={{ fontSize: 11, color: t.color.textDim, lineHeight: 1.5, marginBottom: 14 }}>
            What Coach V remembers about this athlete across mindset, technique, recovery, and goals. Updated by Coach V every 10 chat messages — you can also edit directly.
          </div>
          {(['mindset','technique','recovery','goals']).map(key => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{key}</div>
              <textarea
                value={themesDraft[key]}
                onChange={e => setThemesDraft(d => ({ ...d, [key]: e.target.value }))}
                rows={3}
                placeholder={`What Coach knows about this athlete's ${key}…`}
                style={{
                  width: '100%', padding: 12,
                  background: t.color.bg, border: `1px solid ${t.color.line2}`,
                  borderRadius: 10, color: t.color.text, fontSize: 13,
                  fontFamily: t.font.sans, resize: 'vertical', lineHeight: 1.5,
                }}
              />
            </div>
          ))}
          <button onClick={saveThemes} disabled={themesSaving} style={{
            padding: '10px 16px', background: themesSaving ? t.color.surface2 : t.color.text,
            color: themesSaving ? t.color.textDim : t.color.bg,
            border: 'none', borderRadius: 10,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase',
            cursor: themesSaving ? 'wait' : 'pointer', fontFamily: t.font.sans,
          }}>{themesSaving ? 'Saving…' : themesSavedAt ? '✓ Saved' : 'Save themes'}</button>

          {memory?.athlete_summary && (
            <div style={{ marginTop: 18, padding: 14, background: t.color.bg, border: `1px solid ${t.color.line2}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Legacy summary</div>
              <div style={{ fontSize: 12, color: t.color.textDim, lineHeight: 1.55 }}>{memory.athlete_summary}</div>
            </div>
          )}
        </Card>
      )}

      {section === 'mental' && (
        <>
          <Card title={`Voice journal (${voiceJournal.length})`} onJump={canJump ? () => jumpTo('voice') : null}>
            {voiceJournal.slice(0, 8).map(j => (
              <div key={j.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{new Date(j.recorded_at).toLocaleDateString()}</span>
                  <span style={{ color: j.sentiment === 'locked-in' ? '#4ade80' : t.color.textDim }}>{j.sentiment}</span>
                </div>
                <div style={{ fontSize: 12, color: t.color.text, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{(j.transcript || '').slice(0, 200)}{j.transcript?.length > 200 ? '…' : ''}"
                </div>
                {j.cues?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {j.cues.map(c => <span key={c} style={tag}>{c}</span>)}
                  </div>
                )}
              </div>
            ))}
            {voiceJournal.length === 0 && <Empty />}
          </Card>

          <Card title={`Weekly check-ins (${checkins.length})`} onJump={canJump ? () => jumpTo('weekly') : null}>
            {checkins.slice(0, 6).map(c => (
              <div key={c.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{c.week}</span>
                  <span>Mental {c.mental || '—'}/10 · Conf {c.confidence_level || '—'}/10</span>
                </div>
                {c.wins && <div style={{ fontSize: 12, color: t.color.text, marginTop: 4 }}><b>Win:</b> {c.wins}</div>}
                {c.struggles && <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 2 }}><b>Struggle:</b> {c.struggles}</div>}
                {c.goal && <div style={{ fontSize: 12, color: t.color.text, marginTop: 2 }}><b>Goal:</b> {c.goal}</div>}
              </div>
            ))}
            {checkins.length === 0 && <Empty />}
          </Card>

          <Card title={`Coach V chat (last ${chat.length})`} onJump={canJump ? () => jumpTo('bot') : null}>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {chat.slice(-20).map(m => (
                <div key={m.id} style={{
                  padding: '8px 10px', marginBottom: 6,
                  background: m.role === 'user' ? 'transparent' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${m.role === 'user' ? t.color.line : t.color.line2}`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                    {m.role === 'user' ? name : 'Coach V'} · {new Date(m.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 12, color: t.color.text, lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
            </div>
            {chat.length === 0 && <Empty />}
          </Card>
        </>
      )}

      {section === 'training' && (
        <>
          <Card title={`Action steps (${actionSteps.length})`} onJump={canJump ? () => jumpTo('actions') : null}>
            {actionSteps.slice(0, 8).map(s => {
              const used = ['shark','goldfish','selftalk','tuneout'].filter(k => s[`${k}_used`])
              return (
                <div key={s.id} style={entry()}>
                  <div style={entryHeader}>
                    <span>{s.date} · {s.session_type || 'session'}</span>
                    <span>Mental {s.mental}/10</span>
                  </div>
                  <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 4 }}>
                    Did steps: {s.did_action_steps || '—'} · Tools used: {used.length ? used.join(', ') : 'none'}
                  </div>
                </div>
              )
            })}
            {actionSteps.length === 0 && <Empty />}
          </Card>

          <Card title={`Ball mastery (${ballMastery.length})`} onJump={canJump ? () => jumpTo('ball') : null}>
            {ballMastery.slice(0, 8).map(b => (
              <div key={b.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{b.date}</span>
                  <span>{b.total_skills} skills · {b.total_reps} reps</span>
                </div>
                {b.notes && <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 4 }}>{b.notes}</div>}
              </div>
            ))}
            {ballMastery.length === 0 && <Empty />}
          </Card>

          <Card title={`Workouts (${workouts.length})`} onJump={canJump ? () => jumpTo('workouts') : null}>
            {workouts.slice(0, 8).map(w => (
              <div key={w.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{new Date(w.completed_at).toLocaleDateString()}</span>
                  <span>{w.done_sets}/{w.total_sets} sets</span>
                </div>
                <div style={{ fontSize: 12, color: t.color.text, marginTop: 4 }}>{w.name}</div>
              </div>
            ))}
            {workouts.length === 0 && <Empty />}
          </Card>

          <Card title={`Matches (${matches.length})`} onJump={canJump ? () => jumpTo('match') : null}>
            {matches.slice(0, 8).map(m => (
              <div key={m.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{m.match_date} · {m.opponent || 'Opponent'}</span>
                  <span style={{
                    fontFamily: t.font.athletic, letterSpacing: 1,
                    color: m.result === 'W' ? t.color.ok : m.result === 'L' ? t.color.err : t.color.textDim,
                  }}>
                    {m.result || '—'} {m.score_for != null ? `${m.score_for}-${m.score_against}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 4, letterSpacing: 0.5 }}>
                  Perf {m.performance || '—'}/10 · cues: {(m.cues_used || []).join(', ') || 'none'}
                </div>
                {(m.went_well || m.to_fix) && (
                  <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 4, lineHeight: 1.4 }}>
                    {m.went_well && <div>✓ {m.went_well}</div>}
                    {m.to_fix && <div style={{ marginTop: 2 }}>→ {m.to_fix}</div>}
                  </div>
                )}
              </div>
            ))}
            {matches.length === 0 && <Empty />}
          </Card>

          <Card title={`Daily quests (last ${dailyQuests.length} days)`} onJump={canJump ? () => jumpTo('home') : null}>
            {dailyQuests.slice(0, 10).map(q => (
              <div key={q.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{q.quest_date} · {q.quest_id?.replace('quest-', '') || 'quest'}</span>
                  <span style={{
                    color: q.progress >= q.target ? t.color.ok : t.color.textDim,
                  }}>{q.progress || 0}/{q.target || 1} {q.progress >= q.target ? '✓' : ''}</span>
                </div>
              </div>
            ))}
            {dailyQuests.length === 0 && <Empty />}
          </Card>
        </>
      )}

      {section === 'body' && (
        <>
          <Card title={`Body stats (${body.length})`} onJump={canJump ? () => jumpTo('body') : null}>
            {body.slice(0, 8).map(b => (
              <div key={b.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{new Date(b.measured_at).toLocaleDateString()}</span>
                  <span>{b.weight ? `${b.weight} lb` : ''}{b.body_fat ? ` · ${b.body_fat}% BF` : ''}</span>
                </div>
              </div>
            ))}
            {body.length === 0 && <Empty />}
          </Card>

          <Card title={`Nutrition (last ${food.length} logs)`} onJump={canJump ? () => jumpTo('nutrition') : null}>
            {food.slice(0, 10).map(f => (
              <div key={f.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{new Date(f.logged_at).toLocaleDateString()} · {f.meal || 'Meal'}</span>
                  <span>{f.cal} cal</span>
                </div>
                <div style={{ fontSize: 12, color: t.color.text, marginTop: 2 }}>{f.food_name}</div>
              </div>
            ))}
            {food.length === 0 && <Empty />}
          </Card>
        </>
      )}

      {section === 'social' && (
        <>
          <Card title="Squads" onJump={canJump ? () => jumpTo('squad') : null}>
            {squads.length === 0 && <Empty />}
            {squads.map(s => (
              <div key={s.id} style={entry()}>
                <div style={entryHeader}>
                  <span>{s.name}</span>
                  <span style={{ fontFamily: t.font.mono, letterSpacing: 2 }}>{s.invite_code}</span>
                </div>
              </div>
            ))}
          </Card>

          <Card title="Badges earned" onJump={canJump ? () => jumpTo('player') : null}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {badges.map(b => <span key={b.badge_id} style={tag}>{b.badge_id}</span>)}
              {badges.length === 0 && <Empty />}
            </div>
          </Card>
        </>
      )}

      {section === 'notes' && adminView && (
        <Card title="Private coach notes">
          <div style={{ fontSize: 11, color: t.color.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Notes only visible to coaches/admins. The athlete never sees these.
          </div>
          <textarea
            value={newNote} onChange={e => setNewNote(e.target.value)}
            rows={3} placeholder="Add a private note…"
            style={{
              width: '100%', padding: 12,
              background: t.color.bg, border: `1px solid ${t.color.line2}`,
              borderRadius: 10, color: t.color.text, fontSize: 13,
              fontFamily: t.font.sans, marginBottom: 8, resize: 'vertical',
            }}
          />
          <button onClick={handleAddNote} disabled={savingNote || !newNote.trim()} style={{
            padding: '10px 16px', background: t.color.text, color: t.color.bg,
            border: 'none', borderRadius: 10,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: t.font.sans,
            opacity: (!newNote.trim() || savingNote) ? 0.4 : 1,
          }}>{savingNote ? 'Saving…' : 'Add note'}</button>

          <div style={{ marginTop: 14 }}>
            {notes.map(n => (
              <div key={n.id} style={{
                padding: 12, marginBottom: 8,
                background: t.color.bg, border: `1px solid ${t.color.line2}`,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.4, color: t.color.textMute, textTransform: 'uppercase', fontWeight: 600 }}>
                    {n.profiles?.full_name || 'Coach'} · {new Date(n.created_at).toLocaleDateString()}
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)} style={{
                    background: 'transparent', border: 'none', color: t.color.textMute,
                    fontSize: 11, cursor: 'pointer',
                  }}>×</button>
                </div>
                <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>{n.note}</div>
              </div>
            ))}
            {notes.length === 0 && <div style={{ fontSize: 12, color: t.color.textDim }}>No notes yet.</div>}
          </div>
        </Card>
      )}
    </div>
  )
}

function Card({ title, children, onJump }) {
  return (
    <div style={{
      padding: 16, background: t.color.surface,
      border: `1px solid ${t.color.line}`, borderRadius: 16, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase' }}>{title}</div>
        {onJump && (
          <button onClick={onJump} style={{
            background: 'transparent', border: `1px solid ${t.color.line2}`,
            color: t.color.text, fontSize: 9, letterSpacing: 1.4, fontWeight: 700,
            textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999,
            cursor: 'pointer', fontFamily: t.font.sans,
          }}>Open →</button>
        )}
      </div>
      {children}
    </div>
  )
}
function Stat({ label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        padding: 14, background: t.color.surface,
        border: `1px solid ${t.color.line}`, borderRadius: 12,
        textAlign: 'left', fontFamily: t.font.sans,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms ease, background 120ms ease',
        width: '100%',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.borderColor = t.color.text }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.borderColor = t.color.line }}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: t.font.athletic, fontSize: 26, color: t.color.text, marginTop: 4, letterSpacing: 1 }}>{value}</div>
    </button>
  )
}
function Empty() { return <div style={{ fontSize: 12, color: t.color.textDim }}>Nothing logged yet.</div> }

const entryHeader = { display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }
const tag = {
  padding: '4px 8px', background: 'rgba(255,255,255,0.06)',
  border: `1px solid ${t.color.line2}`, borderRadius: 999,
  fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
  color: t.color.text, textTransform: 'uppercase',
}
function entry() {
  return {
    padding: '10px 0', borderBottom: `1px solid ${t.color.line}`,
  }
}
function pill(active) {
  return {
    padding: '6px 10px',
    background: active ? t.color.text : 'transparent',
    color: active ? t.color.bg : t.color.textDim,
    border: `1px solid ${active ? t.color.text : t.color.line2}`,
    borderRadius: 999,
    fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
    cursor: 'pointer', fontFamily: t.font.sans,
  }
}
