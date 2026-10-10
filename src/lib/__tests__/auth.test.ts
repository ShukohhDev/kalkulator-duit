// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  accountNames,
  currentUser,
  hasAccounts,
  login,
  logout,
  register,
  touchSession,
  SESSION_TIME_KEY,
  SESSION_TIMEOUT_MS,
} from '../auth'

const STATE_KEY = 'kalkulator-duitmu:v1'
const PREFS_KEY = 'kalkulator-duitmu:prefs'

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('akun & sesi', () => {
  it('mendaftar akun pertama memindahkan data lama ke key miliknya', async () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ allowance: 700_000 }))
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ view: 'week' }))

    expect(await register('adi', 'kata123')).toBeNull()

    expect(window.localStorage.getItem(`${STATE_KEY}:adi`)).toContain('700000')
    expect(window.localStorage.getItem(`${PREFS_KEY}:adi`)).toContain('week')
    expect(window.localStorage.getItem(STATE_KEY)).toBeNull()
    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull()
    expect(currentUser()).toBe('adi')
  })

  it('akun kedua tidak menyentuh sisa data legacy', async () => {
    await register('adi', 'kata123')
    logout()
    window.localStorage.setItem(STATE_KEY, '{"allowance":1}')

    expect(await register('budi', 'kata123')).toBeNull()
    expect(window.localStorage.getItem(STATE_KEY)).toBe('{"allowance":1}')
    expect(window.localStorage.getItem(`${STATE_KEY}:budi`)).toBeNull()
  })

  it('menolak nama kosong, sandi pendek, dan nama ganda', async () => {
    expect(await register('', 'kata123')).toContain('Nama pengguna')
    expect(await register('adi', 'abc')).toContain('minimal 4')
    expect(await register('adi', 'kata123')).toBeNull()
    expect(await register('ADI', 'kata123')).toContain('sudah dipakai')
    expect(hasAccounts()).toBe(true)
    expect(accountNames()).toEqual(['adi'])
  })

  it('login menolak sandi salah lalu menerima yang benar', async () => {
    await register('adi', 'kata123')
    logout()

    expect(await login('adi', 'salah')).toContain('Kata sandi salah')
    expect(currentUser()).toBeNull()
    expect(await login('nobody', 'kata123')).toContain('tidak ditemukan')

    expect(await login('adi', 'kata123')).toBeNull()
    expect(currentUser()).toBe('adi')
  })

  it('logout menghapus sesi', async () => {
    await register('adi', 'kata123')
    expect(currentUser()).toBe('adi')
    logout()
    expect(currentUser()).toBeNull()
  })

  it('sesi bertahan saat browser ditutup sebentar (sessionStorage kosong tapi di bawah 30 menit)', async () => {
    await register('adi', 'kata123')
    expect(currentUser()).toBe('adi')

    // Simulasi tutup tab/browser: sessionStorage dibersihkan
    window.sessionStorage.clear()

    // Buka kembali 5 menit kemudian
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    window.localStorage.setItem(SESSION_TIME_KEY, String(fiveMinutesAgo))

    expect(currentUser()).toBe('adi')
  })

  it('sesi otomatis hangus jika pengguna keluar lebih dari 30 menit', async () => {
    await register('adi', 'kata123')
    expect(currentUser()).toBe('adi')

    // Simulasi waktu berlalu lebih dari 30 menit
    const expiredTime = Date.now() - (SESSION_TIMEOUT_MS + 1000)
    window.localStorage.setItem(SESSION_TIME_KEY, String(expiredTime))

    expect(currentUser()).toBeNull()
  })

  it('touchSession memperbarui timestamp aktivitas sesi', async () => {
    await register('adi', 'kata123')
    const initialTime = Date.now() - 10 * 60 * 1000
    window.localStorage.setItem(SESSION_TIME_KEY, String(initialTime))

    touchSession()
    const updated = Number(window.localStorage.getItem(SESSION_TIME_KEY))
    expect(updated).toBeGreaterThan(initialTime)
  })
})
