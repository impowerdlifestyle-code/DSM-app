import { useEffect, useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { LEAGUES } from '../../data/gamification.js'
import { getLeaderboard, getTeamStandings, setTeamLeague, getProfile } from '../../lib/supabase.js'

const SCOPES = [
  { id: 'team',     label: 'My Team' },
  { id: 'league',   label: 'League' },
  { id: 'country',  label: 'Country' },
  { id: 'academy',  label: 'Academy Cup' },
]

export default function CompetitionsTab({ user, profile }) {
  const [me, setMe] = useState({
    club_team: profile?.club_team || '',
    league: profile?.league || '',
    country: profile?.country || '',
  })
  const [scope, setScope] = useState('team')
  const [period, setPeriod] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(false)

  const needsSetup = !me.club_team && !me.league && !me.country

  useEffect(() => {
    // Refresh profile competition fields in case onboarding didn't capture them.
    (async () => {
      const { data } = await getProfile(user.id)
      if (data) setMe({ club_team: data.club_team || '', league: data.league || '', country: data.country || '' })
    })()
  }, [user.id])

  useEffect(() => { fetchBoard() }, [scope, period, me.club_team, me.league, me.country])

  async function fetchBoard() {
    setErr(''); setLoading(true)
    try {
      if (scope === 'academy') {
        const { data, error } = await getTeamStandings({ period })
        if (error) throw error
        setRows(data)
      } else {
        const value = scope === 'team' ? me.club_team : scope === 'league' ? me.league : me.country
        if (!value) { setRows([]); setLoading(false); return }
        const { data, error } = await getLeaderboard({ scope, value, period })
        if (error) throw error
        setRows(data)
      }
    } catch (e) {
      setErr('Leaderboards open once the season is live.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade" style={{ ...C.scroll }}>
      <div style={C.title}>Compete</div>
      <div style={C.sub}>Mindset leaderboards · consistency wins</div>

      {needsSetup && !editing ? (
        <SetupCard onEdit={() => setEditing(true)} />
      ) : editing ? (
        <TeamEditor user={user} initial={me} onSaved={(v) => { setMe(v); setEditing(false) }} onCancel={() => setEditing(false)} />
      ) : (
        <div style={{ ...C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.color.text }}>{me.club_team || 'No team set'}</div>
            <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 2 }}>
              {[me.league, me.country].filter(Boolean).join(' · ') || 'Add your league & country'}
            </div>
          </div>
          <button style={{ ...C.bghost, width: 'auto', marginBottom: 0, padding: '8px 14px', fontSize: 12 }}
            onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}

      {/* Scope selector */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: t.color.surface, border: `1px solid ${t.color.line}`, borderRadius: 999, marginBottom: 10, marginTop: 4 }}>
        {SCOPES.map(s => {
          const a = scope === s.id
          return (
            <button key={s.id} onClick={() => setScope(s.id)} style={{
              flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
              color: a ? t.color.bg : t.color.textDim, background: a ? t.color.text : 'transparent',
              border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: t.font.sans,
            }}>{s.label}</button>
          )
        })}
      </div>

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[{ id: 'all', label: 'All-time' }, { id: 'month', label: '🏆 Monthly Cup' }].map(p => {
          const a = period === p.id
          return (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              color: a ? t.color.text : t.color.textMute,
              background: a ? 'rgba(74,222,128,0.10)' : 'transparent',
              border: `1px solid ${a ? t.color.pitchEdge : t.color.line2}`, borderRadius: t.radius.sm, cursor: 'pointer',
            }}>{p.label}</button>
          )
        })}
      </div>

      {(scope === 'league' || scope === 'country') && (
        <div style={{ fontSize: 11, color: t.color.textMute, marginBottom: 10, letterSpacing: 0.5 }}>
          {scope === 'league'
            ? (me.league ? `${me.league} circuit — including the ECNL & MLS NEXT challenges` : 'Set your league to see this board')
            : (me.country ? `${me.country} national board` : 'Set your country to see this board')}
        </div>
      )}

      {loading && <div style={{ color: t.color.textMute, fontSize: 13 }}>Loading…</div>}
      {!loading && err && (
        <div style={{ ...C.card, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 13, color: t.color.textMute, lineHeight: 1.5 }}>{err}</div>
        </div>
      )}
      {!loading && !err && rows.length === 0 && (
        <div style={{ ...C.card, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 13, color: t.color.textMute, lineHeight: 1.5 }}>
            No standings yet. Be the first to put your team on the board — log your reps.
          </div>
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        scope === 'academy'
          ? <AcademyBoard rows={rows} myTeam={me.club_team} />
          : <IndividualBoard rows={rows} myId={user.id} />
      )}

      <p style={{ fontSize: 10.5, color: t.color.textMute, lineHeight: 1.5, marginTop: 14, letterSpacing: 0.2 }}>
        Standings rank consistency XP — check-ins, routines, reflections, challenges. Never goals, wins, or stats. The most consistent athlete tops the board.
      </p>
    </div>
  )
}

