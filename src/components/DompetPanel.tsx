import { useEffect, useState } from 'react'
import type { AppState } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR } from '../lib/money'
import { loadPrefs, savePrefs, type WalletCurrency } from '../lib/prefs'
import { onRateUpdate, refreshUsdRate } from '../lib/rates'
import { uid } from '../lib/id'
import { END_SAVINGS_WALLET_ID } from '../lib/state'
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
    update((s) => {
      const isEnd = id === END_SAVINGS_WALLET_ID
      const nextEndSavings = isEnd && patch.balance !== undefined ? Math.max(0, patch.balance) : s.endSavings
      const nextWallets = s.wallets.map((wallet) =>
        wallet.id === id
          ? {
              ...wallet,
              ...patch,
              balance: patch.balance !== undefined ? Math.max(0, patch.balance) : wallet.balance,
            }
          : wallet,
      )
      return {
        ...s,
        endSavings: nextEndSavings,
        wallets: nextWallets,
      }
    })
  }

  const removeWallet = (id: string) => {
    if (id === END_SAVINGS_WALLET_ID) return
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
        {state.wallets.map((wallet) => {
          const isEnd = wallet.id === END_SAVINGS_WALLET_ID
          return (
            <article key={wallet.id} className="ob-row">
              <input
                className="input input-name"
                aria-label={`Nama dompet ${wallet.name}`}
                value={wallet.name}
                readOnly={isEnd}
                title={isEnd ? 'Dompet otomatis terhubung ke Tabungan Akhir Periode' : undefined}
                onChange={(e) => patchWallet(wallet.id, { name: e.target.value })}
              />
              <MoneyInput
                id={`w-bal-${wallet.id}`}
                value={wallet.balance}
                onValueChange={(value) => patchWallet(wallet.id, { balance: value })}
              />
              <div className="ob-actions">
                {isEnd ? (
                  <span
                    className="badge"
                    title="Saldo otomatis sinkron dengan Tabungan Akhir Periode"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    Otomatis
                  </span>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeWallet(wallet.id)}>
                    Hapus
                  </button>
                )}
              </div>
            </article>
          )
        })}
        {state.wallets.length === 0 && (
          <p className="muted small">Belum ada dompet nih. Yuk tambahin rekening, e-wallet, atau uang tunai kamu di bawah.</p>
        )}
      </div>

      <button type="button" className="btn btn-ghost" onClick={addWallet}>
        + Tambah dompet
      </button>
    </section>
  )
}
