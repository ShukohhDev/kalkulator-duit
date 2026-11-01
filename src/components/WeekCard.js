/**
 * 7 Days Expense Summary & Sparkline (Pure Vanilla JS)
 */
import { Chart } from 'chart.js';
import { expenseLast7Days } from '../lib/derive.js';
import { formatIDR, roundTo500 } from '../lib/money.js';
import { translate } from '../lib/i18n.js';
import { CHART_FONT, MUTED_COLOR } from '../lib/chartSetup.js';
import { escapeHtml } from '../lib/dom.js';

export function renderWeekCard(container, { state, derived, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const week = expenseLast7Days(state);

  const rawDailyBudget =
    derived?.daily && derived.daily > 0
      ? derived.daily
      : state.allowance > 0
      ? state.mode === 'week'
        ? state.allowance / 7
        : state.allowance / 30
      : 0;
  const dailyBudget = roundTo500(rawDailyBudget);

  const spentToday = week.today.total;
  const remainingToday = Math.max(0, dailyBudget - spentToday);
  const isOver = dailyBudget > 0 && spentToday > dailyBudget;
  const ratio = dailyBudget > 0 ? spentToday / dailyBudget : 0;
  const pctUsed = Math.min(100, Math.round(ratio * 100));

  const statusLabel =
    dailyBudget <= 0
      ? translate('week.noBudget', lang)
      : isOver
      ? `${translate('week.statusOver', lang)} ${formatIDR(spentToday - dailyBudget)}`
      : ratio >= 0.8
      ? `${translate('week.statusWarning', lang)} (${pctUsed}%)`
      : `${translate('week.statusSafe', lang)} (${pctUsed}%)`;

  const statusClass =
    dailyBudget <= 0
      ? 'meter-neutral'
      : isOver
      ? 'meter-danger'
      : ratio >= 0.8
      ? 'meter-warning'
      : 'meter-safe';

  let root = container.querySelector('.week-card');
  if (!root) {
    container.innerHTML = `
      <section class="card week-card" aria-label="${translate('week.title', lang)}">
        <header class="card-head">
          <h2>${translate('week.title', lang)}</h2>
          <button type="button" class="btn btn-ghost btn-sm btn-copy-summary">${translate('week.copy', lang)}</button>
        </header>

        <div class="week-meter-slot"></div>

        <div class="spark-wrap">
          <canvas class="chart-week" style="max-height: 140px;"></canvas>
        </div>
        <div class="week-total">
          <span class="muted">${translate('week.total7', lang)}</span>
          <strong class="week-total-val">${formatIDR(week.total7)}</strong>
        </div>
      </section>
    `;
    root = container.querySelector('.week-card');
  }

  // Update total
  const totalVal = root.querySelector('.week-total-val');
  if (totalVal) totalVal.textContent = formatIDR(week.total7);

  // Update meter slot
  const meterSlot = root.querySelector('.week-meter-slot');
  if (meterSlot) {
    meterSlot.innerHTML = dailyBudget > 0
      ? `<div class="daily-meter-block" style="margin: 8px 0 14px; padding: 12px; background: var(--surface-2); border-radius: 8px;">
          <div class="daily-meter-top" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <div class="daily-meter-title-wrap">
              <strong>${translate('week.meterTitle', lang)}</strong>
              <span class="muted small" style="margin-left: 6px;">${escapeHtml(week.today.label)}</span>
            </div>
            <span class="chip ${statusClass}">${statusLabel}</span>
          </div>
          <div class="progress-bar-track" style="height: 10px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin: 6px 0;">
            <div class="progress-bar-fill ${statusClass}" style="width: ${pctUsed}%; height: 100%; border-radius: 999px;"></div>
          </div>
          <div class="daily-meter-footer muted small" style="display: flex; justify-content: space-between; margin-top: 4px;">
            <span>
              ${translate('week.spentToday', lang)}: <strong class="tabular-nums" style="color: var(--text);">${formatIDR(spentToday)}</strong>
              / ${formatIDR(dailyBudget)}
            </span>
            <span>
              ${isOver ? translate('week.overBudget', lang) : translate('week.remainingToday', lang)}:
              <strong class="tabular-nums" style="color: ${isOver ? 'var(--danger)' : 'var(--text)'};">
                ${formatIDR(isOver ? spentToday - dailyBudget : remainingToday)}
              </strong>
            </span>
          </div>
        </div>`
      : '';
  }

  // Preserve latest week on root for copy handler
  root._latestWeek = week;
  if (!root._hasCopyListener) {
    root._hasCopyListener = true;
    root.querySelector('.btn-copy-summary')?.addEventListener('click', async () => {
      const currentWeek = root._latestWeek || week;
      const body =
        currentWeek.today.total > 0
          ? [
              `${isEn ? "Today's expenses:" : 'Pengeluaran hari ini:'} ${formatIDR(currentWeek.today.total)}`,
              ...currentWeek.today.byCategory.map((item) => `- ${item.name}: ${formatIDR(item.amount)}`),
            ]
          : [isEn ? 'No expenses recorded today' : 'Belum ada pengeluaran hari ini'];
      const titleApp = isEn ? 'Pocket Money Calculator' : 'Kalkulator Uang Jajan';
      const text = [`${titleApp} · ${currentWeek.today.label}`, ...body].join('\n');
      try {
        await navigator.clipboard.writeText(text);
        notify?.(isEn ? "Today's summary copied" : 'Ringkasan hari ini disalin');
      } catch {
        notify?.(isEn ? 'Failed to copy summary' : 'Gagal menyalin ringkasan', { error: true });
      }
    });
  }

  // Chart
  const canvas = root.querySelector('.chart-week');
  if (canvas) {
    try {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: week.days.map((d) => d.label),
          datasets: [
            {
              data: week.days.map((d) => d.total),
              backgroundColor: 'rgba(34, 139, 34, 0.65)',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: CHART_FONT, color: MUTED_COLOR },
            },
            y: {
              grid: { display: false },
              ticks: { font: CHART_FONT, color: MUTED_COLOR },
            },
          },
        },
      });
    } catch {}
  }
}
