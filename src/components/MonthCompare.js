/**
 * Month-to-Month Comparison (Pure Vanilla JS)
 */
import { categoryDeltas, shiftMonthKey, summarizeMonth } from '../lib/compare.js';
import { formatIDR, monthKey, monthLabel, toISO } from '../lib/money.js';
import { ICON_DELTA_UP, ICON_DELTA_DOWN } from './icons.js';
import { escapeHtml } from '../lib/dom.js';

function renderDelta(value, isEn) {
  if (value === null) return `<span class="delta">${isEn ? 'new' : 'baru'}</span>`;
  if (value === 0) return `<span class="delta delta-flat">0%</span>`;
  return `
    <span class="delta ${value > 0 ? 'delta-up' : 'delta-down'}">
      ${value > 0 ? ICON_DELTA_UP : ICON_DELTA_DOWN}
      <span>${Math.abs(value)}%</span>
    </span>
  `;
}

export function renderMonthCompare(container, { state, derived, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const currentKey = monthKey(toISO(new Date()));
  const previousKey = shiftMonthKey(currentKey, -1);

  const current = summarizeMonth(derived.allIncomes, state.expenses, currentKey);
  const previous = summarizeMonth(derived.allIncomes, state.expenses, previousKey);
  const deltas = categoryDeltas(state.expenses, state.categories, currentKey, previousKey);

  const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? null : 0);

  container.innerHTML = `
    <section class="card month-compare-card">
      <header class="card-head">
        <h2>${isEn ? 'This Month vs Last Month' : 'Bulan Ini vs Bulan Lalu'}</h2>
        <span class="muted small">${monthLabel(currentKey)}</span>
      </header>

      <div class="compare-grid">
        <div class="compare">
          <span class="muted small">${isEn ? 'Income' : 'Pemasukan'}</span>
          <strong>${formatIDR(current.income)}</strong>
          ${renderDelta(pct(current.income, previous.income), isEn)}
        </div>
        <div class="compare">
          <span class="muted small">${isEn ? 'Expenses' : 'Pengeluaran'}</span>
          <strong>${formatIDR(current.expense)}</strong>
          ${renderDelta(pct(current.expense, previous.expense), isEn)}
        </div>
        <div class="compare">
          <span class="muted small">
            ${isEn ? 'Net (income − expenses)' : 'Sisa (pemasukan − pengeluaran)'}
          </span>
          <strong class="${current.net < 0 ? 'text-danger' : ''}">${formatIDR(current.net)}</strong>
          ${renderDelta(pct(current.net, previous.net), isEn)}
        </div>
      </div>

      <h3 class="section-title" style="margin-top: 16px;">${isEn ? 'By category' : 'Per kategori'}</h3>
      <ul class="delta-list">
        ${
          deltas.length === 0
            ? `<li class="empty">${isEn ? 'No comparison data yet.' : 'Belum ada pembanding.'}</li>`
            : deltas.map((item) => `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="alloc-dot" style="width: 10px; height: 10px; border-radius: 999px; background: ${escapeHtml(item.category.color)};"></span>
                    <span class="alloc-name" style="font-weight: 500;">${escapeHtml(item.category.name)}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="muted small">${formatIDR(item.current)}</span>
                    ${renderDelta(item.changePct, isEn)}
                  </div>
                </li>
              `).join('')
        }
      </ul>
    </section>
  `;
}

