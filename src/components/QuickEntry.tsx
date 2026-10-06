import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import type { AppState, Expense, Income, Notify } from '../types'
import type { Updater } from '../hooks/useAppState'
import { INCOME_SOURCES, SAVINGS_CATEGORY, primaryGoal } from '../lib/state'
import { todayISO } from '../lib/money'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'

interface Props {
  mode: 'expense' | 'income'
  state: AppState
  update: Updater
  notify: Notify
  onClose: () => void
}

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export function QuickEntry({ mode, state, update, notify, onClose }: Props) {
  const [date, setDate] = useState(todayISO())
  const [categoryId, setCategoryId] = useState(() => state.categories[0]?.id ?? 'makan')
  const [source, setSource] = useState(INCOME_SOURCES[0])
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(0)
  const rootRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const section = rootRef.current
    const anchor = section?.parentElement
    const button = anchor?.querySelector('button')
    if (!section || !anchor || !button) return
    const place = () => {
      const rect = button.getBoundingClientRect()
      const box = anchor.getBoundingClientRect()
      const width = Math.min(380, window.innerWidth - 24)
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12)
      section.style.left = `${left - box.left}px`
      section.style.right = 'auto'
      section.style.width = `${width}px`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (amount <= 0) return
    if (mode === 'expense') {
      const expense: Expense = {
        id: uid('exp'),
        date,
        categoryId,
        note: note.trim(),
        amount,
        goalId: categoryId === SAVINGS_CATEGORY ? primaryGoal(state.goals)?.id : undefined,
      }
      update((s) => ({ ...s, expenses: [expense, ...s.expenses] }))
      notify('Pengeluaran dicatat')
    } else {
      const income: Income = { id: uid('inc'), date, source, amount }
      update((s) => ({ ...s, incomes: [income, ...s.incomes] }))
      notify('Pemasukan dicatat')
    }
    setAmount(0)
  }

  return (
    <section ref={rootRef} className="card quick-form quick-pop">
      <header className="card-head">
        <h2>{mode === 'expense' ? 'Catat Pengeluaran' : 'Catat Pemasukan'}</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm window-close"
          onClick={onClose}
          aria-label="Tutup form catat cepat"
          title="Tutup"
        >
          {CLOSE_ICON}
        </button>
      </header>

      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="qk-date">Tanggal</label>
          <input id="qk-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {mode === 'expense' ? (
          <div className="field">
            <label htmlFor="qk-cat">Kategori</label>
            <select id="qk-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {state.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.ratio > 0 ? ` (${Math.round(category.ratio * 100)}%)` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="qk-source">Sumber</label>
            <select id="qk-source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
              {INCOME_SOURCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'expense' && (
          <div className="field">
            <label htmlFor="qk-note">Untuk apa</label>
            <input
              id="qk-note"
              className="input"
              placeholder="mis. nasi goreng di kantin"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="qk-amount">Nominal</label>
          <MoneyInput value={amount} onValueChange={setAmount} id="qk-amount" autoFocus />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={amount <= 0}>
            {mode === 'expense' ? 'Simpan pengeluaran' : 'Simpan pemasukan'}
          </button>
        </div>
      </form>
    </section>
  )
}
