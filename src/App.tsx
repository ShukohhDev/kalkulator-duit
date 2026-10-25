import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from './hooks/useAppState'
import { derive } from './lib/derive'
import { buildInsights } from './lib/insights'
import { buildAlerts, notifyAlerts } from './lib/alerts'
import { buildTips } from './lib/tips'
import { notifyDue } from './lib/obligations'
import { applyProfile as applyProfileToCategories, findProfile } from './lib/profiles'
import { applyLifestyle } from './lib/lifestyles'
import { roundAllocationCategories } from './lib/allocation'
import { initialState } from './lib/state'
import { clearState, saveState } from './lib/storage'
import { currentUser, isAdmin, logout as endSession, touchSession } from './lib/auth'
import { appendActivity } from './lib/activity'
import { sweepTransition } from './lib/sweep'
import { refreshUsdRate } from './lib/rates'
import { getDeviceColorTheme, getDeviceTheme, loadPrefs, savePrefs, setDeviceColorTheme, setDeviceTheme } from './lib/prefs'
import {
  buildUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from './lib/notifications'
import { translate, getDeviceLanguage, setDeviceLanguage, type Language } from './lib/i18n'
import type { Notify, ProfileId, Theme } from './types'
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
import { FaqPrivacyCard } from './components/FaqPrivacyCard'
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
import { ThemePickerCard } from './components/ThemePickerCard'
import { WeekCard } from './components/WeekCard'
import { ICON_BELL, NAV_SVG_ICONS } from './components/icons'

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


function AppShell({ user, onLogout }: { user: string; onLogout: () => void }) {
  const { state, update, replace, saved, cloudStatus, lastSyncTime, syncNow, pullNow } = useAppState()
  const [language, setLanguage] = useState<Language>(() => loadPrefs().language ?? getDeviceLanguage())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [quick, setQuick] = useState<'expense' | 'income' | null>(null)
  const [toast, setToast] = useState<{ text: string; error?: boolean; undo?: () => void } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [catatView, setCatatView] = useState<'all' | 'expenses' | 'income'>('all')

  const [isScrolled, setIsScrolled] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(min-width: 769px)').matches
    }
    return (window.innerWidth || 1024) > 768
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateDesktop = () => {
      if (typeof window.matchMedia === 'function') {
        setIsDesktop(window.matchMedia('(min-width: 769px)').matches)
      } else {
        setIsDesktop((window.innerWidth || 1024) > 768)
      }
    }
    updateDesktop()
    window.addEventListener('resize', updateDesktop)
    return () => window.removeEventListener('resize', updateDesktop)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let rafId: number | null = null

    const checkScroll = () => {
      const y = window.scrollY || 0
      // Hysteresis: aktivasi saat scroll melewati batas topbar (>= 75px), kembali saat mendekati atas (<= 55px)
      setIsScrolled((prev) => {
        if (!prev && y >= 75) return true
        if (prev && y <= 55) return false
        return prev
      })
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        checkScroll()
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    checkScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [])

  const isUserAdmin = isAdmin()
  const navItems = useMemo(() => {
    const base: NavItem[] = [
      { id: 'nav-beranda', label: translate('nav.beranda', language) },
      { id: 'nav-catat', label: translate('nav.catat', language) },
      { id: 'nav-kewajiban', label: translate('nav.kewajiban', language) },
      { id: 'nav-analisis', label: translate('nav.analisis', language) },
      { id: 'nav-tabungan', label: translate('nav.tabungan', language) },
      { id: 'nav-laporan', label: translate('nav.laporan', language) },
      { id: 'nav-data', label: translate('nav.data', language) },
    ]
    if (isUserAdmin) {
      base.push({ id: 'nav-admin', label: translate('nav.admin', language) })
    }
    return base
  }, [isUserAdmin, language])

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
    const activeColor = state.colorTheme ?? 'emerald'
    document.documentElement.dataset.theme = state.theme
    document.documentElement.dataset.colorTheme = activeColor
    setDeviceTheme(state.theme)
    setDeviceColorTheme(activeColor)
  }, [state.theme, state.colorTheme])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // kurs USD→IDR otomatis, cache 24 jam; gagal = diam, pakai kurs terakhir
  useEffect(() => {
    void refreshUsdRate()
  }, [])

  // Deteksi aktivitas pengguna untuk memperpanjang sesi aktif
  useEffect(() => {
    let lastTouch = Date.now()
    const handleActivity = () => {
      const now = Date.now()
      // Throttle pembaruan storage setiap 15 detik agar tidak membebani performa
      if (now - lastTouch > 15000) {
        lastTouch = now
        touchSession()
      }
    }

    window.addEventListener('click', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('touchstart', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [])

  // Cek batas kedaluwarsa sesi (inaktivitas > 30 menit) saat kembali ke tab atau berkala
  useEffect(() => {
    const checkSessionExpiry = () => {
      if (!currentUser()) {
        onLogout()
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionExpiry()
      }
    }

    const timer = setInterval(checkSessionExpiry, 30000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', checkSessionExpiry)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', checkSessionExpiry)
    }
  }, [onLogout])

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
    update((s) => {
      const base = applyProfileToCategories(s.categories, profile)
      const styled = applyLifestyle(base, s.lifestyle)
      return {
        ...s,
        profile: profileId,
        categories: s.allowance > 0 ? roundAllocationCategories(styled, s.allowance) : styled,
      }
    })
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
      setOpenPanel(id)
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

  const showQuickInNav = isScrolled
  const showQuickInTopbar = !showQuickInNav

  const renderQuickButtons = (prefix = '') => (
    <>
      <div className={`quick-anchor ${prefix}`.trim()}>
        <button
          type="button"
          className={`btn btn-sm btn-quick-action btn-quick-expense${quick === 'expense' ? ' quick-on' : ''}`}
          aria-expanded={quick === 'expense'}
          title={`${translate('topbar.expense', language)} (Shortcut: E)`}
          onClick={() => toggleQuick('expense')}
        >
          <span>{translate('topbar.expense', language)}</span>
          <kbd className="quick-kbd">E</kbd>
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
      <div className={`quick-anchor ${prefix}`.trim()}>
        <button
          type="button"
          className={`btn btn-sm btn-quick-action btn-quick-income${quick === 'income' ? ' quick-on' : ''}`}
          aria-expanded={quick === 'income'}
          title={`${translate('topbar.income', language)} (Shortcut: P)`}
          onClick={() => toggleQuick('income')}
        >
          <span>{translate('topbar.income', language)}</span>
          <kbd className="quick-kbd">P</kbd>
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
    </>
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row-primary">
          <div className="topbar-brand-wrap">
            <h1 className="brand">
              <img src="/favicon.png" alt="Logo" className="brand-logo-img" width="28" height="28" />
              <span>{translate('topbar.brand', language)}</span>
            </h1>
          </div>
          <div className="topbar-user-area">
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
            <button
              type="button"
              className="btn-lang-toggle"
              onClick={() => {
                const nextLang: Language = language === 'id' ? 'en' : 'id'
                setLanguage(nextLang)
                setDeviceLanguage(nextLang)
                savePrefs({ language: nextLang })
              }}
              aria-label={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
            >
              <span className={`lang-choice${language === 'id' ? ' lang-active' : ''}`}>ID</span>
              <span className="lang-sep">|</span>
              <span className={`lang-choice${language === 'en' ? ' lang-active' : ''}`}>EN</span>
            </button>
            <button
              type="button"
              className="topbar-icon-btn fab-theme"
              onClick={() => {
                const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark'
                update((s) => {
                  const next = { ...s, theme: nextTheme }
                  saveState(next)
                  return next
                })
                setDeviceTheme(nextTheme)
              }}
              aria-label="Ganti tema"
              title={state.theme === 'dark' ? translate('topbar.themeLight', language) : translate('topbar.themeDark', language)}
            >
              {state.theme === 'dark' ? SUN_ICON : MOON_ICON}
            </button>
            <span className="chip chip-user" title={`Masuk sebagai ${user}`}>
              {user}
            </span>
            {isUserAdmin && <span className="chip-admin-badge">{translate('topbar.adminBadge', language)}</span>}
            <button type="button" className="btn btn-ghost btn-sm btn-logout" onClick={handleLogout}>
              {translate('topbar.logout', language)}
            </button>
          </div>
        </div>

        <div className="topbar-actions">
          {showQuickInTopbar && (
            <div className="topbar-quick-wrapper">
              {renderQuickButtons('topbar-quick')}
            </div>
          )}
          {state.mode && (
            <button type="button" className="btn btn-ghost btn-sm btn-period-select" onClick={() => setPickerOpen(true)} title="Ganti Periode">
              <span className="period-label-prefix">{translate('topbar.periodPrefix', language)}</span>
              <span>{state.mode === 'week' ? translate('topbar.periodWeek', language) : translate('topbar.periodMonth', language)}</span>
            </button>
          )}
          <span className={`save-state${saved ? ' save-ok' : ''}`} title={saved ? translate('topbar.saved', language) : translate('topbar.saving', language)}>
            {saved ? <>{CHECK_ICON} <span className="save-state-text">{translate('topbar.saved', language)}</span></> : <span className="save-state-text">{translate('topbar.saving', language)}</span>}
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
              {cloudStatus === 'synced' ? translate('topbar.cloudSynced', language) : cloudStatus === 'syncing' ? translate('topbar.cloudSyncing', language) : translate('topbar.cloudOffline', language)}
            </span>
          )}
        </div>
      </header>

      <SectionNav
        items={navItems}
        openId={openPanel ?? 'nav-beranda'}
        onOpen={togglePanel}
        isSticky={isScrolled}
        isStickyDesktop={isDesktop && isScrolled}
        extraActions={showQuickInNav ? renderQuickButtons('nav-quick') : null}
      />

      {!openPanel && (
        <main className="front beranda-front" id="nav-beranda">
          <div className="panel-hero-banner">
            <div className="panel-hero-main">
              <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-beranda']}</div>
              <div className="panel-hero-body">
                <h2 className="panel-hero-title">{translate('hero.title', language)}</h2>
                <p className="panel-hero-desc">{translate('hero.desc', language)}</p>
              </div>
            </div>
            <div className="panel-hero-badge">
              <span>{state.mode === 'week' ? translate('hero.weekBadge', language) : translate('hero.monthBadge', language)}</span>
            </div>
          </div>
          <AlertsPanel alerts={alerts} />
          <div className="beranda-grid">
            <div className="beranda-col-main">
              <WeekCard state={state} derived={derived} notify={notify} lang={language} />
              <AllowanceCard state={state} derived={derived} update={update} notify={notify} onChangePeriod={() => setPickerOpen(true)} />
              <WalletCards state={state} derived={derived} />
            </div>
            <aside className="beranda-col-side">
              <TotalAsetCard state={state} lang={language} />
              <InsightsPanel insights={insights} />
              <ChallengeCard state={state} derived={derived} />
              <TipsPanel tips={tips} />
            </aside>
          </div>
        </main>
      )}

      <div id="nav-catat" className={sectionClass('nav-catat')}>
        <div className="panel-hero-banner">
          <div className="panel-hero-main">
            <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-catat']}</div>
            <div className="panel-hero-body">
              <h2 className="panel-hero-title">{translate('hero.catat.title', language)}</h2>
              <p className="panel-hero-desc">{translate('hero.catat.desc', language)}</p>
            </div>
          </div>
          <div className="panel-hero-badge">
            <span>{translate('hero.catat.badge', language, { expenses: state.expenses.length, incomes: state.incomes.length })}</span>
          </div>
        </div>
        <div className="catat-mobile-switch" role="tablist" aria-label="Pilihan tampilan pencatatan">
          <button
            type="button"
            role="tab"
            aria-selected={catatView === 'all'}
            className={`catat-switch-btn ${catatView === 'all' ? 'active' : ''}`}
            onClick={() => setCatatView('all')}
          >
            {translate('catat.switchAll', language)}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={catatView === 'expenses'}
            className={`catat-switch-btn ${catatView === 'expenses' ? 'active' : ''}`}
            onClick={() => setCatatView('expenses')}
          >
            {translate('catat.switchExpenses', language)}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={catatView === 'income'}
            className={`catat-switch-btn ${catatView === 'income' ? 'active' : ''}`}
            onClick={() => setCatatView('income')}
          >
            {translate('catat.switchIncome', language)}
          </button>
        </div>

        <div className={`catat-split-grid show-${catatView}`}>
          <div className="catat-column catat-col-expenses">
            <ExpensesPanel state={state} update={update} notify={notify} />
          </div>
          <div className="catat-column catat-col-income">
            <IncomePanel state={state} update={update} notify={notify} />
          </div>
        </div>
        <ShoppingListCard state={state} update={update} notify={notify} />
      </div>
      <div id="nav-kewajiban" className={sectionClass('nav-kewajiban')}>
        <div className="panel-hero-banner">
          <div className="panel-hero-main">
            <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-kewajiban']}</div>
            <div className="panel-hero-body">
              <h2 className="panel-hero-title">{translate('hero.kewajiban.title', language)}</h2>
              <p className="panel-hero-desc">{translate('hero.kewajiban.desc', language)}</p>
            </div>
          </div>
          <div className="panel-hero-badge">
            <span>{translate('hero.kewajiban.badge', language, { bills: state.bills.length, debts: state.debts.length })}</span>
          </div>
        </div>
        <ObligationsPanel state={state} update={update} notify={notify} />
      </div>
      <div id="nav-analisis" className={sectionClass('nav-analisis')}>
        <div className="panel-hero-banner">
          <div className="panel-hero-main">
            <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-analisis']}</div>
            <div className="panel-hero-body">
              <h2 className="panel-hero-title">{translate('hero.analisis.title', language)}</h2>
              <p className="panel-hero-desc">{translate('hero.analisis.desc', language)}</p>
            </div>
          </div>
          <div className="panel-hero-badge">
            <span>{translate('hero.analisis.badge', language)}</span>
          </div>
        </div>
        <HealthCard state={state} derived={derived} />
        <CashflowChart state={state} derived={derived} />
        <TrendPanel state={state} />
        <AllocationDonut state={state} derived={derived} />
        <CalendarHeatmap state={state} update={update} />
        <MonthCompare state={state} derived={derived} />
        <WhatIfPanel state={state} derived={derived} />
      </div>
      <div id="nav-tabungan" className={sectionClass('nav-tabungan')}>
        <div className="panel-hero-banner">
          <div className="panel-hero-main">
            <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-tabungan']}</div>
            <div className="panel-hero-body">
              <h2 className="panel-hero-title">{translate('hero.tabungan.title', language)}</h2>
              <p className="panel-hero-desc">{translate('hero.tabungan.desc', language)}</p>
            </div>
          </div>
          <div className="panel-hero-badge">
            <span>{translate('hero.tabungan.badge', language, { count: state.wallets.length })}</span>
          </div>
        </div>
        {/* Baris 1: Tabungan Akhir Periode (Kiri) & Dompet / E-wallet (Kanan) */}
        <div className="tabungan-split-grid">
          <div className="tabungan-col tabungan-col-left">
            <EndSavingsCard state={state} update={update} notify={notify} lang={language} />
          </div>
          <div className="tabungan-col tabungan-col-right">
            <DompetPanel state={state} update={update} lang={language} />
          </div>
        </div>

        {/* Baris 2: Target Tabungan (Kiri) & Wishlist / Incaran Beli (Kanan) */}
        <div className="tabungan-split-grid">
          <div className="tabungan-col tabungan-col-left">
            <SavingsPanel state={state} derived={derived} update={update} lang={language} />
          </div>
          <div className="tabungan-col tabungan-col-right">
            <WishlistPanel state={state} derived={derived} update={update} lang={language} />
          </div>
        </div>

        {/* Dana Musiman */}
        <SeasonalPanel state={state} derived={derived} update={update} notify={notify} />
      </div>
      <div id="nav-laporan" className={sectionClass('nav-laporan')}>
        <div className="panel-hero-banner">
          <div className="panel-hero-main">
            <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-laporan']}</div>
            <div className="panel-hero-body">
              <h2 className="panel-hero-title">{translate('hero.laporan.title', language)}</h2>
              <p className="panel-hero-desc">{translate('hero.laporan.desc', language)}</p>
            </div>
          </div>
          <div className="panel-hero-badge">
            <span>{state.mode === 'week' ? translate('hero.laporan.weekBadge', language) : translate('hero.laporan.monthBadge', language)}</span>
          </div>
        </div>
        <ReportCard state={state} notify={notify} />
      </div>
      <div id="nav-data" className={sectionClass('nav-data')}>
        <div className="panel-hero-banner">
          <div className="panel-hero-main">
            <div className="panel-hero-icon">{NAV_SVG_ICONS['nav-data']}</div>
            <div className="panel-hero-body">
              <h2 className="panel-hero-title">{translate('hero.data.title', language)}</h2>
              <p className="panel-hero-desc">{translate('hero.data.desc', language)}</p>
            </div>
          </div>
          <div className="panel-hero-badge">
            <span>{translate('hero.data.badge', language, { user })}</span>
          </div>
        </div>
        <ThemePickerCard
          colorTheme={state.colorTheme ?? 'emerald'}
          themeMode={state.theme}
          onColorThemeChange={(colorTheme) => {
            update((s) => {
              const next = { ...s, colorTheme }
              saveState(next)
              return next
            })
            setDeviceColorTheme(colorTheme)
          }}
          onThemeModeChange={(theme) => {
            update((s) => {
              const next = { ...s, theme }
              saveState(next)
              return next
            })
            setDeviceTheme(theme)
          }}
        />
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
        <FaqPrivacyCard />
        <ActivityPanel state={state} />
      </div>
      {isUserAdmin && (
        <div id="nav-admin" className={sectionClass('nav-admin')}>
          {openPanel === 'nav-admin' && <AdminPanel currentUser={user} notify={notify} />}
        </div>
      )}

      <footer className="footer muted small">
        Semua data tersimpan aman di browser kamu. Bunga dihitung majemuk 8% per tahun (setara 0,64%/bulan).
      </footer>

      {toast && (
        <div className={`toast${toast.error ? ' toast-error' : ''}`} role="status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {toast.error ? <strong>!</strong> : CHECK_ICON}
            <span>{toast.text}</span>
          </span>
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

  useEffect(() => {
    document.documentElement.dataset.colorTheme = getDeviceColorTheme()
    document.documentElement.dataset.theme = getDeviceTheme()
  }, [])

  useEffect(() => {
    const handleSyncSession = () => {
      const active = currentUser()
      setUser((prev) => (prev !== active ? active : prev))
    }
    window.addEventListener('focus', handleSyncSession)
    document.addEventListener('visibilitychange', handleSyncSession)
    return () => {
      window.removeEventListener('focus', handleSyncSession)
      document.removeEventListener('visibilitychange', handleSyncSession)
    }
  }, [])

  if (!user) return <AuthGate onAuthed={setUser} />
  // key=user: pindah akun memuat ulang seluruh state dari storage miliknya
  return (
    <AppShell
      key={user}
      user={user}
      onLogout={() => {
        endSession()
        setUser(null)
      }}
    />
  )
}
