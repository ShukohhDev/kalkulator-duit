import { useMemo, useState, type FormEvent } from 'react'
import type { AppState, Category, Expense, Notify } from '../types'
import type { Updater } from '../hooks/useAppState'
import { CATEGORY_COLORS, SAVINGS_CATEGORY, primaryGoal, isSavingsOrEmergencyCategory } from '../lib/state'
import { deleteReceipt, saveReceipt } from '../lib/receipts'
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'
import { ReceiptView } from './ReceiptView'
import { CustomSelect } from './CustomSelect'

interface Props {
  state: AppState
  update: Updater
  notify: Notify
}

const QUICK_ADDS = [5_000, 10_000, 20_000]

export function ExpensesPanel({ state, update, notify }: Props) {
  const [date, setDate] = useState(todayISO())
  const [categoryId, setCategoryId] = useState(() => state.categories[0]?.id ?? 'makan')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(0)
  const [goalTarget, setGoalTarget] = useState('auto')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState('')

  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [timeRange, setTimeRange] = useState<'all' | 'this_month' | 'last_7_days'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'date_asc' | 'amount' | 'amount_asc'>('date')

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const months = useMemo(() => {
    const keys = new Set(state.expenses.map((item) => monthKey(item.date)))
    return [...keys].sort().reverse()
  }, [state.expenses])

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    for (const category of state.categories) map.set(category.id, category)
    return map
  }, [state.categories])

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const nowISO = todayISO()
    const thisMonth = monthKey(nowISO)

    const list = state.expenses.filter((item) => {
      if (filterCategory !== 'all' && item.categoryId !== filterCategory) return false
      if (filterMonth !== 'all' && monthKey(item.date) !== filterMonth) return false
      if (timeRange === 'this_month' && monthKey(item.date) !== thisMonth) return false
      if (timeRange === 'last_7_days') {
        const itemDate = new Date(item.date)
        const diffMs = new Date().getTime() - itemDate.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays < 0 || diffDays > 7) return false
      }
      if (keyword) {
        const catName = categoryMap.get(item.categoryId)?.name ?? ''
        const haystack = `${item.note} ${catName} ${item.amount} ${formatIDR(item.amount)}`.toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      return true
    })

    return list.sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount
      if (sortBy === 'amount_asc') return a.amount - b.amount
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    })
  }, [state.expenses, filterCategory, filterMonth, timeRange, query, sortBy, categoryMap])

  const totalVisible = visible.reduce((sum, item) => sum + item.amount, 0)
  const hasActiveFilter = query !== '' || filterCategory !== 'all' || filterMonth !== 'all' || timeRange !== 'all'

  const resetForm = () => {
    setNote('')
    setAmount(0)
    setGoalTarget('auto')
    setEditingId(null)
    setReceiptId(null)
    setReceiptError('')
  }

  const resolveTarget = (): { goalId?: string; wishlistId?: string } => {
    if (categoryId !== SAVINGS_CATEGORY || goalTarget === 'none') return {}
    if (goalTarget.startsWith('wish:')) return { wishlistId: goalTarget.slice(5) }
    if (goalTarget === 'auto') return { goalId: primaryGoal(state.goals)?.id }
    return { goalId: goalTarget }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (amount <= 0) return
    const { goalId, wishlistId } = resolveTarget()

    if (editingId) {
      const previous = state.expenses.find((item) => item.id === editingId)
      const wasSavings = previous ? isSavingsOrEmergencyCategory(previous.categoryId, state.categories) : false
      const isSavings = isSavingsOrEmergencyCategory(categoryId, state.categories)

      update((s) => {
        let nextEndSavings = s.endSavings
        if (wasSavings && isSavings) {
          const delta = amount - (previous?.amount ?? 0)
          nextEndSavings = Math.max(0, nextEndSavings - delta)
        } else if (wasSavings && !isSavings) {
          nextEndSavings = nextEndSavings + (previous?.amount ?? 0)
        } else if (!wasSavings && isSavings) {
          nextEndSavings = Math.max(0, nextEndSavings - amount)
        }

        return {
          ...s,
          endSavings: nextEndSavings,
          expenses: s.expenses.map((item) =>
            item.id === editingId
              ? { ...item, date, categoryId, note, amount, goalId, wishlistId, receiptId: receiptId ?? undefined }
              : item,
          ),
        }
      })
      if (previous?.receiptId && previous.receiptId !== receiptId) void deleteReceipt(previous.receiptId)
    } else {
      const isSavings = isSavingsOrEmergencyCategory(categoryId, state.categories)
      const expense: Expense = {
        id: uid('exp'),
        date,
        categoryId,
        note: note.trim(),
        amount,
        goalId,
        wishlistId,
        receiptId: receiptId ?? undefined,
      }
      update((s) => ({
        ...s,
        endSavings: isSavings ? Math.max(0, s.endSavings - amount) : s.endSavings,
        expenses: [expense, ...s.expenses],
      }))
    }
    resetForm()
  }

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setDate(expense.date)
    setCategoryId(expense.categoryId)
    setNote(expense.note)
    setAmount(expense.amount)
    setGoalTarget(expense.wishlistId ? `wish:${expense.wishlistId}` : (expense.goalId ?? 'auto'))
    setReceiptId(expense.receiptId ?? null)
    setReceiptError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = (id: string) => {
    const index = state.expenses.findIndex((item) => item.id === id)
    const target = state.expenses[index]
    if (!target) return
    const wasSavings = isSavingsOrEmergencyCategory(target.categoryId, state.categories)

    update((s) => ({
      ...s,
      endSavings: wasSavings ? s.endSavings + target.amount : s.endSavings,
      expenses: s.expenses.filter((item) => item.id !== id),
    }))
    if (target.receiptId) void deleteReceipt(target.receiptId)
    if (editingId === id) resetForm()
    notify('Catatan dihapus.', {
      undo: () =>
        update((s) => {
          const next = [...s.expenses]
          next.splice(Math.min(index, next.length), 0, { ...target, receiptId: undefined })
          return {
            ...s,
            endSavings: wasSavings ? Math.max(0, s.endSavings - target.amount) : s.endSavings,
            expenses: next,
          }
        }),
    })
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    const category: Category = {
      id: uid('cat'),
      name,
      ratio: 0,
      builtin: false,
      color: CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length],
    }
    update((s) => ({ ...s, categories: [...s.categories, category] }))
    setCategoryId(category.id)
    setNewCategory('')
    setShowCategoryForm(false)
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Pengeluaran</h2>
        <span className="muted small">{state.expenses.length} catatan</span>
      </header>

      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="exp-date">Tanggal</label>
          <input id="exp-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="exp-cat">Kategori</label>
          <CustomSelect id="exp-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} title="Pilih Kategori Pengeluaran">
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.ratio > 0 ? ` (${Math.round(category.ratio * 100)}%)` : ''}
              </option>
            ))}
          </CustomSelect>
          {isSavingsOrEmergencyCategory(categoryId, state.categories) && (
            <p className="small" style={{ color: 'var(--primary)', margin: '4px 0 0 0' }}>
              Pengeluaran kategori ini memotong saldo Tabungan Akhir Periode (saldo saat ini: {formatIDR(state.endSavings)}).
            </p>
          )}
          <button type="button" className="link" onClick={() => setShowCategoryForm((v) => !v)}>
            {showCategoryForm ? 'Batal tambah kategori' : '+ Tambah kategori sendiri'}
          </button>
          {showCategoryForm && (
            <div className="inline-form">
              <input
                className="input"
                placeholder="Nama kategori (mis. Beli Buku)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="button" className="btn btn-sm" onClick={addCategory}>
                Tambah
              </button>
            </div>
          )}
        </div>
        {categoryId === SAVINGS_CATEGORY && (state.goals.length > 0 || state.wishlist.length > 0) && (
          <div className="field">
            <label htmlFor="exp-goal">Masukkan ke</label>
            <CustomSelect id="exp-goal" className="input" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} title="Masukkan ke Target Tabungan">
              {state.goals.length > 0 && <option value="auto">Target utama (otomatis)</option>}
              <option value="none">Tidak masuk target/incaran</option>
              {state.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name} · target tabungan
                </option>
              ))}
              {state.wishlist.map((item) => (
                <option key={item.id} value={`wish:${item.id}`}>
                  {item.name} · incaran
                </option>
              ))}
            </CustomSelect>
            <span className="muted small">Saldo tabungan/incaran yang dipilih ikut bertambah.</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="exp-note">Untuk apa</label>
          <input
            id="exp-note"
            className="input"
            placeholder="mis. nasi goreng di kantin"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="exp-amount">Nominal</label>
          <MoneyInput value={amount} onValueChange={setAmount} id="exp-amount" />
          <div className="quick-row">
            {QUICK_ADDS.map((value) => (
              <button key={value} type="button" className="chip chip-btn" onClick={() => setAmount((prev) => prev + value)}>
                +{formatIDR(value)}
              </button>
            ))}
            {amount > 0 && (
              <button type="button" className="chip chip-btn" onClick={() => setAmount(0)}>
                Kosongkan
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="exp-receipt">Bukti (opsional)</label>
          <input
            id="exp-receipt"
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setReceiptError('')
              saveReceipt(file)
                .then((id) => setReceiptId(id))
                .catch(() => setReceiptError('Gagal menyimpan bukti di browser.'))
            }}
          />
          {receiptId && (
            <div className="inline-form">
              <span className="chip">Bukti terlampir</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const previous = editingId
                    ? state.expenses.find((item) => item.id === editingId)?.receiptId
                    : undefined
                  if (previous && previous !== receiptId) void deleteReceipt(previous)
                  setReceiptId(null)
                }}
              >
                Lepas
              </button>
            </div>
          )}
          {receiptError && <span className="text-danger small">{receiptError}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={amount <= 0}>
            {editingId ? 'Simpan perubahan' : 'Catat pengeluaran'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="filter-panel-card">
        <div className="filter-row">
          <div className="search-input-wrap">
            <input
              className="input input-search"
              placeholder="Cari catatan, kategori, atau nominal…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari pengeluaran"
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                aria-label="Bersihkan pencarian"
                title="Hapus kata kunci"
              >
                ×
              </button>
            )}
          </div>
          <CustomSelect className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter kategori" title="Filter Kategori">
            <option value="all">Semua kategori</option>
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </CustomSelect>
          <CustomSelect className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter bulan" title="Filter Bulan">
            <option value="all">Semua bulan</option>
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </CustomSelect>
          <CustomSelect className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'date_asc' | 'amount' | 'amount_asc')} aria-label="Urutan" title="Urutan Catatan">
            <option value="date">Terbaru</option>
            <option value="date_asc">Terlama</option>
            <option value="amount">Nominal terbesar</option>
            <option value="amount_asc">Nominal terkecil</option>
          </CustomSelect>
        </div>

        <div className="quick-filter-chips">
          <button
            type="button"
            className={`filter-chip${timeRange === 'all' ? ' filter-chip-active' : ''}`}
            onClick={() => setTimeRange('all')}
          >
            Semua Periode
          </button>
          <button
            type="button"
            className={`filter-chip${timeRange === 'this_month' ? ' filter-chip-active' : ''}`}
            onClick={() => setTimeRange('this_month')}
          >
            Bulan Ini
          </button>
          <button
            type="button"
            className={`filter-chip${timeRange === 'last_7_days' ? ' filter-chip-active' : ''}`}
            onClick={() => setTimeRange('last_7_days')}
          >
            7 Hari Terakhir
          </button>
        </div>

        <div className="filter-summary-row">
          <span className="muted small">
            Menampilkan {visible.length} dari {state.expenses.length} catatan · Total <strong>{formatIDR(totalVisible)}</strong>
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              className="btn btn-ghost btn-sm filter-reset-btn"
              onClick={() => {
                setQuery('')
                setFilterCategory('all')
                setFilterMonth('all')
                setTimeRange('all')
              }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      <ul className="tx-list">
        {visible.map((item) => {
          const category = categoryMap.get(item.categoryId)
          return (
            <li key={item.id} className={`tx${editingId === item.id ? ' tx-active' : ''}`}>
              <span className="tx-dot" style={{ background: category?.color ?? '#868e96' }} />
              <span className="tx-main">
                <strong>{item.note || category?.name || 'Pengeluaran'}</strong>
                <span className="muted small">
                  {formatShortDate(item.date)} · {category?.name ?? 'Tanpa kategori'}
                </span>
              </span>
              <span className="tx-amount">−{formatIDR(item.amount)}</span>
              <span className="tx-actions">
                {item.receiptId && <ReceiptView id={item.receiptId} />}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>
                  Ubah
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(item.id)}>
                  Hapus
                </button>
              </span>
            </li>
          )
        })}
        {visible.length === 0 && <li className="empty">Belum ada pengeluaran yang cocok.</li>}
      </ul>
    </section>
  )
}
