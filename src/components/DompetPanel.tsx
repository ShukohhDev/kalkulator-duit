import { useEffect, useState } from 'react'
import type { AppState } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { loadPrefs, savePrefs, type WalletCurrency } from '../lib/prefs'
import { onRateUpdate, refreshUsdRate } from '../lib/rates'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'

interface Props {
  state: AppState
  update: Updater
}

function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function formatRateAt(at: string): string {
  const stamp = Date.parse(at)
  if (!Number.isFinite(stamp)) return ''
  return new Date(stamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function DompetPanel({ state, update }: Props) {
  const [currency, setCurrency] = useState<WalletCurrency>(() => loadPrefs().walletCurrency)
  const [rateInfo, setRateInfo] = useState(() => {
    const prefs = loadPrefs()
    return { rate: prefs.usdRate, at: prefs.usdRateAt }
  })

  useEffect(() => onRateUpdate(() => {
    const prefs = loadPrefs()
    setRateInfo({ rate: prefs.usdRate, at: prefs.usdRateAt })
  }), [])

  const total = state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
  const inUsd = currency === 'usd' && rateInfo.rate > 0

  const pickCurrency = (next: WalletCurrency) => {
    setCurrency(next)
    savePrefs({ walletCurrency: next })
    if (next === 'usd') void refreshUsdRate()
  }

  const addWallet = () => {
    update((s) => ({ ...s, wallets: [...s.wallets, { id: uid('wallet'), name: `Dompet ${s.wallets.length + 1}`, balance: 0 }] }))
  }

  const patchWallet = (id: string, patch: Partial<{ name: string; balance: number }>) => {
    update((s) => ({ ...s, wallets: s.wallets.map((wallet) => (wallet.id === id ? { ...wallet, ...patch } : wallet)) }))
  }

  const removeWallet = (id: string) => {
    update((s) => ({ ...s, wallets: s.wallets.filter((wallet) => wallet.id !== id) }))
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Dompet &amp; E-wallet</h2>
        <div className="profile-chips">
          <button
            type="button"
            className={`nav-chip${currency === 'idr' ? ' nav-chip-on' : ''}`}
            onClick={() => pickCurrency('idr')}
          >
            Rp
          </button>
          <button
            type="button"
            className={`nav-chip${currency === 'usd' ? ' nav-chip-on' : ''}`}
            onClick={() => pickCurrency('usd')}
          >
            USD
          </button>
        </div>
      </header>

      <div className="wallet-total">
        <span className="muted small">Total aset</span>
        <strong className="wallet-total-value">{inUsd ? formatUSD(total / rateInfo.rate) : formatIDR(total)}</strong>
        {inUsd && (
          <span className="muted small wallet-rate" data-testid="rate-note">
            1 USD = Rp {Math.round(rateInfo.rate).toLocaleString('id-ID')} ·{' '}
            {rateInfo.at ? `kurs otomatis, diperbarui ${formatRateAt(rateInfo.at)}` : 'kurs terakhir, offline'}
          </span>
        )}
      </div>

      <div className="goal-list">
        {state.wallets.map((wallet) => (
          <article key={wallet.id} className="ob-row">
            <input
              className="input input-name"
              aria-label={`Nama dompet ${wallet.name}`}
              value={wallet.name}
              onChange={(e) => patchWallet(wallet.id, { name: e.target.value })}
            />
            <MoneyInput
              id={`w-bal-${wallet.id}`}
              value={wallet.balance}
              onValueChange={(value) => patchWallet(wallet.id, { balance: value })}
            />
            <div className="ob-actions">
              <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeWallet(wallet.id)}>
                Hapus
              </button>
            </div>
          </article>
        ))}
        {state.wallets.length === 0 && (
          <p className="muted small">Belum ada dompet. Tambahkan rekening, e-wallet, atau tunai di bawah.</p>
        )}
      </div>

      <button type="button" className="btn btn-ghost" onClick={addWallet}>
        + Tambah dompet
      </button>
    </section>
  )
}
