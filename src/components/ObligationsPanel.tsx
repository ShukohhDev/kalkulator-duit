import { useState, type FormEvent } from 'react'
import type { AppState, Bill, Debt } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR, todayISO } from '../lib/money'
import { CICILAN_CATEGORY, TAGIHAN_CATEGORY } from '../lib/state'
import { daysUntilDue, dueDateLabel, dueLabel, dueThisMonth, nowDate } from '../lib/obligations'
import { uid } from '../lib/id'
import { MiniCalendar } from './MiniCalendar'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  update: Updater
}

export function ObligationsPanel({ state, update }: Props) {
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState(0)
  const [billDay, setBillDay] = useState(1)
  const [debtName, setDebtName] = useState('')
  const [debtTotal, setDebtTotal] = useState(0)
  const [debtInstallment, setDebtInstallment] = useState(0)
  const [debtDay, setDebtDay] = useState(1)
  const now = nowDate()

  const addBill = (event: FormEvent) => {
    event.preventDefault()
    const name = billName.trim()
    if (!name || billAmount <= 0) return
    update((s) => ({
      ...s,
      bills: [...s.bills, { id: uid('bill'), name, amount: billAmount, dueDay: billDay }],
    }))
    setBillName('')
    setBillAmount(0)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

  const payBill = (bill: Bill) => {
    const date = todayISO()
    update((s) => ({
      ...s,
      bills: s.bills.map((item) => (item.id === bill.id ? { ...item, lastPaid: date } : item)),
      expenses: [
        { id: uid('exp'), date, categoryId: TAGIHAN_CATEGORY, note: bill.name, amount: bill.amount },
        ...s.expenses,
      ],
    }))
  }

  const removeBill = (id: string) => {
    update((s) => ({ ...s, bills: s.bills.filter((item) => item.id !== id) }))
  }

  const addDebt = (event: FormEvent) => {
    event.preventDefault()
    const name = debtName.trim()
    if (!name || debtTotal <= 0 || debtInstallment <= 0) return
    update((s) => ({
      ...s,
      debts: [
        ...s.debts,
        { id: uid('debt'), name, total: debtTotal, paid: 0, installment: debtInstallment, dueDay: debtDay },
      ],
    }))
    setDebtName('')
    setDebtTotal(0)
    setDebtInstallment(0)
  }

  const payDebt = (debt: Debt) => {
    const remaining = Math.max(0, debt.total - debt.paid)
    const amount = Math.min(debt.installment, remaining)
    if (amount <= 0) return
    update((s) => ({
      ...s,
      debts: s.debts.map((item) => (item.id === debt.id ? { ...item, paid: item.paid + amount } : item)),
      expenses: [
        { id: uid('exp'), date: todayISO(), categoryId: CICILAN_CATEGORY, note: debt.name, amount },
        ...s.expenses,
      ],
    }))
  }

  const removeDebt = (id: string) => {
    update((s) => ({ ...s, debts: s.debts.filter((item) => item.id !== id) }))
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kewajiban</h2>
        <span className="muted small">cicilan utang dan tagihan rutin, ikut tercatat sebagai pengeluaran</span>
      </header>

      <h3 className="section-title">Tagihan rutin</h3>
      <div className="goal-list">
        {state.bills.map((bill) => {
          const paid = dueThisMonth(bill.lastPaid, now)
          const days = daysUntilDue(bill.dueDay, now)
          return (
            <article key={bill.id} className="ob-row">
              <div className="ob-main">
                <strong>{bill.name}</strong>
                <span className="muted small">
                  {formatIDR(bill.amount)} · tiap tgl {bill.dueDay} ({dueDateLabel(bill.dueDay)})
                </span>
              </div>
              <span className={`ob-badge ${paid ? 'ob-badge-ok' : days <= 3 ? 'ob-badge-due' : ''}`}>
                {paid ? 'Lunas bulan ini' : dueLabel(days)}
              </span>
              <div className="ob-actions">
                <button type="button" className="btn btn-sm" disabled={paid} onClick={() => payBill(bill)}>
                  Bayar
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeBill(bill.id)}>
                  Hapus
                </button>
              </div>
            </article>
          )
        })}
        {state.bills.length === 0 && (
          <p className="muted small">Belum ada tagihan. Tambahkan listrik, internet, atau sewa di bawah.</p>
        )}
      </div>

      <form className="ob-form" onSubmit={addBill}>
        <div className="field">
          <label htmlFor="bill-name">Nama tagihan</label>
          <input
            id="bill-name"
            className="input"
            value={billName}
            placeholder="Listrik, internet, sewa…"
            onChange={(e) => setBillName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="bill-amount">Nominal (Rp)</label>
          <MoneyInput id="bill-amount" value={billAmount} onValueChange={setBillAmount} />
        </div>
        <MiniCalendar id="bill-due" value={billDay} onChange={setBillDay} />
        <button type="submit" className="btn" disabled={!billName.trim() || billAmount <= 0}>
          + Tambah tagihan
        </button>
      </form>

      <h3 className="section-title">Utang berjalan</h3>
      <div className="goal-list">
        {state.debts.map((debt) => {
          const remaining = Math.max(0, debt.total - debt.paid)
          const lunas = remaining <= 0
          const days = daysUntilDue(debt.dueDay, now)
          return (
            <article key={debt.id} className="ob-row">
              <div className="ob-main">
                <strong>{debt.name}</strong>
                <ProgressBar value={debt.paid} max={debt.total} />
                <span className="muted small">
                  Terbayar {formatIDR(debt.paid)} dari {formatIDR(debt.total)} · sisa {formatIDR(remaining)} ·
                  angsuran {formatIDR(debt.installment)} tiap tgl {debt.dueDay}
                </span>
              </div>
              <span className={`ob-badge ${lunas ? 'ob-badge-ok' : days <= 3 ? 'ob-badge-due' : ''}`}>
                {lunas ? 'Lunas' : dueLabel(days)}
              </span>
              <div className="ob-actions">
                <button type="button" className="btn btn-sm" disabled={lunas} onClick={() => payDebt(debt)}>
                  Bayar angsuran
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeDebt(debt.id)}>
                  Hapus
                </button>
              </div>
            </article>
          )
        })}
        {state.debts.length === 0 && (
          <p className="muted small">Belum ada utang. Catat cicilan motor, pinjaman, atau paylater di bawah.</p>
        )}
      </div>

      <form className="ob-form" onSubmit={addDebt}>
        <div className="field">
          <label htmlFor="debt-name">Nama utang</label>
          <input
            id="debt-name"
            className="input"
            value={debtName}
            placeholder="Motor, pinjaman, paylater…"
            onChange={(e) => setDebtName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="debt-total">Total utang (Rp)</label>
          <MoneyInput id="debt-total" value={debtTotal} onValueChange={setDebtTotal} />
        </div>
        <div className="field">
          <label htmlFor="debt-installment">Angsuran / bulan (Rp)</label>
          <MoneyInput id="debt-installment" value={debtInstallment} onValueChange={setDebtInstallment} />
        </div>
        <MiniCalendar id="debt-due" value={debtDay} onChange={setDebtDay} />
        <button
          type="submit"
          className="btn"
          disabled={!debtName.trim() || debtTotal <= 0 || debtInstallment <= 0}
        >
          + Tambah utang
        </button>
      </form>
    </section>
  )
}
