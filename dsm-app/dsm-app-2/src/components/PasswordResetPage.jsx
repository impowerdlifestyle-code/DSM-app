// Password-reset landing — renders when Supabase fires the PASSWORD_RECOVERY
// event (i.e. the user just clicked the magic link from the reset email).
// The session is already established at this point; we just need to take a
// new password and call supabase.auth.updateUser({ password }).

import { useState } from 'react'
import { tokens as t, C } from '../styles.js'
import { supabase, signOut } from '../lib/supabase.js'
import PasswordInput from './widgets/PasswordInput.jsx'

const MIN_LEN = 8

export default function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [done, setDone]         = useState(false)

  async function submit() {
    if (password.length < MIN_LEN) { setErr(`Password must be at least ${MIN_LEN} characters.`); return }
    if (password !== confirm)      { setErr('Passwords do not match.');                          return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setErr(error.message || 'Could not update password.'); return }
    setDone(true)
    // Sign out so they re-authenticate with the new password cleanly.
    // Defer slightly so they see the success state.
    setTimeout(async () => {
      await signOut()
      // Strip the recovery fragment + reset query so a refresh lands on login.
      window.location.replace(window.location.origin + '/')
    }, 1800)
  }

  if (done) {
    return (
      <Shell>
        <div style={card}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>✓</div>
          <h1 style={h1}>Password updated.</h1>
          <p style={body}>Signing you out now so you can log back in with your new password…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={card}>
        <div style={eyebrow}>Reset password</div>
        <h1 style={h1}>Set a<br/>new password.</h1>
        <p style={body}>Pick something strong — at least {MIN_LEN} characters.</p>

        <div style={lbl}>New password</div>
        <PasswordInput
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <div style={{ ...lbl, marginTop: 10 }}>Confirm password</div>
        <PasswordInput
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />

        {err && <div style={errBox}>{err}</div>}

        <button
          onClick={submit}
          disabled={loading || !password || !confirm}
          style={{ ...btn, opacity: (loading || !password || !confirm) ? 0.5 : 1 }}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>

        <button
          onClick={async () => {
            await signOut()
            window.location.replace(window.location.origin + '/')
          }}
          style={C.bghost}
        >
          Cancel · back to sign in
        </button>
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
      <div style={{ width: '100%', maxWidth: 440 }}>{children}</div>
    </div>
  )
}

const card = {
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.xl,
  padding: 28,
  boxShadow: t.shadow.raised,
}
const eyebrow = {
  fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
  fontWeight: 700, textTransform: 'uppercase', marginBottom: 8,
}
const h1 = {
  fontFamily: t.font.athletic, fontSize: 36, lineHeight: 1,
  fontWeight: 400, letterSpacing: 1, textTransform: 'uppercase',
  margin: '0 0 12px', color: t.color.text,
}
const body = { fontSize: 13, color: t.color.textDim, lineHeight: 1.55, margin: '0 0 18px' }
const lbl = {
  fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
  fontWeight: 600, marginBottom: 8, display: 'block', textTransform: 'uppercase',
}
const input = {
  width: '100%',
  background: t.color.bg,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.md,
  padding: '14px 16px',
  fontSize: 16,
  color: t.color.text,
  fontFamily: t.font.sans,
  outline: 'none',
  boxSizing: 'border-box',
}
const btn = {
  width: '100%', marginTop: 18,
  background: `linear-gradient(180deg, ${t.color.pitch} 0%, ${t.color.pitch} 45%, ${t.color.pitchDeep} 100%)`,
  border: `1px solid ${t.color.pitchEdge}`,
  borderRadius: t.radius.md,
  padding: '15px 20px',
  fontSize: 13, fontWeight: 700, letterSpacing: 1.4,
  color: '#ffffff',
  textShadow: '0 1px 0 rgba(0,0,0,0.25)',
  cursor: 'pointer', fontFamily: t.font.sans,
  textTransform: 'uppercase',
  boxShadow: t.shadow.pitch,
}
const errBox = {
  marginTop: 12, padding: 12,
  background: t.color.errBg,
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: t.radius.md,
  fontSize: 12, color: t.color.text,
  lineHeight: 1.4,
}
