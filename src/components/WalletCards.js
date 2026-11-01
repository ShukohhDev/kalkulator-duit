/**
 * Pocket Cards Component (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import { roundTo500 } from '../lib/allocation.js';
import { escapeHtml } from '../lib/dom.js';

export function renderWalletCards(container, { state, derived, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  if (state.mode === null || state.allowance <= 0) {
    container.innerHTML = '';
    return;
  }

  const activeCategories = state.categories.filter((category) => category.ratio > 0);
  if (activeCategories.length === 0) {
    container.innerHTML = '';
    return;
  }

  const cardsHtml = activeCategories.map((category) => {
    const allocated = roundTo500(state.allowance * category.ratio);
    const spent = derived.spentByCategory[category.id] ?? 0;
    const over = allocated > 0 && spent > allocated;
    const percent = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
    const ratioPercent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return `
      <article class="wallet" style="--wallet-color: ${escapeHtml(category.color)};">
        <header>
          <span class="wallet-dot"></span>
          <h3>${escapeHtml(category.name)}</h3>
        </header>
        <p class="wallet-amount">${formatIDR(spent)}</p>
        <p class="muted small">
          ${
            isEn
              ? `Allocated ${formatIDR(allocated)} · remaining ${formatIDR(Math.max(0, allocated - spent))}`
              : `Alokasi ${formatIDR(allocated)} · sisa ${formatIDR(Math.max(0, allocated - spent))}`
          }
        </p>
        <div class="progress-bar-track" style="width: 100%; height: 8px; background: var(--bg-surface-soft, rgba(0,0,0,0.06)); border-radius: 999px; overflow: hidden; margin: 8px 0;">
          <div class="progress-bar-fill" style="width: ${percent}%; height: 100%; background: ${category.color}; border-radius: 999px;"></div>
        </div>
        ${
          over
            ? `<span class="badge badge-danger">
                ${isEn ? `Exceeded allocation ${ratioPercent}%` : `Melebihi alokasi ${ratioPercent}%`}
              </span>`
            : spent >= allocated * 0.8
            ? `<span class="badge badge-warn">
                ${isEn ? `Almost reaching limit (${ratioPercent}%)` : `Hampir mencapai batas (${ratioPercent}%)`}
              </span>`
            : ''
        }
      </article>
    `;
  }).join('');

  container.innerHTML = `
    <section class="card">
      <header class="card-head">
        <h2>${isEn ? 'Pocket Cards' : 'Kartu Saku'}</h2>
        <span class="muted small">
          ${isEn ? 'Allocation vs actual this period' : 'Alokasi vs realisasi periode ini'}
        </span>
      </header>
      <div class="wallet-grid">
        ${cardsHtml}
      </div>
    </section>
  `;
}