function IndividualBoard({ rows, myId }) {
  return rows.map((r, i) => {
    const you = r.user_id === myId
    return (
      <div key={r.user_id} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 6,
        background: you ? 'rgba(74,222,128,0.08)' : t.color.surface,
        border: `1px solid ${you ? t.color.pitchEdge : t.color.line}`, borderRadius: 12,
      }}>
        <Rank i={i} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.color.text }}>
            {r.display_name}{you && <Tag>You</Tag>}
          </div>
          {r.club_team && <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 1 }}>{r.club_team}</div>}
        </div>
        <Xp v={r.xp} />
      </div>
    )
  })
}

function AcademyBoard({ rows, myTeam }) {
  return rows.map((r, i) => {
    const mine = r.club_team === myTeam
    return (
      <div key={r.club_team} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 6,
        background: mine ? 'rgba(74,222,128,0.08)' : t.color.surface,
        border: `1px solid ${mine ? t.color.pitchEdge : t.color.line}`, borderRadius: 12,
      }}>
        <Rank i={i} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.color.text }}>
            {r.club_team}{mine && <Tag>Yours</Tag>}
          </div>
          <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 1 }}>
            {[r.league, `${r.athletes} athlete${r.athletes === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <Xp v={r.xp} />
      </div>
    )
  })
}

function Rank({ i }) {
  const medal = ['🥇', '🥈', '🥉'][i]
  return (
    <div style={{
      fontFamily: t.font.athletic, fontSize: 20, minWidth: 26, textAlign: 'center',
      color: i < 3 ? t.color.text : t.color.textDim, lineHeight: 0.9,
    }}>{medal || (i + 1)}</div>
  )
}
function Xp({ v }) {
  return (
    <div style={{ fontFamily: t.font.athletic, fontSize: 18, color: t.color.text, letterSpacing: 0.5, fontVariantNumeric: 'tabular-nums' }}>
      {Number(v).toLocaleString()}
    </div>
  )
}
function Tag({ children }) {
  return <span style={{ fontSize: 9, marginLeft: 8, letterSpacing: 1.4, color: t.color.pitch, fontWeight: 700, textTransform: 'uppercase' }}>{children}</span>
}

function SetupCard({ onEdit }) {
  return (
    <div style={{ ...C.card, background: t.color.surface2, textAlign: 'center', padding: 22 }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🏆</div>
      <div style={{ fontFamily: t.font.athletic, fontSize: 22, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
        Join the competition
      </div>
      <p style={{ fontSize: 13, color: t.color.textDim, lineHeight: 1.5, marginBottom: 14 }}>
        Add your team, league, and country to climb the leaderboards — academy vs academy, ECNL & MLS NEXT circuits, and the monthly mindset cup.
      </p>
      <button style={C.btn} onClick={onEdit}>Set my team</button>
    </div>
  )
}

function TeamEditor({ user, initial, onSaved, onCancel }) {
  const [clubTeam, setClubTeam] = useState(initial.club_team || '')
  const [league, setLeague] = useState(initial.league || '')
  const [country, setCountry] = useState(initial.country || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setErr(''); setSaving(true)
    const { error } = await setTeamLeague(user.id, { clubTeam, league, country })
    setSaving(false)
    if (error) return setErr(error.message || 'Could not save.')
    onSaved({ club_team: clubTeam, league, country })
  }

  return (
    <div style={{ ...C.card, background: t.color.surface2 }}>
      <div style={C.lbl}>Team / Academy</div>
      <input style={{ ...C.inp, marginBottom: 12 }} placeholder="e.g. Tampa Bay United 09B"
        value={clubTeam} onChange={e => setClubTeam(e.target.value)} />

      <div style={C.lbl}>League / Circuit</div>
      <select style={{ ...C.inp, marginBottom: 12 }} value={league} onChange={e => setLeague(e.target.value)}>
        <option value="">Select league…</option>
        {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      <div style={C.lbl}>Country</div>
      <input style={{ ...C.inp, marginBottom: 14 }} placeholder="e.g. USA"
        value={country} onChange={e => setCountry(e.target.value)} />

      {err && <div style={{ color: t.color.err, fontSize: 12, marginBottom: 10 }}>{err}</div>}
      <button style={C.btn} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      <button style={C.bghost} onClick={onCancel}>Cancel</button>
    </div>
  )
}
