import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase.js'

const s = {
  app: { fontFamily: "'Arial Narrow', Arial, sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#fff', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px' },
  logo: { fontSize: 48, fontWeight: 900, letterSpacing: 8, textAlign: 'center', lineHeight: 1 },
  sub: { fontSize: 10, letterSpacing: 3, color: '#ff3d00', fontWeight: 700, textAlign: 'center', marginTop: 6, marginBottom: 40 },
  card: { background: '#111', borderRadius: 16, padding: 24, border: '1px solid #1e1e1e' },
  lbl: { fontSize: 9, letterSpacing: 3, color: '#555', fontWeight: 700, marginBottom: 7, display: 'block' },
  inp: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '14px 16px', fontSize: 15, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  btn: { background: 'linear-gradient(135deg,#ff3d00,#ff6d00)', border: 'none', borderRadius: 10, padding: '16px 20px', fontSize: 14, fontWeight: 800, letterSpacing: 2, color: '#fff', cursor: 'pointer', width: '100%', fontFamily: 'inherit', marginTop: 6 },
  link: { background: 'none', border: 'none', color: '#ff3d00', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 16, display: 'block', textAlign: 'center', width: '100%' },
  err: { background: '#2a0a0a', border: '1px solid #ff3d00', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ff6d00', marginBottom: 14, fontFamily: "'Arial', sans-serif" },
  msg: { background: '#0a2a0a', border: '1px solid #00aa44', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#00cc55', marginBottom: 14, fontFamily: "'Arial', sans-serif" },
}

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if (mode === 'signup' && !name) return setError('Please enter your name.')
    setLoading(true)
    setError('')
    setMessage('')
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(email, password, name)
      if (error) setError(error.message)
      else setMessage('✅ Check your email to confirm your account, then log in!')
    }
    setLoading(false)
  }

  return (
    <div style={s.app}>
      <div style={s.logo}>DSM</div>
      <div style={s.sub}>DILORENZO SOCCER MINDSET</div>
      <div style={s.card}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, marginBottom: 20 }}>
          {mode === 'login' ? 'LOCK IN 🔥' : 'JOIN THE PROGRAM 🦈'}
        </div>
        {error && <div style={s.err}>{error}</div>}
        {message && <div style={s.msg}>{message}</div>}
        {mode === 'signup' && (
          <>
            <span style={s.lbl}>FULL NAME</span>
            <input style={s.inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          </>
        )}
        <span style={s.lbl}>EMAIL</span>
        <input style={s.inp} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <span style={s.lbl}>PASSWORD</span>
        <input style={s.inp} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'LOADING...' : mode === 'login' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
        </button>
        <button style={s.link} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#333', fontFamily: "'Arial', sans-serif" }}>
        DiLorenzoSoccerMindset.com
      </div>
    </div>
  )
}
