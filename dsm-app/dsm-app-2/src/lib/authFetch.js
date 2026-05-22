// Client-side fetch helper that injects the Supabase JWT into Authorization.
// Use for any /api/* call that requires auth.
//
//   import { authFetch } from '@/lib/authFetch'
//   const res = await authFetch('/api/coach', { method:'POST', body: JSON.stringify({...}) })

import { supabase } from './supabase'

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  return fetch(url, { ...options, headers })
}
