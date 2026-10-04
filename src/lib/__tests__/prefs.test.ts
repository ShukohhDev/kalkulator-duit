// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPrefs, savePrefs } from '../prefs'

describe('preferensi grafik', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('memberi default saat belum ada penyimpanan', () => {
    expect(loadPrefs()).toEqual({ view: 'day', chartType: 'bar' })
  })

  it('menyimpan dan memuat kembali pilihan pengguna', () => {
    savePrefs({ view: 'month', chartType: 'category' })
    expect(loadPrefs()).toEqual({ view: 'month', chartType: 'category' })
  })

  it('mengabaikan nilai tidak sah atau rusak dengan kembali ke default', () => {
    window.localStorage.setItem('kalkulator-duitmu:prefs', JSON.stringify({ view: 'disk', chartType: 'pie3d' }))
    expect(loadPrefs()).toEqual({ view: 'day', chartType: 'bar' })

    window.localStorage.setItem('kalkulator-duitmu:prefs', 'bukan json {')
    expect(loadPrefs()).toEqual({ view: 'day', chartType: 'bar' })
  })
})
