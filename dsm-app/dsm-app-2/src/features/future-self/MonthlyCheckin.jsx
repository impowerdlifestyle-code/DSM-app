import { useEffect, useRef, useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import FutureSelfPlayer from './FutureSelfPlayer.jsx'
import { getCurrentMonth, getMonthlyCheckin } from './lib/checkin.js'
import { authFetch } from '../../lib/authFetch.js'

// Once-per-month Coach V check-in.
// Flow: available → asking (Coach V poses the question in his cloned voice)
//        → recording (kid speaks response) → saving → done (AI reflection).
// Already-checked-in months render a compact retrospective card.

const MONTH_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function MonthlyCheckin({ user }) {
  const [phase, setPhase] = useState('loading')
  const [existing, setExisting] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [transcript, setTranscript] = useState('')
  const [savedRow, setSavedRow] = useState(null)
  const [error, setError] = useState('')
  const recognizerRef = useRef(null)
  const month = getCurrentMonth()
  const monthLabel = MONTH_LONG[parseInt(month.slice(-2), 10) - 1]

  useEffect(() => {
    let live = true
    if (!user?.id) return
    ;(async () => {
      const { data } = await getMonthlyCheckin(user.id, month)
      if (!live) return
      if (data) { setExisting(data); setSavedRow(data); setPhase('done') }
      else setPhase('available')
    })()
    return () => { live = false }
  }, [user?.id, month])

  // Stop any running recognizer on unmount so navigating away mid-recording
  // doesn't leave the mic open (H10 — mirrors VoiceJournal cleanup).
  useEffect(() => () => {
    const rec = recognizerRef.current
    if (rec?.stop) { try { rec.stop() } catch { /* ignore */ } }
    recognizerRef.current = null
  }, [])

  function startRecord() {
    setError(''); setTranscript('')
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) {
      setError('Speech recognition is not available — try Chrome or iOS Safari 14.5+.')
      setPhase('recording'); return
    }
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true
    rec.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' '
      setTranscript(full.trim())
    }
    rec.onerror = (e) => {
      // H12: surface SR errors instead of only handling 'not-allowed'.
      console.warn('[MonthlyCheckin SR error]', e.error)
      if (e.error === 'not-allowed')        setError('Microphone permission denied.')
      else if (e.error === 'no-speech')     setError("Didn't catch any speech — try again.")
      else if (e.error === 'audio-capture') setError("Couldn't access your mic — check the OS settings.")
      else if (e.error === 'network')       setError('Speech recognition needs network — check your connection.')
      else if (e.error === 'aborted')       { /* user cancelled — silent */ }
      else                                   setError(`Recorder error: ${e.error || 'unknown'}`)
    }
    rec.onend = () => {
      if (recognizerRef.current === rec) {
        try { rec.start() }
        catch (err) {
          // iOS Safari throws InvalidStateError if start() runs while
          // recognizer is still draining. Surface so the user knows.
          console.warn('[MonthlyCheckin restart failed]', err?.name, err?.message)
          setError('Recorder stopped — tap record to try again.')
          setPhase('available')
        }
      }
    }
    try {
      rec.start()
    } catch (err) {
      console.warn('[MonthlyCheckin start failed]', err?.name, err?.message)
      setError('Could not start the recorder — close any other mic-using app and retry.')
      setPhase('available')
      return
    }
    recognizerRef.current = rec
    setPhase('recording')
  }

  async function stopAndSave() {
    if (recognizerRef.current?.stop) {
      try { recognizerRef.current.stop() } catch { /* ignore */ }
    }
    recognizerRef.current = null
    const finalText = transcript.trim()
    if (!finalText) {
      setError("Didn't catch a response — tap Start over to retry.")
      return
    }
    if (!prompt) {
      setError('Lost the question — Start over.')
      return
    }
    setPhase('saving'); setError('')
    try {
      const res = await authFetch('/api/future-self/save-checkin', {
        method: 'POST',
        body: JSON.stringify({ month, prompt, transcript: finalText }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || `Save failed (${res.status})`); setPhase('recording'); return
      }
      setSavedRow({
        id: json.id, month, prompt,
        response_transcript: finalText, ai_reflection: json.ai_reflection,
      })
      setPhase('done')
    } catch (e) {
      setError(e?.message || 'Network error'); setPhase('recording')
    }
  }

  if (phase === 'loading') return null

  // Already done — retrospective card
  if (phase === 'done' && (savedRow || existing)) {
    const row = savedRow || existing
    return (
      <div style={card}>
        <div style={lbl}>Coach V · {monthLabel} check-in</div>
        <div style={{ fontSize: 13, color: t.color.text, marginTop: 6, lineHeight: 1.5 }}>
          <strong style={dim}>Q:</strong> {row.prompt}
        </div>
        <div style={{ fontSize: 13, color: t.color.text, marginTop: 8, lineHeight: 1.5 }}>
          <strong style={dim}>You:</strong> {row.response_transcript}
        </div>
        {row.ai_reflection && (
          <div style={reflection}>{row.ai_reflection}</div>
        )}
        <div style={done}>✓ Done for {monthLabel}</div>
      </div>
    )
  }

  // Available — CTA card
  if (phase === 'available') {
    return (
      <div style={card}>
        <div style={lbl}>Coach V · {monthLabel} check-in</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.color.text, marginTop: 4, lineHeight: 1.3 }}>
          Coach V has a question for you.
        </div>
        <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 6, lineHeight: 1.5 }}>
          Once a month. Listen, answer out loud, see how you've actually been showing up.
        </div>
        {error && <div style={errStyle}>{error}</div>}
        <button style={{ ...C.btn, marginTop: 12, marginBottom: 0 }} onClick={() => setPhase('asking')}>
          Start
        </button>
      </div>
    )
  }

  // Asking — FutureSelfPlayer plays the question; onReady captures the script;
  // onPlayed advances us to recording.
  if (phase === 'asking') {
    return (
      <FutureSelfPlayer
        user={user}
        context="monthly_check"
        autoGenerate
        label={`Coach V — ${monthLabel} check-in`}
        onReady={({ script }) => setPrompt(script)}
        onPlayed={() => startRecord()}
      />
    )
  }

  // Recording / saving
  return (
    <div style={card}>
      <div style={lbl}>Coach V · {monthLabel} check-in</div>
      <div style={{ fontSize: 13, color: t.color.text, marginTop: 6, lineHeight: 1.5 }}>
        <strong style={dim}>Q:</strong> {prompt}
      </div>

      {phase === 'recording' && (
        <>
          <div style={liveBox}>
            {transcript || <span style={{ color: t.color.textMute }}>Listening… answer out loud, then tap Done.</span>}
          </div>
          {error && <div style={errStyle}>{error}</div>}
          <button style={{ ...C.btn, marginTop: 12, marginBottom: 0 }} onClick={stopAndSave}>
            Done — save my answer
          </button>
        </>
      )}

      {phase === 'saving' && (
        <div style={{ marginTop: 12, fontSize: 12, color: t.color.textDim }}>Saving and reflecting…</div>
      )}
    </div>
  )
}

const card = {
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.lg,
  padding: 16, marginBottom: 12,
}
const lbl = {
  fontSize: 9, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 700,
  textTransform: 'uppercase',
}
const dim = { color: t.color.textDim, fontWeight: 600 }
const reflection = {
  marginTop: 12, padding: 12,
  border: `1px solid ${t.color.line2}`, borderRadius: t.radius.md,
  fontSize: 13, color: t.color.text, lineHeight: 1.55, fontStyle: 'italic',
}
const done = {
  fontSize: 10, color: t.color.textMute, letterSpacing: 1.4, fontWeight: 600,
  textTransform: 'uppercase', marginTop: 10,
}
const liveBox = {
  marginTop: 12, padding: 10, minHeight: 60,
  border: `1px dashed ${t.color.line2}`, borderRadius: t.radius.md,
  fontSize: 13, color: t.color.text, lineHeight: 1.5,
}
const errStyle = {
  marginTop: 10, padding: '8px 10px',
  background: 'rgba(248,113,113,0.08)',
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: 8, fontSize: 12, color: t.color.err,
}
