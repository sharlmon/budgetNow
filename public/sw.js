// Weka service worker: app shell works offline.
// - The private app screens are client-rendered, so their first page is the same static shell for everyone. It opens instantly
//   from the saved copy and is refreshed in the background (stale-while-revalidate), so a slow connection never delays the first paint.
// - Other pages (landing, legal, guides) are network-first so updates arrive; everything else is cache-first.
const CACHE = 'weka-v6'
const SCOPE = self.registration.scope
const APP_SCREENS = ['home', 'activity', 'analytics', 'goals', 'bills', 'debts', 'accounts', 'settings']
const isAppScreen = (url) => APP_SCREENS.some(p => url.pathname === new URL(SCOPE).pathname + p || url.pathname.startsWith(new URL(SCOPE).pathname + p + '/'))

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([SCOPE, SCOPE + 'home', SCOPE + 'manifest.webmanifest', SCOPE + 'icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// The page sends the URLs it already loaded before this worker took control, so offline works after the first visit.
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'cache-urls') return
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(e.data.urls.map(u => c.add(u).catch(() => {})))))
})

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return
  // Account data and auth are always live: never serve them from cache.
  if (sameOrigin && (url.pathname.startsWith('/api/') || url.pathname.endsWith('/version.json') || url.searchParams.has('__clerk_handshake') || url.searchParams.has('__clerk_db_jwt'))) return

  if (req.mode === 'navigate' && sameOrigin && isAppScreen(url)) {
    const refresh = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
      return res
    })
    e.respondWith(caches.match(req).then(hit => hit || refresh.catch(() => caches.match(SCOPE + 'home') || caches.match(SCOPE))))
    e.waitUntil(refresh.catch(() => {})) // keep the worker alive until the saved copy has been refreshed
    return
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res })
        .catch(() => caches.match(req).then(r => r || caches.match(SCOPE))),
    )
    return
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
        return res
      }).catch(() => hit)
      return hit || net
    }),
  )
})
