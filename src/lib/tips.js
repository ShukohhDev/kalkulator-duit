import { formatIDR } from './money';
import { categoryKind } from './state';
const MAX_TIPS = 3;
function isWeekend(dateISO) {
    const day = new Date(`${dateISO}T00:00:00`).getDay();
    return day === 0 || day === 6;
}
export function buildTips(state, derived, lang = 'id') {
    const isEn = lang === 'en';
    const period = derived.period;
    if (!period || state.allowance <= 0 || derived.spentInPeriod <= 0)
        return [];
    const expenses = state.expenses.filter((expense) => expense.date >= period.startISO && expense.date <= period.endISO);
    if (expenses.length === 0)
        return [];
    const byCategory = new Map();
    for (const expense of expenses) {
        byCategory.set(expense.categoryId, (byCategory.get(expense.categoryId) ?? 0) + expense.amount);
    }
    const out = [];
    const topKeinginan = state.categories
        .filter((category) => categoryKind(category) === 'keinginan')
        .map((category) => ({ category, spent: byCategory.get(category.id) ?? 0 }))
        .sort((a, b) => b.spent - a.spent)[0];
    if (topKeinginan && topKeinginan.spent >= derived.spentInPeriod * 0.15) {
        const cut = Math.round(topKeinginan.spent * 0.2);
        out.push({
            id: 'keinginan',
            text: isEn
                ? `${topKeinginan.category.name} recorded ${formatIDR(topKeinginan.spent)} this period, trim 20% (±${formatIDR(cut)}) to redirect into savings.`
                : `${topKeinginan.category.name} tercatat ${formatIDR(topKeinginan.spent)} periode ini, pangkas 20% (±${formatIDR(cut)}) untuk dialihkan ke tabungan.`,
        });
    }
    const savedInPeriod = state.categories
        .filter((category) => categoryKind(category) === 'tabungan')
        .reduce((sum, category) => sum + (byCategory.get(category.id) ?? 0), 0);
    if (savedInPeriod === 0 && derived.elapsedDays >= Math.ceil(period.totalDays / 2)) {
        const aside = Math.max(10_000, Math.round(derived.remainingInPeriod * 0.2));
        out.push({
            id: 'belum-nabung',
            text: isEn
                ? `No savings deposit recorded this period yet: start with ${formatIDR(aside)} from your remaining balance.`
                : `Belum ada setoran Ditabung periode ini: mulai dari ${formatIDR(aside)} dari sisa kamu.`,
        });
    }
    const weekendTotal = expenses
        .filter((expense) => isWeekend(expense.date))
        .reduce((sum, expense) => sum + expense.amount, 0);
    if (weekendTotal >= derived.spentInPeriod * 0.5) {
        const pct = Math.round((weekendTotal / derived.spentInPeriod) * 100);
        out.push({
            id: 'akhir-pekan',
            text: isEn
                ? `${pct}% of your expenses fall on the weekend (${formatIDR(weekendTotal)}). Consolidate into one day for better control.`
                : `${pct}% pengeluaranmu jatuh di akhir pekan (${formatIDR(weekendTotal)}). Satukan jadi satu hari supaya lebih terkendali.`,
        });
    }
    const micro = expenses.filter((expense) => expense.amount <= state.allowance * 0.02);
    if (micro.length >= 8) {
        const total = micro.reduce((sum, expense) => sum + expense.amount, 0);
        out.push({
            id: 'mikro',
            text: isEn
                ? `${micro.length} small transactions totaling ${formatIDR(total)}. Consolidate into a single daily spend for easier tracking.`
                : `${micro.length} transaksi kecil total ${formatIDR(total)}. Gabungkan jadi belanja per hari biar mudah dilacak.`,
        });
    }
    return out.slice(0, MAX_TIPS);
}
