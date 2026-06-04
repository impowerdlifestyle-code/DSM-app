import { useState, useEffect } from 'react'
import { tokens as t } from '../../styles.js'
import {
  createSquad, joinSquadByCode, getMySquads, leaveSquad, getSquadLeaderboard,
} from '../../lib/supabase.js'
import TeamTab from './TeamTab.jsx'

export default function SquadTab({ user }) {
  const [section, setSection] = useState('squad') // squad | teams
  const [squads, setSquads] = useState([])
  const [activeSquadId, setActiveSquadId] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('view')
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [user?.id])

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const { data } = await getMySquads(user.id)
    setSquads(data)
    if (data.length && !activeSquadId) {
      setActiveSquadId(data[0].id)
    } else if (!data.length) {
      setActiveSquadId(null)
      setLeaderboard([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!activeSquadId) return
    getSquadLeaderboard(activeSquadId).then(({ data }) => setLeaderboard(data || []))
  }, [activeSquadId])

  async function handleCreate() {
    setError('')
    if (!newName.trim()) { setError('Name your squad first.'); return }
    setBusy(true)
    const { data, error } = await createSquad(user.id, newName.trim())
    setBusy(false)
    if (error) { setError(error.message || 'Could not create squad.'); return }
    setNewName('')
    setMode('view')
    await load()
    if (data?.id) setActiveSquadId(data.id)
  }

  async function handleJoin() {
    setError('')
    if (!joinCode.trim()) { setError('Enter an invite code.'); return }
    setBusy(true)
    const { data, error } = await joinSquadByCode(user.id, joinCode.trim())
    setBusy(false)
    if (error) { setError(error.message || 'Invalid invite code.'); return }
    setJoinCode('')
    setMode('view')
    await load()
    if (data?.id) setActiveSquadId(data.id)
  }

  async function handleLeave(squadId) {
    if (!confirm('Leave this squad?')) return
    await leaveSquad(user.id, squadId)
    await load()
  }

  const activeSquad = squads.find(s => s.id === activeSquadId)

  const sectionToggle = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
      <button onClick={() => setSection('squad')} style={pill(section === 'squad')}>Squad</button>
      <button onClick={() => setSection('teams')} style={pill(section === 'teams')}>Teams</button>
    </div>
  )

  if (section === 'teams') {
    return (
      <div style={{ padding: '20px 22px 0' }}>
        {sectionToggle}
        <TeamTab user={user} />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 22px 32px' }}>
      {sectionToggle}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>Squad</div>
        <h2 style={{
          fontFamily: t.font.athletic, fontSize: 38, fontWeight: 400,
          color: t.color.text, marginTop: 4, letterSpacing: 1.5, lineHeight: 0.95,
          textTransform: 'uppercase',
        }}>Compete with friends</h2>
      </div>

      {/* Squad picker / actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {squads.map(s => (
          <button key={s.id} onClick={() => setActiveSquadId(s.id)} style={pill(activeSquadId === s.id)}>
            {s.name}
          </button>
        ))}
        <button onClick={() => setMode(mode === 'create' ? 'view' : 'create')} style={pill(mode === 'create')}>+ New</button>
        <button onClick={() => setMode(mode === 'join' ? 'view' : 'join')} style={pill(mode === 'join')}>Join code</button>
      </div>

      {/* Create form */}
      {mode === 'create' && (
        <div style={card()}>
          <div style={label}>CREATE A SQUAD</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Squad name (e.g. 'Strikers Camp 2026')"
            style={input} />
          <button onClick={handleCreate} disabled={busy} style={primaryBtn(busy)}>{busy ? 'Creating…' : 'Create squad'}</button>
        </div>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <div style={card()}>
          <div style={label}>JOIN WITH INVITE CODE</div>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="6-char code"
            maxLength={6} style={{ ...input, textTransform: 'uppercase', letterSpacing: 4, fontFamily: t.font.mono }} />
          <button onClick={handleJoin} disabled={busy} style={primaryBtn(busy)}>{busy ? 'Joining…' : 'Join squad'}</button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 12px', marginBottom: 14,
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 10, fontSize: 12, color: t.color.err,
        }}>{error}</div>
      )}

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading squads…</div>}

      {!loading && !squads.length && mode === 'view' && (
        <div style={{
          padding: 22, background: t.color.surface,
          border: `1px dashed ${t.color.line2}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 14, color: t.color.text, marginBottom: 6, fontWeight: 600 }}>No squads yet.</div>
          <div style={{ fontSize: 12, color: t.color.textDim, lineHeight: 1.5 }}>
            Squads are private leaderboards. Create one and share the invite code with teammates, or join an existing squad.
          </div>
        </div>
      )}

      {/* Active squad */}
      {activeSquad && (
        <div style={card()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <div style={label}>SQUAD</div>
              <div style={{ fontFamily: t.font.athletic, fontSize: 24, color: t.color.text, letterSpacing: 1, textTransform: 'uppercase' }}>
                {activeSquad.name}
              </div>
            </div>
            <div>
              <div style={label}>INVITE</div>
              <div style={{ fontFamily: t.font.mono, fontSize: 18, color: t.color.text, letterSpacing: 3 }}>
                {activeSquad.invite_code}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, marginBottom: 8, fontSize: 10, letterSpacing: 2, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
            Weekly leaderboard
          </div>
          {leaderboard.length === 0 && (
            <div style={{ fontSize: 12, color: t.color.textDim }}>No XP earned this week yet.</div>
          )}
          {leaderboard.map((row, idx) => {
            const isMe = row.user_id === user?.id
            return (
              <div key={row.user_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', marginTop: 6,
                background: isMe ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: `1px solid ${isMe ? t.color.line2 : t.color.line}`,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    fontFamily: t.font.athletic, fontSize: 18,
                    color: idx === 0 ? t.color.text : t.color.textDim,
                    width: 26, textAlign: 'center',
                  }}>{idx + 1}</div>
                  <div>
                    <div style={{ fontSize: 13, color: t.color.text, fontWeight: 600 }}>{row.full_name}{isMe && ' (you)'}</div>
                    <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
                      Streak {row.streak} · Lifetime {row.totalXp.toLocaleString()} XP
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: t.font.athletic, fontSize: 22, color: t.color.text, letterSpacing: 1 }}>
                  {row.weeklyXp.toLocaleString()}
                </div>
              </div>
            )
          })}

          <button onClick={() => handleLeave(activeSquad.id)} style={{
            marginTop: 18, padding: '10px 14px',
            background: 'transparent', border: `1px solid ${t.color.line2}`,
            borderRadius: 10, fontSize: 11, fontWeight: 600, letterSpacing: 1.4,
            textTransform: 'uppercase', color: t.color.textDim, cursor: 'pointer',
            fontFamily: t.font.sans,
          }}>Leave squad</button>
        </div>
      )}
    </div>
  )
}

const label = { fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }
const input = {
  width: '100%', padding: '12px 14px',
  background: t.color.bg, border: `1px solid ${t.color.line2}`,
  borderRadius: 10, color: t.color.text, fontSize: 14,
  fontFamily: t.font.sans, marginBottom: 10,
}
function pill(active) {
  return {
    padding: '8px 14px',
    background: active ? t.color.text : 'transparent',
    color: active ? t.color.bg : t.color.text,
    border: `1px solid ${active ? t.color.text : t.color.line2}`,
    borderRadius: 999,
    fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
    cursor: 'pointer', fontFamily: t.font.sans,
  }
}
function card() {
  return {
    padding: 18, background: t.color.surface,
    border: `1px solid ${t.color.line}`, borderRadius: 16, marginBottom: 14,
  }
}
function primaryBtn(busy) {
  return {
    width: '100%', padding: '12px 14px',
    background: busy ? t.color.surface2 : t.color.text,
    color: busy ? t.color.textDim : t.color.bg,
    border: 'none', borderRadius: 10,
    fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase',
    cursor: busy ? 'wait' : 'pointer', fontFamily: t.font.sans,
  }
}
