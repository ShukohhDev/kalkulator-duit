import { useState } from 'react'
import type { AppState, Notify } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { END_SAVINGS_WALLET_ID, syncEndSavingsWallet } from '../lib/state'
import { appendActivity } from '../lib/activity'
import { MoneyInput } from './MoneyInput'

interface Props {
  state: AppState
  update?: Updater
  notify?: Notify
}

export function EndSavingsCard({ state, update, notify }: Props) {
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [transferDestId, setTransferDestId] = useState<string>('')
  const [transferAmount, setTransferAmount] = useState<number>(0)

  const currentTargetId = state.endSavingsTargetWalletId ?? END_SAVINGS_WALLET_ID
  const userWallets = state.wallets.filter((w) => w.id !== END_SAVINGS_WALLET_ID)
  const targetWallet = state.wallets.find((w) => w.id === currentTargetId)

  const handleTargetChange = (nextTargetId: string) => {
    if (!update) return
    const nextTargetWallet = state.wallets.find((w) => w.id === nextTargetId)
    const targetName =
      nextTargetId === END_SAVINGS_WALLET_ID
        ? 'Dompet Khusus (Tabungan Akhir Periode)'
        : (nextTargetWallet?.name ?? 'dompet tujuan')

    const endWallet = state.wallets.find((w) => w.id === END_SAVINGS_WALLET_ID)
    const currentEndBalance = endWallet ? endWallet.balance : 0

    if (nextTargetId !== END_SAVINGS_WALLET_ID && currentEndBalance > 0 && nextTargetWallet) {
      const confirmMove = window.confirm(
        `Anda memilih ${targetName} sebagai tujuan Tabungan Akhir Periode.\n\nApakah Anda ingin memindahkan saldo saat ini (${formatIDR(currentEndBalance)}) ke ${targetName}?`,
      )
      if (confirmMove) {
        update((s) => {
          const nextWallets = s.wallets.map((w) => {
            if (w.id === END_SAVINGS_WALLET_ID) return { ...w, balance: 0 }
            if (w.id === nextTargetId) return { ...w, balance: w.balance + currentEndBalance }
            return w
          })
          const updatedState = appendActivity(
            s,
            'pemasukan',
            `Memindahkan saldo Tabungan Akhir Periode ${formatIDR(currentEndBalance)} ke ${targetName}`,
          )
          return {
            ...updatedState,
            endSavingsTargetWalletId: nextTargetId,
            wallets: nextWallets,
          }
        })
        notify?.(`Tujuan diubah ke ${targetName} dan saldo ${formatIDR(currentEndBalance)} berhasil dipindahkan.`)
        return
      }
    }

    update((s) => ({
      ...s,
      endSavingsTargetWalletId: nextTargetId,
      wallets: syncEndSavingsWallet(s.wallets, s.endSavings, nextTargetId),
    }))
    notify?.(`Tujuan Tabungan Akhir Periode disetel ke ${targetName}.`)
  }

  const handleOpenTransfer = () => {
    setIsTransferOpen((prev) => !prev)
    setTransferAmount(state.endSavings)
    if (!transferDestId && userWallets.length > 0) {
      setTransferDestId(userWallets[0].id)
    }
  }

  const handleConfirmTransfer = () => {
    if (!update) return
    if (transferAmount <= 0) {
      notify?.('Masukkan nominal pemindahan di atas Rp 0.', { error: true })
      return
    }
    if (transferAmount > state.endSavings) {
      notify?.('Nominal pemindahan melebihi saldo Tabungan Akhir Periode.', { error: true })
      return
    }
    const dest = userWallets.find((w) => w.id === (transferDestId || userWallets[0]?.id))
    if (!dest) {
      notify?.('Pilih dompet tujuan pemindahan terlebih dahulu.', { error: true })
      return
    }

    update((s) => {
      const nextEndSavings = Math.max(0, s.endSavings - transferAmount)
      const nextWallets = s.wallets.map((w) => {
        if (w.id === END_SAVINGS_WALLET_ID) {
          return { ...w, balance: Math.max(0, w.balance - transferAmount) }
        }
        if (w.id === dest.id) {
          return { ...w, balance: w.balance + transferAmount }
        }
        return w
      })
      const updatedState = appendActivity(
        s,
        'pemasukan',
        `Memindahkan saldo Tabungan Akhir Periode ${formatIDR(transferAmount)} ke ${dest.name}`,
      )
      return {
        ...updatedState,
        endSavings: nextEndSavings,
        wallets: nextWallets,
      }
    })
    notify?.(`Berhasil memindahkan ${formatIDR(transferAmount)} ke ${dest.name}.`)
    setIsTransferOpen(false)
    setTransferAmount(0)
  }

  return (
    <section className="card aset-card" aria-label="Tabungan akhir periode">
      <header className="card-head">
        <h2>Tabungan Akhir Periode</h2>
        <span
          className="badge badge-accent"
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          title={`Tujuan saat ini: ${targetWallet ? targetWallet.name : 'Dompet Khusus'}`}
        >
          {currentTargetId === END_SAVINGS_WALLET_ID ? 'Dompet Khusus' : (targetWallet?.name ?? 'Dompet Terpilih')}
        </span>
      </header>
      <p className="aset-total">{formatIDR(state.endSavings)}</p>

      {update && (
        <div className="end-savings-target-box" style={{ marginTop: 12 }}>
          <label htmlFor="end-savings-target-select" className="label small" style={{ display: 'block', marginBottom: 6 }}>
            Tujuan simpan saldo akhir periode:
          </label>
          <select
            id="end-savings-target-select"
            className="input"
            value={currentTargetId}
            onChange={(e) => handleTargetChange(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value={END_SAVINGS_WALLET_ID}>
              Dompet Khusus: Tabungan Akhir Periode (Bawaan)
            </option>
            {userWallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatIDR(w.balance)})
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="muted small" style={{ marginTop: 10, lineHeight: 1.5 }}>
        {currentTargetId === END_SAVINGS_WALLET_ID
          ? state.endSavings > 0
            ? 'Sisa bersih uang jajan otomatis disapu ke dompet khusus ini saat periode berganti dan tersimpan di data dompet.'
            : 'Belum ada sisa. Sisa uang jajan tiap periode akan otomatis masuk ke dompet khusus ini dan tersimpan di data dompet.'
          : `Sisa bersih uang jajan tiap pergantian periode otomatis dialokasikan ke ${targetWallet?.name ?? 'dompet tujuan'} dan menambah saldo dompet tersebut.`}
      </p>

      {update && state.endSavings > 0 && userWallets.length > 0 && (
        <div className="end-savings-actions" style={{ marginTop: 14 }}>
          {!isTransferOpen ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost btn-transfer-savings"
              onClick={handleOpenTransfer}
              style={{ width: '100%' }}
            >
              Pindahkan Saldo ke Dompet / E-wallet
            </button>
          ) : (
            <div
              className="transfer-form-card"
              style={{
                background: 'var(--surface-muted, rgba(0, 0, 0, 0.03))',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                marginTop: '8px',
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Pindahkan Saldo ke Dompet</h4>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="tf-dest-wallet" className="label small" style={{ display: 'block', marginBottom: 4 }}>
                  Pilih dompet tujuan:
                </label>
                <select
                  id="tf-dest-wallet"
                  className="input input-sm"
                  value={transferDestId || (userWallets[0]?.id ?? '')}
                  onChange={(e) => setTransferDestId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {userWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatIDR(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="tf-end-savings-amt" className="label small" style={{ display: 'block', marginBottom: 4 }}>
                  Nominal yang dipindahkan:
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <MoneyInput
                      id="tf-end-savings-amt"
                      value={transferAmount}
                      onValueChange={setTransferAmount}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setTransferAmount(state.endSavings)}
                    title="Pindahkan seluruh saldo"
                  >
                    Semua
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setIsTransferOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary btn-confirm-transfer"
                  onClick={handleConfirmTransfer}
                >
                  Konfirmasi Pindahkan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
