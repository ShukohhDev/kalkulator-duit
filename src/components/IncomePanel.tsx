import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AppState, Income } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'

interface Props {
  state: AppState
  update: Updater
}

export function IncomePanel({ state, update }: Props) {
  const [date, setDate] = useState(todayISO())
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)

  const manualTotal = state.incomes.reduce((sum, item) => sum + item.amount, 0)

  const months = useMemo(() => {
    const keys = new Set(state.incomes.map((item) => monthKey(item.date)))
    return [...keys].sort().reverse()
  }, [state.incomes])

  const resetForm = () => {
    setDate(todayISO())
    setSource('')
    setAmount(0)
    setEditingId(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (amount <= 0) return
    const label = source.trim() || 'Pemasukan lain'

    if (editingId) {
      update((s) => ({
        ...s,
        incomes: s.incomes.map((item) => (item.id === editingId ? { ...item, date, source: label, amount } : item)),
      }))
    } else {
      const income: Income = { id: uid('inc'), date, source: label, amount }
      update((s) => ({ ...s, incomes: [income, ...s.incomes] }))
    }
    resetForm()
  }

  const startEdit = (income: Income) => {
    setEditingId(income.id)
    setDate(income.date)
    setSource(income.source)
    setAmount(income.amount)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = (id: string) => {
    update((s) => ({ ...s, incomes: s.incomes.filter((item) => item.id !== id) }))
    if (editingId === id) resetForm()
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Pemasukan Lain</h2>
        <span className="muted small">total {formatIDR(manualTotal)}</span>
      </header>

      <p className="muted small">
        Uang jajan dibagi rata per hari dan otomatis tercatat sebagai pemasukan. Di sini kamu menambah pemasukan lain
        seperti uang lebaran atau hasil kerja.
      </p>

      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="inc-date">Tanggal</label>
          <input id="inc-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="inc-source">Sumber</label>
          <input
            id="inc-source"
            className="input"
            placeholder="mis. uang lebaran"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="inc-amount">Nominal</label>
          <MoneyInput value={amount} onValueChange={setAmount} id="inc-amount" />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn" disabled={amount <= 0}>
            {editingId ? 'Simpan perubahan' : 'Tambah pemasukan'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </form>

      {months.length > 0 && (
        <p className="muted small">Per bulan: {months.map((key) => `${monthLabel(key)} ${formatIDR(state.incomes.filter((i) => monthKey(i.date) === key).reduce((sum, i) => sum + i.amount, 0))}`).join(' · ')}</p>
      )}

      <ul className="tx-list">
        {state.incomes.map((item) => (
          <li key={item.id} className={`tx${editingId === item.id ? ' tx-active' : ''}`}>
            <span className="tx-dot" style={{ background: '#2f9e44' }} />
            <span className="tx-main">
              <strong>{item.source}</strong>
              <span className="muted small">{formatShortDate(item.date)}</span>
            </span>
            <span className="tx-amount tx-in">+{formatIDR(item.amount)}</span>
            <span className="tx-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>
                Ubah
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(item.id)}>
                Hapus
              </button>
            </span>
          </li>
        ))}
        {state.incomes.length === 0 && <li className="empty">Belum ada pemasukan tambahan.</li>}
      </ul>
    </section>
  )
}
