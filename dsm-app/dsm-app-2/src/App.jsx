import { useState, useEffect } from 'react'
import { supabase, redeemParentInvite } from './lib/supabase.js'
import Auth from './components/Auth.jsx'
import Main from './components/Main.jsx'
import ParentShell from './components/ParentShell.jsx'
import LoadingBall from './components/LoadingBall.jsx'
import BugReporter from './components/BugReporter.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [minHoldDone, setMinHoldDone] = useState(false)

  // Loading screen minimum hold — 4s on first login (no cached name),
  // 1.2s on returning sessions so it doesn't feel slow.
  useEffect(() => {
    const firstLogin = !localStorage.getItem('dsm_player_name')
    const ms = firstLogin ? 4000 : 1200
    const t = setTimeout(() => setMinHoldDone(true), ms)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.id) { setRole(null); return }
    setRoleLoading(true)
    ;(async () => {
      const pending = sessionStorage.getItem('dsm_pending_parent_code')
      if (pending) {
        sessionStorage.removeItem('dsm_pending_parent_code')
        await redeemParentInvite(user.id, pending)
      }
      const { data } = await supabase.from('profiles')
        .select('role, full_name').eq('id', user.id).maybeSingle()
      setRole(data?.role || 'athlete')
      if (data?.full_name) localStorage.setItem('dsm_player_name', data.full_name)
      setRoleLoading(false)
    })()
  }, [user?.id])

  if (loading || (user && roleLoading) || !minHoldDone) return <LoadingBall />

  const content = !user
    ? <Auth />
    : role === 'parent'
      ? <ParentShell user={user} />
      : <Main user={user} />

  return <>
    {content}
    <BugReporter user={user} />
  </>
}
