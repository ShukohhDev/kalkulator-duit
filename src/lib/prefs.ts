import type { CashflowChartType, CashflowView } from '../types'

export type WalletCurrency = 'idr' | 'usd'

export interface Prefs {
  view: CashflowView
  chartType: CashflowChartType
  trendView: CashflowView
  walletCurrency: WalletCurrency
  usdRate: number
  asetVisible: boolean
  profilePicked: boolean
}

const KEY = 'kalkulator-duitmu:prefs'
const VIEWS: CashflowView[] = ['day', 'week', 'month', 'year']
const CHART_TYPES: CashflowChartType[] = ['bar', 'line', 'donut', 'category']
const CURRENCIES: WalletCurrency[] = ['idr', 'usd']

export function loadPrefs(): Prefs {
  const fallback: Prefs = {
    view: 'day',
    chartType: 'bar',
    trendView: 'day',
    walletCurrency: 'idr',
    usdRate: 16_000,
    asetVisible: true,
    profilePicked: false,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const data = JSON.parse(raw) as Partial<Prefs>
    const rate = Number(data.usdRate)
    return {
      view: VIEWS.includes(data.view as CashflowView) ? (data.view as CashflowView) : fallback.view,
      chartType: CHART_TYPES.includes(data.chartType as CashflowChartType)
        ? (data.chartType as CashflowChartType)
        : fallback.chartType,
      trendView: VIEWS.includes(data.trendView as CashflowView) ? (data.trendView as CashflowView) : fallback.trendView,
      walletCurrency: CURRENCIES.includes(data.walletCurrency as WalletCurrency)
        ? (data.walletCurrency as WalletCurrency)
        : fallback.walletCurrency,
      usdRate: Number.isFinite(rate) && rate > 0 ? rate : fallback.usdRate,
      asetVisible: typeof data.asetVisible === 'boolean' ? data.asetVisible : fallback.asetVisible,
      profilePicked: typeof data.profilePicked === 'boolean' ? data.profilePicked : fallback.profilePicked,
    }
  } catch {
    return fallback
  }
}

export function savePrefs(patch: Partial<Prefs>): void {
  try {
    const current = loadPrefs()
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // penyimpanan penuh/di-block: preferensi hanya hilang untuk sesi ini
  }
}
