import type { Category, ProfileId } from '../types'
import { CATEGORY_COLORS, PULSA_CATEGORY } from './state'

export interface ProfileDef {
  id: ProfileId
  label: string
  ratios: { id: string; name: string; ratio: number; optional?: boolean }[]
}

export const PROFILES: ProfileDef[] = [
  {
    id: 'tinggal-rumah',
    label: 'Tinggal di Rumah',
    ratios: [
      { id: 'makan', name: 'Makan & minum', ratio: 0.3 },
      { id: 'transport', name: 'Transportasi/bensin', ratio: 0.2 },
      { id: PULSA_CATEGORY, name: 'Pulsa/kuota', ratio: 0.05, optional: true },
      { id: 'nongkrong', name: 'Nongkrong & ngopi', ratio: 0.15 },
      { id: 'dana-darurat', name: 'Dana darurat', ratio: 0.07 },
      { id: 'tabungan', name: 'Ditabung', ratio: 0.2 },
      { id: 'langganan', name: 'Langganan', ratio: 0.03, optional: true },
    ],
  },
  {
    id: 'tinggal-kos',
    label: 'Tinggal di Kos',
    ratios: [
      { id: 'sewa-kos', name: 'Sewa kos + listrik + keamanan', ratio: 0.3 },
      { id: 'makan', name: 'Makan & minum', ratio: 0.24 },
      { id: 'belanja-bulanan', name: 'Belanja bulanan', ratio: 0.06 },
      { id: 'transport', name: 'Transportasi/bensin', ratio: 0.08 },
      { id: PULSA_CATEGORY, name: 'Pulsa/kuota', ratio: 0.04 },
      { id: 'nongkrong', name: 'Nongkrong & ngopi', ratio: 0.07 },
      { id: 'dana-darurat', name: 'Dana darurat', ratio: 0.05 },
      { id: 'tabungan', name: 'Ditabung', ratio: 0.1 },
      { id: 'laundry', name: 'Laundry', ratio: 0.03, optional: true },
      { id: 'langganan', name: 'Langganan', ratio: 0.03, optional: true },
    ],
  },
]

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === 'string' && PROFILES.some((profile) => profile.id === value)
}

export function findProfile(id: ProfileId): ProfileDef {
  return PROFILES.find((profile) => profile.id === id) ?? PROFILES[0]!
}

const LEGACY_PROFILE_IDS: Record<string, ProfileId> = {
  'anak-kos': 'tinggal-kos',
  standar: 'tinggal-rumah',
  mahasiswa: 'tinggal-rumah',
  karyawan: 'tinggal-rumah',
}

export function migrateProfileId(value: unknown): ProfileId {
  if (isProfileId(value)) return value
  if (typeof value === 'string' && value in LEGACY_PROFILE_IDS) return LEGACY_PROFILE_IDS[value]!
  return 'tinggal-rumah'
}

export function applyProfile(current: Category[], profile: ProfileDef): Category[] {
  const byId = new Map(current.map((category) => [category.id, category]))
  const byName = new Map(current.map((category) => [category.name.trim().toLowerCase(), category]))
  const used = new Set<string>()

  const result: Category[] = profile.ratios.map((entry, index) => {
    const found = byId.get(entry.id) ?? byName.get(entry.name.toLowerCase())
    if (found && !used.has(found.id)) {
      used.add(found.id)
      return { ...found, name: entry.name, ratio: entry.ratio, optional: entry.optional, off: false, baseRatio: undefined }
    }
    return {
      id: entry.id,
      name: entry.name,
      ratio: entry.ratio,
      builtin: true,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      optional: entry.optional,
    }
  })

  for (const category of current) {
    if (!used.has(category.id)) result.push({ ...category, ratio: 0, off: false, baseRatio: undefined })
  }
  return result
}
