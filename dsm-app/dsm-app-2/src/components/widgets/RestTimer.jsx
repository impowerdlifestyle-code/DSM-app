import { useState, useEffect, useRef } from 'react'
import { tokens as t } from '../../styles.js'

/**
 * RestTimer — countdown with start/pause/reset.
 * Triggered between sets; calls onDone when it hits zero.
 */
export default function RestTimer({ seconds = 90, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const startedAt = useRef(null)

  useEffect(() => { setRemaining(seconds) }, [seconds])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setRunning(false)
          onDone?.()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, onDone])

  const pct = Math.max(0, remaining / seconds)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const time = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: 12, borderRadius: 14,
      background: t.color.surface, border: `1px solid ${t.color.line}`,
    }}>
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke={t.color.line2} strokeWidth="3" />
          <circle cx="26" cy="26" r="22" fill="none" stroke={t.color.ember} strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: t.color.text,
          fontVariantNumeric: 'tabular-nums',
        }}>{time}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
          fontWeight: 600, textTransform: 'uppercase',
        }}>Rest</div>
        <div style={{ fontSize: 14, color: t.color.text, fontWeight: 600, marginTop: 2 }}>
          {running ? 'Counting down…' : remaining === 0 ? 'Done — go!' : 'Ready'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {!running ? (
          <button onClick={() => { setRunning(true); if (remaining === 0) setRemaining(seconds) }}
            style={smallBtn(t.color.ember, t.color.bg)}>Start</button>
        ) : (
          <button onClick={() => setRunning(false)}
            style={smallBtn('transparent', t.color.text, t.color.line2)}>Pause</button>
        )}
        <button onClick={() => { setRunning(false); setRemaining(seconds) }}
          style={smallBtn('transparent', t.color.textDim, t.color.line2)}>Reset</button>
      </div>
    </div>
  )
}

function smallBtn(bg, color, border) {
  return {
    background: bg,
    color,
    border: border ? `1px solid ${border}` : 'none',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}
