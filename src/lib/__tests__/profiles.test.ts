import { describe, expect, it } from 'vitest'
import { initialState } from '../state'
import { PROFILES, applyProfile, findProfile, isProfileId } from '../profiles'

describe('profil alokasi', () => {
  it('keempat profil berjumlah tepat 100%', () => {
    for (const profile of PROFILES) {
      const total = profile.ratios.reduce((sum, entry) => sum + entry.ratio, 0)
      expect(Math.abs(total - 1)).toBeLessThan(0.01)
    }
    expect(PROFILES.map((profile) => profile.id)).toEqual(['standar', 'anak-kos', 'mahasiswa', 'karyawan'])
  })

  it('mempertahankan id kategori yang namanya cocok dan membuat yang belum ada', () => {
    const state = initialState()
    const next = applyProfile(state.categories, findProfile('anak-kos'))

    const makan = next.find((category) => category.name === 'Makan & Minum')
    expect(makan?.id).toBe('makan')
    expect(makan?.ratio).toBe(0.45)

    expect(next.some((category) => category.name === 'Laundry & Setrika')).toBe(true)
    expect(next.some((category) => category.name === 'Internet / WiFi')).toBe(true)
    expect(next.reduce((sum, category) => sum + category.ratio, 0)).toBeCloseTo(1, 6)
  })

  it('kategori buatan pengguna tetap ada dengan rasio 0', () => {
    const state = initialState()
    state.categories.push({ id: 'rokok', name: 'Rokok', ratio: 0.07, builtin: false, color: '#111' })

    const next = applyProfile(state.categories, findProfile('mahasiswa'))
    const custom = next.find((category) => category.id === 'rokok')
    expect(custom).toMatchObject({ name: 'Rokok', ratio: 0 })
    expect(next.reduce((sum, category) => sum + category.ratio, 0)).toBeCloseTo(1, 6)
  })

  it('isProfileId menolak nilai asing', () => {
    expect(isProfileId('anak-kos')).toBe(true)
    expect(isProfileId('kos')).toBe(false)
    expect(isProfileId(3)).toBe(false)
  })
})
