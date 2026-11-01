/**
 * Period Picker & Onboarding Wizard (Vanilla JS)
 */
import { PROFILES } from '../lib/profiles.js';
import { loadPrefs, savePrefs } from '../lib/prefs.js';
import { lockBodyScroll } from '../lib/scrollLock.js';
import { escapeHtml } from '../lib/dom.js';

const WIZARD_DESC = {
  'tinggal-rumah': {
    id: 'Ada jatah kebutuhan rumah: listrik, belanja, internet.',
    en: 'Includes household bills: utilities, groceries, internet.',
  },
  'tinggal-kos': {
    id: 'Fokus anak kos: laundry, WiFi, makan di luar.',
    en: 'Focus on dorm life: laundry, WiFi, dining out.',
  },
};

export function renderPeriodPicker(container, { current, onPick, onCancel, profile, onApplyProfile, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';
  const onboard = current === null;
  let profilePicked = loadPrefs().profilePicked ?? false;
  const unlock = lockBodyScroll();

  function render() {
    const options = [
      {
        mode: 'week',
        title: isEn ? '1 Week' : '1 Minggu',
        desc: isEn ? 'Allowance received every week' : 'Uang jajan yang kamu terima tiap minggu',
      },
      {
        mode: 'month',
        title: isEn ? '1 Month' : '1 Bulan',
        desc: isEn ? 'Allowance received every month' : 'Uang jajan yang kamu terima tiap bulan',
      },
    ];

    const wizardCardsHtml = PROFILES.map((item) => `
      <button type="button" class="wizard-card${profile === item.id ? ' wizard-card-on' : ''}" data-profile="${item.id}">
        <strong class="wizard-card-title">${escapeHtml(item.label)}</strong>
        <span class="muted small">${escapeHtml(WIZARD_DESC[item.id]?.[lang] || '')}</span>
      </button>
    `).join('');

    const periodOptionsHtml = options.map((option) => `
      <button type="button" class="period-option${current === option.mode ? ' period-option-active' : ''}" data-mode="${option.mode}">
        <span class="period-option-title">${escapeHtml(option.title)}</span>
        <span class="period-option-desc">${escapeHtml(option.desc)}</span>
      </button>
    `).join('');

    const profileChipsHtml = PROFILES.map((item) => `<button type="button" class="profile-chip${profile === item.id ? ' profile-chip-on' : ''}" data-profile="${item.id}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`).join('');

    container.innerHTML = `
      <div class="overlay${onboard ? ' overlay-onboard' : ''}" role="dialog" aria-modal="true">
        <div class="overlay-card">
          <h1 class="overlay-title">
            ${onboard ? 'Kalkulator Uang Jajan' : isEn ? 'Change allowance period' : 'Ganti periode uang jajan'}
          </h1>
          <p class="overlay-sub">
            ${
              onboard
                ? isEn
                  ? 'Choose how often you receive your allowance so we can budget accurately.'
                  : 'Pilih dulu uang jajan kamu masuknya tiap apa, supaya alokasinya sesuai.'
                : isEn
                ? 'Budget allocations and recurring income will adjust automatically.'
                : 'Alokasi dan pemasukan otomatis akan ikut menyesuaikan.'
            }
          </p>

          ${
            onboard && !profilePicked
              ? `<div class="wizard-step">
                  <p class="profile-label">
                    ${isEn ? 'Step 1: Where do you live?' : 'Langkah 1: kamu tinggal di mana?'}
                  </p>
                  <div class="wizard-cards">
                    ${wizardCardsHtml}
                  </div>
                  <p class="profile-label">
                    ${isEn ? 'Step 2: How often do you receive your allowance?' : 'Langkah 2: uang jajan kamu masuknya tiap apa?'}
                  </p>
                </div>`
              : ''
          }

          <div class="period-options">
            ${periodOptionsHtml}
          </div>

          ${
            !onboard
              ? `<div class="profile-block">
                  <p class="profile-label">${isEn ? 'Allocation profile' : 'Profil alokasi'}</p>
                  <div class="profile-chips">
                    ${profileChipsHtml}
                  </div>
                  <p class="muted small">
                    ${
                      isEn
                        ? 'Switching profiles adjusts allocation ratios; transaction data stays safe.'
                        : 'Ganti profil menukar rasio alokasi; data transaksi tetap aman.'
                    }
                  </p>
                </div>`
              : ''
          }

          ${
            !onboard && onCancel
              ? `<button type="button" class="btn btn-ghost btn-cancel-period">
                  ${isEn ? 'Cancel' : 'Batal'}
                </button>`
              : ''
          }
        </div>
      </div>
    `;

    // Wizard card click
    container.querySelectorAll('.wizard-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.profile;
        onApplyProfile?.(id);
        savePrefs({ profilePicked: true });
        profilePicked = true;
        profile = id;
        render();
      });
    });

    // Period option click
    container.querySelectorAll('.period-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        unlock();
        onPick(btn.dataset.mode);
      });
    });

    // Profile chips click
    container.querySelectorAll('.profile-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.profile;
        const label = btn.dataset.label;
        if (id === profile) return;
        const confirmMsg = isEn
          ? `Apply profile "${label}"? Budget ratios will update to match (you can still customize them later).`
          : `Terapkan profil ${label}? Rasio alokasi akan diganti sesuai profil ini (kamu tetap bisa mengubahnya).`;
        if (!window.confirm(confirmMsg)) return;
        profile = id;
        onApplyProfile?.(id);
        render();
      });
    });

    // Cancel click
    container.querySelector('.btn-cancel-period')?.addEventListener('click', () => {
      unlock();
      onCancel?.();
    });
  }

  render();
}
