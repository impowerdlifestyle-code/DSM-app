import { useEffect, useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { getMyGroups, listGroupMembers, joinGroupByCode } from '../../lib/supabase.js'
import GroupChat from '../GroupChat.jsx'

// Athlete-facing view of the coaching groups they belong to, with group chat.
export default function TeamTab({ user }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [roster, setRoster] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [joinErr, setJoinErr] = useState('')
  const [joining, setJoining] = useState(false)

  async function refresh() {
    const { data } = await getMyGroups(user.id)
    setGroups(data || [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [user?.id])

  async function join() {
    const code = joinCode.trim()
    if (code.length !== 6) { setJoinErr('Enter the 6-character team code.'); return }
    setJoining(true); setJoinErr('')
    const { error } = await joinGroupByCode(code)
    setJoining(false)
    if (error) { setJoinErr(error.message?.includes('not found') ? 'Team code not found.' : (error.message || 'Could not join.')); return }
    setJoinCode('')
    await refresh()
  }

  async function openGroup(g) {
    setActive(g)
    const { data } = await listGroupMembers(g.id)
    setRoster(data || [])
  }

  if (active) {
    const coaches = roster.filter(m => m.role_in_group === 'coach')
    const athletes = roster.filter(m => m.role_in_group === 'athlete')
    return (
      <div style={C.scroll}>
        <button onClick={() => { setActive(null); setRoster([]) }} style={{ background: 'none', border: 'none', color: t.color.textDim, fontSize: 13, cursor: 'pointer', padding: '2px 0', marginBottom: 6 }}>
          ← Teams
        </button>
        <div style={C.title}>{active.name}</div>
        <div style={C.sub}>
          {athletes.length} athlete{athletes.length === 1 ? '' : 's'}
          {coaches.length ? ` · ${coaches.length} coach${coaches.length === 1 ? '' : 'es'}` : ''}
        </div>
        <GroupChat groupId={active.id} user={user} canModerate={false} />
      </div>
    )
  }

  return (
    <div style={C.scroll} className="fade">
      <div style={C.title}>TEAMS</div>
      <div style={C.sub}>Your coaching groups</div>

      <div style={{ ...C.card, marginTop: 6 }}>
        <span style={C.lbl}>Join a team</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={joinCode}
            onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setJoinErr('') }}
            onKeyDown={e => { if (e.key === 'Enter') join() }}
            placeholder="6-char code from your coach"
            style={{ ...C.inp, flex: 1, letterSpacing: 2, textTransform: 'uppercase' }}
          />
          <button style={{ ...C.bsm, padding: '0 18px', borderRadius: t.radius.md }} disabled={joining || joinCode.length !== 6} onClick={join}>
            {joining ? '…' : 'Join'}
          </button>
        </div>
        {joinErr && <div style={{ color: t.color.err, fontSize: 11, marginTop: 6 }}>{joinErr}</div>}
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13, marginTop: 12 }}>Loading…</div>}

      {!loading && !groups.length && (
        <div style={{ ...C.card, marginTop: 14, textAlign: 'center', color: t.color.textMute, fontSize: 13, lineHeight: 1.5, padding: 24 }}>
          You're not in a team yet. Your coach will add you to one — when they do, your group chat shows up here.
        </div>
      )}

      {!loading && groups.map(g => (
        <button key={g.id} onClick={() => openGroup(g)} style={{
          width: '100%', textAlign: 'left', marginBottom: 10, padding: 16,
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', color: t.color.text,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }}>{g.name}</div>
            {g.description && <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 3 }}>{g.description}</div>}
          </div>
          <div style={{ fontSize: 18, color: t.color.textMute }}>→</div>
        </button>
      ))}
    </div>
  )
}
