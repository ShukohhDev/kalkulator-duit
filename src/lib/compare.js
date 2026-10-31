import { monthKey } from './money';
export function summarizeMonth(incomes, expenses, key) {
    const income = incomes.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + item.amount, 0);
    const expense = expenses.filter((item) => monthKey(item.date) === key).reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, net: income - expense };
}
export function categoryDeltas(expenses, categories, currentKey, previousKey) {
    const current = new Map();
    const previous = new Map();
    for (const expense of expenses) {
        const key = monthKey(expense.date);
        const target = key === currentKey ? current : key === previousKey ? previous : null;
        if (target)
            target.set(expense.categoryId, (target.get(expense.categoryId) ?? 0) + expense.amount);
    }
    return categories
        .map((category) => {
        const cur = current.get(category.id) ?? 0;
        const prev = previous.get(category.id) ?? 0;
        return {
            category,
            current: cur,
            previous: prev,
            changePct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? null : 0,
        };
    })
        .filter((item) => item.current > 0 || item.previous > 0)
        .sort((a, b) => b.current - a.current);
}
export function shiftMonthKey(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
