// Minimal service worker — required for Chrome PWA install prompt.
// Caches the app shell on install so the splash + loading screen render
// when offline. The app itself needs network (Supabase, Coach V API),
// but the shell load feels native.

const CACHE = 'dsm-shell-v1'
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

  // Network-first for navigation (so deploys are picked up), cache fallback offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }
  // Cache-first for shell assets
  if (SHELL.includes(url.pathname)) {
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request))
    )
  }
})
