import { useState, useEffect } from 'react'
import { tokens as t } from '../../styles.js'
import { getAdminAthleteList } from '../../lib/supabase.js'
import LockerRoomTab from './LockerRoomTab.jsx'

export default function AdminTab({ user }) {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await getAdminAthleteList()
    setAthletes(data)
    setLoading(false)
  }

  if (selectedId) {
    return (
      <LockerRoomTab
        user={user}
        athleteId={selectedId}
        adminView={true}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  let rows = athletes
  if (filter) {
    const q = filter.toLowerCase()
    rows = rows.filter(a =>
      (a.full_name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    )
  }
  rows = [...rows].sort((a, b) => {
    if (sortBy === 'xp')     return (b.totalXp || 0) - (a.totalXp || 0)
    if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0)
    if (sortBy === 'active') return (a.lastChatAt || '0').localeCompare(b.lastChatAt || '0') * -1
    if (sortBy === 'stale')  return (a.lastChatAt || '9').localeCompare(b.lastChatAt || '9')
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  const totals = {
    athletes: athletes.length,
    paid:     athletes.filter(a => a.access_level === 'paid' || a.access_level === 'mentoring_elite').length,
    active7d: athletes.filter(a => {
      if (!a.lastChatAt) return false
      const days = (Date.now() - new Date(a.lastChatAt).getTime()) / 86400000
      return days <= 7
    }).length,
    xp: athletes.reduce((acc, a) => acc + (a.totalXp || 0), 0),
  }

  return (
    <div style={{ padding: '18px 22px 32px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>Admin</div>
        <h2 style={{
          fontFamily: t.font.athletic, fontSize: 38, fontWeight: 400,
          color: t.color.text, marginTop: 4, letterSpacing: 1.5, lineHeight: 0.95,
          textTransform: 'uppercase',
        }}>Athlete dashboard</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 18 }}>
        <Stat label="Athletes" value={totals.athletes} />
        <Stat label="Paid"     value={totals.paid} />
        <Stat label="Active 7d" value={totals.active7d} />
        <Stat label="Total XP" value={totals.xp.toLocaleString()} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search name or email…"
          style={{
            flex: 1, padding: '10px 12px',
            background: t.color.bg, border: `1px solid ${t.color.line2}`,
            borderRadius: 10, color: t.color.text, fontSize: 13,
            fontFamily: t.font.sans,
          }}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          padding: '10px 12px',
          background: t.color.bg, border: `1px solid ${t.color.line2}`,
          borderRadius: 10, color: t.color.text, fontSize: 13,
          fontFamily: t.font.sans, width: 140,
        }}>
          <option value="recent">Newest</option>
          <option value="xp">Top XP</option>
          <option value="streak">Top streak</option>
          <option value="active">Most active</option>
          <option value="stale">Most stale</option>
        </select>
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading athletes…</div>}

      {!loading && rows.map(a => (
        <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
          width: '100%', textAlign: 'left',
          padding: 14, marginBottom: 8,
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: 12, cursor: 'pointer', fontFamily: t.font.sans,
          color: t.color.text,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.color.text }}>
                {a.full_name || a.email || 'Athlete'}
              </div>
              <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, marginTop: 2 }}>
                {a.email}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 10, letterSpacing: 1, color: t.color.textDim, textTransform: 'uppercase', fontWeight: 600 }}>
              <span>Streak {a.streak}</span>
              <span>{a.totalXp.toLocaleString()} XP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: t.color.textDim, letterSpacing: 0.6 }}>
            <span>{a.actionCount} actions</span>
            <span>·</span>
            <span>{a.voiceCount} voice</span>
            <span>·</span>
            <span>{a.access_level}</span>
            <span>·</span>
            <span>
              {a.lastChatAt
                ? `Last chat ${daysAgo(a.lastChatAt)}`
                : 'No chat yet'}
            </span>
          </div>
        </button>
      ))}

      {!loading && !rows.length && (
        <div style={{ padding: 22, background: t.color.surface, border: `1px dashed ${t.color.line2}`, borderRadius: 14, color: t.color.textDim, fontSize: 13 }}>
          No athletes match this filter.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding: '12px 10px', background: t.color.surface,
      border: `1px solid ${t.color.line}`, borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: t.font.athletic, fontSize: 22, color: t.color.text, marginTop: 4, letterSpacing: 1 }}>{value}</div>
    </div>
  )
}

function daysAgo(iso) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}
