/**
 * Obligations Panel (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import {
  billPaidThisMonth,
  billRemainingThisMonth,
  daysUntilDue,
  dueDateLabel,
  dueLabel,
  isBillFullyPaidThisMonth,
  markBillPaid,
  markDebtPaid,
  nowDate,
} from '../lib/obligations.js';
import { uid } from '../lib/id.js';
import { buildICS } from '../lib/ics.js';
import { END_SAVINGS_WALLET_ID } from '../lib/state.js';
import { renderMiniCalendar } from './MiniCalendar.js';
import { bindMoneyInput } from './MoneyInput.js';
import { escapeHtml } from '../lib/dom.js';

function getSourceBalance(state, source) {
  if (source === 'pot') return state.endSavings;
  if (source.startsWith('wallet:')) {
    const targetId = source.slice(7);
    const wallet = state.wallets.find((w) => w.id === targetId);
    return wallet?.balance ?? 0;
  }
  return Infinity;
}

function getSourceName(state, source) {
  if (source === 'pot') return 'Saku Tabungan';
  if (source.startsWith('wallet:')) {
    const targetId = source.slice(7);
    const wallet = state.wallets.find((w) => w.id === targetId);
    return wallet ? wallet.name : 'Dompet';
  }
  return '';
}

export function renderObligationsPanel(container, { state, getState, update, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : currentState;
  }

  let billName = '';
  let billAmount = 0;
  let billDay = 1;
  let payingBillId = null;
  let payNominal = 0;
  let paySource = 'none';

  let debtName = '';
  let debtTotal = 0;
  let debtInstallment = 0;
  let debtDay = 1;
  let payingDebtId = null;
  let debtPayNominal = 0;
  let debtPaySource = 'none';

  let obView = 'all';

  function exportIcs() {
    const s = getCurrentState();
    try {
      const url = URL.createObjectURL(new Blob([buildICS(s)], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kewajiban.ics';
      link.click();
      URL.revokeObjectURL(url);
      notify?.(isEn ? 'Obligations calendar downloaded (.ics).' : 'Kalender kewajiban diunduh (.ics).');
    } catch {
      notify?.(isEn ? 'Failed to create .ics file.' : 'Gagal membuat file .ics.', { error: true });
    }
  }

  function addBill() {
    const name = billName.trim();
    if (!name || billAmount <= 0) return;
    update((s) => {
      const next = {
        ...s,
        bills: [...s.bills, { id: uid('bill'), name, amount: billAmount, dueDay: billDay }],
      };
      currentState = next;
      return next;
    });
    billName = '';
    billAmount = 0;
    billDay = 1;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    render();
  }

  function openPayBill(bill) {
    const now = nowDate();
    const remaining = billRemainingThisMonth(bill, now);
    payingBillId = bill.id;
    payNominal = remaining;
    paySource = 'none';
    render();
  }

  function cancelPayBill() {
    payingBillId = null;
    payNominal = 0;
    paySource = 'none';
    render();
  }

  function confirmPayBill(bill) {
    if (payNominal <= 0) return;
    const now = nowDate();
    const remaining = billRemainingThisMonth(bill, now);
    const actualPay = Math.min(payNominal, remaining);
    const sourceKey = paySource === 'none' ? undefined : paySource;
    const s = getCurrentState();
    update((prev) => {
      const next = markBillPaid(prev, bill, actualPay, now, sourceKey);
      currentState = next;
      return next;
    });
    const nextRemaining = remaining - actualPay;
    const sourceLabel = sourceKey ? ` via ${getSourceName(s, sourceKey)}` : '';
    if (nextRemaining <= 0) {
      notify?.(
        isEn
          ? `Bill ${bill.name} paid in full this month (${formatIDR(actualPay)}${sourceLabel}).`
          : `Tagihan ${bill.name} lunas bulan ini (${formatIDR(actualPay)}${sourceLabel}).`
      );
    } else {
      notify?.(
        isEn
          ? `Payment for ${bill.name} recorded (${formatIDR(actualPay)}${sourceLabel}). Remaining bill: ${formatIDR(nextRemaining)}.`
          : `Pembayaran ${bill.name} berhasil dicatat (${formatIDR(actualPay)}${sourceLabel}). Sisa tagihan: ${formatIDR(nextRemaining)}.`
      );
    }
    payingBillId = null;
    payNominal = 0;
    paySource = 'none';
    render();
  }

  function removeBill(id) {
    if (payingBillId === id) cancelPayBill();
    const s = getCurrentState();
    const index = s.bills.findIndex((item) => item.id === id);
    const target = s.bills[index];
    if (!target) return;
    update((prev) => {
      const next = { ...prev, bills: prev.bills.filter((item) => item.id !== id) };
      currentState = next;
      return next;
    });
    notify?.(isEn ? 'Bill deleted.' : 'Tagihan dihapus.', {
      undo: () =>
        update((prev) => {
          const nextBills = [...prev.bills];
          nextBills.splice(Math.min(index, nextBills.length), 0, target);
          const next = { ...prev, bills: nextBills };
          currentState = next;
          return next;
        }),
    });
    render();
  }

  function addDebt() {
    const name = debtName.trim();
    if (!name || debtTotal <= 0 || debtInstallment <= 0) return;
    update((s) => {
      const next = {
        ...s,
        debts: [
          ...s.debts,
          { id: uid('debt'), name, total: debtTotal, paid: 0, installment: debtInstallment, dueDay: debtDay },
        ],
      };
      currentState = next;
      return next;
    });
    debtName = '';
    debtTotal = 0;
    debtInstallment = 0;
    debtDay = 1;
    render();
  }

  function openPayDebt(debt) {
    const remaining = Math.max(0, debt.total - debt.paid);
    payingDebtId = debt.id;
    debtPayNominal = Math.min(debt.installment, remaining);
    debtPaySource = 'none';
    render();
  }

  function cancelPayDebt() {
    payingDebtId = null;
    debtPayNominal = 0;
    debtPaySource = 'none';
    render();
  }

  function confirmPayDebt(debt) {
    if (debtPayNominal <= 0) return;
    const remaining = Math.max(0, debt.total - debt.paid);
    const actualPay = Math.min(debtPayNominal, remaining);
    const sourceKey = debtPaySource === 'none' ? undefined : debtPaySource;
    const s = getCurrentState();
    update((prev) => {
      const next = markDebtPaid(prev, debt, actualPay, sourceKey);
      currentState = next;
      return next;
    });
    const nextRemaining = remaining - actualPay;
    const sourceLabel = sourceKey ? ` via ${getSourceName(s, sourceKey)}` : '';
    if (nextRemaining <= 0) {
      notify?.(
        isEn
          ? `Debt ${debt.name} paid off completely (${formatIDR(actualPay)}${sourceLabel}).`
          : `Utang ${debt.name} berhasil dilunasi (${formatIDR(actualPay)}${sourceLabel}).`
      );
    } else {
      notify?.(
        isEn
          ? `Installment for ${debt.name} recorded (${formatIDR(actualPay)}${sourceLabel}). Remaining debt: ${formatIDR(nextRemaining)}.`
          : `Pembayaran angsuran ${debt.name} berhasil dicatat (${formatIDR(actualPay)}${sourceLabel}). Sisa utang: ${formatIDR(nextRemaining)}.`
      );
    }
    payingDebtId = null;
    debtPayNominal = 0;
    debtPaySource = 'none';
    render();
  }

  function removeDebt(id) {
    if (payingDebtId === id) cancelPayDebt();
    const s = getCurrentState();
    const index = s.debts.findIndex((item) => item.id === id);
    const target = s.debts[index];
    if (!target) return;
    update((prev) => {
      const next = { ...prev, debts: prev.debts.filter((item) => item.id !== id) };
      currentState = next;
      return next;
    });
    notify?.(isEn ? 'Debt deleted.' : 'Utang dihapus.', {
      undo: () =>
        update((prev) => {
          const nextDebts = [...prev.debts];
          nextDebts.splice(Math.min(index, nextDebts.length), 0, target);
          const next = { ...prev, debts: nextDebts };
          currentState = next;
          return next;
        }),
    });
    render();
  }

  function render() {
    const s = getCurrentState();
    const now = nowDate();

    const billsHtml = s.bills.map((bill) => {
      const isPaid = isBillFullyPaidThisMonth(bill, now);
      const paidAmount = billPaidThisMonth(bill, now);
      const remaining = billRemainingThisMonth(bill, now);
      const days = daysUntilDue(bill.dueDay, now);
      const isPayingThis = payingBillId === bill.id;
      const pct = bill.amount > 0 ? Math.min(100, Math.round((paidAmount / bill.amount) * 100)) : 0;

      return `
        <article class="ob-row" data-id="${escapeHtml(bill.id)}">
          <div class="ob-main">
            <strong>${escapeHtml(bill.name)}</strong>
            ${paidAmount > 0 && remaining > 0 ? `<div class="progress-bar-track" style="height: 6px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin: 6px 0;"><div class="progress-bar-fill" style="width: ${pct}%; height: 100%; background: var(--accent); border-radius: 999px;"></div></div>` : ''}
            <span class="muted small">
              ${
                paidAmount > 0 && remaining > 0
                  ? (isEn
                      ? `Paid ${formatIDR(paidAmount)} of ${formatIDR(bill.amount)} · left ${formatIDR(remaining)} · every ${bill.dueDay}th (${dueDateLabel(bill.dueDay, now, 'en')})`
                      : `Terbayar ${formatIDR(paidAmount)} dari ${formatIDR(bill.amount)} · sisa ${formatIDR(remaining)} · tiap tgl ${bill.dueDay} (${dueDateLabel(bill.dueDay, now, 'id')})`)
                  : (isEn
                      ? `${formatIDR(bill.amount)} · every ${bill.dueDay}th (${dueDateLabel(bill.dueDay, now, 'en')})`
                      : `${formatIDR(bill.amount)} · tiap tgl ${bill.dueDay} (${dueDateLabel(bill.dueDay, now, 'id')})`)
              }
            </span>
          </div>
          <span class="ob-badge ${isPaid ? 'ob-badge-ok' : paidAmount > 0 ? 'ob-badge-warn' : days <= 3 ? 'ob-badge-due' : ''}">
            ${isPaid ? (isEn ? 'Paid this month' : 'Lunas bulan ini') : paidAmount > 0 ? (isEn ? `Left ${formatIDR(remaining)}` : `Sisa ${formatIDR(remaining)}`) : dueLabel(days, isEn ? 'en' : 'id')}
          </span>
          <div class="ob-actions">
            <button type="button" class="btn btn-sm btn-pay-bill"${isPaid ? ' disabled' : ''}>${isPayingThis ? (isEn ? 'Cancel' : 'Batal') : (isEn ? 'Pay' : 'Bayar')}</button>
            <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-bill">${isEn ? 'Delete' : 'Hapus'}</button>
          </div>

          ${
            isPayingThis
              ? `<div class="ob-pay-drawer">
                  <div class="ob-pay-info">
                    <span class="small">${isEn ? 'Remaining bill:' : 'Sisa tagihan:'} <strong>${formatIDR(remaining)}</strong></span>
                    <span class="muted small">${isEn ? 'Select wallet and enter amount to pay' : 'Pilih dompet dan masukin nominal yang mau dibayar'}</span>
                  </div>
                  <div class="ob-pay-input-row">
                    <div class="field ob-pay-field">
                      <label for="pay-amount-${escapeHtml(bill.id)}">${isEn ? 'Payment amount (Rp)' : 'Nominal bayar (Rp)'}</label>
                      <input id="pay-amount-${escapeHtml(bill.id)}" class="input input-money input-bill-pay-nominal" type="text" inputmode="numeric" value="${payNominal > 0 ? payNominal.toLocaleString('id-ID') : ''}" />
                    </div>
                    <div class="field ob-pay-field">
                      <label for="pay-source-${escapeHtml(bill.id)}">${isEn ? 'Payment source' : 'Sumber pembayaran'}</label>
                      <select id="pay-source-${escapeHtml(bill.id)}" class="input select-pay-source">
                        <option value="none"${paySource === 'none' ? ' selected' : ''}>${isEn ? 'No wallet deduction (log expense only)' : 'Tanpa potong dompet (catat pengeluaran saja)'}</option>
                        <option value="pot"${paySource === 'pot' ? ' selected' : ''}>${isEn ? `Savings Pocket (balance: ${formatIDR(s.endSavings)})` : `Saku Tabungan (saldo: ${formatIDR(s.endSavings)})`}</option>
                        ${s.wallets
                          .filter((w) => w.id !== END_SAVINGS_WALLET_ID)
                          .map((w) => `
                            <option value="wallet:${escapeHtml(w.id)}"${paySource === `wallet:${w.id}` ? ' selected' : ''}>
                              ${escapeHtml(w.name)} (${isEn ? 'balance:' : 'saldo:'} ${formatIDR(w.balance)})
                            </option>
                          `).join('')}
                      </select>
                    </div>
                    <div class="ob-pay-actions">
                      <button type="button" class="btn btn-sm btn-confirm-pay" ${payNominal <= 0 || payNominal > remaining || (paySource !== 'none' && payNominal > getSourceBalance(s, paySource)) ? 'disabled' : ''}>${isEn ? 'Confirm Payment' : 'Konfirmasi Bayar'}</button>
                      <button type="button" class="btn btn-ghost btn-sm btn-cancel-pay">${isEn ? 'Cancel' : 'Batal'}</button>
                    </div>
                  </div>
                  <div class="ob-pay-chips">
                    <button type="button" class="btn btn-ghost btn-xs btn-pay-full-bill">${isEn ? `Pay in full (${formatIDR(remaining)})` : `Bayar lunas (${formatIDR(remaining)})`}</button>
                    ${remaining >= 50_000 && Math.round(remaining / 2) !== remaining ? `<button type="button" class="btn btn-ghost btn-xs btn-pay-half-bill">${isEn ? `Pay 50% (${formatIDR(Math.round(remaining / 2))})` : `Cicil 50% (${formatIDR(Math.round(remaining / 2))})`}</button>` : ''}
                  </div>
                  ${payNominal > remaining ? `<p class="small" style="color: var(--danger); margin: 0;">${isEn ? `Amount exceeds remaining bill (${formatIDR(remaining)}).` : `Nominal melebihi sisa tagihan (${formatIDR(remaining)}).`}</p>` : ''}
                  ${paySource !== 'none' && payNominal > getSourceBalance(s, paySource) ? `<p class="small" style="color: var(--danger); margin: 0;">${isEn ? `${getSourceName(s, paySource)} balance is insufficient (available: ${formatIDR(getSourceBalance(s, paySource))}).` : `Saldo ${getSourceName(s, paySource)} tidak mencukupi (tersedia: ${formatIDR(getSourceBalance(s, paySource))}).`}</p>` : ''}
                </div>`
              : ''
          }
        </article>
      `;
    }).join('');

    const debtsHtml = s.debts.map((debt) => {
      const remaining = Math.max(0, debt.total - debt.paid);
      const lunas = remaining <= 0;
      const days = daysUntilDue(debt.dueDay, now);
      const isPayingThisDebt = payingDebtId === debt.id;
      const debtSourceBal = getSourceBalance(s, debtPaySource);
      const isDebtInsufficient = debtPaySource !== 'none' && debtPayNominal > debtSourceBal;
      const pct = debt.total > 0 ? Math.min(100, Math.round((debt.paid / debt.total) * 100)) : 0;

      return `
        <article class="ob-row" data-id="${escapeHtml(debt.id)}">
          <div class="ob-main">
            <strong>${escapeHtml(debt.name)}</strong>
            ${debt.paid > 0 && debt.total > 0 ? `<div class="progress-bar-track" style="height: 6px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin: 6px 0;"><div class="progress-bar-fill" style="width: ${pct}%; height: 100%; background: var(--accent); border-radius: 999px;"></div></div>` : ''}
            <span class="muted small">
              ${
                isEn
                  ? `Paid ${formatIDR(debt.paid)} of ${formatIDR(debt.total)} · left ${formatIDR(remaining)} · installment ${formatIDR(debt.installment)} every ${debt.dueDay}th`
                  : `Terbayar ${formatIDR(debt.paid)} dari ${formatIDR(debt.total)} · sisa ${formatIDR(remaining)} · angsuran ${formatIDR(debt.installment)} tiap tgl ${debt.dueDay}`
              }
            </span>
          </div>
          <span class="ob-badge ${lunas ? 'ob-badge-ok' : days <= 3 ? 'ob-badge-due' : ''}">
            ${lunas ? (isEn ? 'Paid off' : 'Lunas') : dueLabel(days, isEn ? 'en' : 'id')}
          </span>
          <div class="ob-actions">
            <button type="button" class="btn btn-sm btn-pay-debt"${lunas ? ' disabled' : ''}>${isPayingThisDebt ? (isEn ? 'Cancel' : 'Batal') : (isEn ? 'Pay installment' : 'Bayar angsuran')}</button>
            <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-debt">${isEn ? 'Delete' : 'Hapus'}</button>
          </div>

          ${
            isPayingThisDebt
              ? `<div class="ob-pay-drawer">
                  <div class="ob-pay-info">
                    <span class="small">${isEn ? 'Remaining debt:' : 'Sisa utang:'} <strong>${formatIDR(remaining)}</strong> · ${isEn ? 'Installment:' : 'Angsuran:'} <strong>${formatIDR(debt.installment)}</strong></span>
                    <span class="muted small">${isEn ? 'Select wallet and enter amount to pay' : 'Pilih dompet dan masukin nominal yang mau dibayar'}</span>
                  </div>
                  <div class="ob-pay-input-row">
                    <div class="field ob-pay-field">
                      <label for="debt-amount-${escapeHtml(debt.id)}">${isEn ? 'Payment amount (Rp)' : 'Nominal bayar (Rp)'}</label>
                      <input id="debt-amount-${escapeHtml(debt.id)}" class="input input-money input-debt-pay-nominal" type="text" inputmode="numeric" value="${debtPayNominal > 0 ? debtPayNominal.toLocaleString('id-ID') : ''}" />
                    </div>
                    <div class="field ob-pay-field">
                      <label for="debt-source-${escapeHtml(debt.id)}">${isEn ? 'Payment source' : 'Sumber pembayaran'}</label>
                      <select id="debt-source-${escapeHtml(debt.id)}" class="input select-debt-source">
                        <option value="none"${debtPaySource === 'none' ? ' selected' : ''}>${isEn ? 'No wallet deduction (log expense only)' : 'Tanpa potong dompet (catat pengeluaran saja)'}</option>
                        <option value="pot"${debtPaySource === 'pot' ? ' selected' : ''}>${isEn ? `Savings Pocket (balance: ${formatIDR(s.endSavings)})` : `Saku Tabungan (saldo: ${formatIDR(s.endSavings)})`}</option>
                        ${s.wallets
                          .filter((w) => w.id !== END_SAVINGS_WALLET_ID)
                          .map((w) => `
                            <option value="wallet:${escapeHtml(w.id)}"${debtPaySource === `wallet:${w.id}` ? ' selected' : ''}>
                              ${escapeHtml(w.name)} (${isEn ? 'balance:' : 'saldo:'} ${formatIDR(w.balance)})
                            </option>
                          `).join('')}
                      </select>
                    </div>
                    <div class="ob-pay-actions">
                      <button type="button" class="btn btn-sm btn-confirm-pay-debt" ${debtPayNominal <= 0 || debtPayNominal > remaining || isDebtInsufficient ? 'disabled' : ''}>${isEn ? 'Confirm Payment' : 'Konfirmasi Bayar'}</button>
                      <button type="button" class="btn btn-ghost btn-sm btn-cancel-pay-debt">${isEn ? 'Cancel' : 'Batal'}</button>
                    </div>
                  </div>
                  <div class="ob-pay-chips">
                    <button type="button" class="btn btn-ghost btn-xs btn-pay-inst-debt">${isEn ? `Installment amount (${formatIDR(Math.min(debt.installment, remaining))})` : `Sesuai angsuran (${formatIDR(Math.min(debt.installment, remaining))})`}</button>
                    <button type="button" class="btn btn-ghost btn-xs btn-pay-full-debt">${isEn ? `Pay in full (${formatIDR(remaining)})` : `Bayar lunas (${formatIDR(remaining)})`}</button>
                  </div>
                  ${debtPayNominal > remaining ? `<p class="small" style="color: var(--danger); margin: 0;">${isEn ? `Amount exceeds remaining debt (${formatIDR(remaining)}).` : `Nominal melebihi sisa utang (${formatIDR(remaining)}).`}</p>` : ''}
                  ${isDebtInsufficient ? `<p class="small" style="color: var(--danger); margin: 0;">${isEn ? `${getSourceName(s, debtPaySource)} balance is insufficient (available: ${formatIDR(debtSourceBal)}).` : `Saldo ${getSourceName(s, debtPaySource)} tidak mencukupi (tersedia: ${formatIDR(debtSourceBal)}).`}</p>` : ''}
                </div>`
              : ''
          }
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <div class="obligations-wrapper">
        <section class="card obligations-top-card">
          <header class="card-head">
            <div>
              <h2>${isEn ? 'Obligations' : 'Kewajiban'}</h2>
              <p class="muted small" style="margin: 4px 0 0 0;">
                ${isEn ? 'track bills & debts so you never miss a due date' : 'pantau tagihan & cicilan biar gak kelupaan'}
              </p>
            </div>
            <div class="report-actions no-print">
              <button type="button" class="btn btn-ghost btn-sm btn-export-ics">${isEn ? 'Export .ics' : 'Ekspor .ics'}</button>
            </div>
          </header>
        </section>

        <div class="catat-mobile-switch" role="tablist" aria-label="${isEn ? 'Obligation view options' : 'Pilihan tampilan kewajiban'}">
          <button type="button" role="tab" aria-selected="${obView === 'all'}" class="catat-switch-btn ${obView === 'all' ? 'active' : ''}" data-view="all">${isEn ? 'All' : 'Semua'}</button>
          <button type="button" role="tab" aria-selected="${obView === 'bills'}" class="catat-switch-btn ${obView === 'bills' ? 'active' : ''}" data-view="bills">${isEn ? 'Recurring Bills' : 'Tagihan Rutin'}</button>
          <button type="button" role="tab" aria-selected="${obView === 'debts'}" class="catat-switch-btn ${obView === 'debts' ? 'active' : ''}" data-view="debts">${isEn ? 'Active Debts' : 'Utang Berjalan'}</button>
        </div>

        <div class="obligations-split-grid show-${obView}">
          <!-- Kolom Kiri: Tagihan Rutin -->
          <section class="card ob-column ob-col-bills">
            <header class="card-head">
              <div>
                <h3 class="section-title" style="margin: 0;">${isEn ? 'Recurring Bills' : 'Tagihan rutin'}</h3>
                <span class="muted small">${s.bills.length} ${isEn ? (s.bills.length === 1 ? 'bill' : 'bills') : 'tagihan'}</span>
              </div>
            </header>
            <div class="goal-list">
              ${billsHtml}
              ${s.bills.length === 0 ? `<p class="muted small">${isEn ? 'No recurring bills yet. Record your electricity, internet, or rent below.' : 'Belum ada tagihan nih. Yuk catat listrik, wifi, atau kosan kamu di bawah.'}</p>` : ''}
            </div>

            <form class="ob-form ob-bill-form">
              <div class="field">
                <label for="bill-name">${isEn ? 'Bill name' : 'Nama tagihan'}</label>
                <input id="bill-name" class="input input-bill-name" value="${escapeHtml(billName)}" placeholder="${isEn ? 'Electricity, internet, rent…' : 'Listrik, internet, sewa…'}" />
              </div>
              <div class="field">
                <label for="bill-amount">${isEn ? 'Amount (Rp)' : 'Nominal (Rp)'}</label>
                <input id="bill-amount" class="input input-money input-bill-amount" type="text" inputmode="numeric" value="${billAmount > 0 ? billAmount.toLocaleString('id-ID') : ''}" />
              </div>
              <div class="mini-cal-slot-bill"></div>
              <button type="submit" class="btn btn-add-bill" ${!billName.trim() || billAmount <= 0 ? 'disabled' : ''}>${isEn ? '+ Add bill' : '+ Tambah tagihan'}</button>
            </form>
          </section>

          <!-- Kolom Kanan: Utang Berjalan -->
          <section class="card ob-column ob-col-debts">
            <header class="card-head">
              <div>
                <h3 class="section-title" style="margin: 0;">${isEn ? 'Active debts' : 'Utang berjalan'}</h3>
                <span class="muted small">${s.debts.length} ${isEn ? (s.debts.length === 1 ? 'debt' : 'debts') : 'utang'}</span>
              </div>
            </header>
            <div class="goal-list">
              ${debtsHtml}
              ${s.debts.length === 0 ? `<p class="muted small">${isEn ? 'No debt recorded. Track your installments or loans below to stay ahead.' : 'Belum ada catatan utang. Catat cicilan, pinjaman, atau paylater kamu di bawah biar tenang.'}</p>` : ''}
            </div>

            <form class="ob-form ob-debt-form">
              <div class="field">
                <label for="debt-name">${isEn ? 'Debt name' : 'Nama utang'}</label>
                <input id="debt-name" class="input input-debt-name" value="${escapeHtml(debtName)}" placeholder="${isEn ? 'Motorcycle, loan, paylater…' : 'Motor, pinjaman, paylater…'}" />
              </div>
              <div class="field">
                <label for="debt-total">${isEn ? 'Total debt (Rp)' : 'Total utang (Rp)'}</label>
                <input id="debt-total" class="input input-money input-debt-total" type="text" inputmode="numeric" value="${debtTotal > 0 ? debtTotal.toLocaleString('id-ID') : ''}" />
              </div>
              <div class="field">
                <label for="debt-installment">${isEn ? 'Monthly installment (Rp)' : 'Angsuran / bulan (Rp)'}</label>
                <input id="debt-installment" class="input input-money input-debt-installment" type="text" inputmode="numeric" value="${debtInstallment > 0 ? debtInstallment.toLocaleString('id-ID') : ''}" />
              </div>
              <div class="mini-cal-slot-debt"></div>
              <button type="submit" class="btn btn-add-debt" ${!debtName.trim() || debtTotal <= 0 || debtInstallment <= 0 ? 'disabled' : ''}>${isEn ? '+ Add debt' : '+ Tambah utang'}</button>
            </form>
          </section>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const s = getCurrentState();
    const root = container.querySelector('.obligations-wrapper');
    if (!root) return;

    // Export .ics
    root.querySelector('.btn-export-ics')?.addEventListener('click', exportIcs);

    // Switch view tabs
    root.querySelectorAll('.catat-switch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        obView = btn.getAttribute('data-view') || 'all';
        render();
      });
    });

    // Bill row actions
    root.querySelectorAll('.ob-col-bills .ob-row').forEach((row) => {
      const id = row.getAttribute('data-id');
      const bill = s.bills.find((b) => b.id === id);
      if (!bill) return;

      row.querySelector('.btn-pay-bill')?.addEventListener('click', () => {
        if (payingBillId === id) cancelPayBill();
        else openPayBill(bill);
      });

      row.querySelector('.btn-delete-bill')?.addEventListener('click', () => {
        removeBill(id);
      });

      if (payingBillId === id) {
        const nominalInput = row.querySelector('.input-bill-pay-nominal');
        if (nominalInput) {
          bindMoneyInput(nominalInput, (val) => {
            payNominal = val;
            const confirmBtn = row.querySelector('.btn-confirm-pay');
            const now = nowDate();
            const remaining = billRemainingThisMonth(bill, now);
            if (confirmBtn) {
              confirmBtn.disabled =
                payNominal <= 0 ||
                payNominal > remaining ||
                (paySource !== 'none' && payNominal > getSourceBalance(getCurrentState(), paySource));
            }
          });
        }

        row.querySelector('.select-pay-source')?.addEventListener('change', (e) => {
          paySource = e.target.value;
          const confirmBtn = row.querySelector('.btn-confirm-pay');
          const now = nowDate();
          const remaining = billRemainingThisMonth(bill, now);
          if (confirmBtn) {
            confirmBtn.disabled =
              payNominal <= 0 ||
              payNominal > remaining ||
              (paySource !== 'none' && payNominal > getSourceBalance(getCurrentState(), paySource));
          }
        });

        row.querySelector('.btn-confirm-pay')?.addEventListener('click', () => {
          confirmPayBill(bill);
        });

        row.querySelector('.btn-cancel-pay')?.addEventListener('click', cancelPayBill);

        row.querySelector('.btn-pay-full-bill')?.addEventListener('click', () => {
          const now = nowDate();
          payNominal = billRemainingThisMonth(bill, now);
          render();
        });

        row.querySelector('.btn-pay-half-bill')?.addEventListener('click', () => {
          const now = nowDate();
          payNominal = Math.round(billRemainingThisMonth(bill, now) / 2);
          render();
        });
      }
    });

    // Debt row actions
    root.querySelectorAll('.ob-col-debts .ob-row').forEach((row) => {
      const id = row.getAttribute('data-id');
      const debt = s.debts.find((d) => d.id === id);
      if (!debt) return;

      row.querySelector('.btn-pay-debt')?.addEventListener('click', () => {
        if (payingDebtId === id) cancelPayDebt();
        else openPayDebt(debt);
      });

      row.querySelector('.btn-delete-debt')?.addEventListener('click', () => {
        removeDebt(id);
      });

      if (payingDebtId === id) {
        const nominalInput = row.querySelector('.input-debt-pay-nominal');
        if (nominalInput) {
          bindMoneyInput(nominalInput, (val) => {
            debtPayNominal = val;
            const confirmBtn = row.querySelector('.btn-confirm-pay-debt');
            const remaining = Math.max(0, debt.total - debt.paid);
            const isDebtInsufficient = debtPaySource !== 'none' && debtPayNominal > getSourceBalance(getCurrentState(), debtPaySource);
            if (confirmBtn) {
              confirmBtn.disabled = debtPayNominal <= 0 || debtPayNominal > remaining || isDebtInsufficient;
            }
          });
        }

        row.querySelector('.select-debt-source')?.addEventListener('change', (e) => {
          debtPaySource = e.target.value;
          const confirmBtn = row.querySelector('.btn-confirm-pay-debt');
          const remaining = Math.max(0, debt.total - debt.paid);
          const isDebtInsufficient = debtPaySource !== 'none' && debtPayNominal > getSourceBalance(getCurrentState(), debtPaySource);
          if (confirmBtn) {
            confirmBtn.disabled = debtPayNominal <= 0 || debtPayNominal > remaining || isDebtInsufficient;
          }
        });

        row.querySelector('.btn-confirm-pay-debt')?.addEventListener('click', () => {
          confirmPayDebt(debt);
        });

        row.querySelector('.btn-cancel-pay-debt')?.addEventListener('click', cancelPayDebt);

        row.querySelector('.btn-pay-inst-debt')?.addEventListener('click', () => {
          const remaining = Math.max(0, debt.total - debt.paid);
          debtPayNominal = Math.min(debt.installment, remaining);
          render();
        });

        row.querySelector('.btn-pay-full-debt')?.addEventListener('click', () => {
          debtPayNominal = Math.max(0, debt.total - debt.paid);
          render();
        });
      }
    });

    // Bill form inputs
    const billNameInput = root.querySelector('#bill-name');
    billNameInput?.addEventListener('input', (e) => {
      billName = e.target.value;
      const addBtn = root.querySelector('.btn-add-bill');
      if (addBtn) addBtn.disabled = !billName.trim() || billAmount <= 0;
    });

    const billAmtInput = root.querySelector('#bill-amount');
    if (billAmtInput) {
      bindMoneyInput(billAmtInput, (val) => {
        billAmount = val;
        const addBtn = root.querySelector('.btn-add-bill');
        if (addBtn) addBtn.disabled = !billName.trim() || billAmount <= 0;
      });
    }

    const billCalSlot = root.querySelector('.mini-cal-slot-bill');
    if (billCalSlot) {
      renderMiniCalendar(billCalSlot, {
        id: 'bill-due',
        value: billDay,
        onChange: (day) => {
          billDay = day;
        },
      });
    }

    root.querySelector('.ob-bill-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      addBill();
    });

    // Debt form inputs
    const debtNameInput = root.querySelector('#debt-name');
    debtNameInput?.addEventListener('input', (e) => {
      debtName = e.target.value;
      const addBtn = root.querySelector('.btn-add-debt');
      if (addBtn) addBtn.disabled = !debtName.trim() || debtTotal <= 0 || debtInstallment <= 0;
    });

    const debtTotalInput = root.querySelector('#debt-total');
    if (debtTotalInput) {
      bindMoneyInput(debtTotalInput, (val) => {
        debtTotal = val;
        const addBtn = root.querySelector('.btn-add-debt');
        if (addBtn) addBtn.disabled = !debtName.trim() || debtTotal <= 0 || debtInstallment <= 0;
      });
    }

    const debtInstInput = root.querySelector('#debt-installment');
    if (debtInstInput) {
      bindMoneyInput(debtInstInput, (val) => {
        debtInstallment = val;
        const addBtn = root.querySelector('.btn-add-debt');
        if (addBtn) addBtn.disabled = !debtName.trim() || debtTotal <= 0 || debtInstallment <= 0;
      });
    }

    const debtCalSlot = root.querySelector('.mini-cal-slot-debt');
    if (debtCalSlot) {
      renderMiniCalendar(debtCalSlot, {
        id: 'debt-due',
        value: debtDay,
        onChange: (day) => {
          debtDay = day;
        },
      });
    }

    root.querySelector('.ob-debt-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      addDebt();
    });
  }

  render();

  return {
    update(nextState) {
      currentState = nextState;
      render();
    },
  };
}
