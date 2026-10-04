import type { CashflowChartType, CashflowView } from '../types'

export interface Prefs {
  view: CashflowView
  chartType: CashflowChartType
}

const KEY = 'kalkulator-duitmu:prefs'
const VIEWS: CashflowView[] = ['day', 'week', 'month', 'year']
const CHART_TYPES: CashflowChartType[] = ['bar', 'line', 'donut', 'category']

export function loadPrefs(): Prefs {
  const fallback: Prefs = { view: 'day', chartType: 'bar' }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const data = JSON.parse(raw) as Partial<Prefs>
    return {
      view: VIEWS.includes(data.view as CashflowView) ? (data.view as CashflowView) : fallback.view,
      chartType: CHART_TYPES.includes(data.chartType as CashflowChartType)
        ? (data.chartType as CashflowChartType)
        : fallback.chartType,
    }
  } catch {
    return fallback
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // penyimpanan penuh/di-block: preferensi hanya hilang untuk sesi ini
  }
}
