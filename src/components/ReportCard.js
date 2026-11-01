/**
 * Monthly Financial Report Card (Pure Vanilla JS)
 */
import { buildReport } from '../lib/report.js';
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money.js';
import { escapeHtml } from '../lib/dom.js';

export function renderReportCard(container, { state, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let month = monthKey(todayISO());

  function render() {
    const keys = new Set(state.expenses.map((item) => monthKey(item.date)));
    for (const income of state.incomes) keys.add(monthKey(income.date));
    keys.add(monthKey(todayISO()));
    const months = [...keys].sort().reverse();

    const report = buildReport(state, month);
    const categoryMap = new Map(state.categories.map((category) => [category.id, category]));
    const empty = report.noteCount === 0 && report.byGoal.every((item) => item.logged === 0);

    const byCatHtml = report.byCategory.map(({ category, amount, share }) => `
      <li>
        <span class="alloc-dot" style="background: ${escapeHtml(category.color)};"></span>
        <span class="alloc-name">${escapeHtml(category.name)}</span>
        <span class="alloc-pct">${Math.round(share * 100)}%</span>
        <strong class="alloc-value">${formatIDR(amount)}</strong>
      </li>
    `).join('');

    const byGoalHtml = report.byGoal.map(({ goal, saved, logged, percent }) => `
      <li>
        <span class="alloc-dot" style="background: var(--accent);"></span>
        <span class="alloc-name">${escapeHtml(goal.name)}</span>
        <span class="alloc-pct">${percent}%</span>
        <strong class="alloc-value">
          ${formatIDR(saved)}
          ${logged > 0 ? `<span class="muted small"> (${isEn ? `+${formatIDR(logged)} this month` : `+${formatIDR(logged)} bulan ini`})</span>` : ''}
        </strong>
      </li>
    `).join('');

    const topExpHtml = report.topExpenses.map((item) => {
      const category = categoryMap.get(item.categoryId);
      return `
        <li class="tx">
          <span class="tx-dot" style="background: ${category?.color ?? '#868e96'};"></span>
          <span class="tx-main">
            <strong>${escapeHtml(item.note || category?.name || (isEn ? 'Expense' : 'Pengeluaran'))}</strong>
            <span class="muted small">
              ${formatShortDate(item.date)} · ${escapeHtml(category?.name ?? (isEn ? 'Uncategorized' : 'Tanpa kategori'))}
            </span>
          </span>
          <span class="tx-amount">−${formatIDR(item.amount)}</span>
        </li>
      `;
    }).join('');

    container.innerHTML = `
      <section class="card report">
        <header class="card-head">
          <h2>${isEn ? 'Monthly Report' : 'Laporan Bulanan'}</h2>
          <div class="report-actions no-print">
            <select
              class="input select-report-month"
              aria-label="${isEn ? 'Report month' : 'Bulan laporan'}"
              title="${isEn ? 'Select Report Month' : 'Pilih Bulan Laporan'}"
            >
              ${months.map((k) => `
                <option value="${escapeHtml(k)}"${k === month ? ' selected' : ''}>
                  ${escapeHtml(monthLabel(k))}
                </option>
              `).join('')}
            </select>
            <button type="button" class="btn btn-ghost btn-sm btn-copy-summary">${isEn ? 'Copy summary' : 'Salin ringkasan'}</button>
            <button type="button" class="btn btn-sm btn-print-pdf">${isEn ? 'Print / Save PDF' : 'Cetak / Simpan PDF'}</button>
          </div>
        </header>

        <div class="report-summary">
          <div class="report-stat">
            <span class="muted small">${isEn ? 'Allowance' : 'Uang jajan'}</span>
            <strong>${formatIDR(report.allowance)}</strong>
          </div>
          <div class="report-stat">
            <span class="muted small">${isEn ? 'Other income' : 'Pemasukan lain'}</span>
            <strong>${formatIDR(report.manualIncome)}</strong>
          </div>
          <div class="report-stat">
            <span class="muted small">
              ${isEn ? `Expenses (${report.noteCount} records)` : `Pengeluaran (${report.noteCount} catatan)`}
            </span>
            <strong>${formatIDR(report.expense)}</strong>
          </div>
          <div class="report-stat">
            <span class="muted small">${isEn ? 'Remaining' : 'Sisa'}</span>
            <strong class="${report.net < 0 ? 'text-danger' : ''}">${formatIDR(report.net)}</strong>
          </div>
        </div>

        ${
          empty
            ? `<p class="muted small">
                ${isEn ? `No records in ${monthLabel(month)}.` : `Belum ada catatan di ${monthLabel(month)}.`}
              </p>`
            : ''
        }

        ${
          report.byCategory.length > 0
            ? `<h3 class="section-title">${isEn ? 'Expenses by category' : 'Pengeluaran per kategori'}</h3>
               <ul class="alloc-list">
                 ${byCatHtml}
               </ul>`
            : ''
        }

        ${
          report.byGoal.length > 0
            ? `<h3 class="section-title">${isEn ? 'Savings goals' : 'Target tabungan'}</h3>
               <ul class="alloc-list">
                 ${byGoalHtml}
               </ul>`
            : ''
        }

        ${
          report.topExpenses.length > 0
            ? `<h3 class="section-title">${isEn ? 'Top 5 expenses' : '5 pengeluaran terbesar'}</h3>
               <ul class="tx-list">
                 ${topExpHtml}
               </ul>`
            : ''
        }

        <p class="muted small report-footer">
          ${isEn ? 'Printed from Kalkulator Uang Jajan · data saved locally in browser · 8% annual compound growth.' : 'Dicetak dari Kalkulator Uang Jajan · data tersimpan lokal di browser · bunga majemuk 8% per tahun.'}
        </p>
      </section>
    `;

    bindEvents(report);
  }

  function bindEvents(report) {
    const root = container.querySelector('.report');
    if (!root) return;

    root.querySelector('.select-report-month')?.addEventListener('change', (e) => {
      month = e.target.value;
      render();
    });

    root.querySelector('.btn-copy-summary')?.addEventListener('click', async () => {
      const lines = [
        `${isEn ? 'Report' : 'Laporan'} ${monthLabel(month)} · Kalkulator Uang Jajan`,
        `${isEn ? 'Allowance' : 'Uang jajan'}: ${formatIDR(report.allowance)}`,
        `${isEn ? 'Other income' : 'Pemasukan lain'}: ${formatIDR(report.manualIncome)}`,
        `${isEn ? 'Expenses' : 'Pengeluaran'}: ${formatIDR(report.expense)} (${report.noteCount} ${isEn ? 'records' : 'catatan'})`,
        `${isEn ? 'Remaining' : 'Sisa'}: ${formatIDR(report.net)}`,
        ...report.byCategory.map(
          ({ category, amount, share }) =>
            `- ${category.name}: ${formatIDR(amount)} (${Math.round(share * 100)}%)`
        ),
        ...report.topExpenses.map(
          (item) => `- ${item.note || (isEn ? 'Expense' : 'Pengeluaran')}: ${formatIDR(item.amount)}`
        ),
      ].join('\n');

      try {
        await navigator.clipboard.writeText(lines);
        notify?.(isEn ? 'Report summary copied' : 'Ringkasan laporan disalin');
      } catch {
        notify?.(isEn ? 'Failed to copy summary' : 'Gagal menyalin ringkasan', { error: true });
      }
    });

    root.querySelector('.btn-print-pdf')?.addEventListener('click', () => {
      window.print();
    });
  }

  render();
}

