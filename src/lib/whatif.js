// simulasi saja: tidak menyentuh state, dipakai kartu "Bagaimana kalau"
export function whatIf(state, derived, input) {
    const period = derived.period;
    if (!period || state.allowance <= 0)
        return null;
    const allowance = Math.max(0, state.allowance * (1 + input.allowancePct / 100));
    const basePace = derived.elapsedDays >= 1 && derived.spentInPeriod > 0
        ? derived.spentInPeriod / derived.elapsedDays
        : state.allowance / period.totalDays;
    const pace = Math.max(0, basePace * (1 + input.pacePct / 100));
    return {
        allowance,
        pace,
        projectedExpense: pace * period.totalDays,
        projectedEnd: allowance - pace * period.totalDays,
        perDay: allowance / period.totalDays,
        currentEnd: state.allowance - basePace * period.totalDays,
    };
}
