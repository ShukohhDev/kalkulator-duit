/**
 * Theme & Color Palette Picker Card (Pure Vanilla JS)
 */
import { escapeHtml } from '../lib/dom.js';

const COLOR_OPTIONS = [
  {
    id: 'emerald',
    name: 'Emerald Fintech',
    descId: 'Nuansa hijau toska segar dan profesional.',
    descEn: 'Fresh and professional emerald teal nuance.',
    color: '#0F766E',
  },
  {
    id: 'sage',
    name: 'Cozy Sage',
    descId: 'Nuansa hijau zaitun lembut dan tenang di mata.',
    descEn: 'Soft and calming olive sage green nuance.',
    color: '#15803D',
  },
  {
    id: 'nordic',
    name: 'Nordic Minimalist',
    descId: 'Nuansa monokrom bersih dengan aksen dingin.',
    descEn: 'Clean monochrome nuance with cool slate tones.',
    color: '#0F172A',
  },
];

const CHECK_ICON = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
`;

export function renderThemePickerCard(container, { colorTheme, themeMode, onColorThemeChange, onThemeModeChange, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const optionsHtml = COLOR_OPTIONS.map((opt) => {
    const isSelected = colorTheme === opt.id;
    return `
      <button
        type="button"
        class="theme-card-option${isSelected ? ' is-selected' : ''}"
        data-theme="${escapeHtml(opt.id)}"
        aria-pressed="${isSelected}"
      >
        <div class="theme-card-head">
          <span
            class="theme-swatch"
            style="background-color: ${escapeHtml(opt.color)};"
            aria-hidden="true"
          ></span>
          <strong class="theme-card-name">${escapeHtml(opt.name)}</strong>
          ${isSelected ? `<span class="theme-check">${CHECK_ICON}</span>` : ''}
        </div>
        <p class="theme-card-desc">${isEn ? escapeHtml(opt.descEn) : escapeHtml(opt.descId)}</p>
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <section class="card theme-picker-card" aria-label="${isEn ? 'Theme and appearance settings' : 'Pengaturan tema tampilan'}">
      <header class="card-head">
        <div>
          <h2>${isEn ? 'Theme & Appearance' : 'Tema dan Tampilan'}</h2>
          <p class="muted small" style="margin: 4px 0 0;">
            ${isEn ? 'Choose your favorite color palette and lighting mode.' : 'Pilih kombinasi warna dan pencahayaan yang paling nyaman untuk Anda.'}
          </p>
        </div>
      </header>

      <div class="theme-picker-group">
        <label class="section-title">${isEn ? 'Color Palette' : 'Pilihan Skema Warna'}</label>
        <div class="theme-grid">
          ${optionsHtml}
        </div>
      </div>

      <div class="theme-picker-group" style="margin-top: 20px;">
        <label class="section-title">${isEn ? 'Lighting Mode' : 'Mode Pencahayaan'}</label>
        <div class="theme-mode-row">
          <button
            type="button"
            class="btn btn-sm btn-ghost theme-mode-btn btn-light-mode${themeMode === 'light' ? ' btn-active' : ''}"
            aria-pressed="${themeMode === 'light'}"
          >
            ${isEn ? 'Light Mode' : 'Mode Terang'}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-ghost theme-mode-btn btn-dark-mode${themeMode === 'dark' ? ' btn-active' : ''}"
            aria-pressed="${themeMode === 'dark'}"
          >
            ${isEn ? 'Dark Mode' : 'Mode Gelap'}
          </button>
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll('.theme-card-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.theme;
      onColorThemeChange?.(selected);
    });
  });

  container.querySelector('.btn-light-mode')?.addEventListener('click', () => {
    onThemeModeChange?.('light');
  });

  container.querySelector('.btn-dark-mode')?.addEventListener('click', () => {
    onThemeModeChange?.('dark');
  });
}

