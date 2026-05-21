import { useState, useEffect } from 'react'
import { supabase, redeemParentInvite } from './lib/supabase.js'
import Auth from './components/Auth.jsx'
import Main from './components/Main.jsx'
import ParentShell from './components/ParentShell.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(null)  // re-fetch on auth change
    })
    return () => subscription.unsubscribe()
  }, [])

  // fetch role once we know the user — and if there's a pending parent-invite
  // code from the Auth flow, redeem it before reading the role (so the user
  // lands in ParentShell on first paint instead of Main).
  useEffect(() => {
    if (!user?.id) { setRole(null); return }
    setRoleLoading(true)
    ;(async () => {
      const pending = sessionStorage.getItem('dsm_pending_parent_code')
      if (pending) {
        sessionStorage.removeItem('dsm_pending_parent_code')
        await redeemParentInvite(user.id, pending)  // RPC ignores arg, uses auth.uid()
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setRole(data?.role || 'athlete')
      setRoleLoading(false)
    })()
  }, [user?.id])

  if (loading || (user && roleLoading)) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 6, color: '#fff', fontFamily: 'Arial Narrow, Arial, sans-serif' }}>DSM</div>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#ff3d00', fontWeight: 700, marginTop: 4 }}>LOADING...</div>
      </div>
    </div>
  )

  if (!user) return <Auth />
  if (role === 'parent') return <ParentShell user={user} />
  return <Main user={user} />
}
