import type { Category, CategoryPreset } from '../types'
import { CATEGORY_COLORS } from './state'
import { uid } from './id'

export const MAX_USER_PRESETS = 20

const extra = (id: string, name: string, colorIndex: number): Category => ({
  id,
  name,
  ratio: 0,
  builtin: false,
  color: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
})

export const BUILTIN_PRESETS: CategoryPreset[] = [
  {
    id: 'preset-kos',
    name: 'Anak Kos',
    categories: [
      extra('kos-laundry', 'Laundry & Setrika', 1),
      extra('kos-air', 'Air Galón', 5),
      extra('kos-internet', 'Internet / WiFi', 3),
      extra('kos-jajan', 'Jajan Malam', 4),
    ],
  },
  {
    id: 'preset-mahasiswa',
    name: 'Mahasiswa',
    categories: [
      extra('mhs-buku', 'Buku & ATK', 2),
      extra('mhs-print', 'Print & Fotokopi', 6),
      extra('mhs-ongkos', 'Ongkos Bolak-balik', 3),
      extra('mhs-snack', 'Jajan Kampus', 4),
    ],
  },
  {
    id: 'preset-karyawan',
    name: 'Karyawan',
    categories: [
      extra('kwn-makan', 'Makan Siang', 0),
      extra('kwn-kopi', 'Kopi Kantor', 7),
      extra('kwn-bensin', 'Bensin / Tol', 5),
      extra('kwn-data', 'Paket Data', 1),
    ],
  },
]

export function applyPreset(current: Category[], preset: CategoryPreset): Category[] {
  const existing = new Set(current.map((category) => category.id))
  return [...current, ...preset.categories.filter((category) => !existing.has(category.id))]
}

export function savePreset(
  presets: CategoryPreset[],
  name: string,
  categories: Category[],
): CategoryPreset[] {
  const trimmed = name.trim()
  if (!trimmed || presets.length >= MAX_USER_PRESETS) return presets
  return [...presets, { id: uid('pre'), name: trimmed, categories }]
}
