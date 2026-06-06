// Minimal service worker — required for Chrome PWA install prompt.
// Caches the app shell on install so the splash + loading screen render
// when offline. The app itself needs network (Supabase, Coach V API),
// but the shell load feels native.
//
// CACHE name MUST be bumped on every release that changes routing,
// service-worker behavior, or anything in SHELL. iOS Safari aggressively
// holds onto the old SW + cached index.html otherwise — symptom is
// buttons that "do nothing" because the cached index.html points at
// bundle hashes that 404 on the new deploy.

const CACHE = 'dsm-shell-v4'
const SHELL = ['/', '/index.html', '/dsm-logo.png', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  // Never cache POSTs or API calls — always go to network
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  // Hashed JS/CSS bundles (Vite emits /assets/index-<hash>.js etc.) MUST hit
  // network — caching them would serve stale code on the next deploy. Same
  // for the service worker itself.
  if (url.pathname.startsWith('/assets/') || url.pathname === '/sw.js') return

  // Network-first for navigation (so deploys are picked up), cache fallback offline.
  // Cache the fresh response on success so offline still works on next visit.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(resp => {
          const copy = resp.clone()
          caches.open(CACHE).then(c => c.put('/index.html', copy)).catch(() => {})
          return resp
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }
  // Cache-first for shell assets only
  if (SHELL.includes(url.pathname)) {
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request))
    )
  }
})
