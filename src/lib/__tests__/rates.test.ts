// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { loadPrefs, savePrefs } from '../prefs'
import { refreshUsdRate } from '../rates'

const fetchMock = vi.fn()

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('mengambil kurs IDR otomatis dan menyimpannya dengan stempel waktu', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ rates: { IDR: 15_800 } }),
  })

  await refreshUsdRate()

  expect(fetchMock).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD')
  const prefs = loadPrefs()
  expect(prefs.usdRate).toBe(15_800)
  expect(prefs.usdRateAt).not.toBe('')
})

it('memakai cache yang masih segar (< 24 jam) tanpa fetch ulang', async () => {
  savePrefs({ usdRate: 15_700, usdRateAt: new Date().toISOString() })

  await refreshUsdRate()

  expect(fetchMock).not.toHaveBeenCalled()
  expect(loadPrefs().usdRate).toBe(15_700)
})

it('fetch gagal / respons tidak valid: kurs terakhir dipertahankan', async () => {
  savePrefs({ usdRate: 15_700, usdRateAt: '' })
  fetchMock.mockRejectedValueOnce(new Error('offline'))

  await refreshUsdRate()
  expect(loadPrefs().usdRate).toBe(15_700)

  fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
  await refreshUsdRate()
  expect(loadPrefs().usdRate).toBe(15_700)

  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { IDR: 'oops' } }) })
  await refreshUsdRate()
  expect(loadPrefs().usdRate).toBe(15_700)
})

it('kurs basi (> 24 jam) memicu fetch ulang', async () => {
  savePrefs({ usdRate: 15_700, usdRateAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() })
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ rates: { IDR: 16_200 } }) })

  await refreshUsdRate()

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(loadPrefs().usdRate).toBe(16_200)
})
