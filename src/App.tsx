import { useEffect, useMemo, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { derive } from './lib/derive'
import { buildInsights } from './lib/insights'
import { initialState } from './lib/state'
import { clearState } from './lib/storage'
import { AllowanceCard } from './components/AllowanceCard'
import { AllocationDonut } from './components/AllocationDonut'
import { CalendarHeatmap } from './components/CalendarHeatmap'
import { Calculator } from './components/Calculator'
import { CashflowChart } from './components/CashflowChart'
import { DailyAllocation } from './components/DailyAllocation'
import { DataControls } from './components/DataControls'
import { ExpensesPanel } from './components/ExpensesPanel'
import { IncomePanel } from './components/IncomePanel'
import { InsightsPanel } from './components/InsightsPanel'
import { MonthCompare } from './components/MonthCompare'
import { PeriodPicker } from './components/PeriodPicker'
import { ReportCard } from './components/ReportCard'
import { SavingsPanel } from './components/SavingsPanel'
import { StreakBar } from './components/StreakBar'
import { WalletCards } from './components/WalletCards'

export default function App() {
  const { state, update, replace, saved } = useAppState()
  const [pickerOpen, setPickerOpen] = useState(false)

  const derived = useMemo(() => derive(state), [state])
  const insights = useMemo(() => buildInsights(state, derived), [state, derived])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  const pickMode = (mode: 'week' | 'month') => {
    update((s) => ({ ...s, mode }))
    setPickerOpen(false)
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

      <main className="layout">
        <div className="col">
          <AllowanceCard state={state} derived={derived} update={update} onChangePeriod={() => setPickerOpen(true)} />
          <DailyAllocation state={state} derived={derived} />
          <WalletCards state={state} derived={derived} />
          <InsightsPanel insights={insights} />
          <ExpensesPanel state={state} update={update} />
          <IncomePanel state={state} update={update} />
          <CashflowChart state={state} derived={derived} />
          <AllocationDonut state={state} derived={derived} />
          <CalendarHeatmap state={state} />
          <SavingsPanel state={state} derived={derived} update={update} />
          <MonthCompare state={state} derived={derived} />
          <ReportCard state={state} />
        </div>

        <aside className="col col-side">
          <Calculator onUseNumber={(value) => update((s) => ({ ...s, allowance: value }))} />
          <StreakBar state={state} savingsByGoal={derived.savingsByGoal} />
          <DataControls
            state={state}
            saved={saved}
            onImport={replace}
            onReset={resetAll}
            onToggleTheme={() => update((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
          />
        </aside>
      </main>

      <footer className="footer muted small">
        Data tersimpan lokal di browser kamu. Bunga dihitung majemuk 8% per tahun (setara 0,64%/bulan).
      </footer>

      {(pickerOpen || state.mode === null) && (
        <PeriodPicker current={state.mode} onPick={pickMode} onCancel={state.mode === null ? undefined : () => setPickerOpen(false)} />
      )}
    </div>
  )
}
