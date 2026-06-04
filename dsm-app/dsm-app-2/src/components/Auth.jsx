import { useState, useEffect } from 'react'
import { signIn, signUp, redeemParentInvite, sendPasswordReset, supabase, acceptTerms } from '../lib/supabase.js'
import { TERMS_URL, PRIVACY_URL } from '../lib/platform.js'
import { tokens as t } from '../styles.js'
import TiltCard from './widgets/TiltCard.jsx'
import PasswordInput from './widgets/PasswordInput.jsx'

const s = {
  shell: {
    fontFamily: t.font.sans,
    background: t.color.bg,
    minHeight: '100vh',
    color: t.color.text,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-15%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 520,
    height: 520,
    background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 60%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  inner: { width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 },
  mark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  monogram: {
    width: 56,
    height: 56,
    borderRadius: 14,
    border: `1px solid ${t.color.line2}`,
    background: t.color.surface,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: t.font.athletic,
    fontSize: 36,
    color: t.color.text,
    fontWeight: 400,
    letterSpacing: 1,
  },
  wordmark: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
  },
  wmTitle: {
    fontFamily: t.font.athletic,
    fontSize: 32,
    fontWeight: 400,
    letterSpacing: 3,
    color: t.color.text,
    textTransform: 'uppercase',
  },
  wmSub: {
    fontSize: 9.5,
    letterSpacing: 3,
    color: t.color.textMute,
    fontWeight: 600,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: t.color.textDim,
    fontWeight: 600,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heading: {
    fontFamily: t.font.athletic,
    fontSize: 52,
    lineHeight: 0.95,
    letterSpacing: 1.5,
    textAlign: 'center',
    fontWeight: 400,
    marginBottom: 10,
    textTransform: 'uppercase',
    color: t.color.text,
  },
  italic: { color: t.color.textDim },
  intro: {
    fontSize: 14,
    color: t.color.textDim,
    textAlign: 'center',
    lineHeight: 1.5,
    marginBottom: 30,
    maxWidth: 320,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  card: {
    background: t.color.surface,
    borderRadius: t.radius.xl,
    padding: 26,
    border: `1px solid ${t.color.line}`,
    boxShadow: t.shadow.raised,
  },
  modeRow: {
    display: 'flex',
    gap: 4,
    padding: 4,
    background: t.color.bg,
    borderRadius: t.radius.full,
    border: `1px solid ${t.color.line}`,
    marginBottom: 22,
  },
  modeBtn: (active) => ({
    flex: 1,
    minHeight: 44,
    padding: '12px 0',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.4,
    color: active ? t.color.bg : t.color.textDim,
    background: active ? t.color.text : 'transparent',
    border: 'none',
    borderRadius: t.radius.full,
    cursor: 'pointer',
    fontFamily: t.font.sans,
    textTransform: 'uppercase',
    transition: `all ${t.motion.fast}`,
  }),
  lbl: {
    fontSize: 10,
    letterSpacing: 2.4,
    color: t.color.textMute,
    fontWeight: 600,
    marginBottom: 8,
    display: 'block',
    textTransform: 'uppercase',
  },
  inp: {
    width: '100%',
    background: t.color.bg,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: '14px 16px',
    fontSize: 15,
    color: t.color.text,
    fontFamily: t.font.sans,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 14,
    transition: `border-color ${t.motion.fast}`,
  },
  btn: {
    background: `linear-gradient(180deg, ${t.color.pitch} 0%, ${t.color.pitchDeep} 100%)`,
    border: `1px solid ${t.color.pitchEdge}`,
    borderRadius: t.radius.md,
    padding: '15px 20px',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1.6,
    color: t.color.text,
    cursor: 'pointer',
    width: '100%',
    fontFamily: t.font.sans,
    marginTop: 6,
    textTransform: 'uppercase',
    boxShadow: t.shadow.pitch,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: `transform ${t.motion.fast}, filter ${t.motion.fast}`,
  },
  alert: (kind) => ({
    background: kind === 'err' ? t.color.errBg : t.color.okBg,
    border: `1px solid ${kind === 'err' ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}`,
    borderRadius: t.radius.md,
    padding: '11px 14px',
    fontSize: 13,
    color: kind === 'err' ? t.color.err : t.color.ok,
    marginBottom: 14,
    lineHeight: 1.4,
  }),
  foot: {
    textAlign: 'center',
    marginTop: 26,
    fontSize: 11,
    color: t.color.textMute,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 600,
  },
}

export default function Auth() {
  const [mode, setMode] = useState('login')      // login | signup | parent
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [parentCode, setParentCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [invitedBy, setInvitedBy] = useState(null)
  const [agreedTerms, setAgreedTerms] = useState(false)

  // Read invite + prefill params from the URL once. New signed-token flow:
  //   /?invite=<base64url(payload).base64url(hmac)>&email=x&name=Y
  // The token is opaque to the client — we just hand it to /api/invite/redeem
  // after sign-up. Coach label is shown from the payload (un-verified) purely
  // for the "Invited by" hint; the real binding happens server-side.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    const eParam = params.get('email')
    const nParam = params.get('name')
    if (invite) {
      sessionStorage.setItem('dsm_pending_invite', invite)
      try {
        const [payloadEncoded] = invite.split('.', 2)
        const payload = JSON.parse(atob(payloadEncoded.replace(/-/g, '+').replace(/_/g, '/')))
        if (payload?.coachLabel) setInvitedBy(payload.coachLabel)
      } catch { /* malformed — server will reject on redeem */ }
      setMode('signup')
    } else {
      const stored = sessionStorage.getItem('dsm_pending_invite')
      if (stored) {
        try {
          const [payloadEncoded] = stored.split('.', 2)
          const payload = JSON.parse(atob(payloadEncoded.replace(/-/g, '+').replace(/_/g, '/')))
          if (payload?.coachLabel) setInvitedBy(payload.coachLabel)
        } catch { /* malformed */ }
      }
    }
    if (eParam) setEmail(eParam)
    if (nParam) { setName(nParam); setMode('signup') }
  }, [])

  const handleForgot = async () => {
    if (!email) return setError('Enter your email first, then tap reset.')
    setLoading(true); setError(''); setMessage('')
    const { error } = await sendPasswordReset(email)
    setLoading(false)
    if (error) setError(error.message)
    else setMessage('Reset link sent — check your inbox.')
  }

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if ((mode === 'signup' || mode === 'parent') && !name) return setError('Please enter your name.')
    if ((mode === 'signup' || mode === 'parent') && !agreedTerms) return setError('Please agree to the Terms to continue.')
    if (mode === 'parent' && parentCode.length !== 6) return setError('Enter the 6-char invite code from your athlete.')
    setLoading(true)
    setError('')
    setMessage('')
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else if (mode === 'signup') {
      const { data, error } = await signUp(email, password, name)
      if (error) setError(error.message)
      else {
        if (data?.user) acceptTerms(data.user.id).catch(() => {})
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } else if (mode === 'parent') {
      // Stash the code so App.jsx can auto-redeem after sign-in completes
      // (covers both email-confirm-on and email-confirm-off flows).
      sessionStorage.setItem('dsm_pending_parent_code', parentCode)

      const { data: signUpData, error } = await signUp(email, password, name)
      if (!error && signUpData?.user) acceptTerms(signUpData.user.id).catch(() => {})
      if (error) {
        // existing account? fall through to sign-in attempt (parent adding 2nd athlete)
        if (!/already registered|exists/i.test(error.message)) {
          sessionStorage.removeItem('dsm_pending_parent_code')
          setError(error.message); setLoading(false); return
        }
        const { error: signInErr } = await signIn(email, password)
        if (signInErr) {
          sessionStorage.removeItem('dsm_pending_parent_code')
          setError(signInErr.message); setLoading(false); return
        }
        // App.jsx will pick up the pending code and redeem
        return
      }

      if (!signUpData?.session) {
        setMessage('Account created. Confirm your email, then sign in — your invite code is saved.')
        return
      }
      // Session live (email confirm off) — App.jsx redeems on auth state change.
    }
    setLoading(false)
  }

  return (
    <div style={s.shell}>
      <div style={s.glow} />
      <div style={s.inner}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <img src="/dsm-logo.png" alt="Di Lorenzo Mindset" style={{
            width: 168, height: 168, objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.10))',
          }} />
        </div>

        {invitedBy && (
          <div style={{
            padding: '10px 14px', marginBottom: 18,
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 12, textAlign: 'center',
            fontSize: 12, color: t.color.text, lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 10, letterSpacing: 1.6, color: t.color.pitch, fontWeight: 700, textTransform: 'uppercase' }}>
              Invited by {decodeURIComponent(invitedBy)}
            </span>
            <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 2 }}>
              14-day free trial · full access starts the moment you sign up.
            </div>
          </div>
        )}

        <div style={s.eyebrow}>Elite Soccer Mindset Program</div>
        <h1 style={s.heading}>
          Train the<br />
          mind behind<br />
          <span style={s.italic}>the game.</span>
        </h1>
        <p style={s.intro}>
          A private program for ambitious players. Action steps,
          mental tools, and direct work with Coach Valentino.
        </p>

        <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: t.radius.xl, ...s.card }}>
          <div style={s.modeRow}>
            <button style={s.modeBtn(mode === 'login')} onClick={() => { setMode('login'); setError(''); setMessage('') }}>
              Sign in
            </button>
            <button style={s.modeBtn(mode === 'signup')} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>
              Join
            </button>
            <button style={s.modeBtn(mode === 'parent')} onClick={() => { setMode('parent'); setError(''); setMessage('') }}>
              Parent
            </button>
          </div>

          {error && <div style={s.alert('err')}>{error}</div>}
          {message && <div style={s.alert('ok')}>{message}</div>}

          {(mode === 'signup' || mode === 'parent') && (
            <>
              <span style={s.lbl}>Full name</span>
              <input
                style={s.inp}
                placeholder={mode === 'parent' ? 'Sarah DiLorenzo' : 'Marco DiLorenzo'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </>
          )}

          {mode === 'parent' && (
            <>
              <span style={s.lbl}>Athlete invite code</span>
              <input
                style={{ ...s.inp, textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', fontFamily: t.font.mono, fontSize: 17 }}
                placeholder="ABC123"
                maxLength={6}
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
            </>
          )}

          <span style={s.lbl}>Email</span>
          <input
            style={s.inp}
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={s.lbl}>Password</span>
            {mode === 'login' && (
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: t.color.textDim, fontSize: 10, letterSpacing: 1.6,
                  fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: t.font.sans, marginBottom: 8,
                }}
              >Forgot?</button>
            )}
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            inputStyle={s.inp}
            style={{ marginBottom: s.inp?.marginBottom || 14 }}
          />

          {(mode === 'signup' || mode === 'parent') && (
            <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', margin: '2px 0 14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: t.color.pitch, flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: t.color.textDim, lineHeight: 1.45 }}>
                I agree to the{' '}
                <a href={TERMS_URL} target="_blank" rel="noreferrer" style={{ color: t.color.text, textDecoration: 'underline' }}>Terms</a>{' '}and{' '}
                <a href={PRIVACY_URL} target="_blank" rel="noreferrer" style={{ color: t.color.text, textDecoration: 'underline' }}>Privacy Policy</a>, and understand there is{' '}
                <b style={{ color: t.color.text }}>zero tolerance</b> for abusive content or behavior — it can be reported and will be removed.
              </span>
            </label>
          )}

          <button
            style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Working…'
              : mode === 'login'  ? 'Sign in'
              : mode === 'parent' ? 'Link to my athlete'
                                  : 'Create account'}
            {!loading && <span aria-hidden style={{ fontSize: 14 }}>→</span>}
          </button>
        </TiltCard>

        <div style={s.foot}>DiLorenzoSoccerMindset.com</div>
      </div>
    </div>
  )
}
