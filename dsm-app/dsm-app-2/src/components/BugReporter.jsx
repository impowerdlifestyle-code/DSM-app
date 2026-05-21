/**
 * BugReporter — floating bug button + global error capture beacon.
 *
 * Mount once at the top of the app. It:
 *   1. Renders a small "Bug" button bottom-right (above bottom nav)
 *   2. Hooks window.onerror + unhandledrejection + console.error to auto-buffer
 *   3. When user taps Bug OR an auto-error fires, opens a modal with a note field
 *   4. Posts to /api/bug-report with full context (URL, profile, console tail,
 *      screenshot via html2canvas, last action, stack)
 *
 * Side-effect-free until an event fires — no impact on app rendering.
 */
import { useEffect, useRef, useState } from 'react'
import { tokens as t } from '../styles.js'

const CONSOLE_BUFFER_MAX = 30

// ── singleton ring buffer for console messages ──────────────────
const consoleBuffer = []
let consoleHooked = false
function installConsoleHook() {
  if (consoleHooked || typeof window === 'undefined') return
  consoleHooked = true
  const orig = {}
  ;['log', 'warn', 'error'].forEach(level => {
    orig[level] = console[level].bind(console)
    console[level] = (...args) => {
      try {
        const msg = args.map(a => {
          if (a instanceof Error) return a.stack || a.message
          if (typeof a === 'object') { try { return JSON.stringify(a) } catch { return String(a) } }
          return String(a)
        }).join(' ').slice(0, 500)
        consoleBuffer.push({ level, message: msg, at: Date.now() })
        if (consoleBuffer.length > CONSOLE_BUFFER_MAX) consoleBuffer.shift()
      } catch { /* never break logging */ }
      return orig[level](...args)
    }
  })
}

// ── last-action tracker (cheap event log) ───────────────────────
let lastAction = ''
export function trackAction(action) {
  lastAction = String(action).slice(0, 200)
}
if (typeof window !== 'undefined') window.__dsmTrack = trackAction

// ── error capture ────────────────────────────────────────────────
let pendingAutoError = null
const errorListeners = new Set()
function setPendingError(err) {
  pendingAutoError = err
  errorListeners.forEach(fn => fn(err))
}
function installErrorHook() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
    setPendingError({
      errorMessage: e.message,
      stack: e.error?.stack || '',
      source: 'window.onerror',
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    setPendingError({
      errorMessage: typeof r === 'string' ? r : (r?.message || 'unhandled promise rejection'),
      stack: r?.stack || '',
      source: 'unhandledrejection',
    })
  })
}

