import { describe, expect, it } from 'vitest'

function pick(modules: Record<string, unknown>): string {
  const [content] = Object.values(modules)
  if (typeof content !== 'string') throw new Error('hasil glob kosong')
  return content
}

const manifestRaw = () =>
  pick(
    import.meta.glob('../../../public/manifest.webmanifest', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  )
const htmlRaw = () =>
  pick(import.meta.glob('../../../index.html', { query: '?raw', import: 'default', eager: true }))
const swRaw = () => pick(import.meta.glob('../../../public/sw.js', { query: '?raw', import: 'default', eager: true }))

describe('pwa', () => {
  it('manifest lengkap dan tersambung dari index.html', () => {
    const manifest = JSON.parse(manifestRaw())
    expect(manifest.name).toBe('Kalkulator Uang Jajan')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('id')
    expect(Array.isArray(manifest.icons) && manifest.icons.length > 0).toBe(true)
    expect(manifest.icons.some((icon: { sizes?: string }) => icon.sizes === '192x192')).toBe(true)
    expect(manifest.icons.some((icon: { sizes?: string }) => icon.sizes === '512x512')).toBe(true)

    const html = htmlRaw()
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('name="apple-mobile-web-app-capable"')
  })

  it('service worker bisa dibuka offline: navigasi fallback ke root, aset cache-first', () => {
    const sw = swRaw()
    expect(sw).toContain("request.mode === 'navigate'")
    expect(sw).toContain('caches.match(ROOT')
    expect(sw).toContain('caches.match(request')
    expect(sw).toContain('ignoreVary')
    expect(sw).toContain('addEventListener')
  })

  it('aset ber-hashed ikut di-precache saat install supaya kunjungan pertama aman offline', () => {
    const sw = swRaw()
    expect(sw).toContain('installPrecache')
    expect(sw).toContain('\\/assets\\/') // regex di sw.js mem-escape slash
    expect(sw).toContain('manifest.webmanifest')
    expect(sw).toContain('icon-192.png')
    expect(sw).toContain('icon-512.png')
  })
})
