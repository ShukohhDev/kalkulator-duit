import type { AppState, IncomeDestination } from '../types'

const clamp = (value: number) => Math.max(0, value)

// amount positif = setor masuk, negatif = dibalik (hapus/urungkan/edit delta)
export function applyDestination(state: AppState, dest: IncomeDestination | undefined, amount: number): AppState {
  if (!dest || amount === 0) return state
  if (dest.kind === 'jajan') {
    const allowance = clamp(state.allowance + amount)
    return {
      ...state,
      allowance,
      allowanceMax: state.allowanceMax > 0 ? Math.max(state.allowanceMax, allowance) : state.allowanceMax,
    }
  }
  if (dest.kind === 'pot') return { ...state, endSavings: clamp(state.endSavings + amount) }
  const exists = state.wallets.some((wallet) => wallet.id === dest.walletId)
  if (!exists) return state
  return {
    ...state,
    wallets: state.wallets.map((wallet) =>
      wallet.id === dest.walletId ? { ...wallet, balance: clamp(wallet.balance + amount) } : wallet,
    ),
  }
}
