import { describe, expect, it } from 'vitest'
import type { AppState, Expense } from '../../types'
import { buildAlerts } from '../alerts'
import { derive } from '../derive'
import { initialState } from '../state'

const now = new Date(2026, 9, 10) // Jumat; periode Sen 5 - Min 11 Okt 2026

function base(): AppState {
  const state = initialState()
  state.mode = 'week'
  state.allowance = 700_000
  return state
}

function expense(date: string, categoryId: string, amount: number): Expense {
  return { id: `e-${date}-${categoryId}`, date, categoryId, note: '', amount }
}

describe('buildAlerts', () => {
  it('tanpa pelanggaran → tanpa peringatan', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'makan', 50_000)]
    expect(buildAlerts(state, derive(state, now))).toEqual([])
  })

  it('lewat alokasi periode ini → danger', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'nongkrong', 120_000)]
    const result = buildAlerts(state, derive(state, now))
    const alert = result.find((item) => item.id === 'over-nongkrong')
    expect(alert?.tone).toBe('danger')
    expect(alert?.text).toContain('kelebihan')
  })

  it('mendekati 80% alokasi → warn hampir batas', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'makan', 180_000)]
    const result = buildAlerts(state, derive(state, now))
    const alert = result.find((item) => item.id === 'near-makan')
    expect(alert?.tone).toBe('warn')
    expect(alert?.text).toContain('hampir mencapai batas')
  })

  it('pengeluaran periode lalu tidak dihitung', () => {
    const state = base()
    state.expenses = [expense('2026-09-20', 'nongkrong', 500_000)]
    expect(buildAlerts(state, derive(state, now))).toEqual([])
  })

  it('sisa tidak cukup tutup kebutuhan sisa hari → low-remaining', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'makan', 650_000)]
    const result = buildAlerts(state, derive(state, now))
    const alert = result.find((item) => item.id === 'low-remaining')
    expect(alert?.tone).toBe('danger')
    expect(alert?.text).toContain('Sisa')
    // + peringatan kategori ikut muncul, tetap dibatasi MAX_ALERTS
    expect(result.length).toBeLessThanOrEqual(4)
  })

  it('sisa masih cukup → tanpa low-remaining', () => {
    const state = base()
    state.expenses = [expense('2026-10-06', 'makan', 100_000)]
    const ids = buildAlerts(state, derive(state, now)).map((item) => item.id)
    expect(ids).not.toContain('low-remaining')
  })
})
