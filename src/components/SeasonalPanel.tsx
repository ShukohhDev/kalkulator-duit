import { useState } from 'react'
import type { AppState, Notify, SeasonalFund } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR, todayISO } from '../lib/money'
import { SAVINGS_CATEGORY } from '../lib/state'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
  notify: Notify
}

export function SeasonalPanel({ state, derived, update, notify }: Props) {
  const [deposits, setDeposits] = useState<Record<string, number>>({})
  const [sources, setSources] = useState<Record<string, string>>({})

  const newDeposit = (seasonalId: string, name: string | undefined, amount: number) => ({
    id: uid('exp'),
    date: todayISO(),
    categoryId: SAVINGS_CATEGORY,
    note: `Setoran ${name ?? 'dana musiman'}`.trim(),
    amount,
    seasonalId,
  })

  const addItem = () => {
    update((s) => ({
      ...s,
      seasonal: [...s.seasonal, { id: uid('season'), name: `Dana ${s.seasonal.length + 1}`, target: 0, saved: 0 }],
    }))
  }

  const patchItem = (id: string, patch: Partial<SeasonalFund>) => {
    update((s) => ({ ...s, seasonal: s.seasonal.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
  }

  const removeItem = (id: string) => {
    update((s) => ({ ...s, seasonal: s.seasonal.filter((item) => item.id !== id) }))
  }

  const setor = (id: string) => {
    const amount = deposits[id] ?? 0
    if (amount <= 0) return
    const item = state.seasonal.find((fund) => fund.id === id)
    const sourceKey = sources[id] ?? `wallet:${state.wallets[0]?.id ?? ''}`

    // sumber: e-wallet (saldo dompet) atau Saku Tabungan (pot)
    if (sourceKey === 'pot') {
      if (amount > state.endSavings) {
        notify(`Saku Tabungan tidak cukup (saldo ${formatIDR(state.endSavings)}).`)
        return
      }
      update((s) => ({ ...s, endSavings: Math.max(0, s.endSavings - amount), expenses: [newDeposit(id, item?.name, amount), ...s.expenses] }))
      setDeposits((prev) => ({ ...prev, [id]: 0 }))
      return
    }
    const walletId = sourceKey.startsWith('wallet:') ? sourceKey.slice(7) : ''
    const wallet = state.wallets.find((entry) => entry.id === walletId)
    if (!wallet || amount > wallet.balance) {
      notify(`${wallet?.name ?? 'Dompet'} tidak cukup (saldo ${formatIDR(wallet?.balance ?? 0)}).`)
      return
    }
    update((s) => ({
      ...s,
      wallets: s.wallets.map((entry) =>
        entry.id === walletId ? { ...entry, balance: Math.max(0, entry.balance - amount) } : entry,
      ),
      expenses: [newDeposit(id, item?.name, amount), ...s.expenses],
    }))
    setDeposits((prev) => ({ ...prev, [id]: 0 }))
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Dana Musiman</h2>
        <span className="muted small">
          wadah terpisah dari Target Tabungan: tanpa bunga, untuk lebaran/sekolah/liburan. Kumpulkan sampai target
          atau tanggalnya tiba
        </span>
      </header>

      <div className="goal-list">
        {state.seasonal.map((item) => {
          const logged = derived.seasonalSavings[item.id] ?? 0
          const effective = item.saved + logged
          const percent = item.target > 0 ? Math.min(100, Math.round((effective / item.target) * 100)) : 0
          const remaining = Math.max(0, item.target - effective)
          const daysLeft =
            item.dueDate && item.dueDate >= todayISO()
              ? Math.ceil((new Date(`${item.dueDate}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()) / 86_400_000)
              : null

          return (
            <article key={item.id} className="goal">
              <header className="goal-head">
                <input
                  className="input input-name"
                  value={item.name}
                  aria-label="Nama dana musiman"
                  onChange={(e) => patchItem(item.id, { name: e.target.value })}
                />
                <div className="goal-head-actions">
                  <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeItem(item.id)}>
                    Hapus
                  </button>
                </div>
              </header>

              <div className="form-grid form-grid-2">
                <div className="field">
                  <label>Target (Rp)</label>
                  <MoneyInput value={item.target} onValueChange={(value) => patchItem(item.id, { target: value })} />
                </div>
                <div className="field">
                  <label>Saldo awal (opsional)</label>
                  <MoneyInput value={item.saved} onValueChange={(value) => patchItem(item.id, { saved: value })} />
                </div>
                <div className="field">
                  <label htmlFor={`season-due-${item.id}`}>Tanggal tujuan (opsional)</label>
                  <input
                    id={`season-due-${item.id}`}
                    className="input"
                    type="date"
                    value={item.dueDate ?? ''}
                    onChange={(e) =>
                      patchItem(item.id, { dueDate: e.target.value === '' ? undefined : e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="goal-progress">
                <ProgressBar value={effective} max={item.target} />
                <span className="muted small">
                  {formatIDR(effective)} / {formatIDR(item.target)} ({percent}%)
                  {item.target > 0
                    ? remaining > 0
                      ? ` · kurang ${formatIDR(remaining)} lagi`
                      : ' · target tercapai!'
                    : ''}
                  {daysLeft !== null ? (daysLeft > 0 ? ` · ${daysLeft} hari lagi` : ' · tanggalnya sudah tiba') : ''}
                </span>
                {logged > 0 && (
                  <span className="muted small">
                    = saldo awal {formatIDR(item.saved)} + setoran tercatat {formatIDR(logged)}
                  </span>
                )}
              </div>

              <div className="inline-form">
                <CustomSelect
                  className="input"
                  aria-label={`Sumber setoran ${item.name}`}
                  value={sources[item.id] ?? `wallet:${state.wallets[0]?.id ?? ''}`}
                  onChange={(e) => setSources((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  title={`Pilih Sumber Setoran ${item.name}`}
                >
                  <option value="pot">Saku Tabungan ({formatIDR(state.endSavings)})</option>
                  {state.wallets.map((wallet) => (
                    <option key={wallet.id} value={`wallet:${wallet.id}`}>
                      {wallet.name} ({formatIDR(wallet.balance)})
                    </option>
                  ))}
                </CustomSelect>
                <MoneyInput
                  value={deposits[item.id] ?? 0}
                  onValueChange={(value) => setDeposits((prev) => ({ ...prev, [item.id]: value }))}
                  placeholder="Nominal setoran"
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={(deposits[item.id] ?? 0) <= 0}
                  onClick={() => setor(item.id)}
                >
                  Setor
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <button type="button" className="btn btn-ghost" onClick={addItem}>
        + Tambah dana musiman
      </button>
      {state.seasonal.length === 0 && (
        <p className="muted small">Belum ada dana musiman. Buat wadah untuk lebaran, uang sekolah, atau liburan.</p>
      )}
    </section>
  )
}
