import { useEffect, useState } from 'react'
import { tokens as t, C } from '../styles.js'
import { getPlayerDailyActivity } from '../lib/supabase.js'

const TARGET = 4 // activities in a day = a "full" bar
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Per-athlete day-by-day activity, calendar-style: each day is a cell with a
// progress bar filled by how much that athlete logged. Live total in header.
export default function DailyActivityCalendar({ athleteId, days = 28 }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    ;(async () => {
      const { data } = await getPlayerDailyActivity(athleteId, days)
      if (on) { setData(data || []); setLoading(false) }
    })()
    return () => { on = false }
  }, [athleteId, days])

  if (loading) return <div style={{ ...C.card }}><div style={{ color: t.color.textDim, fontSize: 12 }}>Loading activity…</div></div>

  const todayStr = new Date().toISOString().slice(0, 10)
  const total = data.reduce((s, d) => s + d.count, 0)
  const activeDays = data.filter(d => d.count > 0).length

  return (
    <div style={{ ...C.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={C.lbl}>Daily activity</span>
        <span style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
          {activeDays} active days · {total} actions
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {DOW.map((d, i) => (
          <div key={'h' + i} style={{ fontSize: 8, color: t.color.textMute, textAlign: 'center', letterSpacing: 0.5, marginBottom: 2 }}>{d}</div>
        ))}
        {data.map(d => {
          const pct = Math.min(d.count / TARGET, 1)
          const isToday = d.date === todayStr
          const dom = Number(d.date.slice(8, 10))
          return (
            <div key={d.date} title={`${d.date}: ${d.count} action${d.count === 1 ? '' : 's'}`} style={{
              position: 'relative', aspectRatio: '1', borderRadius: 7, overflow: 'hidden',
              background: t.color.bg,
              border: `1px solid ${isToday ? t.color.pitch : t.color.line}`,
            }}>
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct * 100}%`,
                background: `linear-gradient(180deg, ${t.color.pitch}, ${t.color.pitchDeep})`,
                opacity: d.count ? 1 : 0, transition: 'height 400ms cubic-bezier(.2,.7,.2,1)',
              }} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: pct > 0.5 ? t.color.bg : t.color.textMute,
              }}>{dom}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
