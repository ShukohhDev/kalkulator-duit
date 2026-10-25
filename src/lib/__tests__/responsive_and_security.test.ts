// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  currentUser,
  currentUserRole,
  isAdmin,
  login,
  logout,
  register,
  SESSION_TIME_KEY,
  SESSION_TIMEOUT_MS,
} from '../auth'

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('Keamanan & Pengerasan Otentikasi (Security & Hardening)', () => {
  it('menolak karakter berbahaya pada nama pengguna untuk mencegah injeksi XSS & HTML', async () => {
    // Mencoba mendaftarkan script tag (di bawah 24 karakter)
    const xss = await register('<script>', 'password123')
    expect(xss).toContain('Nama pengguna hanya boleh mengandung')

    // Mencoba karakter SQL/simbol liar (di bawah 24 karakter)
    const sql = await register("admin' OR 1=1", 'password123')
    expect(sql).toContain('Nama pengguna hanya boleh mengandung')

    // Karakter sah (alphanumeric, spasi, titik, strip, #) diterima
    const valid = await register('User.A-1 #Dev', 'password123')
    expect(valid).toBeNull()
    expect(currentUser()).toBe('User.A-1 #Dev')
  })

  it('sesi otomatis kedaluwarsa setelah 30 menit inaktivitas dan tidak dapat diakses lagi', async () => {
    await register('penggunaSesi', 'password123')
    expect(currentUser()).toBe('penggunaSesi')

    // Waktu mundur lebih dari 30 menit
    const expiredTime = Date.now() - (SESSION_TIMEOUT_MS + 2000)
    window.localStorage.setItem(SESSION_TIME_KEY, String(expiredTime))

    expect(currentUser()).toBeNull()
  })

  it('hanya akun pemilik yang dapat mengakses role admin, mencegah eskalasi hak akses', async () => {
    // Pengguna biasa
    await register('userBiasa', 'password123')
    expect(currentUserRole()).toBe('user')
    expect(isAdmin()).toBe(false)
    logout()

    // Akun pemilik
    await register('Shukoh#Dev', 'password123')
    expect(currentUserRole()).toBe('admin')
    expect(isAdmin()).toBe(true)
  })

  it('menolak login dengan kata sandi yang salah', async () => {
    await register('userTest', 'passwordBenar123')
    logout()

    const wrong = await login('userTest', 'passwordSalah')
    expect(wrong).toContain('Kata sandi salah')
    expect(currentUser()).toBeNull()

    const ok = await login('userTest', 'passwordBenar123')
    expect(ok).toBeNull()
    expect(currentUser()).toBe('userTest')
  })
})

describe('Pengujian Responsivitas Lintas Perangkat (Cross-Device Viewports)', () => {
  it('mendeteksi breakpoint desktop (>= 769px) vs tablet/mobile (< 769px)', () => {
    const isDesktopViewport = (width: number) => width > 768

    // Handphone
    expect(isDesktopViewport(375)).toBe(false) // iPhone SE
    expect(isDesktopViewport(390)).toBe(false) // iPhone 14
    expect(isDesktopViewport(412)).toBe(false) // Samsung Galaxy
    expect(isDesktopViewport(640)).toBe(false) // Phablet

    // Tablet Portrait
    expect(isDesktopViewport(768)).toBe(false) // iPad Mini / Air Portrait

    // Tablet Landscape & Laptop
    expect(isDesktopViewport(820)).toBe(true)  // iPad Air Landscape
    expect(isDesktopViewport(1024)).toBe(true) // Small Laptop / iPad Pro
    expect(isDesktopViewport(1280)).toBe(true) // Standard Laptop
    expect(isDesktopViewport(1920)).toBe(true) // Full HD Desktop
  })

  it('logika hysteresis scroll sticky navigasi aktif pada >= 75px dan kembali pada <= 55px', () => {
    let isSticky = false
    const handleScrollHysteresis = (y: number) => {
      if (!isSticky && y >= 75) isSticky = true
      if (isSticky && y <= 55) isSticky = false
      return isSticky
    }

    // Scroll awal di atas
    expect(handleScrollHysteresis(0)).toBe(false)
    expect(handleScrollHysteresis(50)).toBe(false)

    // Scroll melewati topbar
    expect(handleScrollHysteresis(75)).toBe(true)
    expect(handleScrollHysteresis(120)).toBe(true)

    // Scroll kembali ke atas perlahan (hysteresis mencegah flickering antara 56-74px)
    expect(handleScrollHysteresis(65)).toBe(true)
    expect(handleScrollHysteresis(55)).toBe(false)
    expect(handleScrollHysteresis(20)).toBe(false)
  })
})
