/**
 * Savings Tips Panel (Pure Vanilla JS)
 */
import { escapeHtml } from '../lib/dom.js';

export function renderTipsPanel(container, { tips = [], lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  if (tips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <section class="card">
      <header class="card-head">
        <h2>${isEn ? 'Savings Tips' : 'Tips Hemat'}</h2>
        <span class="muted small">${isEn ? 'from your spending patterns' : 'dari pola belanjamu'}</span>
      </header>
      <ul class="tip-list">
        ${tips.map((tip) => `
          <li class="tip">
            <span class="tip-icon" aria-hidden="true">→</span>
            <span>${escapeHtml(tip.text)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}
