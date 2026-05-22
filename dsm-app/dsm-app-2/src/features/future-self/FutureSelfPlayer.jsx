import { useEffect, useRef, useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { logAudit } from './lib/voiceIdentity.js'
import { authFetch } from '../../lib/authFetch.js'

// Renders a "Coach V message" CTA → on click, generates + plays a personalized
// 15-30s message in Valentino's cloned voice. Gates with a 'voice_not_configured'
// state if the admin hasn't set ELEVENLABS_VOICE_ID in env yet.
//
// Props:
//   user       — auth user (required)
//   context    — 'pre_match' | 'post_mistake' | 'monthly_check' | 'custom' | 'onboarding'
//   matchId    — optional, FK passthrough
//   label      — CTA text (defaults to context-aware)
//   onReady    — callback fired with { script, audioUrl, clipId } once the clip is generated
//   onPlayed   — callback fired with { clipId, script } after audio reaches end
//   autoGenerate — if true, fires generate-clip on mount instead of waiting for tap

const DEFAULT_LABELS = {
  pre_match: 'Coach V · pre-match',
  post_mistake: 'Coach V · bounce-back',
  monthly_check: 'Coach V · monthly check-in',
  onboarding: 'Coach V · welcome',
  custom: 'Coach V message',
}

export default function FutureSelfPlayer({ user, context = 'custom', matchId = null, label, onReady, onPlayed, autoGenerate = false }) {
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
      const res = await authFetch('/api/future-self/generate-clip', {
        method: 'POST',
        body: JSON.stringify({ context, matchId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === 'voice_not_configured') {
          setErrCode(json.code); setPhase('gated'); return
        }
        setErrCode(json.code || 'unknown'); setErrMsg(json.error || `Request failed (${res.status})`)
        setPhase('error'); return
      }
      setScript(json.script || '')
      setAudioUrl(json.audioUrl || null)
      setClipId(json.clipId || null)
      setPhase('ready')
      onReady?.({ script: json.script || '', audioUrl: json.audioUrl || null, clipId: json.clipId || null })
    } catch (e) {
      setErrCode('network'); setErrMsg(e?.message || 'Network error'); setPhase('error')
    }
  }

  useEffect(() => {
    if (autoGenerate && phase === 'idle') generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate])

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
    onPlayed?.({ clipId, script })
  }

  // ─── GATED: admin hasn't configured Coach V's voice yet ─────────────────
  if (phase === 'gated') {
    return (
      <div style={card(t)}>
        <div style={lbl(t)}>Coach V voice</div>
        <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5, marginTop: 6 }}>
          Coach V's voice messages aren't switched on yet — admin task pending. Check back soon.
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={card(t)}>
        <div style={lbl(t)}>Coach V voice</div>
        <div style={{ fontSize: 13, color: t.color.err, marginTop: 6 }}>{errMsg || 'Could not generate clip.'}</div>
        <button style={smallBtn(t)} onClick={generate}>Try again</button>
      </div>
    )
  }

  return (
    <div style={card(t)}>
      <div style={lbl(t)}>Coach V voice</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: t.color.text, marginTop: 4, lineHeight: 1.3 }}>{ctaLabel}</div>

      {phase === 'idle' && (
        <button style={primaryBtn(t)} onClick={generate}>Play</button>
      )}
      {phase === 'generating' && (
        <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 10 }}>Coach V is recording…</div>
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
            <button style={smallBtn(t)} onClick={generate}>Hear another</button>
          )}
        </>
      )}
    </div>
  )
}

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
