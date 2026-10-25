import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import type { AppState, Bill, Debt } from '../types'
import type { Updater } from '../hooks/useAppState'
import { expenseTotalsByDay, intensity, monthGrid } from '../lib/calendar'
import { formatIDR, formatShortDate, monthLabel, toISO } from '../lib/money'
import { daysUntilDue, dueLabel, isBillFullyPaidThisMonth, markBillPaid, markDebtPaid } from '../lib/obligations'
import { useI18n } from '../lib/i18n'

interface Props {
  state: AppState
  update: Updater
}

const DAYS_ID = ['Sn', 'Sl', 'Sr', 'Km', 'Jm', 'Sb', 'Mg']
const DAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

type DueMark =
  | { kind: 'bill'; name: string; paid: boolean; item: Bill }
  | { kind: 'debt'; name: string; paid: boolean; item: Debt }

export function CalendarHeatmap({ state, update }: Props) {
  const { language } = useI18n()
  const isEn = language === 'en'
  const daysHeader = isEn ? DAYS_EN : DAYS_ID

  const [today] = useState(() => new Date())
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const totals = useMemo(() => expenseTotalsByDay(state.expenses, year, month), [state.expenses, year, month])
  const rows = useMemo(() => monthGrid(year, month, totals), [year, month, totals])
  const max = useMemo(() => Math.max(0, ...totals.values()), [totals])

  const dueMarks = useMemo(() => {
    const map = new Map<number, DueMark[]>()
    const push = (day: number, mark: DueMark) => {
      const clamped = Math.min(31, Math.max(1, day))
      map.set(clamped, [...(map.get(clamped) ?? []), mark])
    }
    for (const bill of state.bills) {
      push(bill.dueDay, { kind: 'bill', name: bill.name, paid: isBillFullyPaidThisMonth(bill, today), item: bill })
    }
    for (const debt of state.debts) {
      push(debt.dueDay, { kind: 'debt', name: debt.name, paid: debt.paid >= debt.total, item: debt })
    }
    return map
  }, [state.bills, state.debts, today])

  const dayExpenses = selected ? state.expenses.filter((item) => item.date === selected) : []
  const selectedDay = selected ? Number(selected.slice(8)) : 0
  const dayMarks = selected && selectedDay <= 31 ? (dueMarks.get(selectedDay) ?? []) : []

  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setSelected(null)
  }

  const totalMonth = [...totals.values()].reduce((sum, value) => sum + value, 0)

  const markText = (mark: DueMark, day: number) =>
    `${mark.name} ${mark.paid ? (isEn ? 'paid' : 'lunas') : dueLabel(daysUntilDue(day, today), language)}`

  const payMark = (mark: DueMark) => {
    if (mark.kind === 'bill') update((s) => markBillPaid(s, mark.item))
    else update((s) => markDebtPaid(s, mark.item))
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>{isEn ? 'Expense Calendar' : 'Kalender Pengeluaran'}</h2>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => shift(-1)}
            aria-label={isEn ? 'Previous month' : 'Bulan sebelumnya'}
          >
            ←
          </button>
          <span className="cal-title">{monthLabel(`${year}-${String(month + 1).padStart(2, '0')}`, language)}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => shift(1)}
            aria-label={isEn ? 'Next month' : 'Bulan berikutnya'}
          >
            →
          </button>
        </div>
      </header>

      <p className="muted small">
        {isEn
          ? `Total this month ${formatIDR(totalMonth)} · darker means higher spending.`
          : `Total bulan ini ${formatIDR(totalMonth)} · makin gelap makin boros.`}
      </p>

      <div className="cal">
        <div className="cal-head">
          {daysHeader.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        {rows.map((row, index) => (
          <div className="cal-row" key={index}>
            {row.map((cell, cellIndex) => {
              if (!cell.iso) return <span key={cellIndex} className="cal-cell cal-empty" />
              const ratio = intensity(cell.total, max)
              const isToday = cell.iso === toISO(today)
              const day = Number(cell.iso.slice(8))
              const marks = day <= 31 ? (dueMarks.get(day) ?? []) : undefined
              const markNote = marks?.map((mark) => markText(mark, day)).join(' · ')
              return (
                <button
                  key={cellIndex}
                  type="button"
                  className={`cal-cell${isToday ? ' cal-today' : ''}${selected === cell.iso ? ' cal-selected' : ''}`}
                  style={{ '--heat': String(ratio) } as CSSProperties}
                  onClick={() => setSelected((prev) => (prev === cell.iso ? null : cell.iso))}
                  title={[
                    cell.total > 0
                      ? `${formatShortDate(cell.iso, language)} · ${formatIDR(cell.total)}`
                      : formatShortDate(cell.iso, language),
                    markNote,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                >
                  <span className="cal-day">{day}</span>
                  {cell.total > 0 && <span className="cal-total">{formatIDR(cell.total)}</span>}
                  {marks && marks.length > 0 && (
                    <span className="cal-dots">
                      {marks.map((mark, markIndex) => (
                        <span key={markIndex} className={`cal-dot cal-dot-${mark.kind}${mark.paid ? ' cal-dot-paid' : ''}`} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <p className="cal-legend muted small">
        <span className="legend-item">
          <span className="cal-dot cal-dot-bill" /> {isEn ? 'Bill' : 'Tagihan'}
        </span>
        <span className="legend-item">
          <span className="cal-dot cal-dot-debt" /> {isEn ? 'Debt' : 'Utang'}
        </span>
        <span className="legend-item">
          <span className="cal-dot cal-dot-bill cal-dot-paid" /> {isEn ? 'Paid this month' : 'Lunas bulan ini'}
        </span>
      </p>

      {selected && (
        <div className="cal-detail">
          <h3 className="section-title">{formatShortDate(selected, language)}</h3>
          {dayMarks.length > 0 && (
            <ul className="tx-list">
              {dayMarks.map((mark, markIndex) => (
                <li key={markIndex} className="tx">
                  <span className={`cal-dot cal-dot-${mark.kind}${mark.paid ? ' cal-dot-paid' : ''}`} />
                  <span className="tx-main">
                    <strong>{mark.name}</strong>
                    <span className="muted small">
                      {mark.kind === 'bill' ? (isEn ? 'Bill' : 'Tagihan') : (isEn ? 'Debt' : 'Utang')} ·{' '}
                      {mark.paid ? (isEn ? 'paid' : 'lunas') : dueLabel(daysUntilDue(selectedDay, today), language)}
                    </span>
                  </span>
                  {!mark.paid && (
                    <span className="tx-actions">
                      <button type="button" className="btn btn-sm" onClick={() => payMark(mark)}>
                        {mark.kind === 'bill'
                          ? isEn
                            ? 'Mark as paid'
                            : 'Tandai lunas'
                          : isEn
                            ? 'Pay installment'
                            : 'Bayar angsuran'}
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {dayExpenses.length === 0 ? (
            <p className="muted small">
              {isEn ? 'No expenses recorded on this date.' : 'Tidak ada pengeluaran di tanggal ini.'}
            </p>
          ) : (
            <ul className="tx-list">
              {dayExpenses.map((item) => (
                <li key={item.id} className="tx">
                  <span className="tx-dot" style={{ background: state.categories.find((c) => c.id === item.categoryId)?.color }} />
                  <span className="tx-main">
                    <strong>{item.note || (isEn ? 'Expense' : 'Pengeluaran')}</strong>
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
