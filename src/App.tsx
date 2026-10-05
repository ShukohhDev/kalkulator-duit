import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { derive } from './lib/derive'
import { buildInsights } from './lib/insights'
import { notifyDue } from './lib/obligations'
import { applyProfile as applyProfileToCategories, findProfile } from './lib/profiles'
import { initialState } from './lib/state'
import { clearState } from './lib/storage'
import type { Notify, ProfileId } from './types'
import { AllowanceCard } from './components/AllowanceCard'
import { AllocationDonut } from './components/AllocationDonut'
import { CalendarHeatmap } from './components/CalendarHeatmap'
import { Calculator } from './components/Calculator'
import { CashflowChart } from './components/CashflowChart'
import { DataControls } from './components/DataControls'
import { DompetPanel } from './components/DompetPanel'
import { ExpensesPanel } from './components/ExpensesPanel'
import { IncomePanel } from './components/IncomePanel'
import { InsightsPanel } from './components/InsightsPanel'
import { MonthCompare } from './components/MonthCompare'
import { ObligationsPanel } from './components/ObligationsPanel'
import { PeriodPicker } from './components/PeriodPicker'
import { ReportCard } from './components/ReportCard'
import { SavingsPanel } from './components/SavingsPanel'
import { QuickEntry } from './components/QuickEntry'
import { SectionNav, type NavItem } from './components/SectionNav'
import { TotalAsetCard } from './components/TotalAsetCard'
import { TrendPanel } from './components/TrendPanel'
import { WalletCards } from './components/WalletCards'
import { WishlistPanel } from './components/WishlistPanel'

const SUN_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

const MOON_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-beranda', label: 'Beranda' },
  { id: 'nav-catat', label: 'Catat' },
  { id: 'nav-kewajiban', label: 'Kewajiban' },
  { id: 'nav-analisis', label: 'Analisis' },
  { id: 'nav-tabungan', label: 'Tabungan' },
  { id: 'nav-laporan', label: 'Laporan' },
  { id: 'nav-data', label: 'Data' },
]

