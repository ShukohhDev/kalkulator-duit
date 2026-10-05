import type { Category, ProfileId } from '../types'
import { uid } from './id'
import { CATEGORY_COLORS } from './state'

export interface ProfileDef {
  id: ProfileId
  label: string
  ratios: { name: string; ratio: number }[]
}

export const PROFILES: ProfileDef[] = [
  {
    id: 'standar',
    label: 'Standar',
    ratios: [
      { name: 'Makan & Minum', ratio: 0.5 },
      { name: 'Transport / Bensin', ratio: 0.15 },
      { name: 'Pulsa & Kuota', ratio: 0.05 },
      { name: 'Nongkrong / Ngopi', ratio: 0.1 },
      { name: 'Ditabung / Investasi', ratio: 0.2 },
    ],
  },
  {
    id: 'anak-kos',
    label: 'Anak Kos',
    ratios: [
      { name: 'Makan & Minum', ratio: 0.45 },
      { name: 'Laundry & Setrika', ratio: 0.1 },
      { name: 'Transport / Bensin', ratio: 0.1 },
      { name: 'Nongkrong / Ngopi', ratio: 0.1 },
      { name: 'Pulsa & Kuota', ratio: 0.05 },
      { name: 'Internet / WiFi', ratio: 0.05 },
      { name: 'Ditabung / Investasi', ratio: 0.15 },
    ],
  },
  {
    id: 'mahasiswa',
    label: 'Mahasiswa',
    ratios: [
      { name: 'Makan & Minum', ratio: 0.45 },
      { name: 'Transport / Bensin', ratio: 0.1 },
      { name: 'Buku & ATK', ratio: 0.1 },
      { name: 'Nongkrong / Ngopi', ratio: 0.1 },
      { name: 'Pulsa & Kuota', ratio: 0.1 },
      { name: 'Ditabung / Investasi', ratio: 0.15 },
    ],
  },
  {
    id: 'karyawan',
    label: 'Karyawan',
    ratios: [
      { name: 'Makan & Minum', ratio: 0.4 },
      { name: 'Transport / Bensin', ratio: 0.15 },
      { name: 'Makan Siang', ratio: 0.15 },
      { name: 'Pulsa & Kuota', ratio: 0.05 },
      { name: 'Nongkrong / Ngopi', ratio: 0.1 },
      { name: 'Kopi Kantor', ratio: 0.05 },
      { name: 'Ditabung / Investasi', ratio: 0.1 },
    ],
  },
]

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === 'string' && PROFILES.some((profile) => profile.id === value)
}

export function findProfile(id: ProfileId): ProfileDef {
  return PROFILES.find((profile) => profile.id === id) ?? PROFILES[0]!
}

export function applyProfile(current: Category[], profile: ProfileDef): Category[] {
  const byName = new Map(current.map((category) => [category.name.trim().toLowerCase(), category]))
  const used = new Set<string>()

  const result: Category[] = profile.ratios.map((entry, index) => {
    const found = byName.get(entry.name.toLowerCase())
    if (found && !used.has(found.id)) {
      used.add(found.id)
      return { ...found, ratio: entry.ratio }
    }
    return {
      id: uid('cat'),
      name: entry.name,
      ratio: entry.ratio,
      builtin: true,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }
  })

  for (const category of current) {
    if (!used.has(category.id)) result.push({ ...category, ratio: 0 })
  }
  return result
}
