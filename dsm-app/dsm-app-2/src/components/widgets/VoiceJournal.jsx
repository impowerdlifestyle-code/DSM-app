import { useState, useEffect, useRef } from 'react'
import { tokens as t } from '../../styles.js'
import { analyzeVoiceJournal } from '../../lib/coachV.js'
import { saveVoiceJournal } from '../../lib/supabase.js'

/**
 * VoiceJournal — UI shell for voice-to-AI mindset journaling.
 * States: idle → recording → transcribing → analyzed
 * No real audio capture; uses a fake timer to demo the flow.
 */
export default function VoiceJournal({ user }) {
  const [state, setState] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState(null)
  const [transcript, setTranscript] = useState('')
  const recognizerRef = useRef(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // tick during recording
  useEffect(() => {
    if (state !== 'recording') return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  // cleanup any pending recognizer on unmount
  useEffect(() => () => {
    if (recognizerRef.current?.stop) {
      try { recognizerRef.current.stop() } catch { /* ignore */ }
    }
  }, [])

  function startRecord() {
    setError('')
    setSaved(false)
    setResult(null)
    setTranscript('')
    setElapsed(0)

    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) {
      // Fallback: still allow the UI flow but warn — user can type, or we use the mock transcript on stop
      setError('Live speech recognition not available in this browser. Try Chrome or Safari (iOS 14.5+).')
      setState('recording')
      return
    }

    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' '
      setTranscript(full.trim())
    }
    rec.onerror = (e) => {
      console.warn('[VoiceJournal SR error]', e.error)
      if (e.error === 'not-allowed') setError('Microphone permission denied.')
    }
    rec.onend = () => {
      // If user wants to keep recording but the browser auto-stopped, restart
      if (state === 'recording') {
        try { rec.start() } catch { /* ignore restart errors */ }
      }
    }
    try { rec.start() } catch (err) { console.warn(err) }
    recognizerRef.current = rec
    setState('recording')
  }

  async function stopRecord() {
    if (recognizerRef.current?.stop) {
      try { recognizerRef.current.stop() } catch { /* ignore */ }
    }
    recognizerRef.current = null

    const finalTranscript = (transcript || '').trim()
    setState('transcribing')

    // If no transcript was captured (no SR support), use the fake result so UI still demos
    if (!finalTranscript) {
      setTimeout(() => { setResult(FAKE_RESULT); setState('analyzed') }, 1200)
      return
    }

    try {
      const ai = await analyzeVoiceJournal({ transcript: finalTranscript })
      setResult({
        transcript: finalTranscript,
        cues: ai.cues || [],
        sentiment: ai.sentiment || 'neutral',
        aiNote: ai.aiNote || '',
      })
      setState('analyzed')
    } catch (err) {
      console.error('[VoiceJournal analyze failed]', err)
      setError('Analysis failed. Saved transcript only.')
      setResult({ transcript: finalTranscript, cues: [], sentiment: 'neutral', aiNote: '' })
      setState('analyzed')
    }
  }

  async function saveEntry() {
    if (!user?.id || !result) return
    try {
      await saveVoiceJournal(user.id, {
        transcript: result.transcript,
        cues: result.cues,
        sentiment: result.sentiment,
        aiNote: result.aiNote,
        duration_seconds: elapsed,
      })
      setSaved(true)
    } catch (err) {
      console.error('[VoiceJournal save failed]', err)
      setError('Could not save entry. Try again.')
    }
  }

  function reset() {
    setState('idle')
    setElapsed(0)
    setResult(null)
    setTranscript('')
    setSaved(false)
    setError('')
  }

  function reset() {
    setState('idle')
    setElapsed(0)
    setResult(null)
  }

  return (
    <div style={{
      background: t.color.surface, border: `1px solid ${t.color.line}`,
      borderRadius: 16, padding: 20, overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
            Voice Journal
          </div>
          <h3 style={{
            fontFamily: t.font.athletic, fontSize: 28, fontWeight: 400,
            color: t.color.text, marginTop: 4, letterSpacing: 1, lineHeight: 0.95,
            textTransform: 'uppercase',
          }}>
            {state === 'idle' ? 'Speak it' : state === 'recording' ? 'Listening…' : state === 'transcribing' ? 'Analyzing…' : 'Captured'}
          </h3>
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          {state === 'recording' && <span style={{ color: '#fafafa' }}>● REC {formatTime(elapsed)}</span>}
          {state !== 'recording' && '+60 XP'}
        </div>
      </div>

      {/* Idle */}
      {state === 'idle' && (
        <>
          <p style={{ fontSize: 13, color: t.color.textDim, lineHeight: 1.5, marginBottom: 16 }}>
            30 seconds. Whisper transcribes, Coach V&rsquo;s AI extracts cues and sentiment.
            Faster than typing when you&rsquo;re tired after a match.
          </p>
          <button onClick={startRecord} style={recordBtn(true)}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.color.bg, display: 'inline-block', marginRight: 10 }} />
            Start recording
          </button>
        </>
      )}

      {/* Recording */}
      {state === 'recording' && (
        <>
          <Waveform />
          <p style={{ fontSize: 12, color: t.color.textDim, textAlign: 'center', marginTop: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>
            Speak naturally
          </p>
          <button onClick={stopRecord} style={{ ...recordBtn(false), marginTop: 16 }}>
            <span style={{ width: 10, height: 10, background: t.color.text, display: 'inline-block', marginRight: 10 }} />
            Stop & analyze
          </button>
        </>
      )}

      {/* Transcribing */}
      {state === 'transcribing' && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Spinner />
          <p style={{ fontSize: 12, color: t.color.textDim, marginTop: 14, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>
            Transcribing · Extracting cues · Scoring sentiment
          </p>
        </div>
      )}

      {/* Analyzed */}
      {state === 'analyzed' && result && (
        <div>
          <div style={{
            padding: 14, background: t.color.bg, border: `1px solid ${t.color.line2}`,
            borderRadius: 10, fontSize: 13, color: t.color.text, lineHeight: 1.55,
            fontStyle: 'italic',
          }}>
            &ldquo;{result.transcript}&rdquo;
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {result.cues.map(c => (
              <span key={c} style={{
                padding: '5px 10px', background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${t.color.line2}`, borderRadius: 999,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
                color: t.color.text, textTransform: 'uppercase',
              }}>{c}</span>
            ))}
            <span style={{
              padding: '5px 10px', background: 'transparent',
              border: `1px solid ${result.sentiment === 'locked-in' ? '#4ade80' : t.color.line2}`,
              borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
              color: result.sentiment === 'locked-in' ? '#4ade80' : t.color.textDim,
              textTransform: 'uppercase',
            }}>{result.sentiment}</span>
          </div>

          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${t.color.line2}`,
            borderRadius: 10,
            display: 'flex', gap: 10,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: t.color.bg, border: `1px solid ${t.color.line2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.font.display, fontSize: 13, fontStyle: 'italic',
              color: t.color.text, fontWeight: 500, flexShrink: 0,
            }}>V</div>
            <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>{result.aiNote}</div>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(248,113,113,0.08)',
              border: `1px solid rgba(248,113,113,0.3)`,
              borderRadius: 10,
              fontSize: 12, color: '#f87171',
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={reset} style={{
              flex: 1,
              minHeight: 44,
              padding: '12px 16px', background: 'transparent',
              border: `1px solid ${t.color.line2}`, borderRadius: 10,
              fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
              color: t.color.textDim, cursor: 'pointer', fontFamily: t.font.sans,
            }}>New entry</button>
            <button onClick={saveEntry} disabled={saved || !user?.id} style={{
              flex: 1,
              minHeight: 44,
              padding: '12px 16px',
              background: saved ? 'rgba(74,222,128,0.18)' : t.color.text,
              border: saved ? `1px solid rgba(74,222,128,0.4)` : 'none',
              borderRadius: 10,
              fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
              color: saved ? '#4ade80' : t.color.bg,
              cursor: (saved || !user?.id) ? 'not-allowed' : 'pointer',
              opacity: !user?.id ? 0.5 : 1,
              fontFamily: t.font.sans,
            }}>{saved ? '✓ Saved' : 'Save entry'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const FAKE_RESULT = {
  transcript: "Practice felt sharp today. First touch was on. I kept tuning out the noise from the sideline and stayed in my own routine. Body feels good — quads tight from yesterday but legs felt fast.",
  cues: ['First touch', 'Tune-out', 'Self-routine', 'Speed'],
  sentiment: 'locked-in',
  aiNote: "Strong session: you named the cue (tune-out) and your physical state. Tomorrow, try to make 'first touch' a named pre-drill cue — that's how you turn a once-a-week win into a default.",
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function recordBtn(primary) {
  return {
    width: '100%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '14px 18px',
    background: primary ? t.color.text : 'transparent',
    color: primary ? t.color.bg : t.color.text,
    border: primary ? 'none' : `1px solid ${t.color.line2}`,
    borderRadius: 12,
    fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase',
    cursor: 'pointer', fontFamily: t.font.sans,
  }
}

function Waveform() {
  // 24 vertical bars with random heights animating to simulate audio
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 4, height: 64, padding: '0 8px',
    }}>
      {Array.from({ length: 28 }).map((_, i) => {
        const delay = (i * 60) % 1200
        return (
          <span key={i} style={{
            display: 'inline-block', width: 3, borderRadius: 2,
            background: t.color.text,
            animation: `wf 900ms ease-in-out ${delay}ms infinite alternate`,
          }} />
        )
      })}
      <style>{`@keyframes wf { 0% { height: 6px; opacity:0.4 } 100% { height: 52px; opacity: 1 } }`}</style>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 28, height: 28, margin: '0 auto',
      border: `2px solid ${t.color.line2}`,
      borderTopColor: t.color.text,
      borderRadius: '50%',
      animation: 'spin 800ms linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
