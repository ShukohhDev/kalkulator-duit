import { useState, type FormEvent } from 'react'
import type { AppState, Bill, Debt, Notify } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import {
  billPaidThisMonth,
  billRemainingThisMonth,
  daysUntilDue,
  dueDateLabel,
  dueLabel,
  isBillFullyPaidThisMonth,
  markBillPaid,
  markDebtPaid,
  nowDate,
} from '../lib/obligations'
import { uid } from '../lib/id'
import { buildICS } from '../lib/ics'
import { MiniCalendar } from './MiniCalendar'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  update: Updater
  notify: Notify
}

function getSourceBalance(state: AppState, source: string): number {
  if (source === 'pot') return state.endSavings
  if (source.startsWith('wallet:')) {
    const targetId = source.slice(7)
    const wallet = state.wallets.find((w) => w.id === targetId)
    return wallet?.balance ?? 0
  }
  return Infinity
}

function getSourceName(state: AppState, source: string): string {
  if (source === 'pot') return 'Saku Tabungan'
  if (source.startsWith('wallet:')) {
    const targetId = source.slice(7)
    const wallet = state.wallets.find((w) => w.id === targetId)
    return wallet ? wallet.name : 'Dompet'
  }
  return ''
}

export function ObligationsPanel({ state, update, notify }: Props) {
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState(0)
  const [billDay, setBillDay] = useState(1)
  const [payingBillId, setPayingBillId] = useState<string | null>(null)
  const [payNominal, setPayNominal] = useState<number>(0)
  const [paySource, setPaySource] = useState<string>('none')
  const [debtName, setDebtName] = useState('')
  const [debtTotal, setDebtTotal] = useState(0)
  const [debtInstallment, setDebtInstallment] = useState(0)
  const [debtDay, setDebtDay] = useState(1)
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null)
  const [debtPayNominal, setDebtPayNominal] = useState<number>(0)
  const [debtPaySource, setDebtPaySource] = useState<string>('none')
  const now = nowDate()

  const exportIcs = () => {
    try {
      const url = URL.createObjectURL(new Blob([buildICS(state)], { type: 'text/calendar;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'kewajiban.ics'
      link.click()
      URL.revokeObjectURL(url)
      notify('Kalender kewajiban diunduh (.ics).')
    } catch {
      notify('Gagal membuat file .ics.', { error: true })
    }
  }

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

  const openPayBill = (bill: Bill) => {
    const remaining = billRemainingThisMonth(bill, now)
    setPayingBillId(bill.id)
    setPayNominal(remaining)
    setPaySource('none')
  }

  const cancelPayBill = () => {
    setPayingBillId(null)
    setPayNominal(0)
    setPaySource('none')
  }

  const confirmPayBill = (bill: Bill) => {
    if (payNominal <= 0) return
    const remaining = billRemainingThisMonth(bill, now)
    const actualPay = Math.min(payNominal, remaining)
    const sourceKey = paySource === 'none' ? undefined : paySource
    update((s) => markBillPaid(s, bill, actualPay, now, sourceKey))
    const nextRemaining = remaining - actualPay
    const sourceLabel = sourceKey ? ` via ${getSourceName(state, sourceKey)}` : ''
    if (nextRemaining <= 0) {
      notify(`Tagihan ${bill.name} lunas bulan ini (${formatIDR(actualPay)}${sourceLabel}).`)
    } else {
      notify(
        `Pembayaran ${bill.name} berhasil dicatat (${formatIDR(actualPay)}${sourceLabel}). Sisa tagihan: ${formatIDR(nextRemaining)}.`,
      )
    }
    setPayingBillId(null)
    setPayNominal(0)
    setPaySource('none')
  }

  const removeBill = (id: string) => {
    if (payingBillId === id) cancelPayBill()
    const index = state.bills.findIndex((item) => item.id === id)
    const target = state.bills[index]
    if (!target) return
    update((s) => ({ ...s, bills: s.bills.filter((item) => item.id !== id) }))
    notify('Tagihan dihapus.', {
      undo: () =>
        update((s) => {
          const next = [...s.bills]
          next.splice(Math.min(index, next.length), 0, target)
          return { ...s, bills: next }
        }),
    })
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

  const openPayDebt = (debt: Debt) => {
    const remaining = Math.max(0, debt.total - debt.paid)
    setPayingDebtId(debt.id)
    setDebtPayNominal(Math.min(debt.installment, remaining))
    setDebtPaySource('none')
  }

  const cancelPayDebt = () => {
    setPayingDebtId(null)
    setDebtPayNominal(0)
    setDebtPaySource('none')
  }

  const confirmPayDebt = (debt: Debt) => {
    if (debtPayNominal <= 0) return
    const remaining = Math.max(0, debt.total - debt.paid)
    const actualPay = Math.min(debtPayNominal, remaining)
    const sourceKey = debtPaySource === 'none' ? undefined : debtPaySource
    update((s) => markDebtPaid(s, debt, actualPay, sourceKey))
    const nextRemaining = remaining - actualPay
    const sourceLabel = sourceKey ? ` via ${getSourceName(state, sourceKey)}` : ''
    if (nextRemaining <= 0) {
      notify(`Utang ${debt.name} berhasil dilunasi (${formatIDR(actualPay)}${sourceLabel}).`)
    } else {
      notify(
        `Pembayaran angsuran ${debt.name} berhasil dicatat (${formatIDR(actualPay)}${sourceLabel}). Sisa utang: ${formatIDR(nextRemaining)}.`,
      )
    }
    setPayingDebtId(null)
    setDebtPayNominal(0)
    setDebtPaySource('none')
  }

  const removeDebt = (id: string) => {
    if (payingDebtId === id) cancelPayDebt()
    const index = state.debts.findIndex((item) => item.id === id)
    const target = state.debts[index]
    if (!target) return
    update((s) => ({ ...s, debts: s.debts.filter((item) => item.id !== id) }))
    notify('Utang dihapus.', {
      undo: () =>
        update((s) => {
          const next = [...s.debts]
          next.splice(Math.min(index, next.length), 0, target)
          return { ...s, debts: next }
        }),
    })
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Kewajiban</h2>
        <div className="report-actions no-print">
          <span className="muted small">cicilan utang dan tagihan rutin, ikut tercatat sebagai pengeluaran</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportIcs}>
            Ekspor .ics
          </button>
        </div>
      </header>

      <h3 className="section-title">Tagihan rutin</h3>
      <div className="goal-list">
        {state.bills.map((bill) => {
          const isPaid = isBillFullyPaidThisMonth(bill, now)
          const paidAmount = billPaidThisMonth(bill, now)
          const remaining = billRemainingThisMonth(bill, now)
          const days = daysUntilDue(bill.dueDay, now)
          const isPayingThis = payingBillId === bill.id

          return (
            <article key={bill.id} className="ob-row">
              <div className="ob-main">
                <strong>{bill.name}</strong>
                {paidAmount > 0 && remaining > 0 && (
                  <ProgressBar value={paidAmount} max={bill.amount} />
                )}
                <span className="muted small">
                  {paidAmount > 0 && remaining > 0 ? (
                    <>
                      Terbayar {formatIDR(paidAmount)} dari {formatIDR(bill.amount)} · sisa {formatIDR(remaining)} · tiap tgl {bill.dueDay} ({dueDateLabel(bill.dueDay)})
                    </>
                  ) : (
                    <>
                      {formatIDR(bill.amount)} · tiap tgl {bill.dueDay} ({dueDateLabel(bill.dueDay)})
                    </>
                  )}
                </span>
              </div>
              <span
                className={`ob-badge ${
                  isPaid ? 'ob-badge-ok' : paidAmount > 0 ? 'ob-badge-warn' : days <= 3 ? 'ob-badge-due' : ''
                }`}
              >
                {isPaid ? 'Lunas bulan ini' : paidAmount > 0 ? `Sisa ${formatIDR(remaining)}` : dueLabel(days)}
              </span>
              <div className="ob-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={isPaid}
                  onClick={() => (isPayingThis ? cancelPayBill() : openPayBill(bill))}
                >
                  {isPayingThis ? 'Batal' : 'Bayar'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger"
                  onClick={() => removeBill(bill.id)}
                >
                  Hapus
                </button>
              </div>

              {isPayingThis && (
                <div className="ob-pay-drawer">
                  <div className="ob-pay-info">
                    <span className="small">
                      Sisa tagihan: <strong>{formatIDR(remaining)}</strong>
                    </span>
                    <span className="muted small">Pilih sumber dana dan ketik nominal yang mau dibayar</span>
                  </div>
                  <div className="ob-pay-input-row">
                    <div className="field ob-pay-field">
                      <label htmlFor={`pay-amount-${bill.id}`}>Nominal bayar (Rp)</label>
                      <MoneyInput
                        id={`pay-amount-${bill.id}`}
                        value={payNominal}
                        onValueChange={setPayNominal}
                        placeholder="Masukkan nominal bayar…"
                        autoFocus
                      />
                    </div>
                    <div className="field ob-pay-field">
                      <label htmlFor={`pay-source-${bill.id}`}>Sumber pembayaran</label>
                      <CustomSelect
                        id={`pay-source-${bill.id}`}
                        className="input"
                        value={paySource}
                        onChange={(e) => setPaySource(e.target.value)}
                        title="Pilih Sumber Pembayaran Tagihan"
                      >
                        <option value="none">Tanpa potong dompet (catat pengeluaran saja)</option>
                        <option value="pot">Saku Tabungan (saldo: {formatIDR(state.endSavings)})</option>
                        {state.wallets.map((w) => (
                          <option key={w.id} value={`wallet:${w.id}`}>
                            {w.name} (saldo: {formatIDR(w.balance)})
                          </option>
                        ))}
                      </CustomSelect>
                    </div>
                    <div className="ob-pay-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={
                          payNominal <= 0 ||
                          payNominal > remaining ||
                          (paySource !== 'none' && payNominal > getSourceBalance(state, paySource))
                        }
                        onClick={() => confirmPayBill(bill)}
                      >
                        Konfirmasi Bayar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={cancelPayBill}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                  <div className="ob-pay-chips">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setPayNominal(remaining)}
                    >
                      Bayar lunas ({formatIDR(remaining)})
                    </button>
                    {remaining >= 50_000 && Math.round(remaining / 2) !== remaining && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setPayNominal(Math.round(remaining / 2))}
                      >
                        Cicil 50% ({formatIDR(Math.round(remaining / 2))})
                      </button>
                    )}
                  </div>
                  {payNominal > remaining && (
                    <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      Nominal melebihi sisa tagihan ({formatIDR(remaining)}).
                    </p>
                  )}
                  {paySource !== 'none' && payNominal > getSourceBalance(state, paySource) && (
                    <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      Saldo {getSourceName(state, paySource)} tidak mencukupi (tersedia: {formatIDR(getSourceBalance(state, paySource))}).
                    </p>
                  )}
                </div>
              )}
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
          const isPayingThisDebt = payingDebtId === debt.id
          const debtSourceBal = getSourceBalance(state, debtPaySource)
          const isDebtInsufficient = debtPaySource !== 'none' && debtPayNominal > debtSourceBal

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
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={lunas}
                  onClick={() => (isPayingThisDebt ? cancelPayDebt() : openPayDebt(debt))}
                >
                  {isPayingThisDebt ? 'Batal' : 'Bayar angsuran'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger"
                  onClick={() => removeDebt(debt.id)}
                >
                  Hapus
                </button>
              </div>

              {isPayingThisDebt && (
                <div className="ob-pay-drawer">
                  <div className="ob-pay-info">
                    <span className="small">
                      Sisa utang: <strong>{formatIDR(remaining)}</strong> · Angsuran: <strong>{formatIDR(debt.installment)}</strong>
                    </span>
                    <span className="muted small">Pilih sumber dana dan tentukan nominal bayar</span>
                  </div>

                  <div className="ob-pay-input-row">
                    <div className="field ob-pay-field">
                      <label htmlFor={`debt-amount-${debt.id}`}>Nominal bayar (Rp)</label>
                      <MoneyInput
                        id={`debt-amount-${debt.id}`}
                        value={debtPayNominal}
                        onValueChange={setDebtPayNominal}
                        placeholder="Masukkan nominal bayar…"
                        autoFocus
                      />
                    </div>
                    <div className="field ob-pay-field">
                      <label htmlFor={`debt-source-${debt.id}`}>Sumber pembayaran</label>
                      <CustomSelect
                        id={`debt-source-${debt.id}`}
                        className="input"
                        value={debtPaySource}
                        onChange={(e) => setDebtPaySource(e.target.value)}
                        title="Pilih Sumber Pembayaran Angsuran"
                      >
                        <option value="none">Tanpa potong dompet (catat pengeluaran saja)</option>
                        <option value="pot">Saku Tabungan (saldo: {formatIDR(state.endSavings)})</option>
                        {state.wallets.map((w) => (
                          <option key={w.id} value={`wallet:${w.id}`}>
                            {w.name} (saldo: {formatIDR(w.balance)})
                          </option>
                        ))}
                      </CustomSelect>
                    </div>
                    <div className="ob-pay-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={debtPayNominal <= 0 || debtPayNominal > remaining || isDebtInsufficient}
                        onClick={() => confirmPayDebt(debt)}
                      >
                        Konfirmasi Bayar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={cancelPayDebt}
                      >
                        Batal
                      </button>
                    </div>
                  </div>

                  <div className="ob-pay-chips">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setDebtPayNominal(Math.min(debt.installment, remaining))}
                    >
                      Sesuai angsuran ({formatIDR(Math.min(debt.installment, remaining))})
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setDebtPayNominal(remaining)}
                    >
                      Bayar lunas ({formatIDR(remaining)})
                    </button>
                  </div>

                  {debtPayNominal > remaining && (
                    <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      Nominal melebihi sisa utang ({formatIDR(remaining)}).
                    </p>
                  )}

                  {isDebtInsufficient && (
                    <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      Saldo {getSourceName(state, debtPaySource)} tidak mencukupi (tersedia: {formatIDR(debtSourceBal)}).
                    </p>
                  )}
                </div>
              )}
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
