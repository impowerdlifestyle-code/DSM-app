// Client-side fetch helper that injects the Supabase JWT into Authorization.
// Use for any /api/* call that requires auth.
//
//   import { authFetch } from '@/lib/authFetch'
//   const res = await authFetch('/api/coach', { method:'POST', body: JSON.stringify({...}) })

import { supabase } from './supabase'
import { apiUrl, isNativeApp } from './platform'

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  // Native apps ship free — mark the request so the server skips the paywall.
  if (isNativeApp()) headers.set('X-DSM-Native', '1')
  return fetch(apiUrl(url), { ...options, headers })
}
