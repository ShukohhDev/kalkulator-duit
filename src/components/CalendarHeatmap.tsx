import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import type { AppState } from '../types'
import { expenseTotalsByDay, intensity, monthGrid } from '../lib/calendar'
import { formatIDR, formatShortDate, monthLabel, toISO } from '../lib/money'

interface Props {
  state: AppState
}

const DAYS = ['Sn', 'Sl', 'Sr', 'Km', 'Jm', 'Sb', 'Mg']

export function CalendarHeatmap({ state }: Props) {
  const [today] = useState(() => new Date())
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const totals = useMemo(() => expenseTotalsByDay(state.expenses, year, month), [state.expenses, year, month])
  const rows = useMemo(() => monthGrid(year, month, totals), [year, month, totals])
  const max = useMemo(() => Math.max(0, ...totals.values()), [totals])

  const dayExpenses = selected ? state.expenses.filter((item) => item.date === selected) : []

  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setSelected(null)
  }

  const totalMonth = [...totals.values()].reduce((sum, value) => sum + value, 0)

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kalender Pengeluaran</h2>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => shift(-1)} aria-label="Bulan sebelumnya">
            ←
          </button>
          <span className="cal-title">{monthLabel(`${year}-${String(month + 1).padStart(2, '0')}`)}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => shift(1)} aria-label="Bulan berikutnya">
            →
          </button>
        </div>
      </header>

      <p className="muted small">Total bulan ini {formatIDR(totalMonth)} · makin gelap makin boros.</p>

      <div className="cal">
        <div className="cal-head">
          {DAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        {rows.map((row, index) => (
          <div className="cal-row" key={index}>
            {row.map((cell, cellIndex) => {
              if (!cell.iso) return <span key={cellIndex} className="cal-cell cal-empty" />
              const ratio = intensity(cell.total, max)
              const isToday = cell.iso === toISO(today)
              return (
                <button
                  key={cellIndex}
                  type="button"
                  className={`cal-cell${isToday ? ' cal-today' : ''}${selected === cell.iso ? ' cal-selected' : ''}`}
                  style={{ '--heat': String(ratio) } as CSSProperties}
                  onClick={() => setSelected((prev) => (prev === cell.iso ? null : cell.iso))}
                  title={cell.total > 0 ? `${formatShortDate(cell.iso)} · ${formatIDR(cell.total)}` : formatShortDate(cell.iso)}
                >
                  <span className="cal-day">{Number(cell.iso.slice(8))}</span>
                  {cell.total > 0 && <span className="cal-total">{formatIDR(cell.total)}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {selected && (
        <div className="cal-detail">
          <h3 className="section-title">{formatShortDate(selected)}</h3>
          {dayExpenses.length === 0 ? (
            <p className="muted small">Tidak ada pengeluaran di tanggal ini.</p>
          ) : (
            <ul className="tx-list">
              {dayExpenses.map((item) => (
                <li key={item.id} className="tx">
                  <span className="tx-dot" style={{ background: state.categories.find((c) => c.id === item.categoryId)?.color }} />
                  <span className="tx-main">
                    <strong>{item.note || 'Pengeluaran'}</strong>
                    <span className="muted small">{state.categories.find((c) => c.id === item.categoryId)?.name}</span>
                  </span>
                  <span className="tx-amount">−{formatIDR(item.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
