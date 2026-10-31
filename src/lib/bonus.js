export const DEFAULT_BONUS_SPLIT = { savings: 50, buffer: 30, fun: 20 };
export function splitTotal(split) {
    return split.savings + split.buffer + split.fun;
}
// bonus = pemasukan aktual − dasar; sisa pembulatan selalu ke "fun" supaya jumlahnya pas
export function bonusAmounts(bonus, split) {
    const savings = Math.round((bonus * split.savings) / 100);
    const buffer = Math.round((bonus * split.buffer) / 100);
    const fun = Math.max(0, bonus - savings - buffer);
    return { savings, buffer, fun };
}
function pct(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(100, Math.max(0, Math.round(n)));
}
export function sanitizeBonusSplit(value) {
    if (!value || typeof value !== 'object')
        return { ...DEFAULT_BONUS_SPLIT };
    const raw = value;
    return {
        savings: pct(raw.savings, DEFAULT_BONUS_SPLIT.savings),
        buffer: pct(raw.buffer, DEFAULT_BONUS_SPLIT.buffer),
        fun: pct(raw.fun, DEFAULT_BONUS_SPLIT.fun),
    };
}
