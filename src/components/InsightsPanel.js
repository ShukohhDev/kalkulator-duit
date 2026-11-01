/**
 * Automatic Insights Panel (Pure Vanilla JS)
 */
import { ICON_CHECK, ICON_ALERT, ICON_INFO } from './icons.js';
import { escapeHtml } from '../lib/dom.js';

const ICONS = {
  warn: ICON_ALERT,
  good: ICON_CHECK,
  info: ICON_INFO,
};

export function renderInsightsPanel(container, { insights = [], lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  if (insights.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <section class="card">
      <header class="card-head">
        <h2>${isEn ? 'Automatic Suggestions' : 'Saran Otomatis'}</h2>
        <span class="muted small">${isEn ? 'calculated from your records' : 'dihitung dari catatanmu'}</span>
      </header>
      <ul class="insight-list">
        ${insights.map((item) => `
          <li class="insight insight-${item.tone}">
            <span class="insight-icon" aria-hidden="true">
              ${ICONS[item.tone] || ICON_INFO}
            </span>
            <span>${escapeHtml(item.text)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}
