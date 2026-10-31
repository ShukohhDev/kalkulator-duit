import { formatIDR } from './money';
import { uid } from './id';
export const MAX_ACTIVITY = 200;
export function activityEntry(kind, text) {
    return { id: uid('act'), ts: Date.now(), kind, text };
}
// tambahkan entri di depan (terbaru dulu), simpan maksimal MAX_ACTIVITY
export function appendActivity(state, kind, text) {
    return { ...state, activity: [activityEntry(kind, text), ...state.activity].slice(0, MAX_ACTIVITY) };
}
// catat penambahan pemasukan/pengeluaran dari update resep (edit/hapus tidak dicatat)
export function diffActivity(prev, next) {
    const before = new Set([
        ...prev.expenses.map((item) => item.id),
        ...prev.incomes.map((item) => item.id),
    ]);
    const names = new Map(next.categories.map((category) => [category.id, category.name]));
    const added = [];
    for (const expense of next.expenses) {
        if (before.has(expense.id))
            continue;
        const category = names.get(expense.categoryId) ?? 'Tanpa kategori';
        const note = expense.note !== '' ? ` · ${expense.note}` : '';
        added.push(activityEntry('pengeluaran', `−${formatIDR(expense.amount)} · ${category}${note}`));
    }
    for (const income of next.incomes) {
        if (before.has(income.id))
            continue;
        added.push(activityEntry('pemasukan', `+${formatIDR(income.amount)} · ${income.source}`));
    }
    // urut waktu catatan, terbaru dulu
    return added.reverse();
}
