export interface ReverseInput {
  target: number
  saved: number
  months: number
}

export interface ReversePlan {
  gap: number
  perMonth: number
  perWeek: number
  perDay: number
  achieved: boolean
}

// kalkulator terbalik: dari target & tenggat → setoran per periode (bagi rata, tanpa bunga)
export function reversePlan({ target, saved, months }: ReverseInput): ReversePlan | null {
  if (!Number.isFinite(target) || !Number.isFinite(saved) || !Number.isFinite(months)) return null
  if (target <= 0 || months <= 0) return null

  const gap = Math.max(0, target - saved)
  const perMonth = gap > 0 ? gap / months : 0
  return {
    gap,
    perMonth,
    perWeek: (perMonth * 12) / 52,
    perDay: perMonth / 30,
    achieved: gap === 0,
  }
}
