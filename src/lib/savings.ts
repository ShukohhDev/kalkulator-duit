export const ANNUAL_RATE = 0.08
export const MONTHLY_RATE = ANNUAL_RATE / 12

export interface SavingsInput {
  target: number
  saved: number
  deposit: number
  months: number
  rate?: number
}

export function futureValue({ target: _target, saved, deposit, months, rate = MONTHLY_RATE }: SavingsInput): number {
  if (months <= 0) return saved
  const growth = (1 + rate) ** months
  return saved * growth + (deposit * (growth - 1)) / rate
}

export function requiredDeposit({ target, saved, months, rate = MONTHLY_RATE }: Omit<SavingsInput, 'deposit'>): number | null {
  if (months <= 0 || target <= 0) return null
  const growth = (1 + rate) ** months
  const remaining = target - saved * growth
  if (remaining <= 0) return 0
  return (remaining * rate) / (growth - 1)
}

function ceilTolerance(value: number): number {
  const rounded = Math.round(value)
  return Math.abs(value - rounded) < 1e-9 ? rounded : Math.ceil(value)
}

export function monthsToTarget({ target, saved, deposit, rate = MONTHLY_RATE }: Omit<SavingsInput, 'months'>): number | null {
  if (target <= 0) return null
  if (deposit > 0) {
    const base = saved + deposit / rate
    if (base <= 0) return null
    const ratio = (target + deposit / rate) / base
    if (ratio <= 1) return 0
    return ceilTolerance(Math.log(ratio) / Math.log(1 + rate))
  }
  if (saved <= 0) return null
  const ratio = target / saved
  if (ratio <= 1) return 0
  return ceilTolerance(Math.log(ratio) / Math.log(1 + rate))
}

export function formatDuration(months: number, lang: 'id' | 'en' = 'id'): string {
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yUnit = lang === 'en' ? (years === 1 ? 'year' : 'years') : 'tahun'
  const mUnit = lang === 'en' ? (rest === 1 ? 'month' : 'months') : 'bulan'
  if (years === 0) return `${rest} ${mUnit}`
  if (rest === 0) return `${years} ${yUnit}`
  return `${years} ${yUnit} ${rest} ${mUnit}`
}

export function ageAfter(currentAge: number, months: number, lang: 'id' | 'en' = 'id'): { years: number; label: string } {
  const total = currentAge * 12 + months
  const years = Math.floor(total / 12)
  const rest = total % 12
  const yUnit = lang === 'en' ? (years === 1 ? 'year' : 'years') : 'tahun'
  const mUnit = lang === 'en' ? (rest === 1 ? 'month' : 'months') : 'bulan'
  return { years, label: rest === 0 ? `${years} ${yUnit}` : `${years} ${yUnit} ${rest} ${mUnit}` }
}

