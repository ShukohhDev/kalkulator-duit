export const EMERGENCY_MONTHS = 3;
// tagihan rutin + angsuran utang yang belum lunas = pengeluaran wajib per bulan
export function monthlyObligations(state) {
    const bills = state.bills.reduce((sum, bill) => sum + Math.max(0, bill.amount), 0);
    const debts = state.debts
        .filter((debt) => debt.paid < debt.total)
        .reduce((sum, debt) => sum + Math.min(debt.installment, Math.max(0, debt.total - debt.paid)), 0);
    return { bills, debts, total: bills + debts };
}
export function emergencyTarget(state) {
    return monthlyObligations(state).total * EMERGENCY_MONTHS;
}
