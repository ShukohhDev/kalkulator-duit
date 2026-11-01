/**
 * Kalkulator Uang Jajan - Main Application Shell (Pure Vanilla JS)
 */
import { createStore } from './store.js';
import { derive } from './lib/derive.js';
import { buildInsights } from './lib/insights.js';
import { buildAlerts, notifyAlerts } from './lib/alerts.js';
import { buildTips } from './lib/tips.js';
import { notifyDue } from './lib/obligations.js';
import { applyProfile as applyProfileToCategories, findProfile } from './lib/profiles.js';
import { applyLifestyle } from './lib/lifestyles.js';
import { roundAllocationCategories } from './lib/allocation.js';
import { initialState } from './lib/state.js';
import { clearState, saveState, loadState } from './lib/storage.js';
import { currentUser, isAdmin, logout as endSession, touchSession } from './lib/auth.js';
import { appendActivity } from './lib/activity.js';
import { sweepTransition } from './lib/sweep.js';
import { refreshUsdRate } from './lib/rates.js';
import {
  getDeviceColorTheme,
  getDeviceTheme,
  loadPrefs,
  savePrefs,
  setDeviceColorTheme,
  setDeviceTheme,
} from './lib/prefs.js';
import {
  buildUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './lib/notifications.js';
import { translate, getDeviceLanguage, setDeviceLanguage } from './lib/i18n.js';

// Component Renders
import { renderAccountSecurityCard } from './components/AccountSecurityCard.js';
import { renderActivityPanel } from './components/ActivityPanel.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderAlertsPanel } from './components/AlertsPanel.js';
import { renderAllocationDonut } from './components/AllocationDonut.js';
import { renderAllowanceCard } from './components/AllowanceCard.js';
import { renderAuthGate } from './components/AuthGate.js';
import { renderCalculator } from './components/Calculator.js';
import { renderCalendarHeatmap } from './components/CalendarHeatmap.js';
import { renderCashflowChart } from './components/CashflowChart.js';
import { renderChallengeCard } from './components/ChallengeCard.js';
import { renderDataControls } from './components/DataControls.js';
import { renderDompetPanel } from './components/DompetPanel.js';
import { renderEndSavingsCard } from './components/EndSavingsCard.js';
import { renderExpensesPanel } from './components/ExpensesPanel.js';
import { renderFaqPrivacyCard } from './components/FaqPrivacyCard.js';
import { renderHealthCard } from './components/HealthCard.js';
import { renderIncomePanel } from './components/IncomePanel.js';
import { renderInsightsPanel } from './components/InsightsPanel.js';
import { renderMonthCompare } from './components/MonthCompare.js';
import { renderNotificationCenter } from './components/NotificationCenter.js';
import { renderObligationsPanel } from './components/ObligationsPanel.js';
import { renderPeriodPicker } from './components/PeriodPicker.js';
import { renderPwaInstallCard } from './components/PwaInstallCard.js';
import { renderQuickEntry } from './components/QuickEntry.js';
import { renderReportCard } from './components/ReportCard.js';
import { renderReportIssueCard } from './components/ReportIssueCard.js';
import { renderSavingsPanel } from './components/SavingsPanel.js';
import { renderSeasonalPanel } from './components/SeasonalPanel.js';
import { renderSectionNav } from './components/SectionNav.js';
import { renderShoppingListCard } from './components/ShoppingListCard.js';
import { renderThemePickerCard } from './components/ThemePickerCard.js';
import { renderTipsPanel } from './components/TipsPanel.js';
import { renderTotalAsetCard } from './components/TotalAsetCard.js';
import { renderTrendPanel } from './components/TrendPanel.js';
import { renderWalletCards } from './components/WalletCards.js';
import { renderWeekCard } from './components/WeekCard.js';
import { renderWhatIfPanel } from './components/WhatIfPanel.js';
import { renderWishlistPanel } from './components/WishlistPanel.js';
import { ICON_BELL, NAV_SVG_ICONS } from './components/icons.js';

const SUN_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>`;
const CALC_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>`;

export function mountApp(rootContainer) {
  if (!rootContainer) return () => {};

  document.documentElement.dataset.colorTheme = getDeviceColorTheme();
  document.documentElement.dataset.theme = getDeviceTheme();

  let activeUser = currentUser();
  let cleanupCurrent = null;

  function renderView() {
    if (cleanupCurrent) {
      cleanupCurrent();
      cleanupCurrent = null;
    }

    if (!activeUser) {
      rootContainer.innerHTML = '';
      const authDiv = document.createElement('div');
      rootContainer.appendChild(authDiv);
      renderAuthGate(authDiv, {
        onAuthed: (user) => {
          activeUser = user;
          renderView();
        },
      });
      cleanupCurrent = () => {
        authDiv.remove();
      };
      return;
    }

    cleanupCurrent = mountAppShell(rootContainer, {
      user: activeUser,
      onLogout: () => {
        activeUser = null;
        renderView();
      },
    });
  }

  const handleSyncSession = () => {
    const active = currentUser();
    if (active !== activeUser) {
      activeUser = active;
      renderView();
    }
  };

  window.addEventListener('focus', handleSyncSession);
  document.addEventListener('visibilitychange', handleSyncSession);

  renderView();

  return () => {
    window.removeEventListener('focus', handleSyncSession);
    document.removeEventListener('visibilitychange', handleSyncSession);
    if (cleanupCurrent) {
      cleanupCurrent();
      cleanupCurrent = null;
    }
    rootContainer.innerHTML = '';
  };
}

function mountAppShell(container, { user, onLogout }) {
  const store = createStore();
  let language = loadPrefs().language ?? getDeviceLanguage();
  let isEn = language === 'en';

  let pickerOpen = false;
  let calcOpen = false;
  let openPanel = null;
  let quick = null; // 'expense' | 'income' | null
  let toast = null;
  let toastTimer = null;
  let catatView = 'all'; // 'all' | 'expenses' | 'income'

  let notifications = [];
  let notifOpen = false;
  let isScrolled = false;

  let isDesktop = typeof window !== 'undefined'
    ? (window.matchMedia ? window.matchMedia('(min-width: 769px)').matches : (window.innerWidth || 1024) > 768)
    : true;

  void refreshUsdRate();

  function notify(text, options) {
    toast = { text, error: options?.error, undo: options?.undo };
    clearTimeout(toastTimer);
    renderToast();
    toastTimer = setTimeout(() => {
      toast = null;
      renderToast();
    }, options?.undo ? 6000 : 2500);
  }

  function handleSetLanguage(lang) {
    language = lang;
    isEn = lang === 'en';
    setDeviceLanguage(lang);
    savePrefs({ language: lang });
    renderFull();
  }

  function handleLogout() {
    const s = store.getState();
    saveState(appendActivity(s, 'logout', `Keluar dari akun ${user}`));
    endSession();
    onLogout();
  }

  function resetAll() {
    clearState();
    store.replace(initialState());
  }

  function pickMode(mode) {
    store.update((s) => ({ ...s, mode }));
    pickerOpen = false;
    renderModals();
  }

  function applyProfile(profileId) {
    const profile = findProfile(profileId);
    store.update((s) => {
      const base = applyProfileToCategories(s.categories, profile);
      const styled = applyLifestyle(base, s.lifestyle);
      return {
        ...s,
        profile: profileId,
        categories: s.allowance > 0 ? roundAllocationCategories(styled, s.allowance) : styled,
      };
    });
  }

  function toggleQuick(mode) {
    quick = quick === mode ? null : mode;
    renderQuickAnchors();
  }

  function togglePanel(id) {
    if (id === 'nav-beranda') {
      openPanel = null;
    } else {
      openPanel = id;
    }
    updateNavSections();
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }

  container.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="topbar-row-primary">
          <div class="topbar-brand-wrap">
            <h1 class="brand">
              <img src="/favicon.png" alt="Logo" class="brand-logo-img" width="28" height="28" />
              <span>${translate('topbar.brand', language)}</span>
            </h1>
          </div>
          <div class="topbar-user-area">
            <div class="notif-anchor" id="notif-anchor"></div>
            <button
              type="button"
              class="btn-lang-toggle"
              id="btn-lang-toggle"
              aria-label="${language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}"
              title="${language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}"
            >
              <span class="lang-choice${language === 'id' ? ' lang-active' : ''}">ID</span>
              <span class="lang-sep">|</span>
              <span class="lang-choice${language === 'en' ? ' lang-active' : ''}">EN</span>
            </button>
            <button
              type="button"
              class="topbar-icon-btn fab-theme"
              id="btn-fab-theme"
              aria-label="${isEn ? 'Toggle theme' : 'Ganti tema'}"
              title="${store.getState().theme === 'dark' ? translate('topbar.themeLight', language) : translate('topbar.themeDark', language)}"
            >
              ${store.getState().theme === 'dark' ? SUN_ICON : MOON_ICON}
            </button>
            <span class="chip chip-user" title="${isEn ? `Logged in as ${user}` : `Masuk sebagai ${user}`}">${user}</span>
            ${isAdmin() ? `<span class="chip-admin-badge">${translate('topbar.adminBadge', language)}</span>` : ''}
            <button type="button" class="btn btn-ghost btn-sm btn-logout" id="btn-logout">
              ${translate('topbar.logout', language)}
            </button>
          </div>
        </div>

        <div class="topbar-actions">
          <div class="topbar-quick-wrapper" id="topbar-quick-wrapper"></div>
          <div id="slot-period-btn"></div>
          <span class="save-state save-ok" id="topbar-save-state" title="${translate('topbar.saved', language)}">
            ${CHECK_ICON} <span class="save-state-text">${translate('topbar.saved', language)}</span>
          </span>
          <span id="slot-cloud-sync"></span>
        </div>
      </header>

      <div id="slot-section-nav"></div>

      <main class="front beranda-front" id="nav-beranda">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-beranda'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span id="hero-period-badge"></span>
          </div>
        </div>
        <div id="slot-alerts"></div>
        <div class="beranda-grid">
          <div class="beranda-col-main">
            <div id="slot-week-card"></div>
            <div id="slot-allowance-card"></div>
            <div id="slot-wallet-cards"></div>
          </div>
          <aside class="beranda-col-side">
            <div id="slot-total-aset"></div>
            <div id="slot-insights"></div>
            <div id="slot-challenge"></div>
            <div id="slot-tips"></div>
          </aside>
        </div>
      </main>

      <div id="nav-catat" class="nav-section">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-catat'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.catat.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.catat.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span id="catat-hero-badge"></span>
          </div>
        </div>
        <div
          class="catat-mobile-switch"
          role="tablist"
          aria-label="${isEn ? 'Record view options' : 'Pilihan tampilan pencatatan'}"
        >
          <button
            type="button"
            role="tab"
            aria-selected="${catatView === 'all'}"
            class="catat-switch-btn ${catatView === 'all' ? 'active' : ''}"
            id="catat-tab-all"
          >
            ${translate('catat.switchAll', language)}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="${catatView === 'expenses'}"
            class="catat-switch-btn ${catatView === 'expenses' ? 'active' : ''}"
            id="catat-tab-expenses"
          >
            ${translate('catat.switchExpenses', language)}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="${catatView === 'income'}"
            class="catat-switch-btn ${catatView === 'income' ? 'active' : ''}"
            id="catat-tab-income"
          >
            ${translate('catat.switchIncome', language)}
          </button>
        </div>

        <div class="catat-split-grid show-${catatView}" id="catat-split-grid">
          <div class="catat-column catat-col-expenses" id="slot-expenses"></div>
          <div class="catat-column catat-col-income" id="slot-income"></div>
        </div>
        <div id="slot-shopping-list"></div>
      </div>

      <div id="nav-kewajiban" class="nav-section">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-kewajiban'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.kewajiban.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.kewajiban.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span id="kewajiban-hero-badge"></span>
          </div>
        </div>
        <div id="slot-obligations"></div>
      </div>

      <div id="nav-analisis" class="nav-section">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-analisis'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.analisis.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.analisis.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span>${translate('hero.analisis.badge', language)}</span>
          </div>
        </div>
        <div id="slot-health"></div>
        <div id="slot-cashflow"></div>
        <div id="slot-trend"></div>
        <div id="slot-donut"></div>
        <div id="slot-heatmap"></div>
        <div id="slot-monthcompare"></div>
        <div id="slot-whatif"></div>
      </div>

      <div id="nav-tabungan" class="nav-section">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-tabungan'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.tabungan.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.tabungan.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span id="tabungan-hero-badge"></span>
          </div>
        </div>
        <div class="tabungan-split-grid">
          <div class="tabungan-col tabungan-col-left" id="slot-endsavings"></div>
          <div class="tabungan-col tabungan-col-right" id="slot-dompet"></div>
        </div>
        <div class="tabungan-split-grid">
          <div class="tabungan-col tabungan-col-left" id="slot-savings"></div>
          <div class="tabungan-col tabungan-col-right" id="slot-wishlist"></div>
        </div>
        <div id="slot-seasonal"></div>
      </div>

      <div id="nav-laporan" class="nav-section">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-laporan'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.laporan.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.laporan.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span id="laporan-hero-badge"></span>
          </div>
        </div>
        <div id="slot-report"></div>
      </div>

      <div id="nav-data" class="nav-section">
        <div class="panel-hero-banner">
          <div class="panel-hero-main">
            <div class="panel-hero-icon">${NAV_SVG_ICONS['nav-data'] || ''}</div>
            <div class="panel-hero-body">
              <h2 class="panel-hero-title">${translate('hero.data.title', language)}</h2>
              <p class="panel-hero-desc">${translate('hero.data.desc', language)}</p>
            </div>
          </div>
          <div class="panel-hero-badge">
            <span>${translate('hero.data.badge', language, { user })}</span>
          </div>
        </div>
        <div id="slot-theme-picker"></div>
        <div id="slot-report-issue"></div>
        <div id="slot-account-security"></div>
        <div id="slot-pwa"></div>
        <div id="slot-data-controls"></div>
        <div id="slot-faq"></div>
        <div id="slot-activity"></div>
      </div>

      ${isAdmin() ? `
        <div id="nav-admin" class="nav-section">
          <div id="slot-admin"></div>
        </div>
      ` : ''}

      <footer class="footer muted small">
        ${translate('footer.text', language)}
      </footer>

      <div id="slot-toast"></div>
      <div id="slot-period-picker"></div>
      <div id="slot-calculator"></div>
      <button
        type="button"
        class="fab"
        id="fab-calc"
        aria-label="${isEn ? 'Calculator' : 'Kalkulator'}"
        title="${isEn ? 'Quick calculator' : 'Kalkulator cepat'}"
      >
        ${CALC_ICON}
      </button>
    </div>
  `;

  // Helper to re-render toast
  function renderToast() {
    const slot = container.querySelector('#slot-toast');
    if (!slot) return;
    if (!toast) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML = `
      <div class="toast${toast.error ? ' toast-error' : ''}" role="status">
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          ${toast.error ? '<strong>!</strong>' : CHECK_ICON}
          <span>${toast.text}</span>
        </span>
        ${toast.undo ? `
          <button type="button" class="btn btn-ghost btn-sm toast-undo" id="btn-toast-undo">
            ${isEn ? 'Undo' : 'Urungkan'}
          </button>
        ` : ''}
      </div>
    `;
    slot.querySelector('#btn-toast-undo')?.addEventListener('click', () => {
      const undoFn = toast?.undo;
      toast = null;
      renderToast();
      undoFn?.();
    });
  }

  // Helper to update navigation sections visibility
  function updateNavSections() {
    const mainBeranda = container.querySelector('#nav-beranda');
    if (mainBeranda) {
      if (!openPanel || openPanel === 'nav-beranda') {
        mainBeranda.style.display = '';
        mainBeranda.classList.add('front');
      } else {
        mainBeranda.style.display = 'none';
        mainBeranda.classList.remove('front');
      }
    }

    const sections = ['nav-catat', 'nav-kewajiban', 'nav-analisis', 'nav-tabungan', 'nav-laporan', 'nav-data', 'nav-admin'];
    sections.forEach((id) => {
      const sec = container.querySelector(`#${id}`);
      if (sec) {
        if (openPanel === id) {
          sec.className = 'nav-section front';
          if (id === 'nav-admin') {
            const slot = sec.querySelector('#slot-admin');
            if (slot && !slot.children.length) {
              renderAdminPanel(slot, { currentUser: user, notify, lang: language });
            }
          }
        } else {
          sec.className = 'nav-section';
        }
      }
    });

    renderSectionNavSlot();
  }

  function getNavItems() {
    const base = [
      { id: 'nav-beranda', label: translate('nav.beranda', language) },
      { id: 'nav-catat', label: translate('nav.catat', language) },
      { id: 'nav-kewajiban', label: translate('nav.kewajiban', language) },
      { id: 'nav-analisis', label: translate('nav.analisis', language) },
      { id: 'nav-tabungan', label: translate('nav.tabungan', language) },
      { id: 'nav-laporan', label: translate('nav.laporan', language) },
      { id: 'nav-data', label: translate('nav.data', language) },
    ];
    if (isAdmin()) {
      base.push({ id: 'nav-admin', label: translate('nav.admin', language) });
    }
    return base;
  }

  function renderQuickButtonsHtml(prefix = '') {
    return `
      <div class="quick-anchor ${prefix}">
        <button
          type="button"
          class="btn btn-sm btn-quick-action btn-quick-expense${quick === 'expense' ? ' quick-on' : ''}"
          data-mode="expense"
          aria-expanded="${quick === 'expense'}"
          title="${translate('topbar.expense', language)} (Shortcut: E)"
        >
          <span>${translate('topbar.expense', language)}</span>
          <kbd class="quick-kbd">E</kbd>
        </button>
        <div class="quick-pop-slot" data-mode="expense"></div>
      </div>
      <div class="quick-anchor ${prefix}">
        <button
          type="button"
          class="btn btn-sm btn-quick-action btn-quick-income${quick === 'income' ? ' quick-on' : ''}"
          data-mode="income"
          aria-expanded="${quick === 'income'}"
          title="${translate('topbar.income', language)} (Shortcut: P)"
        >
          <span>${translate('topbar.income', language)}</span>
          <kbd class="quick-kbd">P</kbd>
        </button>
        <div class="quick-pop-slot" data-mode="income"></div>
      </div>
    `;
  }

  function renderQuickAnchors() {
    const showInNav = isScrolled;
    const topbarWrap = container.querySelector('#topbar-quick-wrapper');
    const navActions = container.querySelector('.section-nav-actions');

    if (!showInNav && topbarWrap) {
      topbarWrap.innerHTML = renderQuickButtonsHtml('topbar-quick');
      bindQuickButtons(topbarWrap);
    } else if (topbarWrap) {
      topbarWrap.innerHTML = '';
    }

    if (showInNav && navActions) {
      navActions.innerHTML = renderQuickButtonsHtml('nav-quick');
      bindQuickButtons(navActions);
    } else if (navActions) {
      navActions.innerHTML = '';
    }
  }

  function bindQuickButtons(parent) {
    if (!parent) return;
    parent.querySelectorAll('.btn-quick-expense').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQuick('expense');
      });
    });
    parent.querySelectorAll('.btn-quick-income').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleQuick('income');
      });
    });

    parent.querySelectorAll('.quick-pop-slot').forEach((slot) => {
      const mode = slot.dataset.mode;
      if (quick === mode) {
        renderQuickEntry(slot, {
          mode,
          state: store.getState(),
          update: store.update,
          notify,
          onClose: () => {
            quick = null;
            renderQuickAnchors();
          },
          lang: language,
        });
      } else {
        slot.innerHTML = '';
      }
    });
  }

  function renderSectionNavSlot() {
    const navSlot = container.querySelector('#slot-section-nav');
    if (!navSlot) return;
    renderSectionNav(navSlot, {
      items: getNavItems(),
      openId: openPanel ?? 'nav-beranda',
      onOpen: togglePanel,
      extraActionsHtml: isScrolled ? renderQuickButtonsHtml('nav-quick') : '',
      isSticky: isScrolled,
      lang: language,
    });
    if (isScrolled) {
      bindQuickButtons(navSlot.querySelector('.section-nav-actions'));
    }
  }

  function renderTopbarBadges() {
    const state = store.getState();
    const periodBtnSlot = container.querySelector('#slot-period-btn');
    if (periodBtnSlot) {
      if (state.mode) {
        periodBtnSlot.innerHTML = `<button type="button" class="btn btn-ghost btn-sm btn-period-select" id="btn-period-select" title="${isEn ? 'Change Period' : 'Ganti Periode'}"><span class="period-label-prefix">${translate('topbar.periodPrefix', language)}</span><span>${state.mode === 'week' ? translate('topbar.periodWeek', language) : translate('topbar.periodMonth', language)}</span></button>`;
        periodBtnSlot.querySelector('#btn-period-select')?.addEventListener('click', () => {
          pickerOpen = true;
          renderModals();
        });
      } else {
        periodBtnSlot.innerHTML = '';
      }
    }

    const saveStateEl = container.querySelector('#topbar-save-state');
    if (saveStateEl) {
      const isSaved = store.getSaved();
      saveStateEl.className = `save-state${isSaved ? ' save-ok' : ''}`;
      saveStateEl.innerHTML = isSaved
        ? `${CHECK_ICON} <span class="save-state-text">${translate('topbar.saved', language)}</span>`
        : `<span class="save-state-text">${translate('topbar.saving', language)}</span>`;
    }

    const cloudSlot = container.querySelector('#slot-cloud-sync');
    if (cloudSlot) {
      const cloudStatus = store.getCloudStatus();
      if (cloudStatus !== 'disabled') {
        cloudSlot.innerHTML = `
          <span class="cloud-sync-chip cloud-sync-${cloudStatus}">
            ${cloudStatus === 'synced' ? translate('topbar.cloudSynced', language) : cloudStatus === 'syncing' ? translate('topbar.cloudSyncing', language) : translate('topbar.cloudOffline', language)}
          </span>
        `;
      } else {
        cloudSlot.innerHTML = '';
      }
    }

    const heroBadge = container.querySelector('#hero-period-badge');
    if (heroBadge) {
      heroBadge.textContent = state.mode === 'week' ? translate('hero.weekBadge', language) : translate('hero.monthBadge', language);
    }
    const catatBadge = container.querySelector('#catat-hero-badge');
    if (catatBadge) {
      catatBadge.textContent = translate('hero.catat.badge', language, { expenses: state.expenses.length, incomes: state.incomes.length });
    }
    const kewajibanBadge = container.querySelector('#kewajiban-hero-badge');
    if (kewajibanBadge) {
      kewajibanBadge.textContent = translate('hero.kewajiban.badge', language, { bills: state.bills.length, debts: state.debts.length });
    }
    const tabunganBadge = container.querySelector('#tabungan-hero-badge');
    if (tabunganBadge) {
      tabunganBadge.textContent = translate('hero.tabungan.badge', language, { count: state.wallets.length });
    }
    const laporanBadge = container.querySelector('#laporan-hero-badge');
    if (laporanBadge) {
      laporanBadge.textContent = state.mode === 'week' ? translate('hero.laporan.weekBadge', language) : translate('hero.laporan.monthBadge', language);
    }
  }

  function renderNotifBell() {
    const anchor = container.querySelector('#notif-anchor');
    if (!anchor) return;
    const unreadCount = notifications.filter((n) => !n.read).length;
    anchor.innerHTML = `
      <button
        type="button"
        class="topbar-bell-btn${unreadCount > 0 ? ' has-unread' : ''}${notifOpen ? ' bell-open' : ''}"
        id="btn-bell"
        aria-label="${isEn ? 'Notification Center' : 'Pusat Notifikasi'}"
        aria-expanded="${notifOpen}"
        title="${isEn ? 'Notifications' : 'Notifikasi'}"
      >
        ${ICON_BELL}
        ${unreadCount > 0 ? `
          <span class="bell-badge" aria-label="${isEn ? `${unreadCount} new notifications` : `${unreadCount} notifikasi baru`}">
            ${unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ` : ''}
      </button>
      <div id="slot-notif-center"></div>
    `;

    anchor.querySelector('#btn-bell')?.addEventListener('click', () => {
      notifOpen = !notifOpen;
      renderNotifBell();
    });

    const notifCenterSlot = anchor.querySelector('#slot-notif-center');
    if (notifOpen && notifCenterSlot) {
      renderNotificationCenter(notifCenterSlot, {
        items: notifications,
        onClose: () => {
          notifOpen = false;
          renderNotifBell();
        },
        onMarkAllRead: () => {
          markAllNotificationsAsRead(user, notifications.map((n) => n.id));
          notifications = notifications.map((n) => ({ ...n, read: true }));
          renderNotifBell();
        },
        onMarkRead: (id) => {
          markNotificationAsRead(user, id);
          notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          renderNotifBell();
        },
        lang: language,
      });
    }
  }

  function renderModals() {
    const state = store.getState();
    const pickerSlot = container.querySelector('#slot-period-picker');
    if (pickerSlot) {
      if (pickerOpen || (state.mode === null && store.getCloudStatus() !== 'syncing')) {
        renderPeriodPicker(pickerSlot, {
          current: state.mode,
          onPick: pickMode,
          onCancel: state.mode === null ? undefined : () => {
            pickerOpen = false;
            renderModals();
          },
          profile: state.profile,
          onApplyProfile: applyProfile,
          lang: language,
        });
      } else {
        pickerSlot.innerHTML = '';
      }
    }

    const calcSlot = container.querySelector('#slot-calculator');
    const fabCalc = container.querySelector('#fab-calc');
    if (calcSlot && fabCalc) {
      if (calcOpen) {
        fabCalc.classList.add('fab-open');
        fabCalc.setAttribute('aria-expanded', 'true');
        calcSlot.innerHTML = `<div class="calc-pop" id="calc-pop-inner"></div>`;
        const inner = calcSlot.querySelector('#calc-pop-inner');
        renderCalculator(inner, {
          onUseNumber: (value) => {
            store.update((s) => ({ ...s, allowance: value }));
            calcOpen = false;
            renderModals();
          },
          onClose: () => {
            calcOpen = false;
            renderModals();
          },
          lang: language,
        });
      } else {
        fabCalc.classList.remove('fab-open');
        fabCalc.setAttribute('aria-expanded', 'false');
        calcSlot.innerHTML = '';
      }
    }
  }

  function renderFull() {
    const state = store.getState();
    const derived = store.getDerived();

    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.colorTheme = state.colorTheme ?? 'emerald';
    setDeviceTheme(state.theme);
    setDeviceColorTheme(state.colorTheme ?? 'emerald');

    renderTopbarBadges();
    renderNotifBell();
    renderQuickAnchors();
    renderSectionNavSlot();

    // Beranda main
    const slotAlerts = container.querySelector('#slot-alerts');
    if (slotAlerts) renderAlertsPanel(slotAlerts, { alerts: buildAlerts(state, derived, language), lang: language });

    const slotWeek = container.querySelector('#slot-week-card');
    if (slotWeek) renderWeekCard(slotWeek, { state, derived, notify, lang: language });

    const slotAllowance = container.querySelector('#slot-allowance-card');
    if (slotAllowance) {
      renderAllowanceCard(slotAllowance, {
        state,
        derived,
        getState: store.getState,
        update: store.update,
        notify,
        onChangePeriod: () => {
          pickerOpen = true;
          renderModals();
        },
        lang: language,
      });
    }

    const slotWallets = container.querySelector('#slot-wallet-cards');
    if (slotWallets) renderWalletCards(slotWallets, { state, derived, lang: language });

    const slotAset = container.querySelector('#slot-total-aset');
    if (slotAset) renderTotalAsetCard(slotAset, { state, lang: language });

    const slotInsights = container.querySelector('#slot-insights');
    if (slotInsights) renderInsightsPanel(slotInsights, { insights: buildInsights(state, derived, language), lang: language });

    const slotChallenge = container.querySelector('#slot-challenge');
    if (slotChallenge) renderChallengeCard(slotChallenge, { state, derived, lang: language });

    const slotTips = container.querySelector('#slot-tips');
    if (slotTips) renderTipsPanel(slotTips, { tips: buildTips(state, derived, language), lang: language });

    // Catat
    const slotExpenses = container.querySelector('#slot-expenses');
    if (slotExpenses) renderExpensesPanel(slotExpenses, { state, getState: store.getState, update: store.update, notify, lang: language });

    const slotIncome = container.querySelector('#slot-income');
    if (slotIncome) renderIncomePanel(slotIncome, { state, getState: store.getState, update: store.update, notify, lang: language });

    const slotShopping = container.querySelector('#slot-shopping-list');
    if (slotShopping) renderShoppingListCard(slotShopping, { state, getState: store.getState, update: store.update, notify, lang: language });

    // Kewajiban
    const slotObligations = container.querySelector('#slot-obligations');
    if (slotObligations) renderObligationsPanel(slotObligations, { state, getState: store.getState, update: store.update, notify, lang: language });

    // Analisis
    const slotHealth = container.querySelector('#slot-health');
    if (slotHealth) renderHealthCard(slotHealth, { state, derived, lang: language });

    const slotCashflow = container.querySelector('#slot-cashflow');
    if (slotCashflow) renderCashflowChart(slotCashflow, { state, derived, lang: language });

    const slotTrend = container.querySelector('#slot-trend');
    if (slotTrend) renderTrendPanel(slotTrend, { state, lang: language });

    const slotDonut = container.querySelector('#slot-donut');
    if (slotDonut) renderAllocationDonut(slotDonut, { state, derived, lang: language });

    const slotHeatmap = container.querySelector('#slot-heatmap');
    if (slotHeatmap) renderCalendarHeatmap(slotHeatmap, { state, getState: store.getState, update: store.update, lang: language });

    const slotMonthCompare = container.querySelector('#slot-monthcompare');
    if (slotMonthCompare) renderMonthCompare(slotMonthCompare, { state, derived, lang: language });

    const slotWhatIf = container.querySelector('#slot-whatif');
    if (slotWhatIf) renderWhatIfPanel(slotWhatIf, { state, derived, lang: language });

    // Tabungan
    const slotEndSavings = container.querySelector('#slot-endsavings');
    if (slotEndSavings) renderEndSavingsCard(slotEndSavings, { state, getState: store.getState, update: store.update, notify, lang: language });

    const slotDompet = container.querySelector('#slot-dompet');
    if (slotDompet) renderDompetPanel(slotDompet, { state, getState: store.getState, update: store.update, lang: language });

    const slotSavings = container.querySelector('#slot-savings');
    if (slotSavings) renderSavingsPanel(slotSavings, { state, derived, getState: store.getState, update: store.update, lang: language });

    const slotWishlist = container.querySelector('#slot-wishlist');
    if (slotWishlist) renderWishlistPanel(slotWishlist, { state, derived, getState: store.getState, update: store.update, lang: language });

    const slotSeasonal = container.querySelector('#slot-seasonal');
    if (slotSeasonal) renderSeasonalPanel(slotSeasonal, { state, derived, getState: store.getState, update: store.update, notify, lang: language });

    // Laporan
    const slotReport = container.querySelector('#slot-report');
    if (slotReport) renderReportCard(slotReport, { state, notify, lang: language });

    // Data
    const slotThemePicker = container.querySelector('#slot-theme-picker');
    if (slotThemePicker) {
      renderThemePickerCard(slotThemePicker, {
        colorTheme: state.colorTheme ?? 'emerald',
        themeMode: state.theme,
        onColorThemeChange: (c) => {
          store.update((s) => ({ ...s, colorTheme: c }));
          setDeviceColorTheme(c);
        },
        onThemeModeChange: (m) => {
          store.update((s) => ({ ...s, theme: m }));
          setDeviceTheme(m);
        },
        lang: language,
      });
    }

    const slotReportIssue = container.querySelector('#slot-report-issue');
    if (slotReportIssue) renderReportIssueCard(slotReportIssue, { notify, lang: language });

    const slotAccountSecurity = container.querySelector('#slot-account-security');
    if (slotAccountSecurity) renderAccountSecurityCard(slotAccountSecurity, { username: user, notify, lang: language });

    const slotPwa = container.querySelector('#slot-pwa');
    if (slotPwa) renderPwaInstallCard(slotPwa, { notify, lang: language });

    const slotDataControls = container.querySelector('#slot-data-controls');
    if (slotDataControls) {
      renderDataControls(slotDataControls, {
        state,
        saved: store.getSaved(),
        cloudStatus: store.getCloudStatus(),
        lastSyncTime: store.getLastSyncTime(),
        onSyncNow: store.syncNow,
        onPullNow: store.pullNow,
        onImport: store.replace,
        onReset: resetAll,
        notify,
        lang: language,
      });
    }

    const slotFaq = container.querySelector('#slot-faq');
    if (slotFaq) renderFaqPrivacyCard(slotFaq, { lang: language });

    const slotActivity = container.querySelector('#slot-activity');
    if (slotActivity) renderActivityPanel(slotActivity, { state, lang: language });

    // Admin
    if (isAdmin()) {
      const slotAdmin = container.querySelector('#slot-admin');
      if (slotAdmin && openPanel === 'nav-admin') {
        renderAdminPanel(slotAdmin, { currentUser: user, notify, lang: language });
      }
    }

    renderModals();
    updateNavSections();
  }

  // Subscribe to store updates
  const unsubscribeStore = store.subscribe((state, derived) => {
    // Check period sweep transition
    if (derived.period && state.periodKey !== derived.period.startISO) {
      store.update((s) => sweepTransition(s, derived.period));
      return;
    }

    notifyDue(state);
    notifyAlerts(state, derived);

    buildUserNotifications(user, state, derived, language).then((items) => {
      notifications = items;
      renderNotifBell();
    }).catch(() => {});

    renderFull();
  });

  // Topbar event listeners
  container.querySelector('#btn-lang-toggle')?.addEventListener('click', () => {
    handleSetLanguage(language === 'id' ? 'en' : 'id');
  });

  container.querySelector('#btn-fab-theme')?.addEventListener('click', () => {
    const nextTheme = store.getState().theme === 'dark' ? 'light' : 'dark';
    store.update((s) => ({ ...s, theme: nextTheme }));
  });

  container.querySelector('#btn-logout')?.addEventListener('click', handleLogout);

  container.querySelector('#fab-calc')?.addEventListener('click', () => {
    calcOpen = !calcOpen;
    renderModals();
  });

  // Catat View Tabs
  const catatGrid = container.querySelector('#catat-split-grid');
  const catatTabAll = container.querySelector('#catat-tab-all');
  const catatTabExp = container.querySelector('#catat-tab-expenses');
  const catatTabInc = container.querySelector('#catat-tab-income');

  function setCatatViewMode(view) {
    catatView = view;
    catatTabAll?.classList.toggle('active', view === 'all');
    catatTabAll?.setAttribute('aria-selected', view === 'all');
    catatTabExp?.classList.toggle('active', view === 'expenses');
    catatTabExp?.setAttribute('aria-selected', view === 'expenses');
    catatTabInc?.classList.toggle('active', view === 'income');
    catatTabInc?.setAttribute('aria-selected', view === 'income');
    if (catatGrid) {
      catatGrid.className = `catat-split-grid show-${view}`;
    }
  }

  catatTabAll?.addEventListener('click', () => setCatatViewMode('all'));
  catatTabExp?.addEventListener('click', () => setCatatViewMode('expenses'));
  catatTabInc?.addEventListener('click', () => setCatatViewMode('income'));

  // Keyboard and scroll listeners
  let rafId = null;
  const onScroll = () => {
    const y = window.scrollY || 0;
    const nextScrolled = y >= 75 ? true : y <= 55 ? false : isScrolled;
    if (nextScrolled !== isScrolled) {
      isScrolled = nextScrolled;
      renderSectionNavSlot();
      renderQuickAnchors();
    }
  };

  const onScrollThrottled = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      onScroll();
    });
  };

  window.addEventListener('scroll', onScrollThrottled, { passive: true });
  onScroll();

  const onResize = () => {
    if (typeof window.matchMedia === 'function') {
      isDesktop = window.matchMedia('(min-width: 769px)').matches;
    } else {
      isDesktop = (window.innerWidth || 1024) > 768;
    }
  };
  window.addEventListener('resize', onResize);

  const onGlobalKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (calcOpen) {
        calcOpen = false;
        renderModals();
      } else if (quick) {
        quick = null;
        renderQuickAnchors();
      } else if (openPanel) {
        openPanel = null;
        updateNavSections();
      }
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    const key = event.key.toLowerCase();
    if (key === 'e') {
      event.preventDefault();
      toggleQuick('expense');
    } else if (key === 'p') {
      event.preventDefault();
      toggleQuick('income');
    }
  };
  window.addEventListener('keydown', onGlobalKeyDown);

  const onGlobalMouseDown = (event) => {
    if (!quick) return;
    const anchor = event.target?.closest?.('.quick-anchor');
    if (!anchor) {
      quick = null;
      renderQuickAnchors();
    }
  };
  document.addEventListener('mousedown', onGlobalMouseDown);

  // Activity detection to touch session
  let lastTouch = Date.now();
  const onUserActivity = () => {
    const now = Date.now();
    if (now - lastTouch > 15000) {
      lastTouch = now;
      touchSession();
    }
  };
  window.addEventListener('click', onUserActivity, { passive: true });
  window.addEventListener('keydown', onUserActivity, { passive: true });
  window.addEventListener('touchstart', onUserActivity, { passive: true });

  // Session expiry timer
  const checkSessionExpiry = () => {
    if (!currentUser()) {
      handleLogout();
    }
  };
  const sessionInterval = setInterval(checkSessionExpiry, 30000);
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') checkSessionExpiry();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', checkSessionExpiry);

  // Initial period sweep transition check (equivalent to React's useEffect on mount)
  const initialDerived = store.getDerived();
  const initialState = store.getState();
  if (initialDerived.period && initialState.periodKey !== initialDerived.period.startISO) {
    store.update((s) => sweepTransition(s, initialDerived.period));
  } else {
    renderFull();
  }

  // Initial notification fetch
  buildUserNotifications(user, store.getState(), store.getDerived(), language)
    .then((items) => {
      notifications = items;
      renderNotifBell();
    })
    .catch(() => {});

  // Cleanup handler
  return () => {
    unsubscribeStore();
    store.destroy();
    clearTimeout(toastTimer);
    clearInterval(sessionInterval);
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScrollThrottled);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onGlobalKeyDown);
    document.removeEventListener('mousedown', onGlobalMouseDown);
    window.removeEventListener('click', onUserActivity);
    window.removeEventListener('keydown', onUserActivity);
    window.removeEventListener('touchstart', onUserActivity);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', checkSessionExpiry);
  };
}

export default mountApp;

