import { useEffect, useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { PARENT_CHALLENGES, isoWeekKey, XP_TABLE } from '../../data/gamification.js'
import { getOrSeedWeeklyChallenges, bumpChallenge, awardXp } from '../../lib/supabase.js'
import ProgressBar from './ProgressBar.jsx'

// Parent-side weekly involvement challenges. Reuses challenge_progress keyed
// by the parent's own user_id. Parent XP is recorded but excluded from the
// athlete leaderboards by the RPC role filter.
export default function ParentChallengesCard({ user }) {
  const weekKey = isoWeekKey()
  const [rows, setRows] = useState(PARENT_CHALLENGES.map(c => ({ ...c, progress: 0, completed: false })))
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      const seeded = await getOrSeedWeeklyChallenges(user.id, weekKey, PARENT_CHALLENGES)
      if (alive) setRows(seeded)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, weekKey])

  async function tap(c) {
    if (c.completed || busy) return
    setBusy(c.id)
    const { row, justCompleted } = await bumpChallenge(user.id, c.id, weekKey, c.target)
    if (row) setRows(rs => rs.map(x => x.id === c.id ? { ...x, progress: row.progress, completed: row.completed } : x))
    if (justCompleted) {
      await awardXp(user.id, 'parent_challenge', XP_TABLE.challengeComplete, c.id, c.title)
      setToast(`${c.title} — nice. That's the work. ✓`)
      setTimeout(() => setToast(''), 2800)
    }
    setBusy('')
  }

  const doneCount = rows.filter(r => r.completed).length

  return (
    <div style={{ ...C.card, background: t.color.surface2 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={C.lbl}>Parent challenges</div>
        <div style={{ fontSize: 10, color: t.color.textMute, fontWeight: 700, letterSpacing: 1 }}>
          {doneCount}/{rows.length} this week
        </div>
      </div>
      <div style={{ fontSize: 12, color: t.color.textMute, marginBottom: 8, lineHeight: 1.4 }}>
        The whole family's in this. Tap as you do each one.
      </div>

      {toast && (
        <div style={{
          fontSize: 12, fontWeight: 600, color: t.color.pitch,
          background: 'rgba(74,222,128,0.10)', border: `1px solid ${t.color.pitchEdge}`,
          borderRadius: t.radius.sm, padding: '8px 10px', margin: '8px 0',
        }}>{toast}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {rows.map(c => {
          const pct = Math.round((c.progress / c.target) * 100)
          return (
            <div key={c.id} style={{
              padding: '12px 13px', borderRadius: t.radius.md,
              background: c.completed ? 'rgba(74,222,128,0.08)' : t.color.surface,
              border: `1px solid ${c.completed ? t.color.pitchEdge : t.color.line}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.color.text, letterSpacing: 0.3 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 1, lineHeight: 1.35 }}>{c.sub}</div>
                </div>
                {c.completed ? (
                  <span style={{ fontSize: 16, color: t.color.ok, flexShrink: 0 }}>✓</span>
                ) : (
                  <button onClick={() => tap(c)} disabled={busy === c.id}
                    style={{
                      flexShrink: 0, width: 38, height: 38, borderRadius: 12,
                      border: `1px solid ${t.color.pitchEdge}`,
                      background: `linear-gradient(180deg, #5eea8f, ${t.color.pitchDeep})`,
                      color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: t.shadow.pitch,
                    }}>+1</button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                <ProgressBar pct={pct} height={5} duration={500} style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: t.color.textDim, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>
                  {c.progress}/{c.target}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
