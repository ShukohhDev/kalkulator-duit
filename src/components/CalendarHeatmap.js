/**
 * Calendar Heatmap (Pure Vanilla JS)
 */
import { expenseTotalsByDay, intensity, monthGrid } from '../lib/calendar.js';
import { formatIDR, formatShortDate, monthLabel, toISO } from '../lib/money.js';
import { daysUntilDue, dueLabel, isBillFullyPaidThisMonth, markBillPaid, markDebtPaid } from '../lib/obligations.js';
import { escapeHtml } from '../lib/dom.js';

const DAYS_ID = ['Sn', 'Sl', 'Sr', 'Km', 'Jm', 'Sb', 'Mg'];
const DAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function renderCalendarHeatmap(container, { state, getState, update, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';
  const daysHeader = isEn ? DAYS_EN : DAYS_ID;

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : (currentState || state);
  }

  const today = new Date();
  let year = container._calYear ?? today.getFullYear();
  let month = container._calMonth ?? today.getMonth();
  let selected = container._calSelected ?? null;

  function setSelected(val) {
    selected = val;
    container._calSelected = val;
  }

  function shift(delta) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    month = nextMonth;
    year = nextYear;
    container._calMonth = month;
    container._calYear = year;
    setSelected(null);
    render();
  }

  function render() {
    const s = getCurrentState();
    const totals = expenseTotalsByDay(s.expenses, year, month);
    const rows = monthGrid(year, month, totals);
    const max = Math.max(0, ...totals.values());

    const dueMarks = new Map();
    const push = (day, mark) => {
      const clamped = Math.min(31, Math.max(1, day));
      dueMarks.set(clamped, [...(dueMarks.get(clamped) ?? []), mark]);
    };
    for (const bill of s.bills) {
      push(bill.dueDay, { kind: 'bill', name: bill.name, paid: isBillFullyPaidThisMonth(bill, today), item: bill });
    }
    for (const debt of s.debts) {
      push(debt.dueDay, { kind: 'debt', name: debt.name, paid: debt.paid >= debt.total, item: debt });
    }

    const totalMonth = [...totals.values()].reduce((sum, value) => sum + value, 0);

    const markText = (mark, day) =>
      `${mark.name} ${mark.paid ? (isEn ? 'paid' : 'lunas') : dueLabel(daysUntilDue(day, today), lang)}`;

    const dayExpenses = selected ? s.expenses.filter((item) => item.date === selected) : [];
    const selectedDay = selected ? Number(selected.slice(8)) : 0;
    const dayMarks = selected && selectedDay <= 31 ? (dueMarks.get(selectedDay) ?? []) : [];

    container.innerHTML = `
      <section class="card">
        <header class="card-head">
          <h2>${isEn ? 'Expense Calendar' : 'Kalender Pengeluaran'}</h2>
          <div class="btn-row">
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-prev-month"
              aria-label="${isEn ? 'Previous month' : 'Bulan sebelumnya'}"
            >
              ←
            </button>
            <span class="cal-title">${monthLabel(`${year}-${String(month + 1).padStart(2, '0')}`, lang)}</span>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-next-month"
              aria-label="${isEn ? 'Next month' : 'Bulan berikutnya'}"
            >
              →
            </button>
          </div>
        </header>

        <p class="muted small">
          ${isEn
            ? `Total this month ${formatIDR(totalMonth)} · darker means higher spending.`
            : `Total bulan ini ${formatIDR(totalMonth)} · makin gelap makin boros.`}
        </p>

        <div class="cal">
          <div class="cal-head">
            ${daysHeader.map((day) => `<span>${day}</span>`).join('')}
          </div>
          ${rows.map((row) => `
            <div class="cal-row">
              ${row.map((cell) => {
                if (!cell.iso) return `<span class="cal-cell cal-empty"></span>`;
                const ratio = intensity(cell.total, max);
                const isToday = cell.iso === toISO(today);
                const day = Number(cell.iso.slice(8));
                const marks = day <= 31 ? (dueMarks.get(day) ?? []) : undefined;
                const markNote = marks?.map((mark) => markText(mark, day)).join(' · ');
                const titleText = [
                  cell.total > 0
                    ? `${formatShortDate(cell.iso, lang)} · ${formatIDR(cell.total)}`
                    : formatShortDate(cell.iso, lang),
                  markNote,
                ].filter(Boolean).join(' · ');

                return `
                  <button
                    type="button"
                    class="cal-cell${isToday ? ' cal-today' : ''}${selected === cell.iso ? ' cal-selected' : ''}"
                    style="--heat: ${ratio};"
                    data-iso="${cell.iso}"
                    title="${escapeHtml(titleText)}"
                  >
                    <span class="cal-day">${day}</span>
                    ${cell.total > 0 ? `<span class="cal-total">${formatIDR(cell.total)}</span>` : ''}
                    ${marks && marks.length > 0 ? `
                      <span class="cal-dots">
                        ${marks.map((mark) => `<span class="cal-dot cal-dot-${mark.kind}${mark.paid ? ' cal-dot-paid' : ''}"></span>`).join('')}
                      </span>
                    ` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>

        <p class="cal-legend muted small">
          <span class="legend-item">
            <span class="cal-dot cal-dot-bill"></span> ${isEn ? 'Bill' : 'Tagihan'}
          </span>
          <span class="legend-item">
            <span class="cal-dot cal-dot-debt"></span> ${isEn ? 'Debt' : 'Utang'}
          </span>
          <span class="legend-item">
            <span class="cal-dot cal-dot-bill cal-dot-paid"></span> ${isEn ? 'Paid this month' : 'Lunas bulan ini'}
          </span>
        </p>

        ${selected ? `
          <div class="cal-detail">
            <h3 class="section-title">${formatShortDate(selected, lang)}</h3>
            ${dayMarks.length > 0 ? `
              <ul class="tx-list">
                ${dayMarks.map((mark, markIndex) => `
                  <li class="tx">
                    <span class="cal-dot cal-dot-${mark.kind}${mark.paid ? ' cal-dot-paid' : ''}"></span>
                    <span class="tx-main">
                      <strong>${escapeHtml(mark.name)}</strong>
                      <span class="muted small">
                        ${mark.kind === 'bill' ? (isEn ? 'Bill' : 'Tagihan') : (isEn ? 'Debt' : 'Utang')} · ${mark.paid ? (isEn ? 'paid' : 'lunas') : dueLabel(daysUntilDue(selectedDay, today), lang)}
                      </span>
                    </span>
                    ${!mark.paid ? `
                      <span class="tx-actions">
                        <button type="button" class="btn btn-sm btn-pay-mark" data-idx="${markIndex}">
                          ${mark.kind === 'bill'
                            ? (isEn ? 'Mark as paid' : 'Tandai lunas')
                            : (isEn ? 'Pay installment' : 'Bayar angsuran')}
                        </button>
                      </span>
                    ` : ''}
                  </li>
                `).join('')}
              </ul>
            ` : ''}
            ${dayExpenses.length === 0 ? `
              <p class="muted small">
                ${isEn ? 'No expenses recorded on this date.' : 'Tidak ada pengeluaran di tanggal ini.'}
              </p>
            ` : `
              <ul class="tx-list">
                ${dayExpenses.map((item) => {
                  const cat = state.categories.find((c) => c.id === item.categoryId);
                  return `
                    <li class="tx">
                      <span class="tx-dot" style="background: ${cat?.color || '#868e96'};"></span>
                      <span class="tx-main">
                        <strong>${escapeHtml(item.note || (isEn ? 'Expense' : 'Pengeluaran'))}</strong>
                        <span class="muted small">${escapeHtml(cat?.name || '')}</span>
                      </span>
                      <span class="tx-amount">−${formatIDR(item.amount)}</span>
                    </li>
                  `;
                }).join('')}
              </ul>
            `}
          </div>
        ` : ''}
      </section>
    `;

    // Event listeners
    container.querySelector('.btn-prev-month')?.addEventListener('click', () => shift(-1));
    container.querySelector('.btn-next-month')?.addEventListener('click', () => shift(1));

    container.querySelectorAll('.cal-cell:not(.cal-empty)').forEach((btn) => {
      btn.addEventListener('click', () => {
        const iso = btn.dataset.iso;
        setSelected(selected === iso ? null : iso);
        render();
      });
    });

    container.querySelectorAll('.btn-pay-mark').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const mark = dayMarks[idx];
        if (!mark) return;
        if (mark.kind === 'bill') {
          update((prev) => {
            const next = markBillPaid(prev, mark.item);
            currentState = next;
            return next;
          });
        } else {
          update((prev) => {
            const next = markDebtPaid(prev, mark.item);
            currentState = next;
            return next;
          });
        }
      });
    });
  }

  render();
}
