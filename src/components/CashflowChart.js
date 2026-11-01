/**
 * Cashflow Analytics Chart (Pure Vanilla JS)
 */
import { Chart } from 'chart.js';
import { buildCashflow } from '../lib/derive.js';
import { CHART_FONT, EXPENSE_COLOR, INCOME_COLOR, MUTED_COLOR } from '../lib/chartSetup.js';
import { loadPrefs, savePrefs } from '../lib/prefs.js';
import { formatIDR } from '../lib/money.js';
import { escapeHtml } from '../lib/dom.js';

export function renderCashflowChart(container, { state, derived, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const prefs = loadPrefs();
  let view = prefs.view || 'month';
  let chartType = prefs.chartType || 'bar';
  let chartInstance = null;

  function render() {
    if (chartInstance) {
      try {
        chartInstance.destroy();
      } catch {}
      chartInstance = null;
    }

    const series = buildCashflow(derived.allIncomes, state.expenses, view);
    const totalIn = series.income.reduce((sum, v) => sum + v, 0);
    const totalOut = series.expense.reduce((sum, v) => sum + v, 0);
    const empty = series.labels.length === 0;

    container.innerHTML = `
      <section class="card cashflow-chart-card" role="region" aria-label="${isEn ? 'Cashflow Analytics' : 'Grafik Arus Kas'}">
        <header class="card-head" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <h2>${isEn ? 'Cashflow' : 'Arus Kas'}</h2>
            <span class="muted small">${isEn ? 'Inflow vs Outflow comparison' : 'Perbandingan pemasukan & pengeluaran'}</span>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <select class="input select-cf-view" style="width: auto;">
              <option value="day"${view === 'day' ? ' selected' : ''}>${isEn ? 'Daily' : 'Harian'}</option>
              <option value="week"${view === 'week' ? ' selected' : ''}>${isEn ? 'Weekly' : 'Mingguan'}</option>
              <option value="month"${view === 'month' ? ' selected' : ''}>${isEn ? 'Monthly' : 'Bulanan'}</option>
              <option value="year"${view === 'year' ? ' selected' : ''}>${isEn ? 'Yearly' : 'Tahunan'}</option>
            </select>
            <select class="input select-cf-type" style="width: auto;">
              <option value="bar"${chartType === 'bar' ? ' selected' : ''}>${isEn ? 'Bar' : 'Batang'}</option>
              <option value="line"${chartType === 'line' ? ' selected' : ''}>${isEn ? 'Line' : 'Garis'}</option>
              <option value="donut"${chartType === 'donut' ? ' selected' : ''}>${isEn ? 'Donut' : 'Donat'}</option>
              <option value="category"${chartType === 'category' ? ' selected' : ''}>${isEn ? 'Category' : 'Kategori'}</option>
            </select>
          </div>
        </header>

        <div style="display: flex; gap: 16px; margin: 12px 0; font-size: 13px;">
          <span style="color: ${INCOME_COLOR}; font-weight: 600;">
            ${isEn ? 'Income: ' : 'Masuk: '} +${formatIDR(totalIn)}
          </span>
          <span style="color: ${EXPENSE_COLOR}; font-weight: 600;">
            ${isEn ? 'Expense: ' : 'Keluar: '} −${formatIDR(totalOut)}
          </span>
          <span class="muted">
            ${isEn ? 'Net: ' : 'Bersih: '} ${formatIDR(totalIn - totalOut)}
          </span>
        </div>

        ${
          empty
            ? `<p class="muted" style="text-align: center; padding: 32px 0;">
                ${isEn ? 'No cashflow data in this view.' : 'Belum ada data transaksi pada tampilan ini.'}
              </p>`
            : chartType === 'category'
            ? `<div class="cf-category-table" style="margin-top: 10px;">
                ${state.categories.map((c) => {
                  const val = series.categoryTotals[c.id] ?? 0;
                  if (val <= 0) return '';
                  return `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13px;">
                      <span style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 10px; height: 10px; border-radius: 999px; background: ${escapeHtml(c.color)};"></span>
                        ${escapeHtml(c.name)}
                      </span>
                      <strong>${formatIDR(val)}</strong>
                    </div>
                  `;
                }).join('')}
              </div>`
            : `<div class="chart-canvas-wrap" style="position: relative; height: 260px; margin-top: 12px;">
                <canvas class="canvas-cashflow"></canvas>
              </div>`
        }
      </section>
    `;

    // Bindings
    container.querySelector('.select-cf-view')?.addEventListener('change', (e) => {
      view = e.target.value;
      savePrefs({ view });
      render();
    });

    container.querySelector('.select-cf-type')?.addEventListener('change', (e) => {
      chartType = e.target.value;
      savePrefs({ chartType });
      render();
    });

    if (!empty && chartType !== 'category') {
      const canvas = container.querySelector('.canvas-cashflow');
      if (canvas) {
        if (chartType === 'donut') {
          chartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
              labels: [isEn ? 'Income' : 'Pemasukan', isEn ? 'Expense' : 'Pengeluaran'],
              datasets: [
                {
                  data: [totalIn, totalOut],
                  backgroundColor: [INCOME_COLOR, EXPENSE_COLOR],
                  borderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.label}: ${formatIDR(Number(ctx.parsed))}`,
                  },
                },
              },
            },
          });
        } else {
          chartInstance = new Chart(canvas, {
            type: chartType === 'line' ? 'line' : 'bar',
            data: {
              labels: series.labels,
              datasets: [
                {
                  label: isEn ? 'Income' : 'Pemasukan',
                  data: series.income,
                  backgroundColor: INCOME_COLOR,
                  borderColor: INCOME_COLOR,
                  tension: 0.3,
                  borderRadius: 4,
                },
                {
                  label: isEn ? 'Expense' : 'Pengeluaran',
                  data: series.expense,
                  backgroundColor: EXPENSE_COLOR,
                  borderColor: EXPENSE_COLOR,
                  tension: 0.3,
                  borderRadius: 4,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${formatIDR(Number(ctx.parsed.y))}`,
                  },
                },
              },
              scales: {
                x: { ticks: { color: MUTED_COLOR, font: CHART_FONT } },
                y: {
                  ticks: {
                    color: MUTED_COLOR,
                    font: CHART_FONT,
                    callback: (v) => (v >= 1000000 ? `${v / 1000000} jt` : v >= 1000 ? `${v / 1000} rb` : v),
                  },
                },
              },
            },
          });
        }
      }
    }
  }

  render();
}

