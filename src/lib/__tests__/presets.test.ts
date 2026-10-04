import { describe, expect, it } from 'vitest'
import { BUILTIN_PRESETS, MAX_USER_PRESETS, applyPreset, savePreset } from '../presets'
import { defaultCategories } from '../state'
import { sanitize } from '../storage'

describe('preset kategori', () => {
  it('preset bawaan punya id unik dan tidak mengubah alokasi (ratio 0)', () => {
    const ids = BUILTIN_PRESETS.flatMap((preset) => preset.categories.map((category) => category.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(BUILTIN_PRESETS.every((preset) => preset.categories.every((category) => category.ratio === 0))).toBe(true)
    expect(BUILTIN_PRESETS.every((preset) => preset.categories.every((category) => category.color !== ''))).toBe(true)
  })

  it('menggabungkan preset tanpa menghapus kategori lama', () => {
    const preset = BUILTIN_PRESETS[0]
    const merged = applyPreset(defaultCategories(), preset)
    expect(merged).toHaveLength(defaultCategories().length + preset.categories.length)
    expect(merged.filter((category) => category.id === 'makan')).toHaveLength(1)
    expect(applyPreset(merged, preset)).toHaveLength(merged.length)
  })

  it('menyimpan preset baru dengan batas jumlah', () => {
    const categories = defaultCategories()
    expect(savePreset([], 'Ku', categories)).toHaveLength(1)
    expect(savePreset([], '   ', categories)).toHaveLength(0)
    const many = Array.from({ length: MAX_USER_PRESETS }, (_, index) => ({
      id: `p${index}`,
      name: `P${index}`,
      categories,
    }))
    expect(savePreset(many, 'Lebay', categories)).toHaveLength(MAX_USER_PRESETS)
  })

  it('impor data lama tanpa presets → kosong, presets rusak dibersihkan dan dibatasi', () => {
    expect(sanitize({ version: 1 }).presets).toEqual([])

    const raw = {
      version: 1,
      presets: [
        { id: 'x', name: '  X  ', categories: [{ name: 'A' }] },
        { name: '   ' },
        'junk',
        ...Array.from({ length: 30 }, () => ({ id: 'y', name: 'Y', categories: [{ name: 'B' }] })),
      ],
    }
    const clean = sanitize(raw).presets
    expect(clean).toHaveLength(MAX_USER_PRESETS)
    expect(clean[0].name).toBe('X')
    expect(clean[0].categories[0]).toMatchObject({ name: 'A', ratio: 0, builtin: false })
  })
})
