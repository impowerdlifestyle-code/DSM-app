import { useEffect, useState } from 'react'
import { getLinkedAthletes, getParentDashboard, redeemParentInvite, signOut } from '../../lib/supabase.js'
import { tokens as t, C } from '../../styles.js'

const s = {
  card: { ...C.card },
  bigCard: {
    background: t.color.surface2,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.xl,
    padding: 22, marginBottom: 14,
    boxShadow: t.shadow.raised,
  },
  metricRow: { display: 'flex', gap: 8, marginBottom: 14 },
  metric: {
    flex: 1, background: t.color.surface,
    border: `1px solid ${t.color.line}`,
    borderRadius: t.radius.md,
    padding: 14,
    textAlign: 'center',
  },
  metricNum: {
    fontFamily: t.font.athletic, fontSize: 32, lineHeight: 1, color: t.color.text,
  },
  metricLbl: {
    fontSize: 9, letterSpacing: 2, color: t.color.textMute, fontWeight: 600,
    textTransform: 'uppercase', marginTop: 4,
  },
  lbl: { ...C.lbl, marginBottom: 6 },
  identityBox: {
    background: 'rgba(255,255,255,0.04)',
    border: `1px dashed ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: 14, marginBottom: 14,
    fontSize: 13, color: t.color.textDim, lineHeight: 1.5, fontStyle: 'italic',
  },
  err: { color: t.color.err, fontSize: 12, marginTop: 8 },
}

export default function ParentDashboardTab({ user }) {
  const [athletes, setAthletes] = useState([])
  const [selected, setSelected] = useState(null)
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await getLinkedAthletes(user.id)
    setAthletes(data || [])
    if ((data || []).length === 1) selectAthlete(data[0])
    setLoading(false)
  }

  async function selectAthlete(a) {
    setSelected(a)
    setDash(null)
    const d = await getParentDashboard(user.id, a.id)
    setDash(d)
  }

  async function redeem() {
    setErr(''); setLinking(true)
    const { error, athleteId } = await redeemParentInvite(user.id, code)
    setLinking(false)
    if (error) return setErr(error.message)
    setCode('')
    await load()
    if (athleteId) {
      // M18: re-fetch and auto-select. Retry once on replication lag —
      // sometimes the just-linked row hasn't propagated to the read
      // replica yet, and the find() returned undefined leaving the
      // parent staring at an empty state until manual refresh.
      const tryFind = async () => {
        const { data } = await getLinkedAthletes(user.id)
        return (data || []).find(x => x.id === athleteId)
      }
      let a = await tryFind()
      if (!a) {
        await new Promise(r => setTimeout(r, 600))
        a = await tryFind()
      }
      if (a) {
        selectAthlete(a)
      } else {
        setErr('Linked successfully — refresh the page in a moment to see them.')
      }
    }
  }

  if (loading) {
    return (
      <div style={C.scroll}>
        <div style={C.title}>PARENT</div>
        <div style={C.sub}>Loading…</div>
      </div>
    )
  }

  // ── EMPTY STATE — no linked athletes ─────────────────────────
  if (!athletes.length) {
    return (
      <div style={C.scroll}>
        <div style={C.title}>PARENT</div>
        <div style={C.sub}>Link to your athlete</div>

        <div style={s.bigCard}>
          <div style={s.lbl}>Athlete's invite code</div>
          <input
            style={{ ...C.inp, marginBottom: 12, textTransform: 'uppercase', fontFamily: t.font.mono, letterSpacing: 4, textAlign: 'center', fontSize: 18 }}
            placeholder="ABC123"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button style={C.btn} disabled={code.length !== 6 || linking} onClick={redeem}>
            {linking ? 'Linking…' : 'Link athlete'}
          </button>
          {err && <div style={s.err}>{err}</div>}
        </div>

        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.color.textDim, lineHeight: 1.5 }}>
            Ask your athlete to open DSM → Settings → Generate parent invite.
            Codes are 6 characters and expire after 14 days.
          </div>
        </div>

        <button style={{ ...C.btn, background: 'transparent', color: t.color.textDim, border: `1px solid ${t.color.line2}`, marginTop: 18 }} onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    )
  }

  // ── DASHBOARD ────────────────────────────────────────────────
  return (
    <div style={C.scroll}>
      <div style={C.title}>PARENT</div>
      <div style={C.sub}>
        {athletes.length > 1 ? `${athletes.length} athletes linked` : 'View-only · sanitized'}
      </div>

      {athletes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {athletes.map(a => (
            <button
              key={a.id}
              onClick={() => selectAthlete(a)}
              style={{
                padding: '8px 14px',
                border: `1px solid ${selected?.id === a.id ? t.color.text : t.color.line2}`,
                background: selected?.id === a.id ? t.color.text : 'transparent',
                color: selected?.id === a.id ? t.color.bg : t.color.text,
                borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{a.full_name?.split(' ')[0] || 'Athlete'}</button>
          ))}
        </div>
      )}

      {selected && !dash && <div style={{ color: t.color.textMute, fontSize: 13 }}>Loading…</div>}

      {dash && (
        <>
          <div style={s.bigCard}>
            <div style={{ fontSize: 11, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
              {dash.profile?.full_name}
            </div>
            <div style={{ fontFamily: t.font.athletic, fontSize: 30, letterSpacing: 1, lineHeight: 1, marginBottom: 14, textTransform: 'uppercase' }}>
              {dash.profile?.position || 'Soccer athlete'}
            </div>

            {dash.profile?.identity_goal && (
              <div style={s.identityBox}>"{dash.profile.identity_goal}"</div>
            )}

            <div style={s.metricRow}>
              <div style={s.metric}>
                <div style={s.metricNum}>{dash.profile?.streak ?? 0}</div>
                <div style={s.metricLbl}>Day streak</div>
              </div>
              <div style={s.metric}>
                <div style={s.metricNum}>{dash.actions?.length || 0}</div>
                <div style={s.metricLbl}>Logs · 14d</div>
              </div>
              <div style={s.metric}>
                <div style={s.metricNum}>{dash.matches?.length || 0}</div>
                <div style={s.metricLbl}>Matches</div>
              </div>
            </div>
          </div>

          {dash.checkins?.length > 0 && (
            <div style={s.card}>
              <div style={s.lbl}>Latest weekly check-in</div>
              <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>
                <div style={{ marginBottom: 4 }}><b>Week:</b> {dash.checkins[0].week} · mental {dash.checkins[0].mental || '—'}/10</div>
                {dash.checkins[0].wins     && <div style={{ marginBottom: 4 }}><b>Wins:</b> {dash.checkins[0].wins}</div>}
                {dash.checkins[0].struggles && <div><b>Struggles:</b> {dash.checkins[0].struggles}</div>}
              </div>
            </div>
          )}

          {dash.matches?.length > 0 && (
            <div style={s.card}>
              <div style={s.lbl}>Recent matches</div>
              {dash.matches.map((m, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < dash.matches.length - 1 ? `1px solid ${t.color.line}` : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.opponent || 'Match'}</div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, letterSpacing: 1,
                      color: m.result === 'W' ? t.color.ok : m.result === 'L' ? t.color.err : t.color.textDim,
                    }}>
                      {m.result || '—'} {m.score_for != null ? `${m.score_for}-${m.score_against}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1 }}>
                    {m.match_date} · self-rating {m.performance || '—'}/10
                  </div>
                  {m.went_well && <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 4 }}>"{m.went_well}"</div>}
                </div>
              ))}
            </div>
          )}

          {dash.themes && (dash.themes.mindset || dash.themes.goals) && (
            <div style={s.card}>
              <div style={s.lbl}>Coach's read</div>
              {dash.themes.mindset && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.6, color: t.color.textMute, marginBottom: 2 }}>MINDSET</div>
                  <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>{dash.themes.mindset}</div>
                </div>
              )}
              {dash.themes.goals && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1.6, color: t.color.textMute, marginBottom: 2 }}>GOALS</div>
                  <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>{dash.themes.goals}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ ...s.card, textAlign: 'center', borderStyle: 'dashed' }}>
            <div style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 600 }}>
              Read-only · private chat with Coach V is not shown
            </div>
          </div>
        </>
      )}

      <button style={{ ...C.btn, background: 'transparent', color: t.color.textDim, border: `1px solid ${t.color.line2}`, marginTop: 18 }} onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
