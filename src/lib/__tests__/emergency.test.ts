import { describe, expect, it } from 'vitest'
import type { AppState } from '../../types'
import { EMERGENCY_MONTHS, emergencyTarget, monthlyObligations } from '../emergency'
import { initialState } from '../state'

function base(): AppState {
  return initialState()
}

describe('dana darurat 3× pengeluaran wajib', () => {
  it('menjumlahkan tagihan + angsuran utang yang belum lunas', () => {
    const state = base()
    state.bills = [
      { id: 'b1', name: 'Listrik', amount: 100_000, dueDay: 10 },
      { id: 'b2', name: 'Internet', amount: 50_000, dueDay: 5 },
    ]
    state.debts = [
      // sisa 50.000 < angsuran → yang dihitung sisa yang belum dibayar
      { id: 'd1', name: 'Pinjaman', total: 1_000_000, paid: 950_000, installment: 100_000, dueDay: 5 },
      { id: 'd2', name: 'Lunas', total: 500_000, paid: 500_000, installment: 100_000, dueDay: 5 },
    ]

    const result = monthlyObligations(state)
    expect(result.bills).toBe(150_000)
    expect(result.debts).toBe(50_000)
    expect(result.total).toBe(200_000)
    expect(EMERGENCY_MONTHS).toBe(3)
    expect(emergencyTarget(state)).toBe(600_000)
  })

  it('tanpa kewajiban → target 0', () => {
    expect(emergencyTarget(base())).toBe(0)
    expect(monthlyObligations(base())).toEqual({ bills: 0, debts: 0, total: 0 })
  })

})
