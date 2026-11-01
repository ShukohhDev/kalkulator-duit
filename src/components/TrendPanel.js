/**
 * Category Trend Analytics Panel (Pure Vanilla JS)
 */
import { Chart } from 'chart.js';
import { buildCashflow } from '../lib/derive.js';
import { CHART_FONT, EXPENSE_COLOR, MUTED_COLOR } from '../lib/chartSetup.js';
import { loadPrefs, savePrefs } from '../lib/prefs.js';
import { formatIDR } from '../lib/money.js';
import { nowDate } from '../lib/obligations.js';
import { escapeHtml } from '../lib/dom.js';

export function renderTrendPanel(container, { state, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const expenseCatIds = new Set(state.expenses.map((e) => e.categoryId));
  const list = state.categories.filter((c) => (c.ratio > 0 && !c.off) || expenseCatIds.has(c.id));
  const trendCategories = list.length > 0 ? list : state.categories;

  let categoryId = trendCategories.find((c) => c.ratio > 0 && !c.off)?.id ?? trendCategories[0]?.id ?? 'makan';
  let view = loadPrefs().trendView || 'month';
  let chartInstance = null;

  const views = [
    { id: 'day', label: isEn ? 'Daily' : 'Harian' },
    { id: 'week', label: isEn ? 'Weekly' : 'Mingguan' },
    { id: 'month', label: isEn ? 'Monthly' : 'Bulanan' },
    { id: 'year', label: isEn ? 'Yearly' : 'Tahunan' },
  ];

  function pickView(next) {
    view = next;
    savePrefs({ trendView: next });
    render();
  }

  function render() {
    if (chartInstance) {
      try {
        chartInstance.destroy();
      } catch {}
      chartInstance = null;
    }

    if (!trendCategories.some((c) => c.id === categoryId)) {
      if (trendCategories[0]) {
        categoryId = trendCategories[0].id;
      }
    }

    const now = nowDate();
    const expenses = state.expenses.filter((item) => item.categoryId === categoryId);
    const series = buildCashflow([], expenses, view, now);
    const total = series.expense.reduce((sum, value) => sum + value, 0);
    const active = state.categories.find((category) => category.id === categoryId);

    container.innerHTML = `
      <section class="card">
        <header class="card-head">
          <h2>${isEn ? 'Trend by Category' : 'Tren per Kategori'}</h2>
          <div class="seg">
            ${views.map((item) => `
              <button
                type="button"
                class="seg-btn${view === item.id ? ' seg-active' : ''}"
                data-view="${item.id}"
              >
                ${item.label}
              </button>
            `).join('')}
          </div>
        </header>

        <div class="filter-row">
          <select
            class="input"
            aria-label="${isEn ? 'Trend category' : 'Kategori tren'}"
            title="${isEn ? 'Select Trend Category' : 'Pilih Kategori Tren'}"
            id="select-trend-cat"
          >
            ${trendCategories.map((category) => `
              <option value="${escapeHtml(category.id)}"${category.id === categoryId ? ' selected' : ''}>
                ${escapeHtml(category.name)}
              </option>
            `).join('')}
          </select>
          <span class="muted small">
            ${isEn ? `Visible total ${formatIDR(total)}` : `Total terlihat ${formatIDR(total)}`}
          </span>
        </div>

        ${expenses.length === 0 ? `
          <p class="muted">${isEn ? 'No expenses in this category yet.' : 'Belum ada pengeluaran pada kategori ini.'}</p>
        ` : `
          <div class="chart-box chart-box-bar">
            <canvas id="trend-chart-canvas"></canvas>
          </div>
        `}
      </section>
    `;

    // Listeners
    container.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        pickView(btn.dataset.view);
      });
    });

    const selectEl = container.querySelector('#select-trend-cat');
    selectEl?.addEventListener('change', (e) => {
      categoryId = e.target.value;
      render();
    });

    if (expenses.length > 0) {
      const canvas = container.querySelector('#trend-chart-canvas');
      if (canvas && typeof Chart === 'function') {
        const data = {
          labels: series.labels,
          datasets: [
            {
              label: active?.name ?? (isEn ? 'Expense' : 'Pengeluaran'),
              data: series.expense,
              borderColor: active?.color ?? EXPENSE_COLOR,
              backgroundColor: active?.color ?? EXPENSE_COLOR,
              tension: 0.3,
              pointRadius: 3,
              fill: false,
            },
          ],
        };

        const options = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => formatIDR(Number(ctx.parsed?.y ?? 0)) },
            },
          },
          scales: {
            x: { ticks: { color: MUTED_COLOR, font: CHART_FONT } },
            y: {
              beginAtZero: true,
              ticks: {
                color: MUTED_COLOR,
                font: CHART_FONT,
                callback: (value) => formatIDR(Number(value)),
              },
            },
          },
        };

        try {
          chartInstance = new Chart(canvas, {
            type: 'line',
            data,
            options,
          });
        } catch {}
      }
    }
  }

  render();
}
