// honey: ganti CACHE hanya jika strategi cache berubah; entri lama dibersihkan saat activate.
const CACHE = 'kalkulator-duitmu-v1'
const ROOT = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(installPrecache().then(() => self.skipWaiting()))
})

// precache index.html + aset ber-hashed dari dalamnya, supaya kunjungan pertama
// langsung aman untuk offline (aset baru hanya masuk cache setelah halaman dikontrol SW)
async function installPrecache() {
  const cache = await caches.open(CACHE)
  const html = await (await fetch(ROOT)).text()
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]))]
  await cache.addAll([ROOT, '/manifest.webmanifest', '/favicon.svg', ...assets])
}

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
  // ignoreVary: server bisa mengirim "Vary: Origin" yang bikin match meleset antar konteks
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          remember(request, response)
          return response
        })
        .catch(async () => (await caches.match(request, { ignoreVary: true })) ?? (await caches.match(ROOT, { ignoreVary: true }))),
    )
    return
  }

  // aset: cache-first, simpan saat pertama kali diambil
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      return (
        cached ??
        fetch(request).then((response) => {
          if (response.ok) remember(request, response)
          return response
        })
      )
    }),
  )
})
