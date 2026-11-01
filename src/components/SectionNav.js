/**
 * Section Navigation Panel (Pure Vanilla JS)
 */
import { NAV_SVG_ICONS } from './icons.js';
import { escapeHtml } from '../lib/dom.js';

export function renderSectionNav(container, { items, openId, onOpen, extraActionsHtml = '', isSticky = false, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const chipsHtml = items.map((item) => {
    const isActive = openId === item.id;
    const icon = NAV_SVG_ICONS[item.id] ? `<span class="nav-chip-icon" aria-hidden="true">${NAV_SVG_ICONS[item.id]}</span>` : '';
    return `
      <button
        type="button"
        class="nav-chip${isActive ? ' nav-chip-on' : ''}"
        data-id="${escapeHtml(item.id)}"
        aria-expanded="${isActive}"
        title="${escapeHtml(item.label)}"
      >
        ${icon}
        <span>${escapeHtml(item.label)}</span>
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <nav class="section-nav${isSticky ? ' section-nav-sticky' : ''}" aria-label="${isEn ? 'Panel navigation' : 'Navigasi panel'}">
      <div class="section-nav-items">
        ${chipsHtml}
      </div>
      ${extraActionsHtml ? `<div class="section-nav-actions">${extraActionsHtml}</div>` : ''}
    </nav>
  `;

  container.querySelectorAll('.nav-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      onOpen?.(btn.dataset.id);
    });
  });
}
