import { currentUser } from './auth';
export { getDeviceLanguage, setDeviceLanguage } from './i18n';
const KEY_BASE = 'kalkulator-duitmu:prefs';
export const DEVICE_COLOR_THEME_KEY = 'kalkulator-duitmu:device-color-theme';
export const DEVICE_THEME_KEY = 'kalkulator-duitmu:device-theme';
const VIEWS = ['day', 'week', 'month', 'year'];
const CHART_TYPES = ['bar', 'line', 'donut', 'category'];
const CURRENCIES = ['idr', 'usd'];
const COLOR_THEMES = ['emerald', 'sage', 'nordic'];
const THEMES = ['light', 'dark'];
export function getDeviceColorTheme() {
    try {
        const saved = localStorage.getItem(DEVICE_COLOR_THEME_KEY);
        if (saved && COLOR_THEMES.includes(saved)) {
            return saved;
        }
    }
    catch {
        // abaikan kesalahan storage
    }
    return 'emerald';
}
export function setDeviceColorTheme(colorTheme) {
    try {
        localStorage.setItem(DEVICE_COLOR_THEME_KEY, colorTheme);
    }
    catch {
        // abaikan kesalahan storage
    }
}
export function getDeviceTheme() {
    try {
        const saved = localStorage.getItem(DEVICE_THEME_KEY);
        if (saved && THEMES.includes(saved)) {
            return saved;
        }
    }
    catch {
        // abaikan kesalahan storage
    }
    return 'light';
}
export function setDeviceTheme(theme) {
    try {
        localStorage.setItem(DEVICE_THEME_KEY, theme);
    }
    catch {
        // abaikan kesalahan storage
    }
}
// tanpa sesi pakai key lama (jalur sebelum akun terdaftar)
function prefsKey() {
    const user = currentUser();
    return user ? `${KEY_BASE}:${user}` : KEY_BASE;
}
export function loadPrefs() {
    const fallback = {
        view: 'day',
        chartType: 'bar',
        trendView: 'day',
        walletCurrency: 'idr',
        usdRate: 16_000,
        usdRateAt: '',
        asetVisible: true,
        profilePicked: false,
    };
    try {
        const raw = localStorage.getItem(prefsKey());
        if (!raw)
            return fallback;
        const data = JSON.parse(raw);
        const rate = Number(data.usdRate);
        return {
            view: VIEWS.includes(data.view) ? data.view : fallback.view,
            chartType: CHART_TYPES.includes(data.chartType)
                ? data.chartType
                : fallback.chartType,
            trendView: VIEWS.includes(data.trendView) ? data.trendView : fallback.trendView,
            walletCurrency: CURRENCIES.includes(data.walletCurrency)
                ? data.walletCurrency
                : fallback.walletCurrency,
            usdRate: Number.isFinite(rate) && rate > 0 ? rate : fallback.usdRate,
            usdRateAt: typeof data.usdRateAt === 'string' ? data.usdRateAt : fallback.usdRateAt,
            asetVisible: typeof data.asetVisible === 'boolean' ? data.asetVisible : fallback.asetVisible,
            profilePicked: typeof data.profilePicked === 'boolean' ? data.profilePicked : fallback.profilePicked,
            colorTheme: COLOR_THEMES.includes(data.colorTheme) ? data.colorTheme : undefined,
            theme: THEMES.includes(data.theme) ? data.theme : undefined,
            language: data.language === 'id' || data.language === 'en' ? data.language : undefined,
        };
    }
    catch {
        return fallback;
    }
}
export function savePrefs(patch) {
    try {
        const current = loadPrefs();
        localStorage.setItem(prefsKey(), JSON.stringify({ ...current, ...patch }));
    }
    catch {
        // penyimpanan penuh/di-block: preferensi hanya hilang untuk sesi ini
    }
}
