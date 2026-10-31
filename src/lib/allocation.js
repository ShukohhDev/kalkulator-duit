import { addDays, roundTo500, toISO } from './money';
export { roundTo500 };
export function roundAllocationCategories(categories, allowance) {
    if (allowance <= 0 || categories.length === 0)
        return categories;
    const activeIndices = [];
    let totalActiveRatio = 0;
    categories.forEach((cat, idx) => {
        if (cat.ratio > 0 && !cat.off) {
            activeIndices.push(idx);
            totalActiveRatio += cat.ratio;
        }
    });
    if (activeIndices.length === 0 || totalActiveRatio <= 0)
        return categories;
    const allocs = activeIndices.map((idx) => {
        const cat = categories[idx];
        const normalizedRatio = cat.ratio / totalActiveRatio;
        const raw = allowance * normalizedRatio;
        let rounded = roundTo500(raw);
        if (raw > 0 && rounded === 0)
            rounded = 500;
        return {
            index: idx,
            raw,
            rounded,
            diff: raw - rounded,
        };
    });
    let currentSum = allocs.reduce((sum, item) => sum + item.rounded, 0);
    let remainder = allowance - currentSum;
    let guard = 0;
    while (Math.abs(remainder) >= 250 && guard < 100) {
        guard++;
        if (remainder > 0) {
            allocs.sort((a, b) => b.diff - a.diff);
            const target = allocs[0];
            if (!target)
                break;
            target.rounded += 500;
            target.diff -= 500;
            remainder -= 500;
        }
        else {
            allocs.sort((a, b) => a.diff - b.diff);
            const target = allocs.find((item) => item.rounded > 500) ?? allocs[0];
            if (!target || target.rounded <= 500)
                break;
            target.rounded -= 500;
            target.diff += 500;
            remainder += 500;
        }
    }
    const allocMap = new Map();
    for (const item of allocs) {
        allocMap.set(item.index, item.rounded);
    }
    return categories.map((cat, idx) => {
        const allocated = allocMap.get(idx);
        if (allocated === undefined)
            return cat;
        return {
            ...cat,
            ratio: allocated / allowance,
        };
    });
}
export function allocationFor(allowance, categoryId, categories) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category)
        return 0;
    const raw = allowance * category.ratio;
    return allowance > 0 ? roundTo500(raw) : raw;
}
function startOfWeek(date) {
    const day = date.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    return addDays(date, offset);
}
export function periodRange(mode, ref = new Date()) {
    let start;
    let end;
    if (mode === 'week') {
        start = startOfWeek(ref);
        end = addDays(start, 6);
    }
    else {
        start = new Date(ref.getFullYear(), ref.getMonth(), 1);
        end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    }
    return {
        start,
        end,
        startISO: toISO(start),
        endISO: toISO(end),
        totalDays: Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    };
}
export function dailyAllowanceEntries(allowance, mode, fromISO, toISODate) {
    const entries = [];
    if (allowance <= 0 || fromISO > toISODate)
        return entries;
    let cursor = new Date(fromISO + 'T00:00:00');
    const to = new Date(toISODate + 'T00:00:00');
    let guard = 0;
    while (cursor <= to && guard < 800) {
        const amount = mode === 'week' ? allowance / 7 : allowance / daysInMonth(cursor);
        entries.push({ iso: toISO(cursor), amount });
        cursor = addDays(cursor, 1);
        guard++;
    }
    return entries;
}
function daysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
