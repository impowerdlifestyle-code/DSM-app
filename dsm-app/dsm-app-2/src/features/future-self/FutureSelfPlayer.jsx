import { useEffect, useRef, useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { logAudit } from './lib/voiceIdentity.js'

// Renders a "future self" CTA → on click, generates + plays the clip in the
// athlete's cloned voice. Falls back to a consent/capture CTA when the API
// reports the athlete hasn't completed Step 4/5 yet.
//
// Props:
//   user       — auth user (required)
//   context    — 'pre_match' | 'post_mistake' | 'monthly_check' | 'custom' | 'onboarding'
//   matchId    — optional, FK passthrough
//   label      — CTA text (defaults to context-aware)
//   onPlayed   — callback fired after audio reaches end
//   autoGenerate — if true, fires generate-clip on mount instead of waiting for tap

const DEFAULT_LABELS = {
  pre_match: 'Hear your future self · pre-match',
  post_mistake: 'Hear your future self · bounce-back',
  monthly_check: "Your future self has something to say",
  onboarding: 'Meet your future self',
  custom: 'Hear your future self',
}

export default function FutureSelfPlayer({ user, context = 'custom', matchId = null, label, onPlayed, autoGenerate = false }) {
  const [phase, setPhase] = useState('idle')        // idle | generating | ready | playing | done | error | gated
  const [script, setScript] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [clipId, setClipId] = useState(null)
  const [errCode, setErrCode] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const audioRef = useRef(null)

  const ctaLabel = label || DEFAULT_LABELS[context] || DEFAULT_LABELS.custom

  async function generate() {
    if (!user?.id) return
    setPhase('generating'); setErrCode(null); setErrMsg('')
    try {
      const res = await fetch('/api/future-self/generate-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, context, matchId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === 'not_consented' || json.code === 'voice_not_cloned') {
          setErrCode(json.code); setPhase('gated'); return
        }
        setErrCode(json.code || 'unknown'); setErrMsg(json.error || `Request failed (${res.status})`)
        setPhase('error'); return
      }
      setScript(json.script || '')
      setAudioUrl(json.audioUrl || null)
      setClipId(json.clipId || null)
      setPhase('ready')
    } catch (e) {
      setErrCode('network'); setErrMsg(e?.message || 'Network error'); setPhase('error')
    }
  }

  useEffect(() => {
    if (autoGenerate && phase === 'idle') generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate])

  // Auto-play once we have audio
  useEffect(() => {
    if (phase !== 'ready' || !audioUrl) return
    const a = audioRef.current
    if (!a) return
    a.play().then(() => setPhase('playing')).catch(() => { /* user gesture required */ })
  }, [phase, audioUrl])

  async function handleEnded() {
    setPhase('done')
    if (clipId && user?.id) {
      await logAudit({ userId: user.id, actorId: user.id, event: 'clip_played', refId: clipId })
    }
    onPlayed?.({ clipId })
  }

  // ─── GATED: consent or capture not done yet ─────────────────────────────
  if (phase === 'gated') {
    return (
      <div style={card(t)}>
        <div style={lbl(t)}>Future Self</div>
        <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5, marginTop: 6 }}>
          {errCode === 'not_consented'
            ? "You haven't set up your future self yet. Tap to record your voice once — Coach V uses it for pre-match, post-mistake, and monthly check-ins."
            : "Your voice hasn't been cloned yet. Finish the voice-capture step to unlock this."}
        </div>
      </div>
    )
  }

  // ─── ERROR ─────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={card(t)}>
        <div style={lbl(t)}>Future Self</div>
        <div style={{ fontSize: 13, color: t.color.err, marginTop: 6 }}>{errMsg || 'Could not generate clip.'}</div>
        <button style={smallBtn(t)} onClick={generate}>Try again</button>
      </div>
    )
  }

  // ─── IDLE / GENERATING / READY / PLAYING / DONE ─────────────────────────
  return (
    <div style={card(t)}>
      <div style={lbl(t)}>Future Self</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: t.color.text, marginTop: 4, lineHeight: 1.3 }}>{ctaLabel}</div>

      {phase === 'idle' && (
        <button style={primaryBtn(t)} onClick={generate}>Play</button>
      )}
      {phase === 'generating' && (
        <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 10 }}>Cueing your voice…</div>
      )}
      {(phase === 'ready' || phase === 'playing' || phase === 'done') && audioUrl && (
        <>
          <audio ref={audioRef} src={audioUrl} onEnded={handleEnded} controls
                 style={{ width: '100%', marginTop: 12 }} />
          {script && (
            <div style={{
              marginTop: 12, padding: 12,
              border: `1px solid ${t.color.line2}`, borderRadius: t.radius.md,
              fontSize: 13, color: t.color.text, lineHeight: 1.55,
              fontStyle: 'italic',
            }}>“{script}”</div>
          )}
          {phase === 'done' && (
            <button style={smallBtn(t)} onClick={generate}>Generate another</button>
          )}
        </>
      )}
    </div>
  )
}

// ─── style helpers (no JSX so they can stay short) ────────────────────────
const card = (t) => ({
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.lg,
  padding: 16, marginBottom: 12,
})
const lbl = (t) => ({
  fontSize: 9, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 700,
  textTransform: 'uppercase',
})
const primaryBtn = (t) => ({
  ...C.btn, marginTop: 12, marginBottom: 0,
})
const smallBtn = (t) => ({
  marginTop: 10,
  padding: '8px 12px',
  background: 'transparent',
  border: `1px solid ${t.color.line2}`,
  color: t.color.text,
  borderRadius: t.radius.md,
  fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase',
  cursor: 'pointer',
})
