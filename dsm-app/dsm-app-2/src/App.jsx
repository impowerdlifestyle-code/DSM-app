import { useState, useEffect, useRef } from 'react'
import { supabase, redeemParentInvite } from './lib/supabase.js'
import { authFetch } from './lib/authFetch.js'
import Auth from './components/Auth.jsx'
import Main from './components/Main.jsx'
import ParentShell from './components/ParentShell.jsx'
import LoadingBall from './components/LoadingBall.jsx'
import BugReporter from './components/BugReporter.jsx'
import ParentConsentPage from './components/ParentConsentPage.jsx'
import PasswordResetPage from './components/PasswordResetPage.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(
    typeof window !== 'undefined' && (
      // Hash returned by Supabase magic links carries type=recovery
      window.location.hash.includes('type=recovery') ||
      // Our redirectTo also adds ?reset=1 so we can fall back to that
      new URLSearchParams(window.location.search).get('reset') === '1'
    )
  )

  // Parent-consent landing — short-circuits auth so parents (who have no account)
  // can approve their child's signup via a tokenized URL.
  const consentToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('consent')
    : null

  // H8: removed the 4s/1.2s artificial splash hold. Auth resolves in ~200ms
  // on cached sessions, so the timer was making returning users stare at
  // the loading ball for ~3.8s of nothing. The localStorage 'dsm_player_name'
  // "first login" heuristic was also wrong on incognito / cleared-data
  // returning users — flagged them as new every session.

  const userIdRef = useRef(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id ?? null
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase fires PASSWORD_RECOVERY when the user clicks the magic link
      // from the reset email. At that point there IS a session, but we want
      // to gate the app behind a "set new password" form instead of letting
      // them straight into Main with a temporary session.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT')        setPasswordRecovery(false)
      // TOKEN_REFRESHED (hourly) fires with the same user — skip it, otherwise a
      // new user object identity + role reset re-renders all of Main for nothing.
      const nextId = session?.user?.id ?? null
      if (nextId === userIdRef.current) return
      userIdRef.current = nextId
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
      const pendingInvite = sessionStorage.getItem('dsm_pending_invite')
      const { data } = await supabase.from('profiles')
        .select('role, full_name, assigned_coach').eq('id', user.id).maybeSingle()
      if (pendingInvite && data && !data.assigned_coach) {
        sessionStorage.removeItem('dsm_pending_invite')
        try {
          await authFetch('/api/invite/redeem', {
            method: 'POST',
            body: JSON.stringify({ token: pendingInvite }),
          })
        } catch { /* server rejected — invite was forged/expired, signup still succeeds */ }
      }
      setRole(data?.role || 'athlete')
      if (data?.full_name) localStorage.setItem('dsm_player_name', data.full_name)
      setRoleLoading(false)
    })()
  }, [user?.id])

  if (consentToken) return <ParentConsentPage token={consentToken} />

  // Password-reset gate — short-circuits everything else so the user is
  // forced to set a new password before continuing into the app.
  if (passwordRecovery) return <PasswordResetPage />

  if (loading || (user && roleLoading)) return <LoadingBall />

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