export default function BugReporter({ user, profile }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [autoError, setAutoError] = useState(null)
  const installedRef = useRef(false)

  useEffect(() => {
    if (installedRef.current) return
    installedRef.current = true
    installConsoleHook()
    installErrorHook()
    const listener = (err) => { setAutoError(err); setOpen(true) }
    errorListeners.add(listener)
    return () => errorListeners.delete(listener)
  }, [])

  async function captureScreenshot() {
    // Lazy-load html2canvas only when needed — keeps initial bundle small
    try {
      const mod = await import('html2canvas')
      const html2canvas = mod.default || mod
      const canvas = await html2canvas(document.body, {
        scale: 0.6,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000',
      })
      return canvas.toDataURL('image/jpeg', 0.55)
    } catch (err) {
      console.warn('[bug-report] screenshot failed', err)
      return null
    }
  }

  async function submit() {
    setSending(true); setResult(null)
    const screenshotDataUrl = await captureScreenshot().catch(() => null)
    const payload = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      profile: profile ? {
        id: profile.id, email: profile.email,
        full_name: profile.full_name, role: profile.role,
      } : (user ? { id: user.id, email: user.email } : null),
      consoleTail: consoleBuffer.slice(-20),
      lastAction,
      userMessage: note.trim(),
      errorMessage: autoError?.errorMessage || '',
      stack: autoError?.stack || '',
      screenshotDataUrl,
      timestamp: new Date().toISOString(),
    }
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      setResult(res.ok ? { ok: true, issue: json.issue, triage: json.triage } : { ok: false, error: json.error || 'send failed' })
      if (res.ok) {
        setNote('')
        setAutoError(null)
        pendingAutoError = null
        setTimeout(() => { setOpen(false); setResult(null) }, 3500)
      }
    } catch (err) {
      setResult({ ok: false, error: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating button — bottom-right, above bottom nav */}
      <button
        onClick={() => setOpen(true)}
        title="Report a bug"
        style={btn}
      >🐛</button>

      {open && (
        <div style={overlay} onClick={() => !sending && setOpen(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: t.font.athletic, fontSize: 22, letterSpacing: 1, color: t.color.text, textTransform: 'uppercase' }}>
                {autoError ? '⚠️ Something broke' : '🐛 Report bug'}
              </div>
              {!sending && <button onClick={() => setOpen(false)} style={closeBtn}>✕</button>}
            </div>

            {autoError && (
              <div style={errBox}>
                <div style={{ fontSize: 10, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 600, marginBottom: 4 }}>AUTO-CAPTURED</div>
                <div style={{ fontSize: 12, color: t.color.text, fontFamily: t.font.mono }}>
                  {(autoError.errorMessage || '').slice(0, 200)}
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1.6, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
              What were you trying to do?
            </div>
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. tapped Save on the post-match form, got a red error"
              style={textarea}
            />

            {result?.ok && (
              <div style={okBox}>
                ✓ Logged{result.issue ? ` — issue #${result.issue.number}` : ''}.
                {result.triage?.likelyCause && <div style={{ marginTop: 4, fontSize: 11, color: t.color.textDim }}>
                  Claude says: {result.triage.likelyCause}
                </div>}
              </div>
            )}
            {result && !result.ok && (
              <div style={errBox}>Send failed: {result.error}</div>
            )}

            <button onClick={submit} disabled={sending} style={{ ...sendBtn, opacity: sending ? 0.5 : 1 }}>
              {sending ? 'Sending…' : autoError ? 'Send error report' : 'Send'}
            </button>

            <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, marginTop: 10, textAlign: 'center' }}>
              Captures screenshot + last 20 console messages + your profile.
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const btn = {
  position: 'fixed',
  bottom: 'calc(82px + env(safe-area-inset-bottom))',  // above bottom nav
  right: 14,
  zIndex: 400,
  width: 42, height: 42,
  borderRadius: '50%',
  background: 'rgba(10,10,10,0.92)',
  border: `1px solid ${t.color.line2}`,
  color: t.color.text,
  fontSize: 18,
  cursor: 'pointer',
  boxShadow: '0 8px 24px -10px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(8px)',
  zIndex: 500,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  padding: 12,
}

const modal = {
  width: '100%', maxWidth: 440,
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.xl,
  padding: 18,
  boxShadow: t.shadow.raised,
  marginBottom: 'env(safe-area-inset-bottom)',
}

const textarea = {
  width: '100%', minHeight: 90,
  background: t.color.bg,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.md,
  padding: 12,
  fontSize: 14, color: t.color.text,
  fontFamily: t.font.sans,
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: 10,
  resize: 'vertical',
}

const sendBtn = {
  width: '100%',
  background: t.color.text,
  color: t.color.bg,
  border: 'none',
  borderRadius: t.radius.md,
  padding: '13px 18px',
  fontSize: 13, fontWeight: 700,
  letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

const closeBtn = {
  background: 'transparent', border: 'none',
  color: t.color.textDim, fontSize: 16,
  cursor: 'pointer', padding: 4,
}

const errBox = {
  background: t.color.errBg,
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: t.radius.md,
  padding: 10,
  fontSize: 12, color: t.color.text,
  marginBottom: 10,
  lineHeight: 1.4,
}

const okBox = {
  background: t.color.okBg,
  border: '1px solid rgba(74,222,128,0.3)',
  borderRadius: t.radius.md,
  padding: 10,
  fontSize: 12, color: t.color.text,
  marginBottom: 10,
  lineHeight: 1.4,
}
