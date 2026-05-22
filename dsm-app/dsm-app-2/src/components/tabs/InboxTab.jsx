import { useState, useRef, useEffect } from 'react'
import { tokens as t } from '../../styles.js'
import { COACH_TEMPLATES } from '../../data/foods.js'

const SEED_THREAD = [
  { id: '1', from: 'coach', text: "How are you feeling after yesterday's lower session?", time: '8:14 AM', read: true },
  { id: '2', from: 'me',    text: "Quads are a bit sore but legs felt fast in the sprints 🦈", time: '8:21 AM', read: true },
  { id: '3', from: 'coach', text: 'Perfect. Light mobility tonight, save the legs for game day. Can you send a clip of your warm-up?', time: '8:22 AM', read: true },
  { id: '4', from: 'me',    text: 'Will do — sending after practice', time: '8:23 AM', read: true },
  { id: '5', from: 'coach', text: 'Saw your check-in for week 14. Top 5% of the program for consistency. Keep going.', time: '10:47 AM', read: false },
]

export default function InboxTab() {
  const [thread, setThread] = useState(SEED_THREAD)
  const [draft, setDraft] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  function send(text) {
    if (!text.trim()) return
    setThread(prev => [...prev, {
      id: String(Date.now()),
      from: 'me',
      text: text.trim(),
      time: nowTime(),
      read: true,
    }])
    setDraft('')
    setShowTemplates(false)
  }

  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 84px)', minHeight: 'calc(100vh - 84px)' }}>
      {/* Coach header */}
      <div style={{
        padding: '14px 22px',
        borderBottom: `1px solid ${t.color.line}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: t.color.surface,
          border: `1px solid ${t.color.line2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: t.font.display, fontSize: 20, fontStyle: 'italic',
          color: t.color.ember, fontWeight: 500,
        }}>V</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.color.text }}>Coach Valentino</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: t.color.textMute, marginTop: 2,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: t.color.pitch,
            }} />
            Online · usually replies within an hour
          </div>
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
        {thread.map((m, i) => {
          const mine = m.from === 'me'
          const showAvatar = !mine && (i === 0 || thread[i - 1].from !== 'coach')
          return (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: mine ? 'flex-end' : 'flex-start',
              gap: 8, marginBottom: 10, alignItems: 'flex-end',
            }}>
              {!mine && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: showAvatar ? t.color.surface : 'transparent',
                  border: showAvatar ? `1px solid ${t.color.line2}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: t.font.display, fontSize: 12, fontStyle: 'italic',
                  color: showAvatar ? t.color.ember : 'transparent',
                  fontWeight: 500, flexShrink: 0, alignSelf: 'flex-end',
                }}>V</div>
              )}
              <div style={{ maxWidth: '74%' }}>
                <div style={{
                  background: mine ? t.color.ember : t.color.surface,
                  color: mine ? t.color.bg : t.color.text,
                  border: mine ? 'none' : `1px solid ${t.color.line}`,
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 4 : 16,
                  borderBottomLeftRadius: mine ? 16 : 4,
                  padding: '10px 14px',
                  fontSize: 14, lineHeight: 1.4,
                }}>{m.text}</div>
                <div style={{
                  fontSize: 10, color: t.color.textMute,
                  marginTop: 4, padding: '0 6px',
                  textAlign: mine ? 'right' : 'left',
                  letterSpacing: 0.5,
                }}>
                  {m.time}{mine && m.read ? ' · Read' : ''}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Template tray */}
      {showTemplates && (
        <div style={{
          padding: '8px 22px 4px',
          borderTop: `1px solid ${t.color.line}`,
          background: t.color.surface,
        }}>
          <div style={{
            fontSize: 9, letterSpacing: 2, color: t.color.textMute,
            fontWeight: 600, textTransform: 'uppercase', marginBottom: 6,
          }}>Quick replies</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
            {COACH_TEMPLATES.map((t1, i) => (
              <button key={i} onClick={() => send(t1)} style={{
                flexShrink: 0,
                background: t.color.bg, color: t.color.text,
                border: `1px solid ${t.color.line2}`,
                borderRadius: 999, padding: '8px 14px',
                fontSize: 12, fontFamily: t.font.sans,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{t1}</button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div style={{
        padding: '10px 22px 18px',
        borderTop: `1px solid ${t.color.line}`,
        background: t.color.bg,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => setShowTemplates(!showTemplates)} style={{
          width: 38, height: 38, flexShrink: 0,
          background: showTemplates ? t.color.ember : t.color.surface,
          color: showTemplates ? t.color.bg : t.color.textDim,
          border: `1px solid ${showTemplates ? t.color.ember : t.color.line2}`,
          borderRadius: '50%',
          fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: t.font.sans,
        }}>⚡</button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(draft)}
          placeholder="Message Coach Valentino…"
          style={{
            flex: 1,
            background: t.color.surface,
            border: `1px solid ${t.color.line2}`,
            borderRadius: 999, padding: '11px 16px',
            fontSize: 14, color: t.color.text,
            fontFamily: t.font.sans, outline: 'none',
          }}
        />
        <button onClick={() => send(draft)} disabled={!draft.trim()} style={{
          width: 38, height: 38, flexShrink: 0,
          background: draft.trim() ? t.color.ember : t.color.line,
          color: draft.trim() ? t.color.bg : t.color.textMute,
          border: 'none', borderRadius: '50%',
          fontSize: 16, fontWeight: 700,
          cursor: draft.trim() ? 'pointer' : 'not-allowed',
          fontFamily: t.font.sans,
        }}>→</button>
      </div>
    </div>
  )
}

function nowTime() {
  const d = new Date()
  const h = d.getHours()
  const m = d.getMinutes()
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
