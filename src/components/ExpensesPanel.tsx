import { useMemo, useState, type FormEvent } from 'react'
import type { AppState, Category, Expense, Notify } from '../types'
import type { Updater } from '../hooks/useAppState'
import { CATEGORY_COLORS, SAVINGS_CATEGORY, primaryGoal, isSavingsOrEmergencyCategory } from '../lib/state'
import { deleteReceipt, saveReceipt } from '../lib/receipts'
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money'
import { uid } from '../lib/id'
import { useI18n } from '../lib/i18n'
import { MoneyInput } from './MoneyInput'
import { ReceiptView } from './ReceiptView'
import { CustomSelect } from './CustomSelect'
import { ICON_CLOSE } from './icons'

interface Props {
  state: AppState
  update: Updater
  notify: Notify
}

const QUICK_ADDS = [5_000, 10_000, 20_000]

export function ExpensesPanel({ state, update, notify }: Props) {
  const { t, language } = useI18n()
  const [date, setDate] = useState(todayISO())
  const [categoryId, setCategoryId] = useState(() => state.categories[0]?.id ?? 'makan')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(0)
  const [walletId, setWalletId] = useState('')
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
        const walletName = item.walletId ? state.wallets.find((w) => w.id === item.walletId)?.name ?? '' : ''
        const haystack = `${item.note} ${catName} ${walletName} ${item.amount} ${formatIDR(item.amount)}`.toLowerCase()
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
    setWalletId('')
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

        let nextWallets = s.wallets
        const prevWalletId = previous?.walletId
        const prevAmount = previous?.amount ?? 0

        if (prevWalletId === walletId && walletId) {
          const delta = amount - prevAmount
          nextWallets = nextWallets.map((w) =>
            w.id === walletId ? { ...w, balance: Math.max(0, w.balance - delta) } : w,
          )
        } else {
          if (prevWalletId) {
            nextWallets = nextWallets.map((w) =>
              w.id === prevWalletId ? { ...w, balance: w.balance + prevAmount } : w,
            )
          }
          if (walletId) {
            nextWallets = nextWallets.map((w) =>
              w.id === walletId ? { ...w, balance: Math.max(0, w.balance - amount) } : w,
            )
          }
        }

        return {
          ...s,
          endSavings: nextEndSavings,
          wallets: nextWallets,
          expenses: s.expenses.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  date,
                  categoryId,
                  note,
                  amount,
                  goalId,
                  wishlistId,
                  receiptId: receiptId ?? undefined,
                  walletId: walletId || undefined,
                }
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
        walletId: walletId || undefined,
      }
      update((s) => {
        let nextWallets = s.wallets
        if (walletId) {
          nextWallets = s.wallets.map((w) =>
            w.id === walletId ? { ...w, balance: Math.max(0, w.balance - amount) } : w,
          )
        }
        return {
          ...s,
          endSavings: isSavings ? Math.max(0, s.endSavings - amount) : s.endSavings,
          wallets: nextWallets,
          expenses: [expense, ...s.expenses],
        }
      })
    }
    resetForm()
  }

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setDate(expense.date)
    setCategoryId(expense.categoryId)
    setWalletId(expense.walletId ?? '')
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
    const targetWalletId = target.walletId

    update((s) => {
      let nextWallets = s.wallets
      if (targetWalletId) {
        nextWallets = nextWallets.map((w) =>
          w.id === targetWalletId ? { ...w, balance: w.balance + target.amount } : w,
        )
      }
      return {
        ...s,
        endSavings: wasSavings ? s.endSavings + target.amount : s.endSavings,
        wallets: nextWallets,
        expenses: s.expenses.filter((item) => item.id !== id),
      }
    })
    if (target.receiptId) void deleteReceipt(target.receiptId)
    if (editingId === id) resetForm()
    notify('Catatan dihapus.', {
      undo: () =>
        update((s) => {
          const next = [...s.expenses]
          next.splice(Math.min(index, next.length), 0, { ...target, receiptId: undefined })
          let nextWallets = s.wallets
          if (targetWalletId) {
            nextWallets = nextWallets.map((w) =>
              w.id === targetWalletId ? { ...w, balance: Math.max(0, w.balance - target.amount) } : w,
            )
          }
          return {
            ...s,
            endSavings: wasSavings ? Math.max(0, s.endSavings - target.amount) : s.endSavings,
            wallets: nextWallets,
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
        <h2>{t('expenses.title')}</h2>
        <span className="muted small">
          {language === 'en'
            ? `${state.expenses.length} ${state.expenses.length === 1 ? 'entry' : 'entries'}`
            : `${state.expenses.length} catatan`}
        </span>
      </header>

      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="exp-date">{t('expenses.date')}</label>
          <input id="exp-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="exp-cat">{t('expenses.category')}</label>
          <CustomSelect id="exp-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} title={language === 'en' ? 'Select Expense Category' : 'Pilih Kategori Pengeluaran'}>
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.ratio > 0 ? ` (${Math.round(category.ratio * 100)}%)` : ''}
              </option>
            ))}
          </CustomSelect>
          {isSavingsOrEmergencyCategory(categoryId, state.categories) && (
            <p className="small" style={{ color: 'var(--primary)', margin: '4px 0 0 0' }}>
              {language === 'en'
                ? `Spending in this category automatically deducts from your End-of-Period Savings (current balance: ${formatIDR(state.endSavings)}).`
                : `Pengeluaran di kategori ini otomatis motong Tabungan Akhir Periode kamu ya (saldo saat ini: ${formatIDR(state.endSavings)}).`}
            </p>
          )}
          <button type="button" className="link" onClick={() => setShowCategoryForm((v) => !v)}>
            {showCategoryForm ? t('expenses.cancelAddCat') : t('expenses.addCategory')}
          </button>
          {showCategoryForm && (
            <div className="inline-form">
              <input
                className="input"
                placeholder={t('expenses.catNamePlaceholder')}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="button" className="btn btn-sm" onClick={addCategory}>
                {t('expenses.addBtn')}
              </button>
            </div>
          )}
        </div>
        {categoryId === SAVINGS_CATEGORY && (state.goals.length > 0 || state.wishlist.length > 0) && (
          <div className="field">
            <label htmlFor="exp-goal">{t('expenses.targetLabel')}</label>
            <CustomSelect id="exp-goal" className="input" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} title={language === 'en' ? 'Allocate to Goal' : 'Masukkan ke Target Tabungan'}>
              {state.goals.length > 0 && <option value="auto">{t('expenses.autoGoal')}</option>}
              <option value="none">{t('expenses.noneGoal')}</option>
              {state.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name} · {t('expenses.targetGoalSuffix')}
                </option>
              ))}
              {state.wishlist.map((item) => (
                <option key={item.id} value={`wish:${item.id}`}>
                  {item.name} · {t('expenses.targetWishSuffix')}
                </option>
              ))}
            </CustomSelect>
            <span className="muted small">{t('expenses.targetNotice')}</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="exp-wallet">{t('expenses.walletLabel')}</label>
          <CustomSelect
            id="exp-wallet"
            className="input"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            title={language === 'en' ? 'Select Funding Wallet' : 'Pilih Sumber Dana Pengeluaran'}
          >
            <option value="">{t('expenses.noWallet')}</option>
            {state.wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name} ({language === 'en' ? 'Balance' : 'Saldo'}: {formatIDR(wallet.balance)})
              </option>
            ))}
          </CustomSelect>
          {walletId && (() => {
            const selected = state.wallets.find((w) => w.id === walletId)
            if (!selected) return null
            const sisa = Math.max(0, selected.balance - amount)
            return (
              <p className="small" style={{ color: 'var(--primary)', margin: '4px 0 0 0' }}>
                {language === 'en'
                  ? `Current ${selected.name} balance: ${formatIDR(selected.balance)} (remaining after recording: ${formatIDR(sisa)}).`
                  : `Saldo ${selected.name} saat ini: ${formatIDR(selected.balance)} (sisa setelah dicatat: ${formatIDR(sisa)}).`}
              </p>
            )
          })()}
        </div>

        <div className="field">
          <label htmlFor="exp-note">{t('expenses.noteLabel')}</label>
          <input
            id="exp-note"
            className="input"
            placeholder={t('expenses.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="exp-amount">{t('expenses.amountLabel')}</label>
          <MoneyInput value={amount} onValueChange={setAmount} id="exp-amount" />
          <div className="quick-row">
            {QUICK_ADDS.map((value) => (
              <button key={value} type="button" className="chip chip-btn" onClick={() => setAmount((prev) => prev + value)}>
                +{formatIDR(value)}
              </button>
            ))}
            {amount > 0 && (
              <button type="button" className="chip chip-btn" onClick={() => setAmount(0)}>
                {t('expenses.clear')}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="exp-receipt">{t('expenses.receiptLabel')}</label>
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
                .catch(() => setReceiptError(t('expenses.receiptError')))
            }}
          />
          {receiptId && (
            <div className="inline-form">
              <span className="chip">{t('expenses.receiptAttached')}</span>
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
                {t('expenses.receiptDetach')}
              </button>
            </div>
          )}
          {receiptError && <span className="text-danger small">{receiptError}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={amount <= 0}>
            {editingId ? t('expenses.saveChange') : t('expenses.submit')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              {t('expenses.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="filter-panel-card">
        <div className="filter-row">
          <div className="search-input-wrap">
            <input
              className="input input-search"
              placeholder={t('expenses.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('expenses.searchAria')}
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                aria-label={language === 'en' ? 'Clear search' : 'Bersihkan pencarian'}
                title={language === 'en' ? 'Clear keywords' : 'Hapus kata kunci'}
              >
                {ICON_CLOSE}
              </button>
            )}
          </div>
          <CustomSelect className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter kategori" title={language === 'en' ? 'Filter Category' : 'Filter Kategori'}>
            <option value="all">{t('expenses.filterCatAll')}</option>
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </CustomSelect>
          <CustomSelect className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter bulan" title={language === 'en' ? 'Filter Month' : 'Filter Bulan'}>
            <option value="all">{t('expenses.filterMonthAll')}</option>
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </CustomSelect>
          <CustomSelect className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'date_asc' | 'amount' | 'amount_asc')} aria-label="Urutan" title={language === 'en' ? 'Sort Order' : 'Urutan Catatan'}>
            <option value="date">{t('expenses.sortNewest')}</option>
            <option value="date_asc">{t('expenses.sortOldest')}</option>
            <option value="amount">{t('expenses.sortLargest')}</option>
            <option value="amount_asc">{t('expenses.sortSmallest')}</option>
          </CustomSelect>
        </div>

        <div className="quick-filter-chips">
          <button
            type="button"
            className={`filter-chip${timeRange === 'all' ? ' filter-chip-active' : ''}`}
            onClick={() => setTimeRange('all')}
          >
            {t('expenses.rangeAll')}
          </button>
          <button
            type="button"
            className={`filter-chip${timeRange === 'this_month' ? ' filter-chip-active' : ''}`}
            onClick={() => setTimeRange('this_month')}
          >
            {t('expenses.rangeThisMonth')}
          </button>
          <button
            type="button"
            className={`filter-chip${timeRange === 'last_7_days' ? ' filter-chip-active' : ''}`}
            onClick={() => setTimeRange('last_7_days')}
          >
            {t('expenses.range7Days')}
          </button>
        </div>

        <div className="filter-summary-row">
          <span className="muted small">
            {language === 'en'
              ? `Showing ${visible.length} of ${state.expenses.length} entries · Total `
              : `Menampilkan ${visible.length} dari ${state.expenses.length} catatan · Total `}
            <strong>{formatIDR(totalVisible)}</strong>
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
          const wallet = item.walletId ? state.wallets.find((w) => w.id === item.walletId) : undefined
          return (
            <li key={item.id} className={`tx${editingId === item.id ? ' tx-active' : ''}`}>
              <span className="tx-dot" style={{ background: category?.color ?? '#868e96' }} />
              <span className="tx-main">
                <strong>{item.note || category?.name || (language === 'en' ? 'Expense' : 'Pengeluaran')}</strong>
                <span className="muted small">
                  {formatShortDate(item.date)} · {category?.name ?? (language === 'en' ? 'Uncategorized' : 'Tanpa kategori')}
                  {wallet && ` · ${wallet.name}`}
                </span>
              </span>
              <span className="tx-amount tx-out tabular-nums">
                <span className="tx-kind-badge tx-kind-out" aria-label={language === 'en' ? 'Expense' : 'Pengeluaran'}>
                  <span aria-hidden="true">↓</span> {language === 'en' ? 'Out' : 'Keluar'}
                </span>
                −{formatIDR(item.amount)}
              </span>
              <span className="tx-actions">
                {item.receiptId && <ReceiptView id={item.receiptId} />}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>
                  {t('expenses.edit')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(item.id)}>
                  {t('expenses.delete')}
                </button>
              </span>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li className="empty empty-state-box">
            <span className="empty-state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <strong>{language === 'en' ? 'No expense entries yet' : 'Belum ada catatan pengeluaran'}</strong>
            <span className="muted small">
              {query || filterCategory !== 'all' || filterMonth !== 'all' || timeRange !== 'all'
                ? (language === 'en' ? 'No expenses match your active filter.' : 'Tidak ada pengeluaran yang cocok dengan filter kamu.')
                : (language === 'en' ? 'Start recording your expenses with the form above or the [+ Expense] button!' : 'Yuk catat pengeluaran pertamamu lewat form di atas atau tombol [+ Pengeluaran]!')}
            </span>
          </li>
        )}
      </ul>
    </section>
  )
}
