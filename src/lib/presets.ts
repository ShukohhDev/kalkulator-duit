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
    id: 'preset-rumah',
    name: 'Tinggal di Rumah',
    categories: [
      extra('rmh-belanja', 'Belanja Bulanan', 0),
      extra('rmh-listrik', 'Listrik / Air', 5),
      extra('rmh-perawatan', 'Perawatan Rumah', 2),
      extra('rmh-keluarga', 'Jajan Keluarga', 4),
    ],
  },
  {
    id: 'preset-kos',
    name: 'Tinggal di Kos',
    categories: [
      extra('kos-laundry', 'Laundry & Setrika', 1),
      extra('kos-air', 'Air Galón', 5),
      extra('kos-jajan', 'Jajan Malam', 4),
      extra('kos-kebersihan', 'Kebersihan Kamar', 3),
    ],
  },
]

export function applyPreset(current: Category[], preset: CategoryPreset): Category[] {
  const existingIds = new Set(current.map((category) => category.id))
  const existingNames = new Set(current.map((category) => category.name.trim().toLowerCase()))
  return [
    ...current,
    ...preset.categories.filter(
      (category) => !existingIds.has(category.id) && !existingNames.has(category.name.trim().toLowerCase()),
    ),
  ]
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
