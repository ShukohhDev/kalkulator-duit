import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { derive } from './lib/derive'
import { buildInsights } from './lib/insights'
import { buildAlerts, notifyAlerts } from './lib/alerts'
import { buildTips } from './lib/tips'
import { notifyDue } from './lib/obligations'
import { applyProfile as applyProfileToCategories, findProfile } from './lib/profiles'
import { applyLifestyle } from './lib/lifestyles'
import { initialState } from './lib/state'
import { clearState, saveState } from './lib/storage'
import { currentUser, isAdmin, logout as endSession } from './lib/auth'
import { appendActivity } from './lib/activity'
import { sweepTransition } from './lib/sweep'
import { refreshUsdRate } from './lib/rates'
import {
  buildUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from './lib/notifications'
import type { Notify, ProfileId } from './types'
import { ActivityPanel } from './components/ActivityPanel'
import { AdminPanel } from './components/AdminPanel'
import { AllowanceCard } from './components/AllowanceCard'
import { AuthGate } from './components/AuthGate'
import { AllocationDonut } from './components/AllocationDonut'
import { CalendarHeatmap } from './components/CalendarHeatmap'
import { Calculator } from './components/Calculator'
import { CashflowChart } from './components/CashflowChart'
import { DataControls } from './components/DataControls'
import { ReportIssueCard } from './components/ReportIssueCard'
import { AccountSecurityCard } from './components/AccountSecurityCard'
import { DompetPanel } from './components/DompetPanel'
import { EndSavingsCard } from './components/EndSavingsCard'
import { ExpensesPanel } from './components/ExpensesPanel'
import { IncomePanel } from './components/IncomePanel'
import { InsightsPanel } from './components/InsightsPanel'
import { AlertsPanel } from './components/AlertsPanel'
import { TipsPanel } from './components/TipsPanel'
import { ChallengeCard } from './components/ChallengeCard'
import { HealthCard } from './components/HealthCard'
import { MonthCompare } from './components/MonthCompare'
import { NotificationCenter } from './components/NotificationCenter'
import { ObligationsPanel } from './components/ObligationsPanel'
import { PeriodPicker } from './components/PeriodPicker'
import { ReportCard } from './components/ReportCard'
import { SavingsPanel } from './components/SavingsPanel'
import { SeasonalPanel } from './components/SeasonalPanel'
import { WhatIfPanel } from './components/WhatIfPanel'
import { QuickEntry } from './components/QuickEntry'
import { SectionNav, type NavItem } from './components/SectionNav'
import { TotalAsetCard } from './components/TotalAsetCard'
import { TrendPanel } from './components/TrendPanel'
import { WalletCards } from './components/WalletCards'
import { WishlistPanel } from './components/WishlistPanel'
import { PwaInstallCard } from './components/PwaInstallCard'
import { ShoppingListCard } from './components/ShoppingListCard'
import { WeekCard } from './components/WeekCard'
import { ICON_BELL } from './components/icons'

const SUN_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

const MOON_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)

const CALC_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8" />
    <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
  </svg>
)

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
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

