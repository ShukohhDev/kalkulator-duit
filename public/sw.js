// honey: ganti CACHE hanya jika strategi cache berubah; entri lama dibersihkan saat activate.
const CACHE = 'kalkulator-duitmu-v1'
const ROOT = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([ROOT, '/manifest.webmanifest', '/favicon.svg']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function remember(request, response) {
  const copy = response.clone()
  caches.open(CACHE).then((cache) => cache.put(request, copy))
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // navigasi: network-first, fallback ke cache saat offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          remember(request, response)
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(ROOT))),
    )
    return
  }

  // aset: cache-first, simpan saat pertama kali diambil
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) remember(request, response)
          return response
        }),
    ),
  )
})
