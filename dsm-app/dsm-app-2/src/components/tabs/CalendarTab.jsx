import { tokens as t } from '../../styles.js'
import { CALENDAR_EVENTS } from '../../data/foods.js'
import TiltCard from '../widgets/TiltCard.jsx'

const TYPE_META = {
  workout:  { label: 'Workout',  color: t.color.ember,   glyph: 'W' },
  practice: { label: 'Practice', color: '#e8e3d5',        glyph: 'P' },
  game:     { label: 'Game',     color: '#4ade80',        glyph: 'G' },
  rest:     { label: 'Rest',     color: t.color.textDim,  glyph: '·' },
}

const dayName = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}
const dayNum = (dateStr) => new Date(dateStr + 'T00:00:00').getDate()

export default function CalendarTab() {
  // Group events by date, in order
  const byDate = {}
  CALENDAR_EVENTS.forEach(e => {
    byDate[e.date] = byDate[e.date] || []
    byDate[e.date].push(e)
  })
  const dates = Object.keys(byDate).sort()

  // Build day strip for top
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          This week
        </div>
        <h2 style={{
          fontFamily: t.font.display, fontSize: 32, fontWeight: 500,
          color: t.color.text, marginTop: 4, letterSpacing: -0.5, lineHeight: 1.05,
        }}>
          Your <span style={{ color: t.color.ember, fontStyle: 'italic' }}>program</span>
        </h2>
      </div>

      {/* Day strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${dates.length}, 1fr)`,
        gap: 6, marginBottom: 18,
      }}>
        {dates.map(d => {
          const isToday = d === today
          const events = byDate[d]
          return (
            <TiltCard key={d} tiltLimit={14} scale={1.05} style={{ borderRadius: 10 }}>
            <div style={{
              padding: '10px 4px',
              background: isToday ? 'rgba(255,255,255,0.10)' : t.color.surface,
              border: `1px solid ${isToday ? 'rgba(255,255,255,0.35)' : t.color.line}`,
              borderRadius: 10,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 9, letterSpacing: 1.4, fontWeight: 600,
                color: isToday ? t.color.ember : t.color.textMute,
              }}>{dayName(d)}</div>
              <div style={{
                fontFamily: t.font.display, fontSize: 20, fontWeight: 500,
                color: isToday ? t.color.ember : t.color.text, marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}>{dayNum(d)}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4, height: 4 }}>
                {events.slice(0, 3).map((e, i) => (
                  <span key={i} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: TYPE_META[e.type]?.color || t.color.textDim,
                  }} />
                ))}
              </div>
            </div>
            </TiltCard>
          )
        })}
      </div>

      {/* Event list */}
      {dates.map(d => {
        const events = byDate[d]
        const isToday = d === today
        return (
          <div key={d} style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <div style={{
                fontFamily: t.font.display, fontSize: 22, fontWeight: 500,
                color: t.color.text, letterSpacing: -0.3,
              }}>
                {dayName(d)} <span style={{ color: isToday ? t.color.ember : t.color.textMute, fontStyle: 'italic' }}>
                  {dayNum(d)}
                </span>
              </div>
              {isToday && (
                <span style={{
                  fontSize: 9, letterSpacing: 1.6, color: t.color.ember,
                  fontWeight: 700, textTransform: 'uppercase',
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.10)',
                  border: `1px solid rgba(255,255,255,0.3)`,
                  borderRadius: 999,
                }}>Today</span>
              )}
            </div>

            {events.map((e, i) => {
              const meta = TYPE_META[e.type] || {}
              return (
                <div key={i} style={{
                  background: t.color.surface, border: `1px solid ${t.color.line}`,
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 12, padding: '14px 16px', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t.color.line2}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: t.font.display, fontSize: 17, fontStyle: 'italic',
                    color: meta.color, fontWeight: 500, flexShrink: 0,
                  }}>{meta.glyph}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.color.text }}>{e.title}</div>
                    <div style={{
                      fontSize: 10, letterSpacing: 1.6, color: t.color.textMute,
                      marginTop: 2, fontWeight: 600, textTransform: 'uppercase',
                    }}>{meta.label} · {e.time}</div>
                  </div>
                  <div style={{ color: t.color.textMute, fontSize: 12 }}>→</div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
