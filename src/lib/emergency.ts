import type { AppState } from '../types'

export const EMERGENCY_MONTHS = 3

// tagihan rutin + angsuran utang yang belum lunas = pengeluaran wajib per bulan
export function monthlyObligations(state: AppState): { bills: number; debts: number; total: number } {
  const bills = state.bills.reduce((sum, bill) => sum + Math.max(0, bill.amount), 0)
  const debts = state.debts
    .filter((debt) => debt.paid < debt.total)
    .reduce((sum, debt) => sum + Math.min(debt.installment, Math.max(0, debt.total - debt.paid)), 0)
  return { bills, debts, total: bills + debts }
}

export function emergencyTarget(state: AppState): number {
  return monthlyObligations(state).total * EMERGENCY_MONTHS
}
