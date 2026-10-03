import { useMemo, useState } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { categoryDeltas, shiftMonthKey, summarizeMonth } from '../lib/compare'
import { formatIDR, monthKey, monthLabel, toISO } from '../lib/money'

interface Props {
  state: AppState
  derived: Derived
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="delta">baru</span>
  if (value === 0) return <span className="delta delta-flat">0%</span>
  return <span className={`delta ${value > 0 ? 'delta-up' : 'delta-down'}`}>{value > 0 ? `▲ ${value}%` : `▼ ${Math.abs(value)}%`}</span>
}

export function MonthCompare({ state, derived }: Props) {
  const [currentKey] = useState(() => monthKey(toISO(new Date())))
  const previousKey = useMemo(() => shiftMonthKey(currentKey, -1), [currentKey])

  const current = useMemo(() => summarizeMonth(derived.allIncomes, state.expenses, currentKey), [derived.allIncomes, state.expenses, currentKey])
  const previous = useMemo(() => summarizeMonth(derived.allIncomes, state.expenses, previousKey), [derived.allIncomes, state.expenses, previousKey])
  const deltas = useMemo(
    () => categoryDeltas(state.expenses, state.categories, currentKey, previousKey),
    [state.expenses, state.categories, currentKey, previousKey],
  )

  const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? null : 0)

  return (
    <section className="card">
      <header className="card-head">
        <h2>Bulan Ini vs Bulan Lalu</h2>
        <span className="muted small">{monthLabel(currentKey)}</span>
      </header>

      <div className="compare-grid">
        <div className="compare">
          <span className="muted small">Pemasukan</span>
          <strong>{formatIDR(current.income)}</strong>
          <Delta value={pct(current.income, previous.income)} />
        </div>
        <div className="compare">
          <span className="muted small">Pengeluaran</span>
          <strong>{formatIDR(current.expense)}</strong>
          <Delta value={pct(current.expense, previous.expense)} />
        </div>
        <div className="compare">
          <span className="muted small">Sisa (pemasukan − pengeluaran)</span>
          <strong className={current.net < 0 ? 'text-danger' : ''}>{formatIDR(current.net)}</strong>
          <Delta value={pct(current.net, previous.net)} />
        </div>
      </div>

      <h3 className="section-title">Per kategori</h3>
      <ul className="delta-list">
        {deltas.map((item) => (
          <li key={item.category.id}>
            <span className="alloc-dot" style={{ background: item.category.color }} />
            <span className="alloc-name">{item.category.name}</span>
            <span className="muted small">{formatIDR(item.current)}</span>
            <Delta value={item.changePct} />
          </li>
        ))}
        {deltas.length === 0 && <li className="empty">Belum ada pembanding.</li>}
      </ul>
    </section>
  )
}
