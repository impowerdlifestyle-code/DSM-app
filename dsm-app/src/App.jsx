import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import Auth from './components/Auth.jsx'
import Main from './components/Main.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 6, color: '#fff', fontFamily: 'Arial Narrow, Arial, sans-serif' }}>DSM</div>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#ff3d00', fontWeight: 700, marginTop: 4 }}>LOADING...</div>
      </div>
    </div>
  )

  return user ? <Main user={user} /> : <Auth />
}
