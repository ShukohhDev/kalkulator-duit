export const DAYS_PER_YEAR = 365;
export const WEEKS_PER_YEAR = DAYS_PER_YEAR / 7;
export const MONTHS_PER_YEAR = 12;
const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});
export function formatIDR(value) {
    if (!Number.isFinite(value))
        return 'Rp 0';
    return rupiah.format(Math.round(value));
}
export function roundTo500(value) {
    if (!Number.isFinite(value) || value <= 0)
        return 0;
    return Math.round(value / 500) * 500;
}
export function parseAmount(raw) {
    const digits = raw.replace(/[^\d-]/g, '');
    if (!digits)
        return 0;
    const n = Number(digits);
    return Number.isFinite(n) ? n : 0;
}
export function toYearly(amount, mode) {
    return mode === 'week' ? (amount * DAYS_PER_YEAR) / 7 : amount * MONTHS_PER_YEAR;
}
export function fromYearly(yearly, mode) {
    return mode === 'week' ? (yearly * 7) / DAYS_PER_YEAR : yearly / MONTHS_PER_YEAR;
}
export const perDay = (yearly) => yearly / DAYS_PER_YEAR;
export const perWeek = (yearly) => (yearly * 7) / DAYS_PER_YEAR;
export const perMonth = (yearly) => yearly / MONTHS_PER_YEAR;
export function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
export function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}
export function todayISO() {
    return toISO(new Date());
}
export function addDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
}
export function daysBetween(from, to) {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / 86400000);
}
export function monthKey(iso) {
    return iso.slice(0, 7);
}
export function monthLabel(key, lang = 'id') {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
        month: 'long',
        year: 'numeric',
    });
}
export function formatShortDate(iso, lang = 'id') {
    return parseISO(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
    });
}
