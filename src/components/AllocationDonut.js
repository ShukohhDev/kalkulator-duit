/**
 * Allocation vs Spending Donut / Bar Chart (Pure Vanilla JS)
 */
import { Chart } from 'chart.js';
import { CHART_FONT, MUTED_COLOR } from '../lib/chartSetup.js';
import { formatIDR } from '../lib/money.js';
import { roundTo500 } from '../lib/allocation.js';
import { escapeHtml } from '../lib/dom.js';

export function renderAllocationDonut(container, { state, derived, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let viewMode = 'bar'; // 'bar' | 'donut'
  let chartInstance = null;

  function render() {
    if (chartInstance) {
      try {
        chartInstance.destroy();
      } catch {}
      chartInstance = null;
    }

    const rows = state.categories
      .map((category) => ({
        category,
        allocated: roundTo500(state.allowance * category.ratio),
        spent: derived.spentByCategory[category.id] ?? 0,
      }))
      .filter((row) => row.spent > 0 || row.allocated > 0);

    const spentRows = rows.filter((row) => row.spent > 0);
    const totalSpent = spentRows.reduce((sum, row) => sum + row.spent, 0);

    if (totalSpent <= 0) {
      container.innerHTML = `
        <section class="card" aria-label="${isEn ? 'Allocation versus actual spending' : 'Alokasi versus realisasi pengeluaran'}">
          <header class="card-head">
            <h2>${isEn ? 'Allocation vs Spending' : 'Alokasi vs Realisasi'}</h2>
          </header>
          <p class="muted">
            ${isEn ? 'No expenses recorded in this period yet, chart is empty.' : 'Belum ada pengeluaran pada periode ini, jadi grafiknya masih kosong.'}
          </p>
        </section>
      `;
      return;
    }

    const sortedRows = [...rows].sort((a, b) => b.spent - a.spent || b.allocated - a.allocated);

    const barsHtml = sortedRows.map((row) => {
      const maxVal = Math.max(row.allocated, row.spent, 1);
      const spentPct = Math.min(100, (row.spent / maxVal) * 100);
      const allocPct = Math.min(100, (row.allocated / maxVal) * 100);

      return `
        <div class="alloc-bar-row" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
            <span style="font-weight: 600;">${escapeHtml(row.category.name)}</span>
            <span>
              <strong>${formatIDR(row.spent)}</strong>
              <span class="muted small"> / ${formatIDR(row.allocated)}</span>
            </span>
          </div>
          <div style="position: relative; height: 10px; background: var(--bg-surface-soft, rgba(0,0,0,0.06)); border-radius: 999px; overflow: hidden;">
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${allocPct}%; background: rgba(0,0,0,0.1); border-radius: 999px;"></div>
            <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${spentPct}%; background: ${escapeHtml(row.category.color)}; border-radius: 999px;"></div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <section class="card" aria-label="${isEn ? 'Allocation versus actual spending' : 'Alokasi versus realisasi pengeluaran'}">
        <header class="card-head" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2>${isEn ? 'Allocation vs Spending' : 'Alokasi vs Realisasi'}</h2>
            <span class="muted small">${isEn ? 'current period' : 'periode berjalan'}</span>
          </div>
          <div class="btn-row" style="margin: 0; display: flex; gap: 4px;">
            <button type="button" class="btn btn-ghost btn-sm btn-mode-bar${viewMode === 'bar' ? ' btn-active' : ''}">
              ${isEn ? 'Bars' : 'Batang'}
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-mode-donut${viewMode === 'donut' ? ' btn-active' : ''}">
              Donat
            </button>
          </div>
        </header>

        ${
          viewMode === 'bar'
            ? `<div class="alloc-bars" style="margin-top: 14px;">${barsHtml}</div>`
            : `<div class="chart-donut-wrap" style="position: relative; height: 220px; margin-top: 14px;">
                <canvas class="canvas-donut"></canvas>
              </div>`
        }
      </section>
    `;

    container.querySelector('.btn-mode-bar')?.addEventListener('click', () => {
      viewMode = 'bar';
      render();
    });

    container.querySelector('.btn-mode-donut')?.addEventListener('click', () => {
      viewMode = 'donut';
      render();
    });

    if (viewMode === 'donut') {
      const canvas = container.querySelector('.canvas-donut');
      if (canvas && spentRows.length > 0) {
        try {
          chartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
              labels: spentRows.map((r) => r.category.name),
              datasets: [
                {
                  data: spentRows.map((r) => r.spent),
                  backgroundColor: spentRows.map((r) => r.category.color),
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { font: CHART_FONT, color: MUTED_COLOR } },
              },
            },
          });
        } catch {}
      }
    }
  }

  render();
}
