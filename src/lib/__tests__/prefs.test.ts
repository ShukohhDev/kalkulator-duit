// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPrefs, savePrefs } from '../prefs'

const DEFAULTS = {
  view: 'day',
  chartType: 'bar',
  trendView: 'day',
  walletCurrency: 'idr',
  usdRate: 16_000,
  usdRateAt: '',
  asetVisible: true,
  profilePicked: false,
}

describe('preferensi grafik', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('memberi default saat belum ada penyimpanan', () => {
    expect(loadPrefs()).toEqual(DEFAULTS)
  })

  it('menyimpan dan memuat kembali pilihan pengguna', () => {
    savePrefs({ view: 'month', chartType: 'category' })
    expect(loadPrefs()).toEqual({ ...DEFAULTS, view: 'month', chartType: 'category' })
  })

  it('savePrefs bersifat merge: mengubah satu kunci tidak menghapus kunci lain', () => {
    savePrefs({ walletCurrency: 'usd', usdRate: 15_700 })
    savePrefs({ view: 'year' })
    expect(loadPrefs()).toEqual({ ...DEFAULTS, view: 'year', walletCurrency: 'usd', usdRate: 15_700 })
  })

  it('mengabaikan nilai tidak sah atau rusak dengan kembali ke default', () => {
    window.localStorage.setItem(
      'kalkulator-duitmu:prefs',
      JSON.stringify({ view: 'disk', chartType: 'pie3d', walletCurrency: 'eur', usdRate: -3 }),
    )
    expect(loadPrefs()).toEqual(DEFAULTS)

    window.localStorage.setItem('kalkulator-duitmu:prefs', 'bukan json {')
    expect(loadPrefs()).toEqual(DEFAULTS)
  })
})

it('menyimpan preferensi sembunyikan total aset', () => {
  savePrefs({ asetVisible: false })
  expect(loadPrefs().asetVisible).toBe(false)
  savePrefs({ asetVisible: true })
  expect(loadPrefs().asetVisible).toBe(true)
})
