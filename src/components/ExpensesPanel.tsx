import { useMemo, useState, type FormEvent } from 'react'
import type { AppState, Category, Expense } from '../types'
import type { Updater } from '../hooks/useAppState'
import { CATEGORY_COLORS, SAVINGS_CATEGORY, primaryGoal } from '../lib/state'
import { BUILTIN_PRESETS, applyPreset, savePreset } from '../lib/presets'
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money'
import { uid } from '../lib/id'
import { MoneyInput } from './MoneyInput'

interface Props {
  state: AppState
  update: Updater
}

const QUICK_ADDS = [5_000, 10_000, 20_000]

export function ExpensesPanel({ state, update }: Props) {
  const [date, setDate] = useState(todayISO())
  const [categoryId, setCategoryId] = useState(() => state.categories[0]?.id ?? 'makan')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(0)
  const [goalTarget, setGoalTarget] = useState('auto')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [presetId, setPresetId] = useState('')

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
    const list = state.expenses.filter((item) => {
      if (filterCategory !== 'all' && item.categoryId !== filterCategory) return false
      if (filterMonth !== 'all' && monthKey(item.date) !== filterMonth) return false
      if (keyword) {
        const haystack = `${item.note} ${categoryMap.get(item.categoryId)?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      return true
    })

    return list.sort((a, b) =>
      sortBy === 'amount' ? b.amount - a.amount : b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    )
  }, [state.expenses, filterCategory, filterMonth, query, sortBy, categoryMap])

  const totalVisible = visible.reduce((sum, item) => sum + item.amount, 0)

  const resetForm = () => {
    setNote('')
    setAmount(0)
    setGoalTarget('auto')
    setEditingId(null)
  }

  const resolveGoalId = (): string | undefined => {
    if (categoryId !== SAVINGS_CATEGORY || goalTarget === 'none') return undefined
    if (goalTarget === 'auto') return primaryGoal(state.goals)?.id
    return goalTarget
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (amount <= 0) return
    const goalId = resolveGoalId()

    if (editingId) {
      update((s) => ({
        ...s,
        expenses: s.expenses.map((item) =>
          item.id === editingId ? { ...item, date, categoryId, note, amount, goalId } : item,
        ),
      }))
    } else {
      const expense: Expense = { id: uid('exp'), date, categoryId, note: note.trim(), amount, goalId }
      update((s) => ({ ...s, expenses: [expense, ...s.expenses] }))
    }
    resetForm()
  }

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setDate(expense.date)
    setCategoryId(expense.categoryId)
    setNote(expense.note)
    setAmount(expense.amount)
    setGoalTarget(expense.goalId ?? 'auto')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = (id: string) => {
    update((s) => ({ ...s, expenses: s.expenses.filter((item) => item.id !== id) }))
    if (editingId === id) resetForm()
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

  const applyPresetId = () => {
    const preset = [...BUILTIN_PRESETS, ...state.presets].find((item) => item.id === presetId)
    if (!preset) return
    update((s) => ({ ...s, categories: applyPreset(s.categories, preset) }))
    setPresetId('')
  }

  const saveCurrentAsPreset = () => {
    const name = window.prompt('Nama preset baru', `Preset ${state.presets.length + 1}`)
    if (name === null) return
    update((s) => ({ ...s, presets: savePreset(s.presets, name, s.categories) }))
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
          <select id="exp-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {state.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.ratio > 0 ? ` (${Math.round(category.ratio * 100)}%)` : ''}
              </option>
            ))}
          </select>
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
          <div className="inline-form">
            <select
              className="input"
              aria-label="Preset kategori"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              <option value="">Preset kategori…</option>
              {BUILTIN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} (bawaan)
                </option>
              ))}
              {state.presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-sm" disabled={presetId === ''} onClick={applyPresetId}>
              Terapkan
            </button>
          </div>
          <button type="button" className="link" onClick={saveCurrentAsPreset}>
            Simpan kategori saat ini sebagai preset
          </button>
        </div>

        {categoryId === SAVINGS_CATEGORY && state.goals.length > 0 && (
          <div className="field">
            <label htmlFor="exp-goal">Masukkan ke target</label>
            <select id="exp-goal" className="input" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)}>
              <option value="auto">Target utama (otomatis)</option>
              <option value="none">Tidak masuk target</option>
              {state.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </select>
            <span className="muted small">Saldo tabungan pada target itu ikut bertambah.</span>
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

      <div className="filter-row">
        <input
          className="input input-search"
          placeholder="Cari pengeluaran…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari pengeluaran"
        />
        <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter kategori">
          <option value="all">Semua kategori</option>
          {state.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter bulan">
          <option value="all">Semua bulan</option>
          {months.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')} aria-label="Urutan">
          <option value="date">Terbaru</option>
          <option value="amount">Nominal terbesar</option>
        </select>
      </div>

      <p className="muted small">
        Menampilkan {visible.length} dari {state.expenses.length} catatan · total {formatIDR(totalVisible)}
      </p>

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
