import { useEffect } from 'react'
import { tokens as t } from '../styles.js'

// Full-screen hands-free call with Coach Valentino. Presentational only — the
// listen→reply→speak loop lives in Main.jsx and drives `phase`:
//   listening | thinking | speaking | idle
const PHASE_COPY = {
  listening: '● Listening',
  thinking:  'Thinking…',
  speaking:  'Coach is talking…',
  idle:      'Tap to talk',
}

const ERROR_COPY = {
  'not-allowed': 'Microphone blocked. Enable mic access in your browser settings, then call again.',
  unsupported:   'Voice calls aren’t supported on this device’s browser.',
}

export default function CoachCall({ phase = 'listening', level = 0, transcript = '', reply = '', error = '', coachName = 'Coach Valentino', onEnd, onTapTalk }) {
  const active = phase === 'listening' || phase === 'speaking'
  // Live mic level drives the orb scale while listening so it's obvious the AI
  // is hearing you. Clamped so a loud room can't blow it up.
  const listenScale = phase === 'listening' ? 1 + Math.min(level * 2.2, 0.32) : 1

  // Escape always hangs up — a guaranteed exit even if a tap is missed.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onEnd?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onEnd])
  return (
    <div style={S.overlay} className="dsm-call">
      <style>{CALL_CSS}</style>

      <div style={S.top}>
        <div style={S.label}>{error ? 'Call ended' : 'On a call with'}</div>
        <div style={S.name}>{coachName}</div>
      </div>

      <div style={S.center}>
        <div
          className={`dsm-call__orb ${phase}`}
          style={{
            ...S.orb,
            borderColor: phase === 'thinking' ? t.color.line2 : t.color.pitchEdge,
            transform: `scale(${listenScale})`,
            transition: 'transform 90ms ease-out, border-color 240ms ease',
          }}
        >
          <div style={S.orbInner}>
            <span style={S.orbGlyph}>{phase === 'speaking' ? '🎙️' : phase === 'thinking' ? '…' : '⚽'}</span>
          </div>
          {active && <span className="dsm-call__ring" style={{ borderColor: t.color.pitchEdge }} />}
        </div>

        <div style={S.status}>{error ? '' : PHASE_COPY[phase]}</div>

        <div style={S.bubble}>
          {error
            ? <span style={{ color: t.color.coral }}>{ERROR_COPY[error] || 'Something went wrong on the call.'}</span>
            : phase === 'speaking' && reply
              ? <span style={{ color: t.color.text }}>{reply}</span>
              : transcript
                ? <span style={{ color: t.color.textDim }}>“{transcript}”</span>
                : <span style={{ color: t.color.textMute }}>
                    {phase === 'listening' ? 'Say what’s on your mind…' : phase === 'idle' ? 'No worries — tap the mic when you’re ready.' : ''}
                  </span>}
        </div>
      </div>

      <div style={S.controls}>
        {phase === 'idle' && !error && (
          <button onClick={onTapTalk} style={S.talkBtn} aria-label="Tap to talk">🎙️ Tap to talk</button>
        )}
        <button onClick={onEnd} style={S.endBtn} aria-label={error ? 'Close' : 'End call'}>
          {error ? 'Close' : '✕  End call'}
        </button>
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: `radial-gradient(120% 80% at 50% 0%, ${t.color.surface} 0%, ${t.color.bg} 60%)`,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 24px max(28px, env(safe-area-inset-bottom))',
    backdropFilter: 'blur(2px)',
  },
  top: { textAlign: 'center', marginTop: 8 },
  label: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: t.color.textMute, fontWeight: 700 },
  name: { fontSize: 30, color: t.color.text, marginTop: 4, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, width: '100%', maxWidth: 420 },
  orb: {
    position: 'relative', width: 168, height: 168, borderRadius: '50%',
    border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  orbInner: {
    width: 132, height: 132, borderRadius: '50%',
    background: `radial-gradient(circle at 50% 35%, ${t.color.surface2}, ${t.color.bg})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
  },
  orbGlyph: { fontSize: 46 },
  status: { fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.color.pitch },
  bubble: { minHeight: 60, textAlign: 'center', fontSize: 16, lineHeight: 1.5, padding: '0 6px', maxWidth: 380 },
  controls: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 },
  talkBtn: {
    width: '100%', borderRadius: 999, border: `1px solid ${t.color.line2}`,
    background: t.color.surface, color: t.color.text, fontSize: 15, fontWeight: 700,
    padding: '14px 18px', cursor: 'pointer', fontFamily: 'inherit',
  },
  endBtn: {
    width: '100%', borderRadius: 999, border: 'none',
    background: t.color.err, color: '#fff', cursor: 'pointer',
    fontSize: 15, fontWeight: 800, letterSpacing: 1, padding: '16px 18px',
    boxShadow: '0 10px 28px -8px rgba(0,0,0,0.6)', fontFamily: 'inherit',
  },
}

const CALL_CSS = `
.dsm-call__orb { transition: border-color 240ms ease; }
.dsm-call__orb .dsm-call__ring {
  position: absolute; inset: -10px; border-radius: 50%; border: 2px solid; opacity: 0;
}
.dsm-call__orb.listening .dsm-call__ring { animation: dsmCallRing 1.6s ease-out infinite; }
.dsm-call__orb.speaking  { animation: dsmCallPulse 1.1s ease-in-out infinite; }
.dsm-call__orb.thinking  { animation: dsmCallSpin 1.4s linear infinite; }
@keyframes dsmCallRing { 0% { transform: scale(0.92); opacity: 0.7; } 100% { transform: scale(1.25); opacity: 0; } }
@keyframes dsmCallPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes dsmCallSpin { to { transform: rotate(360deg); } }
`
