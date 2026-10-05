import { useEffect, useMemo, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { derive } from './lib/derive'
import { buildInsights } from './lib/insights'
import { notifyDue } from './lib/obligations'
import { applyProfile as applyProfileToCategories, findProfile } from './lib/profiles'
import { initialState } from './lib/state'
import { clearState } from './lib/storage'
import type { ProfileId } from './types'
import { AllowanceCard } from './components/AllowanceCard'
import { AllocationDonut } from './components/AllocationDonut'
import { CalendarHeatmap } from './components/CalendarHeatmap'
import { Calculator } from './components/Calculator'
import { CashflowChart } from './components/CashflowChart'
import { DataControls } from './components/DataControls'
import { ExpensesPanel } from './components/ExpensesPanel'
import { IncomePanel } from './components/IncomePanel'
import { InsightsPanel } from './components/InsightsPanel'
import { MonthCompare } from './components/MonthCompare'
import { ObligationsPanel } from './components/ObligationsPanel'
import { PeriodPicker } from './components/PeriodPicker'
import { ReportCard } from './components/ReportCard'
import { SavingsPanel } from './components/SavingsPanel'
import { SectionNav, type NavItem } from './components/SectionNav'
import { TodayCard } from './components/TodayCard'
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

  const derived = useMemo(() => derive(state), [state])
  const insights = useMemo(() => buildInsights(state, derived), [state, derived])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

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

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="brand">Kalkulator Uang Jajan</h1>
          <p className="muted small">Alokasi 50/15/5/10/20 · target tabungan bunga 8% per tahun</p>
        </div>
        <div className="topbar-actions">
          {state.mode && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(true)}>
              Periode: {state.mode === 'week' ? '1 Minggu' : '1 Bulan'}
            </button>
          )}
          <span className={`save-state${saved ? ' save-ok' : ''}`}>{saved ? 'Tersimpan' : 'Menyimpan…'}</span>
        </div>
      </header>

      <SectionNav items={NAV_ITEMS} />

      <main className="layout">
        <div className="col">
          <div id="nav-beranda" className="nav-section">
            <AllowanceCard state={state} derived={derived} update={update} onChangePeriod={() => setPickerOpen(true)} />
            <WalletCards state={state} derived={derived} />
            <InsightsPanel insights={insights} />
          </div>
          <div id="nav-catat" className="nav-section">
            <ExpensesPanel state={state} update={update} />
            <IncomePanel state={state} update={update} />
          </div>
          <div id="nav-kewajiban" className="nav-section">
            <ObligationsPanel state={state} update={update} />
          </div>
          <div id="nav-analisis" className="nav-section">
            <CashflowChart state={state} derived={derived} />
            <AllocationDonut state={state} derived={derived} />
            <CalendarHeatmap state={state} />
            <MonthCompare state={state} derived={derived} />
          </div>
          <div id="nav-tabungan" className="nav-section">
            <SavingsPanel state={state} derived={derived} update={update} />
            <WishlistPanel state={state} derived={derived} update={update} />
          </div>
          <div id="nav-laporan" className="nav-section">
            <ReportCard state={state} />
          </div>
          <div id="nav-data" className="nav-section">
            <DataControls
              state={state}
              saved={saved}
              onImport={replace}
              onReset={resetAll}
            />
          </div>
        </div>

        <aside className="col col-side">
          <TodayCard state={state} derived={derived} />
        </aside>
      </main>

      <footer className="footer muted small">
        Data tersimpan lokal di browser kamu. Bunga dihitung majemuk 8% per tahun (setara 0,64%/bulan).
      </footer>

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
