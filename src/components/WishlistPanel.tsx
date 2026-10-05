import { useState } from 'react'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import type { Updater } from '../hooks/useAppState'
import { formatIDR, todayISO } from '../lib/money'
import { SAVINGS_CATEGORY } from '../lib/state'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'
import { ProgressBar } from './ProgressBar'

interface Props {
  state: AppState
  derived: Derived
  update: Updater
}

export function WishlistPanel({ state, derived, update }: Props) {
  const [deposits, setDeposits] = useState<Record<string, number>>({})

  const addItem = () => {
    update((s) => ({
      ...s,
      wishlist: [...s.wishlist, { id: uid('wish'), name: `Incaran ${s.wishlist.length + 1}`, price: 0, saved: 0 }],
    }))
  }

  const patchItem = (id: string, patch: Partial<{ name: string; price: number; saved: number }>) => {
    update((s) => ({ ...s, wishlist: s.wishlist.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
  }

  const removeItem = (id: string) => {
    update((s) => ({ ...s, wishlist: s.wishlist.filter((item) => item.id !== id) }))
  }

  const setor = (id: string) => {
    const amount = deposits[id] ?? 0
    if (amount <= 0) return
    const item = state.wishlist.find((wish) => wish.id === id)
    update((s) => ({
      ...s,
      expenses: [
        {
          id: uid('exp'),
          date: todayISO(),
          categoryId: SAVINGS_CATEGORY,
          note: `Setoran ${item?.name ?? 'incaran'}`.trim(),
          amount,
          wishlistId: id,
        },
        ...s.expenses,
      ],
    }))
    setDeposits((prev) => ({ ...prev, [id]: 0 }))
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Wishlist / Incaran Beli</h2>
        <span className="muted small">tanpa bunga, kumpulkan sampai cukup harga barang</span>
      </header>

      <div className="goal-list">
        {state.wishlist.map((item) => {
          const logged = derived.wishlistSavings[item.id] ?? 0
          const effective = item.saved + logged
          const percent = item.price > 0 ? Math.min(100, Math.round((effective / item.price) * 100)) : 0
          const remaining = Math.max(0, item.price - effective)

          return (
            <article key={item.id} className="goal">
              <header className="goal-head">
                <input
                  className="input input-name"
                  value={item.name}
                  aria-label="Nama incaran"
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
                  <label>Harga barang (Rp)</label>
                  <MoneyInput value={item.price} onValueChange={(value) => patchItem(item.id, { price: value })} />
                </div>
                <div className="field">
                  <label>Saldo awal (opsional)</label>
                  <MoneyInput value={item.saved} onValueChange={(value) => patchItem(item.id, { saved: value })} />
                </div>
              </div>

              <div className="goal-progress">
                <ProgressBar value={effective} max={item.price} />
                <span className="muted small">
                  {formatIDR(effective)} / {formatIDR(item.price)} ({percent}%)
                  {item.price > 0
                    ? remaining > 0
                      ? ` · kurang ${formatIDR(remaining)} lagi`
                      : ' · sudah cukup, tinggal beli!'
                    : ''}
                </span>
                {logged > 0 && (
                  <span className="muted small">
                    = saldo awal {formatIDR(item.saved)} + setoran tercatat {formatIDR(logged)}
                  </span>
                )}
              </div>

              <div className="inline-form">
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
        + Tambah incaran baru
      </button>
      {state.wishlist.length === 0 && (
        <p className="muted small">Belum ada incaran. Tambahkan barang yang ingin kamu beli (game, HP, dll).</p>
      )}
    </section>
  )
}
