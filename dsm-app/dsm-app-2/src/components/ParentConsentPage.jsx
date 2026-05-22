import { useEffect, useState } from 'react'
import { tokens as t } from '../styles.js'

const COLLECTED = [
  ['Action steps', 'What they tried after a game, mental score 1-10'],
  ['Ball mastery log',  'Daily skills checklist'],
  ['Weekly check-in',   'Mood, wins, what they want to work on'],
  ['Chats with Coach V', 'Their messages and Coach V replies'],
  ['Match notes',       'Pre + post-game reflections, no media'],
]

const NOT_COLLECTED = [
  'Photos or videos of your child',
  'Body weight, body composition, nutrition data (locked for under-13)',
  'Behavioral advertising or third-party ad tracking',
  'Voice recordings (locked for under-13)',
]

export default function ParentConsentPage({ token }) {
  const [state, setState] = useState({ loading: true, profile: null, error: null })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState(null)

  useEffect(() => {
    if (!token) { setState({ loading: false, profile: null, error: 'Missing token.' }); return }
    ;(async () => {
      try {
        const res  = await fetch(`/api/consent-info?token=${encodeURIComponent(token)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Could not load athlete info.')
        setState({ loading: false, profile: json.profile, error: null })
        // If the parent already approved (e.g. they're refreshing the page or
        // re-opening the email link), skip the form and show the success state.
        if (json.profile?.status === 'granted')  setResult({ decision: 'granted',  ok: true })
        if (json.profile?.status === 'declined') setResult({ decision: 'declined', ok: true })
      } catch (e) {
        setState({ loading: false, profile: null, error: e.message })
      }
    })()
  }, [token])

  async function submit(decision) {
    setSubmitting(true); setResult(null)
    try {
      const endpoint = decision === 'granted' ? '/api/grant-consent' : '/api/decline-consent'
      const res  = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Something went wrong.')
      setResult({ decision, ok: true })
    } catch (e) {
      setResult({ decision, ok: false, error: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (state.loading) {
    return <Shell><div style={muted}>Loading approval request…</div></Shell>
  }
  if (state.error) {
    return (
      <Shell>
        <div style={card}>
          <div style={eyebrow}>Couldn't load</div>
          <h1 style={h1}>That link didn't work.</h1>
          <p style={body}>{state.error}</p>
          <p style={muted}>If this is unexpected, ask your child to send you a fresh link from their app.</p>
        </div>
      </Shell>
    )
  }

  const p = state.profile

  if (result?.ok) {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>{result.decision === 'granted' ? '✅' : '🚫'}</div>
          <h1 style={h1}>
            {result.decision === 'granted'
              ? `${p.full_name || 'Your athlete'} is set up.`
              : 'Account stays paused.'}
          </h1>
          <p style={body}>
            {result.decision === 'granted'
              ? "They can sign in now and Coach Valentino will start working with them. Their 14-day free trial just began."
              : "We've recorded your decision. Their account stays paused and no data will be collected."}
          </p>
          <p style={muted}>You can close this window.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={card}>
        <div style={eyebrow}>DSM · Parental approval</div>
        <h1 style={h1}>
          {p.full_name || 'Your athlete'} signed up for<br />
          <span style={{ fontStyle: 'italic' }}>DiLorenzo Soccer Mindset</span>.
        </h1>
        <p style={body}>
          They're {p.age ?? 'under 13'} years old, so U.S. law (COPPA) requires your OK before we collect any data or before Coach Valentino starts working with them.
        </p>

        <div style={section}>
          <div style={sectionTitle}>What DSM IS</div>
          <p style={body}>
            A private app where your child works on the mental side of the game with Coach Valentino DiLorenzo — confidence, focus, bouncing back from mistakes, pre-game nerves. Think sports-psychology coaching, soccer-specific.
          </p>
        </div>

        <div style={section}>
          <div style={sectionTitle}>What we collect</div>
          {COLLECTED.map(([k, sub]) => (
            <div key={k} style={lineItem}>
              <span style={check}>✓</span>
              <div>
                <div style={lineLabel}>{k}</div>
                <div style={lineSub}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={section}>
          <div style={sectionTitle}>What we DON'T collect from under-13s</div>
          {NOT_COLLECTED.map(item => (
            <div key={item} style={lineItem}>
              <span style={x}>✕</span>
              <div style={lineLabel}>{item}</div>
            </div>
          ))}
        </div>

        <div style={section}>
          <div style={sectionTitle}>Your rights</div>
          <p style={body}>
            You can review everything we have on your child, ask us to delete it, or revoke this approval any time by emailing <a href="mailto:valentino@dilorenzosoccermindset.com" style={link}>valentino@dilorenzosoccermindset.com</a>. We don't sell their data and never share it with advertisers.
          </p>
        </div>

        {result && !result.ok && (
          <div style={errBox}>Couldn't save your choice: {result.error}</div>
        )}

        <div style={btnRow}>
          <button onClick={() => submit('declined')} disabled={submitting} style={btnGhost}>
            Decline
          </button>
          <button onClick={() => submit('granted')} disabled={submitting} style={btnPrimary}>
            {submitting ? 'Saving…' : 'Approve'}
          </button>
        </div>

        <p style={{ ...muted, marginTop: 16, fontSize: 11 }}>
          By approving, you confirm you're the parent or legal guardian of {p.full_name || 'this athlete'} and consent to DSM's data practices described above.
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: t.color.bg, color: t.color.text,
      fontFamily: t.font.sans, padding: '40px 18px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>{children}</div>
    </div>
  )
}

const card = {
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: 20, padding: 28,
  boxShadow: t.shadow.raised,
}
const eyebrow = {
  fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
  fontWeight: 700, textTransform: 'uppercase', marginBottom: 8,
}
const h1 = {
  fontFamily: t.font.athletic, fontSize: 32, lineHeight: 1.05,
  fontWeight: 400, letterSpacing: 1, textTransform: 'uppercase',
  margin: '0 0 12px', color: t.color.text,
}
const body = {
  fontSize: 14, color: t.color.text, lineHeight: 1.55, margin: '0 0 8px',
}
const muted = { fontSize: 12, color: t.color.textDim, lineHeight: 1.5 }
const section = {
  marginTop: 22, paddingTop: 18, borderTop: `1px solid ${t.color.line}`,
}
const sectionTitle = {
  fontSize: 10, letterSpacing: 2, color: t.color.textMute,
  fontWeight: 700, textTransform: 'uppercase', marginBottom: 10,
}
const lineItem = {
  display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8,
}
const lineLabel = { fontSize: 13, fontWeight: 700, color: t.color.text }
const lineSub   = { fontSize: 11, color: t.color.textDim, marginTop: 2 }
const check     = { color: t.color.ok,  fontWeight: 800, fontSize: 14, flexShrink: 0, lineHeight: 1.4 }
const x         = { color: t.color.err, fontWeight: 800, fontSize: 14, flexShrink: 0, lineHeight: 1.4 }
const link      = { color: t.color.text, textDecoration: 'underline' }
const btnRow    = { display: 'flex', gap: 8, marginTop: 22 }
const btnPrimary = {
  flex: 1, background: t.color.text, color: t.color.bg,
  border: 'none', borderRadius: 12, padding: '14px 18px',
  fontSize: 13, fontWeight: 800, letterSpacing: 1.6,
  textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.sans,
}
const btnGhost = {
  flex: 1, background: 'transparent', color: t.color.textDim,
  border: `1px solid ${t.color.line2}`, borderRadius: 12, padding: '14px 18px',
  fontSize: 13, fontWeight: 700, letterSpacing: 1.6,
  textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.sans,
}
const errBox = {
  marginTop: 12, padding: 12,
  background: 'rgba(248,113,113,0.08)',
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: 12, fontSize: 12, color: t.color.text,
}
