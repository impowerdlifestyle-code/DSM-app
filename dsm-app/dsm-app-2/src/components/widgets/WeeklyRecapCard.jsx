import { useEffect, useState } from 'react'
import { getLatestRecap } from '../../lib/supabase.js'
import { tokens as t } from '../../styles.js'

export default function WeeklyRecapCard({ user }) {
  const [recap, setRecap] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await getLatestRecap(user.id)
      setRecap(data)
      setLoading(false)
    })()
  }, [user])

  if (loading || !recap || !recap.highlights) return null

  const h = recap.highlights
  const ageDays = Math.floor((Date.now() - new Date(recap.created_at).getTime()) / 86400000)
  if (ageDays > 9) return null  // hide if older than ~9 days

  return (
    <div style={{
      background: t.color.surface2,
      border: `1px solid ${t.color.line2}`,
      borderRadius: 16, padding: 18, marginBottom: 14,
      boxShadow: t.shadow.raised,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Weekly recap · {recap.week_key}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: t.color.textDim, fontSize: 12, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}
        >{open ? 'Less' : 'More'}</button>
      </div>
      <div style={{ fontFamily: t.font.athletic, fontSize: 20, lineHeight: 1.15, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>
        {h.headline || 'Weekly recap'}
      </div>
      {open && (
        <>
          {h.wins?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, marginBottom: 4 }}>WINS</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>
                {h.wins.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
              </ul>
            </div>
          )}
          {h.fix && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, marginBottom: 4 }}>FIX THIS WEEK</div>
              <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>{h.fix}</div>
            </div>
          )}
          {h.cta && (
            <div style={{
              background: t.color.text, color: t.color.bg,
              borderRadius: 12, padding: '12px 14px',
              textAlign: 'center', fontWeight: 700, letterSpacing: 1.4,
              fontSize: 12, textTransform: 'uppercase',
            }}>{h.cta}</div>
          )}
        </>
      )}
    </div>
  )
}
