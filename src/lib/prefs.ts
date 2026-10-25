import type { CashflowChartType, CashflowView, ColorTheme, Theme } from '../types'
import type { Language } from './i18n'
import { currentUser } from './auth'

export { getDeviceLanguage, setDeviceLanguage, type Language } from './i18n'

export type WalletCurrency = 'idr' | 'usd'

export interface Prefs {
  view: CashflowView
  chartType: CashflowChartType
  trendView: CashflowView
  walletCurrency: WalletCurrency
  usdRate: number
  usdRateAt: string
  asetVisible: boolean
  profilePicked: boolean
  colorTheme?: ColorTheme
  theme?: Theme
  language?: Language
}

const KEY_BASE = 'kalkulator-duitmu:prefs'
export const DEVICE_COLOR_THEME_KEY = 'kalkulator-duitmu:device-color-theme'
export const DEVICE_THEME_KEY = 'kalkulator-duitmu:device-theme'

const VIEWS: CashflowView[] = ['day', 'week', 'month', 'year']
const CHART_TYPES: CashflowChartType[] = ['bar', 'line', 'donut', 'category']
const CURRENCIES: WalletCurrency[] = ['idr', 'usd']
const COLOR_THEMES: ColorTheme[] = ['emerald', 'sage', 'nordic']
const THEMES: Theme[] = ['light', 'dark']

export function getDeviceColorTheme(): ColorTheme {
  try {
    const saved = localStorage.getItem(DEVICE_COLOR_THEME_KEY)
    if (saved && COLOR_THEMES.includes(saved as ColorTheme)) {
      return saved as ColorTheme
    }
  } catch {
    // abaikan kesalahan storage
  }
  return 'emerald'
}

export function setDeviceColorTheme(colorTheme: ColorTheme): void {
  try {
    localStorage.setItem(DEVICE_COLOR_THEME_KEY, colorTheme)
  } catch {
    // abaikan kesalahan storage
  }
}

export function getDeviceTheme(): Theme {
  try {
    const saved = localStorage.getItem(DEVICE_THEME_KEY)
    if (saved && THEMES.includes(saved as Theme)) {
      return saved as Theme
    }
  } catch {
    // abaikan kesalahan storage
  }
  return 'light'
}

export function setDeviceTheme(theme: Theme): void {
  try {
    localStorage.setItem(DEVICE_THEME_KEY, theme)
  } catch {
    // abaikan kesalahan storage
  }
}

// tanpa sesi pakai key lama (jalur sebelum akun terdaftar)
function prefsKey(): string {
  const user = currentUser()
  return user ? `${KEY_BASE}:${user}` : KEY_BASE
}

export function loadPrefs(): Prefs {
  const fallback: Prefs = {
    view: 'day',
    chartType: 'bar',
    trendView: 'day',
    walletCurrency: 'idr',
    usdRate: 16_000,
    usdRateAt: '',
    asetVisible: true,
    profilePicked: false,
  }
  try {
    const raw = localStorage.getItem(prefsKey())
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
      usdRateAt: typeof data.usdRateAt === 'string' ? data.usdRateAt : fallback.usdRateAt,
      asetVisible: typeof data.asetVisible === 'boolean' ? data.asetVisible : fallback.asetVisible,
      profilePicked: typeof data.profilePicked === 'boolean' ? data.profilePicked : fallback.profilePicked,
      colorTheme: COLOR_THEMES.includes(data.colorTheme as ColorTheme) ? (data.colorTheme as ColorTheme) : undefined,
      theme: THEMES.includes(data.theme as Theme) ? (data.theme as Theme) : undefined,
      language: data.language === 'id' || data.language === 'en' ? data.language : undefined,
    }
  } catch {
    return fallback
  }
}

export function savePrefs(patch: Partial<Prefs>): void {
  try {
    const current = loadPrefs()
    localStorage.setItem(prefsKey(), JSON.stringify({ ...current, ...patch }))
  } catch {
    // penyimpanan penuh/di-block: preferensi hanya hilang untuk sesi ini
  }
}
