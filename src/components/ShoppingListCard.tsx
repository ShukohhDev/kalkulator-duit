import { useMemo, useState, type FormEvent } from 'react'
import type { AppState, Expense, Notify, ShoppingItem } from '../types'
import type { Updater } from '../hooks/useAppState'
import { formatIDR, todayISO } from '../lib/money'
import { uid } from '../lib/id'
import { ICON_CART, ICON_CHECKLIST } from './icons'
import { MoneyInput } from './MoneyInput'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  update: Updater
  notify: Notify
}

const QUICK_SUGGESTIONS = [
  'Beras',
  'Minyak Goreng',
  'Telur',
  'Sayur & Bumbu',
  'Sabun Cuci',
  'Kopi & Teh',
  'Camilan',
]

export function ShoppingListCard({ state, update, notify }: Props) {
  const [name, setName] = useState('')
  const [estimatedPrice, setEstimatedPrice] = useState(0)
  const [categoryId, setCategoryId] = useState(() => state.categories[0]?.id ?? 'makan')
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'checked'>('all')

  const shoppingList = useMemo(() => state.shoppingList ?? [], [state.shoppingList])

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const cat of state.categories) {
      map.set(cat.id, cat.name)
    }
    return map
  }, [state.categories])

  const { totalEstimated, totalChecked, checkedCount, pendingCount } = useMemo(() => {
    let est = 0
    let chk = 0
    let chkCount = 0
    let pendCount = 0

    for (const item of shoppingList) {
      est += item.estimatedPrice
      if (item.checked) {
        chk += item.estimatedPrice
        chkCount++
      } else {
        pendCount++
      }
    }

    return {
      totalEstimated: est,
      totalChecked: chk,
      checkedCount: chkCount,
      pendingCount: pendCount,
    }
  }, [shoppingList])

  const filteredItems = useMemo(() => {
    if (filterTab === 'pending') return shoppingList.filter((item) => !item.checked)
    if (filterTab === 'checked') return shoppingList.filter((item) => item.checked)
    return shoppingList
  }, [shoppingList, filterTab])

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return

    const newItem: ShoppingItem = {
      id: uid('shop'),
      name: cleanName,
      estimatedPrice: Math.max(0, estimatedPrice),
      checked: false,
      categoryId: categoryId || undefined,
    }

    update((s) => ({
      ...s,
      shoppingList: [newItem, ...(s.shoppingList ?? [])],
    }))

    setName('')
    setEstimatedPrice(0)
  }

  const toggleCheck = (id: string) => {
    update((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    }))
  }

  const deleteItem = (id: string) => {
    const target = shoppingList.find((item) => item.id === id)
    if (!target) return

    update((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).filter((item) => item.id !== id),
    }))

    notify(`Barang "${target.name}" dihapus.`, {
      undo: () =>
        update((s) => ({
          ...s,
          shoppingList: [target, ...(s.shoppingList ?? [])],
        })),
    })
  }

  const toggleAll = (checked: boolean) => {
    update((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).map((item) => ({ ...item, checked })),
    }))
  }

  const clearCheckedItems = () => {
    const checked = shoppingList.filter((item) => item.checked)
    if (checked.length === 0) return

    update((s) => ({
      ...s,
      shoppingList: (s.shoppingList ?? []).filter((item) => !item.checked),
    }))

    notify(`${checked.length} barang selesai dihapus dari daftar belanja.`, {
      undo: () =>
        update((s) => ({
          ...s,
          shoppingList: [...checked, ...(s.shoppingList ?? [])],
        })),
    })
  }

  const handleCheckoutToExpenses = () => {
    const checkedItems = shoppingList.filter((item) => item.checked)
    if (checkedItems.length === 0) {
      notify('Pilih atau centang minimal 1 barang yang sudah dibeli terlebih dahulu.')
      return
    }

    // Resolusi kategori: ambil kategori yang paling sering muncul di checked items
    const catCounts = new Map<string, number>()
    for (const item of checkedItems) {
      const cat = item.categoryId || state.categories[0]?.id || 'makan'
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1)
    }

    let dominantCategory = state.categories[0]?.id ?? 'makan'
    let highestCount = -1
    for (const [cat, count] of catCounts.entries()) {
      if (count > highestCount) {
        highestCount = count
        dominantCategory = cat
      }
    }

    const note = `Belanja: ${checkedItems.map((item) => item.name).join(', ')}`
    const expenseAmount = totalChecked > 0 ? totalChecked : 0

    const newExpense: Expense = {
      id: uid('exp'),
      date: todayISO(),
      categoryId: dominantCategory,
      note,
      amount: expenseAmount,
    }

    const remainingItems = shoppingList.filter((item) => !item.checked)

    update((s) => ({
      ...s,
      expenses: [newExpense, ...s.expenses],
      shoppingList: remainingItems,
    }))

    notify(`Berhasil mencatat belanjaan ${formatIDR(expenseAmount)} ke pengeluaran! (${checkedItems.length} barang)`, {
      undo: () =>
        update((s) => ({
          ...s,
          expenses: s.expenses.filter((e) => e.id !== newExpense.id),
          shoppingList: [...checkedItems, ...(s.shoppingList ?? [])],
        })),
    })
  }

  return (
    <section className="card shopping-card" id="shopping-list-card">
      <header className="card-head">
        <div className="shopping-head-title">
          <div className="shopping-head-icon" aria-hidden="true">
            {ICON_CART}
          </div>
          <div>
            <h2>Daftar Rencana Belanja</h2>
            <p className="muted small">
              Tulis kebutuhan sebelum berbelanja, lalu catat otomatis ke pengeluaran saat barang selesai dibeli.
            </p>
          </div>
        </div>
        <div className="shopping-head-badges">
          <span className="chip chip-pending">
            {pendingCount} belum dibeli
          </span>
          {checkedCount > 0 && (
            <span className="chip chip-checked">
              {checkedCount} di keranjang
            </span>
          )}
        </div>
      </header>

      {/* Form tambah item baru */}
      <form className="shopping-form" onSubmit={handleAddItem}>
        <div className="shopping-form-row">
          <div className="field-group flex-2">
            <label htmlFor="shopping-name-input" className="small">Nama Barang</label>
            <input
              id="shopping-name-input"
              className="input"
              type="text"
              placeholder="Contoh: Minyak Goreng 2L"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field-group flex-1">
            <label htmlFor="shopping-price-input" className="small">Estimasi Harga (Rp)</label>
            <MoneyInput
              id="shopping-price-input"
              value={estimatedPrice}
              onValueChange={setEstimatedPrice}
              placeholder="0"
            />
          </div>

          <div className="field-group flex-1">
            <label htmlFor="shopping-category-select" className="small">Kategori</label>
            <CustomSelect
              id="shopping-category-select"
              className="input select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              title="Pilih Kategori Belanja"
            >
              {state.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </CustomSelect>
          </div>

          <div className="shopping-form-submit">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim()}
              id="shopping-add-btn"
            >
              + Tambah Barang
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="shopping-suggestions">
          <span className="muted small">Ide cepat:</span>
          {QUICK_SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              type="button"
              className="chip chip-suggestion"
              onClick={() => setName(sug)}
            >
              {sug}
            </button>
          ))}
        </div>
      </form>

      {/* Filter Tabs & Bulk Actions */}
      <div className="shopping-controls">
        <div className="shopping-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'all'}
            className={`shopping-tab${filterTab === 'all' ? ' active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            Semua ({shoppingList.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'pending'}
            className={`shopping-tab${filterTab === 'pending' ? ' active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            Belum Dibeli ({pendingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'checked'}
            className={`shopping-tab${filterTab === 'checked' ? ' active' : ''}`}
            onClick={() => setFilterTab('checked')}
          >
            Di Keranjang ({checkedCount})
          </button>
        </div>

        {shoppingList.length > 0 && (
          <div className="shopping-bulk-actions">
            {checkedCount < shoppingList.length ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => toggleAll(true)}
              >
                Pilih Semua
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => toggleAll(false)}
              >
                Batal Pilih
              </button>
            )}

            {checkedCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-danger"
                onClick={clearCheckedItems}
                title="Hapus barang yang sudah diceklis dari daftar"
              >
                Hapus Diceklis
              </button>
            )}
          </div>
        )}
      </div>

      {/* List items */}
      {filteredItems.length === 0 ? (
        <div className="shopping-empty">
          <div className="shopping-empty-icon" aria-hidden="true">
            {ICON_CHECKLIST}
          </div>
          <p className="muted">
            {filterTab === 'all'
              ? 'Daftar belanja masih kosong. Tambahkan barang kebutuhanmu di atas sebelum berbelanja!'
              : filterTab === 'pending'
              ? 'Semua barang sudah masuk ke keranjang!'
              : 'Belum ada barang yang diceklis/masuk keranjang.'}
          </p>
        </div>
      ) : (
        <ul className="shopping-list" role="list">
          {filteredItems.map((item) => {
            const catName = item.categoryId ? categoryMap.get(item.categoryId) : undefined
            return (
              <li
                key={item.id}
                className={`shopping-item${item.checked ? ' is-checked' : ''}`}
              >
                <label className="shopping-checkbox-label">
                  <input
                    type="checkbox"
                    className="shopping-checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(item.id)}
                    aria-label={`Tandai ${item.name} selesai`}
                  />
                  <span className="shopping-item-name">{item.name}</span>
                </label>

                <div className="shopping-item-meta">
                  {catName && (
                    <span className="chip chip-cat-tag">
                      {catName}
                    </span>
                  )}
                  <span className="shopping-item-price">
                    {item.estimatedPrice > 0 ? formatIDR(item.estimatedPrice) : 'Rp 0'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon shopping-delete-btn"
                    onClick={() => deleteItem(item.id)}
                    aria-label={`Hapus ${item.name}`}
                    title="Hapus barang"
                  >
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Summary Footer & One-Click Checkout */}
      {shoppingList.length > 0 && (
        <footer className="shopping-footer">
          <div className="shopping-totals">
            <div className="shopping-total-row">
              <span className="muted small">Total Estimasi Belanja:</span>
              <strong className="shopping-total-val">{formatIDR(totalEstimated)}</strong>
            </div>
            {checkedCount > 0 && (
              <div className="shopping-total-row text-highlight">
                <span className="small">Siap Dicatat ({checkedCount} barang):</span>
                <strong className="shopping-total-val">{formatIDR(totalChecked)}</strong>
              </div>
            )}
          </div>

          <div className="shopping-action-row">
            <button
              type="button"
              className="btn btn-primary shopping-checkout-btn"
              onClick={handleCheckoutToExpenses}
              disabled={checkedCount === 0}
              id="shopping-checkout-button"
            >
              Catat ke Pengeluaran ({checkedCount}) · {formatIDR(totalChecked)}
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}
