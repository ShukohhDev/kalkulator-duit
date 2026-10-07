import { loadPrefs, savePrefs } from './prefs'

const API = 'https://open.er-api.com/v6/latest/USD'
const TTL = 24 * 60 * 60 * 1000
const EVENT = 'kurs-updated'

function isFresh(at: string): boolean {
  const stamp = Date.parse(at)
  return Number.isFinite(stamp) && Date.now() - stamp < TTL
}

function announce(): void {
  window.dispatchEvent(new Event(EVENT))
}

/** Fetch kurs USD→IDR otomatis, di-cache 24 jam. Gagal = diam, pakai kurs terakhir. */
export async function refreshUsdRate(): Promise<void> {
  if (typeof fetch !== 'function') return
  const cached = loadPrefs()
  if (isFresh(cached.usdRateAt)) return
  try {
    const response = await fetch(API)
    if (!response.ok) return
    const data = (await response.json()) as { rates?: Record<string, unknown> }
    const idr = Number(data.rates?.IDR)
    if (!Number.isFinite(idr) || idr <= 0) return
    savePrefs({ usdRate: idr, usdRateAt: new Date().toISOString() })
    announce()
  } catch {
    // offline / diblokir: pertahankan kurs terakhir
  }
}

export function onRateUpdate(handler: () => void): () => void {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