function AppShell({ user, onLogout }: { user: string; onLogout: () => void }) {
  const { state, update, replace, saved, cloudStatus, lastSyncTime, syncNow, pullNow } = useAppState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [quick, setQuick] = useState<'expense' | 'income' | null>(null)
  const [toast, setToast] = useState<{ text: string; error?: boolean; undo?: () => void } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  const isUserAdmin = isAdmin()
  const navItems = useMemo(
    () => (isUserAdmin ? [...NAV_ITEMS, { id: 'nav-admin', label: 'Admin' }] : NAV_ITEMS),
    [isUserAdmin],
  )

  const derived = useMemo(() => derive(state), [state])
  const insights = useMemo(() => buildInsights(state, derived), [state, derived])
  const alerts = useMemo(() => buildAlerts(state, derived), [state, derived])
  const tips = useMemo(() => buildTips(state, derived), [state, derived])

  const reloadNotifications = useCallback(async () => {
    try {
      const items = await buildUserNotifications(user, state, derived)
      setNotifications(items)
    } catch {
      // ignore
    }
  }, [user, state, derived])

  useEffect(() => {
    void reloadNotifications()
  }, [reloadNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const handleMarkRead = (id: string) => {
    markNotificationAsRead(user, id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(
      user,
      notifications.map((n) => n.id),
    )
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // kurs USD→IDR otomatis, cache 24 jam; gagal = diam, pakai kurs terakhir
  useEffect(() => {
    void refreshUsdRate()
  }, [])

  useEffect(() => {
    notifyDue(state)
    notifyAlerts(state, derived)
  }, [state, derived])

  // ganti periode: sisa uang jajan tiap kategori disapu ke pot Tabungan akhir periode
  useEffect(() => {
    if (!derived.period) return
    if (state.periodKey === derived.period.startISO) return
    const period = derived.period
    update((s) => sweepTransition(s, period))
  }, [derived.period, state.periodKey, update])

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

  useEffect(() => {
    if (!quick) return
    const onDown = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('.quick-anchor')
      if (!anchor) setQuick(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [quick])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      const key = event.key.toLowerCase()
      if (key !== 'e' && key !== 'p') return
      event.preventDefault()
      const mode = key === 'e' ? 'expense' : 'income'
      setQuick((prev) => (prev === mode ? null : mode))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const pickMode = (mode: 'week' | 'month') => {
    update((s) => ({ ...s, mode }))
    setPickerOpen(false)
  }

  const applyProfile = (profileId: ProfileId) => {
    const profile = findProfile(profileId)
    update((s) => ({
      ...s,
      profile: profileId,
      // gaya hidup ditumpuk di atas dasar profil
      categories: applyLifestyle(applyProfileToCategories(s.categories, profile), s.lifestyle),
    }))
  }

  const resetAll = () => {
    clearState()
    replace(initialState())
  }

  const handleLogout = () => {
    saveState(appendActivity(state, 'logout', `Keluar dari akun ${user}`))
    endSession()
    onLogout()
  }

  const notify: Notify = (text, options) => {
    setToast({ text, error: options?.error, undo: options?.undo })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), options?.undo ? 6000 : 2500)
  }

  const togglePanel = (id: string) => {
    if (id === 'nav-beranda') {
      setOpenPanel(null)
    } else {
      setOpenPanel((prev) => (prev === id ? null : id))
    }
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      // ignore
    }
  }

  const toggleQuick = (mode: 'expense' | 'income') => {
    setQuick((prev) => (prev === mode ? null : mode))
  }

  const sectionClass = (id: string) => `nav-section${openPanel === id ? ' front' : ''}`

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="brand">
            <img src="/favicon.png" alt="Logo" className="brand-logo-img" width="28" height="28" />
            <span>Kalkulator Uang Jajan</span>
          </h1>
        </div>
        <div className="topbar-actions">
          <div className="notif-anchor">
            <button
              type="button"
              className={`topbar-bell-btn${unreadCount > 0 ? ' has-unread' : ''}${notifOpen ? ' bell-open' : ''}`}
              onClick={() => setNotifOpen((open) => !open)}
              aria-label="Pusat Notifikasi"
              aria-expanded={notifOpen}
              title="Notifikasi"
            >
              {ICON_BELL}
              {unreadCount > 0 && (
                <span className="bell-badge" aria-label={`${unreadCount} notifikasi baru`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationCenter
                items={notifications}
                onClose={() => setNotifOpen(false)}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
              />
            )}
          </div>
          <div className="quick-anchor">
            <button
              type="button"
              className={`btn btn-sm${quick === 'expense' ? ' quick-on' : ''}`}
              aria-expanded={quick === 'expense'}
              title="+ Pengeluaran (E)"
              onClick={() => toggleQuick('expense')}
            >
              + Pengeluaran
            </button>
            {quick === 'expense' && (
              <QuickEntry
                key="expense"
                mode="expense"
                state={state}
                update={update}
                notify={notify}
                onClose={() => setQuick(null)}
              />
            )}
          </div>
          <div className="quick-anchor">
            <button
              type="button"
              className={`btn btn-sm${quick === 'income' ? ' quick-on' : ''}`}
              aria-expanded={quick === 'income'}
              title="+ Pemasukan (P)"
              onClick={() => toggleQuick('income')}
            >
              + Pemasukan
            </button>
            {quick === 'income' && (
              <QuickEntry
                key="income"
                mode="income"
                state={state}
                update={update}
                notify={notify}
                onClose={() => setQuick(null)}
              />
            )}
          </div>
          {state.mode && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(true)}>
              Periode: {state.mode === 'week' ? '1 Minggu' : '1 Bulan'}
            </button>
          )}
          <span className={`save-state${saved ? ' save-ok' : ''}`}>
            {saved ? <>{CHECK_ICON} Tersimpan</> : 'Menyimpan…'}
          </span>
          {cloudStatus !== 'disabled' && (
            <span
              className={`cloud-sync-chip cloud-sync-${cloudStatus}`}
              title={
                cloudStatus === 'synced'
                  ? 'Data tersinkron otomatis ke cloud Supabase'
                  : cloudStatus === 'syncing'
                  ? 'Sedang menyinkronkan data ke cloud'
                  : 'Status cloud sync'
              }
            >
              {cloudStatus === 'synced' ? 'Cloud' : cloudStatus === 'syncing' ? 'Sync…' : 'Offline'}
            </span>
          )}
          <span className="chip chip-user" title={`Masuk sebagai ${user}`}>
            {user}
          </span>
          {isUserAdmin && <span className="chip-admin-badge">Admin</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </header>

      <SectionNav items={navItems} openId={openPanel ?? 'nav-beranda'} onOpen={togglePanel} />

      {!openPanel && (
        <main className="front" id="nav-beranda">
          <TotalAsetCard state={state} />
          <AlertsPanel alerts={alerts} />
          <AllowanceCard state={state} derived={derived} update={update} notify={notify} onChangePeriod={() => setPickerOpen(true)} />
          <WeekCard state={state} derived={derived} notify={notify} />
          <WalletCards state={state} derived={derived} />
          <InsightsPanel insights={insights} />
          <TipsPanel tips={tips} />
          <ChallengeCard state={state} derived={derived} />
        </main>
      )}

      <div id="nav-catat" className={sectionClass('nav-catat')}>
        <ShoppingListCard state={state} update={update} notify={notify} />
        <ExpensesPanel state={state} update={update} notify={notify} />
        <IncomePanel state={state} update={update} notify={notify} />
      </div>
      <div id="nav-kewajiban" className={sectionClass('nav-kewajiban')}>
        <ObligationsPanel state={state} update={update} notify={notify} />
      </div>
      <div id="nav-analisis" className={sectionClass('nav-analisis')}>
        <HealthCard state={state} derived={derived} />
        <CashflowChart state={state} derived={derived} />
        <TrendPanel state={state} />
        <AllocationDonut state={state} derived={derived} />
        <CalendarHeatmap state={state} update={update} />
        <MonthCompare state={state} derived={derived} />
        <WhatIfPanel state={state} derived={derived} />
      </div>
      <div id="nav-tabungan" className={sectionClass('nav-tabungan')}>
        <EndSavingsCard state={state} />
        <DompetPanel state={state} update={update} />
        <SavingsPanel state={state} derived={derived} update={update} />
        <WishlistPanel state={state} derived={derived} update={update} />
        <SeasonalPanel state={state} derived={derived} update={update} notify={notify} />
      </div>
      <div id="nav-laporan" className={sectionClass('nav-laporan')}>
        <ReportCard state={state} notify={notify} />
      </div>
      <div id="nav-data" className={sectionClass('nav-data')}>
        <ReportIssueCard notify={notify} />
        <AccountSecurityCard username={user} notify={notify} />
        <PwaInstallCard notify={notify} />
        <DataControls
          state={state}
          saved={saved}
          cloudStatus={cloudStatus}
          lastSyncTime={lastSyncTime}
          onSyncNow={syncNow}
          onPullNow={pullNow}
          onImport={replace}
          onReset={resetAll}
          notify={notify}
        />
        <ActivityPanel state={state} />
      </div>
      {isUserAdmin && (
        <div id="nav-admin" className={sectionClass('nav-admin')}>
          {openPanel === 'nav-admin' && <AdminPanel currentUser={user} notify={notify} />}
        </div>
      )}

      <footer className="footer muted small">
        Data tersimpan lokal di browser kamu. Bunga dihitung majemuk 8% per tahun (setara 0,64%/bulan).
      </footer>

      {toast && (
        <div className={`toast${toast.error ? ' toast-error' : ''}`} role="status">
          <span>{toast.error ? '! ' : '✓ '}{toast.text}</span>
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

      {(pickerOpen || (state.mode === null && cloudStatus !== 'syncing')) && (
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
        title={state.theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
      >
        {state.theme === 'dark' ? SUN_ICON : MOON_ICON}
      </button>
      <button
        type="button"
        className={`fab${calcOpen ? ' fab-open' : ''}`}
        onClick={() => setCalcOpen((open) => !open)}
        aria-expanded={calcOpen}
        aria-label="Kalkulator"
        title="Kalkulator cepat"
      >
        {CALC_ICON}
      </button>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => currentUser())
  if (!user) return <AuthGate onAuthed={setUser} />
  // key=user: pindah akun memuat ulang seluruh state dari storage miliknya
  return <AppShell key={user} user={user} onLogout={() => setUser(null)} />
}