export default function App() {
  const { state, update, replace, saved } = useAppState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [quick, setQuick] = useState<'expense' | 'income' | null>(null)
  const [toast, setToast] = useState<{ text: string; error?: boolean; undo?: () => void } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const derived = useMemo(() => derive(state), [state])
  const insights = useMemo(() => buildInsights(state, derived), [state, derived])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    notifyDue(state)
  }, [state])

  useEffect(() => {
    if (!calcOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalcOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [calcOpen])

  useEffect(() => {
    if (!openPanel && !quick) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (openPanel) setOpenPanel(null)
      else setQuick(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openPanel, quick])

  const pickMode = (mode: 'week' | 'month') => {
    update((s) => ({ ...s, mode }))
    setPickerOpen(false)
  }

  const applyProfile = (profileId: ProfileId) => {
    const profile = findProfile(profileId)
    update((s) => ({ ...s, profile: profileId, categories: applyProfileToCategories(s.categories, profile) }))
  }

  const resetAll = () => {
    clearState()
    replace(initialState())
  }

  const notify: Notify = (text, options) => {
    setToast({ text, error: options?.error, undo: options?.undo })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), options?.undo ? 6000 : 2500)
  }

  const togglePanel = (id: string) => {
    if (id === 'nav-beranda') {
      setOpenPanel(null)
      return
    }
    setOpenPanel((prev) => (prev === id ? null : id))
  }

  const toggleQuick = (mode: 'expense' | 'income') => {
    setOpenPanel(null)
    setQuick((prev) => (prev === mode ? null : mode))
  }

  const sectionClass = (id: string) => `nav-section${openPanel === id ? ' nav-section-window' : ''}`

  const windowHead = (id: string) => {
    const label = NAV_ITEMS.find((item) => item.id === id)?.label ?? ''
    const open = openPanel === id
    return (
      <header className="window-head">
        <h2>{label}</h2>
        {open && (
          <button
            type="button"
            className="btn btn-ghost btn-sm window-close"
            onClick={() => setOpenPanel(null)}
            aria-label="Tutup jendela"
            title="Tutup"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </header>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="brand">Kalkulator Uang Jajan</h1>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={`btn btn-sm${quick === 'expense' ? ' quick-on' : ''}`}
            aria-expanded={quick === 'expense'}
            onClick={() => toggleQuick('expense')}
          >
            + Pengeluaran
          </button>
          <button
            type="button"
            className={`btn btn-sm${quick === 'income' ? ' quick-on' : ''}`}
            aria-expanded={quick === 'income'}
            onClick={() => toggleQuick('income')}
          >
            + Pemasukan
          </button>
          {state.mode && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(true)}>
              Periode: {state.mode === 'week' ? '1 Minggu' : '1 Bulan'}
            </button>
          )}
          <span className={`save-state${saved ? ' save-ok' : ''}`}>{saved ? 'Tersimpan' : 'Menyimpan…'}</span>
        </div>
      </header>

      <SectionNav items={NAV_ITEMS} openId={openPanel ?? 'nav-beranda'} onOpen={togglePanel} />

      {!openPanel && (
        <main className="front" id="nav-beranda">
          <TotalAsetCard state={state} />
          {quick && (
            <QuickEntry key={quick} mode={quick} state={state} update={update} notify={notify} onClose={() => setQuick(null)} />
          )}
          <AllowanceCard state={state} derived={derived} update={update} onChangePeriod={() => setPickerOpen(true)} />
          <WalletCards state={state} derived={derived} />
          <InsightsPanel insights={insights} />
        </main>
      )}

      {openPanel && <div className="window-backdrop" onClick={() => setOpenPanel(null)} />}

      <div
        id="nav-catat"
        className={sectionClass('nav-catat')}
        role={openPanel === 'nav-catat' ? 'dialog' : undefined}
        aria-modal={openPanel === 'nav-catat' ? 'true' : undefined}
      >
        {windowHead('nav-catat')}
        <ExpensesPanel state={state} update={update} notify={notify} />
        <IncomePanel state={state} update={update} notify={notify} />
      </div>
      <div
        id="nav-kewajiban"
        className={sectionClass('nav-kewajiban')}
        role={openPanel === 'nav-kewajiban' ? 'dialog' : undefined}
        aria-modal={openPanel === 'nav-kewajiban' ? 'true' : undefined}
      >
        {windowHead('nav-kewajiban')}
        <ObligationsPanel state={state} update={update} notify={notify} />
      </div>
      <div
        id="nav-analisis"
        className={sectionClass('nav-analisis')}
        role={openPanel === 'nav-analisis' ? 'dialog' : undefined}
        aria-modal={openPanel === 'nav-analisis' ? 'true' : undefined}
      >
        {windowHead('nav-analisis')}
        <CashflowChart state={state} derived={derived} />
        <TrendPanel state={state} />
        <AllocationDonut state={state} derived={derived} />
        <CalendarHeatmap state={state} update={update} />
        <MonthCompare state={state} derived={derived} />
      </div>
      <div
        id="nav-tabungan"
        className={sectionClass('nav-tabungan')}
        role={openPanel === 'nav-tabungan' ? 'dialog' : undefined}
        aria-modal={openPanel === 'nav-tabungan' ? 'true' : undefined}
      >
        {windowHead('nav-tabungan')}
        <DompetPanel state={state} update={update} />
        <SavingsPanel state={state} derived={derived} update={update} />
        <WishlistPanel state={state} derived={derived} update={update} />
      </div>
      <div
        id="nav-laporan"
        className={sectionClass('nav-laporan')}
        role={openPanel === 'nav-laporan' ? 'dialog' : undefined}
        aria-modal={openPanel === 'nav-laporan' ? 'true' : undefined}
      >
        {windowHead('nav-laporan')}
        <ReportCard state={state} />
      </div>
      <div
        id="nav-data"
        className={sectionClass('nav-data')}
        role={openPanel === 'nav-data' ? 'dialog' : undefined}
        aria-modal={openPanel === 'nav-data' ? 'true' : undefined}
      >
        {windowHead('nav-data')}
        <DataControls state={state} saved={saved} onImport={replace} onReset={resetAll} notify={notify} />
      </div>

      <footer className="footer muted small">
        Data tersimpan lokal di browser kamu. Bunga dihitung majemuk 8% per tahun (setara 0,64%/bulan).
      </footer>

      {toast && (
        <div className={`toast${toast.error ? ' toast-error' : ''}`} role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              className="btn btn-ghost btn-sm toast-undo"
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
            >
              Urungkan
            </button>
          )}
        </div>
      )}

      {(pickerOpen || state.mode === null) && (
        <PeriodPicker
          current={state.mode}
          onPick={pickMode}
          onCancel={state.mode === null ? undefined : () => setPickerOpen(false)}
          profile={state.profile}
          onApplyProfile={applyProfile}
        />
      )}

      {calcOpen && (
        <div className="calc-pop">
          <Calculator
            onUseNumber={(value) => update((s) => ({ ...s, allowance: value }))}
            onClose={() => setCalcOpen(false)}
          />
        </div>
      )}
      <button
        type="button"
        className="fab fab-theme"
        onClick={() => update((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
        aria-label="Ganti tema"
        title="Ganti tema"
      >
        {state.theme === 'dark' ? SUN_ICON : MOON_ICON}
      </button>
      <button
        type="button"
        className={`fab${calcOpen ? ' fab-open' : ''}`}
        onClick={() => setCalcOpen((open) => !open)}
        aria-expanded={calcOpen}
        aria-label="Kalkulator"
        title="Kalkulator"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
        </svg>
      </button>
    </div>
  )
}
