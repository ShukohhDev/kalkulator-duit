import type { Category, CategoryKind } from '../types'
import { categoryKind } from './state'

export interface LifestyleDef {
  id: string
  name: string
  blurb: string
  // faktor per jenis kategori; tanpa faktor = tidak diubah
  factors: Partial<Record<CategoryKind, number>>
}

export const LIFESTYLES: LifestyleDef[] = [
  {
    id: 'seimbang',
    name: 'Seimbang',
    blurb: 'Ikuti profil tanpa perubahan.',
    factors: {},
  },
  {
    id: 'hemat',
    name: 'Hemat',
    blurb: 'Keinginan dipangkas, tabungan & dana darurat diperkuat.',
    factors: { keinginan: 0.6, tabungan: 1.3 },
  },
  {
    id: 'santai',
    name: 'Santai',
    blurb: 'Keinginan lebih lega, tabungan tetap jalan.',
    factors: { keinginan: 1.5, tabungan: 0.75 },
  },
]

export function isLifestyleId(value: unknown): value is string {
  return typeof value === 'string' && LIFESTYLES.some((item) => item.id === value)
}

export function findLifestyle(id: string): LifestyleDef {
  return LIFESTYLES.find((item) => item.id === id) ?? LIFESTYLES[0]!
}

// diterapkan di atas rasio profil yang sedang aktif; hasil dinormalkan ke total 100%
export function applyLifestyle(categories: Category[], id: string): Category[] {
  const lifestyle = findLifestyle(id)
  if (Object.keys(lifestyle.factors).length === 0) return categories

  const scaled = categories.map((category) => {
    const factor = lifestyle.factors[categoryKind(category)] ?? 1
    return { ...category, ratio: Math.max(0, category.ratio * factor) }
  })
  const sum = scaled.reduce((total, category) => total + category.ratio, 0)
  if (sum <= 0) return categories
  return scaled.map((category) => ({ ...category, ratio: category.ratio / sum }))
}
