/**
 * Income Panel (Pure Vanilla JS)
 */
import { formatIDR, formatShortDate, monthKey, todayISO } from '../lib/money.js';
import { END_SAVINGS_WALLET_ID, INCOME_SOURCES } from '../lib/state.js';
import { uid } from '../lib/id.js';
import { deleteReceipt, saveReceipt } from '../lib/receipts.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';
import { renderReceiptView } from './ReceiptView.js';

const SOURCES = INCOME_SOURCES;

function destinationKey(dest) {
  if (!dest || dest.kind === 'jajan') return 'jajan';
  if (dest.kind === 'pot') return 'pot';
  return `wallet:${dest.walletId}`;
}

function parseDestination(raw) {
  if (!raw || raw === 'jajan') return { kind: 'jajan' };
  if (raw === 'pot') return { kind: 'pot' };
  if (raw.startsWith('wallet:')) return { kind: 'wallet', walletId: raw.slice(7) };
  return { kind: 'jajan' };
}

function destinationLabel(state, dest) {
  if (!dest || dest.kind === 'jajan') return '';
  if (dest.kind === 'pot') return 'Saku Tabungan';
  const wallet = state.wallets.find((w) => w.id === dest.walletId);
  return wallet ? wallet.name : 'Dompet';
}

function applyDestination(state, dest, delta) {
  if (!dest || dest.kind === 'jajan' || delta === 0) return state;
  if (dest.kind === 'pot') {
    return { ...state, endSavings: Math.max(0, state.endSavings + delta) };
  }
  return {
    ...state,
    wallets: state.wallets.map((w) =>
      w.id === dest.walletId ? { ...w, balance: Math.max(0, w.balance + delta) } : w
    ),
  };
}

export function renderIncomePanel(container, { state, getState, update, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : currentState;
  }

  let date = todayISO();
  let source = SOURCES[0];
  let amount = 0;
  let destKey = 'jajan';
  let editingId = null;
  let receiptId = null;
  let receiptError = '';
  let query = '';
  let filterMonth = 'all';
  let timeRange = 'all';
  let sortBy = 'date';

  function resetForm() {
    date = todayISO();
    source = SOURCES[0];
    amount = 0;
    destKey = 'jajan';
    editingId = null;
    receiptId = null;
    receiptError = '';
    render();
  }

  function submit(e) {
    if (e) e.preventDefault();
    if (amount <= 0) return;
    const label = source.trim() || SOURCES[0];
    const destination = parseDestination(destKey);

    if (editingId) {
      update((s) => {
        const previous = s.incomes.find((item) => item.id === editingId);
        if (!previous) return s;
        let next = applyDestination(s, previous.destination, -previous.amount);
        next = applyDestination(next, destination, amount);
        const res = {
          ...next,
          incomes: next.incomes.map((item) =>
            item.id === editingId
              ? { ...item, date, source: label, amount, destination, receiptId: receiptId ?? undefined }
              : item
          ),
        };
        currentState = res;
        return res;
      });
    } else {
      const income = {
        id: uid('inc'),
        date,
        source: label,
        amount,
        destination,
        receiptId: receiptId ?? undefined,
      };
      update((s) => {
        const next = applyDestination({ ...s, incomes: [income, ...s.incomes] }, destination, amount);
        currentState = next;
        return next;
      });
    }
    resetForm();
  }

  function startEdit(income) {
    editingId = income.id;
    date = income.date;
    source = income.source;
    amount = income.amount;
    destKey = destinationKey(income.destination);
    receiptId = income.receiptId ?? null;
    receiptError = '';
    render();
  }

  function remove(id) {
    const s = getCurrentState();
    const index = s.incomes.findIndex((item) => item.id === id);
    const target = s.incomes[index];
    if (!target) return;
    update((prev) => {
      const nextIncomes = prev.incomes.filter((item) => item.id !== id);
      const afterBal = applyDestination(prev, target.destination, -target.amount);
      const next = { ...afterBal, incomes: nextIncomes };
      currentState = next;
      return next;
    });
    if (target.receiptId) void deleteReceipt(target.receiptId);
    if (editingId === id) resetForm();
    notify?.('Pemasukan dihapus.', {
      undo: () =>
        update((prev) => {
          const nextIncomes = [...prev.incomes];
          nextIncomes.splice(Math.min(index, nextIncomes.length), 0, { ...target, receiptId: undefined });
          const afterBal = applyDestination(prev, target.destination, target.amount);
          const next = { ...afterBal, incomes: nextIncomes };
          currentState = next;
          return next;
        }),
    });
  }

  function render() {
    const s = getCurrentState();
    const manualTotal = s.incomes.reduce((sum, item) => sum + item.amount, 0);
    const keyword = query.trim().toLowerCase();
    const nowISO = todayISO();
    const thisMonth = monthKey(nowISO);

    const visible = s.incomes.filter((item) => {
      if (filterMonth !== 'all' && monthKey(item.date) !== filterMonth) return false;
      if (timeRange === 'this_month' && monthKey(item.date) !== thisMonth) return false;
      if (timeRange === 'last_7_days') {
        const itemDate = new Date(item.date);
        const diffMs = Date.now() - itemDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 7) return false;
      }
      if (keyword) {
        const dest = destinationLabel(s, item.destination) ?? '';
        const haystack = `${item.source} ${dest} ${item.amount} ${formatIDR(item.amount)}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });

    const totalVisible = visible.reduce((sum, item) => sum + item.amount, 0);
    const hasActiveFilter = query !== '' || filterMonth !== 'all' || timeRange !== 'all';

    const txItemsHtml = visible.length === 0
      ? `<li class="empty empty-state-box">
          <strong>${isEn ? 'No income entries yet' : 'Belum ada catatan pemasukan'}</strong>
          <span class="muted small">${isEn ? 'Add additional income with the form above.' : 'Yuk catat pemasukan tambahan pertamamu lewat form di atas!'}</span>
        </li>`
      : visible.map((item) => {
        const destLabel = destinationLabel(s, item.destination);
        return `
          <li class="tx${editingId === item.id ? ' tx-active' : ''}" data-id="${escapeHtml(item.id)}">
            <span class="tx-dot" style="background: #2f9e44;"></span>
            <span class="tx-main">
              <strong>${escapeHtml(item.source)}</strong>
              <span class="muted small">
                ${formatShortDate(item.date)}
                ${destLabel ? ` · ${isEn ? 'to' : 'ke'} ${escapeHtml(destLabel)}` : ''}
              </span>
            </span>
            <span class="tx-amount tx-in tabular-nums">
              <span class="tx-kind-badge tx-kind-in" aria-label="${isEn ? 'Income' : 'Pemasukan'}">
                <span aria-hidden="true">↑</span> ${isEn ? 'In' : 'Masuk'}
              </span>
              +${formatIDR(item.amount)}
            </span>
            <span class="tx-actions">
              ${item.receiptId ? `<span class="receipt-slot" data-rcp="${escapeHtml(item.receiptId)}"></span>` : ''}
              <button type="button" class="btn btn-ghost btn-sm btn-edit-tx" data-id="${escapeHtml(item.id)}">${isEn ? 'Edit' : 'Ubah'}</button>
              <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-tx" data-id="${escapeHtml(item.id)}">${isEn ? 'Delete' : 'Hapus'}</button>
            </span>
          </li>
        `;
      }).join('');

    const existingPanel = container.querySelector('.income-panel');
    const existingForm = container.querySelector('#form-income');
    const existingList = container.querySelector('.tx-list');

    if (existingPanel && existingForm && existingList) {
      // In-place update to prevent DOM detachment
      const dateInp = existingForm.querySelector('#inc-date');
      if (dateInp && document.activeElement !== dateInp) dateInp.value = date;

      const srcSelect = existingForm.querySelector('#inc-source');
      if (srcSelect && document.activeElement !== srcSelect) {
        if (!SOURCES.includes(source)) {
          let customOpt = srcSelect.querySelector(`option[value="${source}"]`);
          if (!customOpt) {
            customOpt = document.createElement('option');
            customOpt.value = source;
            customOpt.textContent = source;
            srcSelect.appendChild(customOpt);
          }
        }
        srcSelect.value = source;
      }

      const amtInp = existingForm.querySelector('#inc-amount');
      if (amtInp && document.activeElement !== amtInp) {
        amtInp.value = amount > 0 ? amount.toLocaleString('id-ID') : '';
      }

      const destSelect = existingForm.querySelector('#inc-dest');
      if (destSelect && document.activeElement !== destSelect) destSelect.value = destKey;

      const submitBtn = existingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = amount <= 0;
        submitBtn.textContent = editingId ? translate('income.saveChange', lang) : (isEn ? 'Add income' : 'Tambah pemasukan');
      }

      existingList.innerHTML = txItemsHtml;
      bindTxActions(existingPanel);
      return;
    }

    container.innerHTML = `
      <section class="card income-panel">
        <header class="card-head">
          <h2>${isEn ? 'Other Income' : 'Pemasukan Lain'}</h2>
          <span class="muted small">${isEn ? 'total' : 'total'} ${formatIDR(manualTotal)}</span>
        </header>

        <p class="muted small">
          ${isEn ? 'Your allowance is distributed evenly per day and automatically recorded as income. Here you can add other income such as bonuses or earnings.' : 'Uang jajan dibagi rata per hari dan otomatis tercatat sebagai pemasukan. Di sini kamu menambah pemasukan lain seperti uang lebaran atau hasil kerja.'}
        </p>

        <form class="form-grid" id="form-income">
          <div class="field">
            <label for="inc-date">${translate('income.date', lang)}</label>
            <input id="inc-date" class="input" type="date" value="${escapeHtml(date)}" />
          </div>

          <div class="field">
            <label for="inc-source">${translate('income.sourceLabel', lang)}</label>
            <select id="inc-source" class="input" title="${isEn ? 'Select Income Source' : 'Pilih Sumber Pemasukan'}">
              ${!SOURCES.includes(source) ? `<option value="${escapeHtml(source)}" selected>${escapeHtml(source)}</option>` : ''}
              ${SOURCES.map((item) => `
                <option value="${escapeHtml(item)}"${item === source ? ' selected' : ''}>
                  ${escapeHtml(item)}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="field">
            <label for="inc-amount">${translate('income.amountLabel', lang)}</label>
            <input id="inc-amount" class="input input-money" type="text" inputmode="numeric" value="${amount > 0 ? amount.toLocaleString('id-ID') : ''}" />
          </div>

          <div class="field">
            <label for="inc-dest">${translate('income.destLabel', lang)}</label>
            <select id="inc-dest" class="input" title="${isEn ? 'Select Income Destination' : 'Pilih Tujuan Pemasukan'}">
              <option value="jajan"${destKey === 'jajan' ? ' selected' : ''}>${isEn ? 'Pocket money budget' : 'Uang jajan'}</option>
              <option value="pot"${destKey === 'pot' ? ' selected' : ''}>${isEn ? 'Savings Wallet' : 'Saku Tabungan'}</option>
              ${s.wallets
                .filter((wallet) => wallet.id !== END_SAVINGS_WALLET_ID)
                .map((w) => `
                  <option value="wallet:${escapeHtml(w.id)}"${destKey === `wallet:${w.id}` ? ' selected' : ''}>
                    ${escapeHtml(w.name)}
                  </option>
                `).join('')}
            </select>
          </div>

          <div class="field">
            <label for="inc-receipt">${isEn ? 'Receipt (optional)' : 'Bukti (opsional)'}</label>
            <input id="inc-receipt" class="input" type="file" accept="image/*" />
            ${receiptId ? `
              <div class="inline-form">
                <span class="chip">${isEn ? 'Receipt attached' : 'Bukti terlampir'}</span>
                <button type="button" class="btn btn-ghost btn-sm btn-detach-receipt">${isEn ? 'Detach' : 'Lepas'}</button>
              </div>
            ` : ''}
            ${receiptError ? `<span class="text-danger small">${escapeHtml(receiptError)}</span>` : ''}
          </div>

          <div class="form-actions">
            <button type="submit" class="btn" ${amount <= 0 ? 'disabled' : ''}>
              ${editingId ? translate('income.saveChange', lang) : (isEn ? 'Add income' : 'Tambah pemasukan')}
            </button>
            ${editingId ? `
              <button type="button" class="btn btn-ghost btn-cancel-edit">${translate('income.cancel', lang)}</button>
            ` : ''}
          </div>
        </form>

        <div class="filter-panel-card">
          <div class="filter-row">
            <div class="search-input-wrap">
              <input
                class="input input-search"
                placeholder="${isEn ? 'Search source or amount…' : 'Cari sumber atau nominal…'}"
                value="${escapeHtml(query)}"
              />
            </div>
            <select class="input filter-month-select" title="${isEn ? 'Filter by Month' : 'Saring Berdasarkan Bulan'}">
              <option value="all">${isEn ? 'All Months' : 'Semua Bulan'}</option>
              <option value="${thisMonth}"${filterMonth === thisMonth ? ' selected' : ''}>${isEn ? 'This Month' : 'Bulan Ini'}</option>
            </select>
          </div>

          <div class="quick-filter-chips">
            <button type="button" class="filter-chip${timeRange === 'all' ? ' filter-chip-active' : ''}" data-range="all">
              ${isEn ? 'All time' : 'Semua'}
            </button>
            <button type="button" class="filter-chip${timeRange === 'this_month' ? ' filter-chip-active' : ''}" data-range="this_month">
              ${isEn ? 'This month' : 'Bulan ini'}
            </button>
            <button type="button" class="filter-chip${timeRange === 'last_7_days' ? ' filter-chip-active' : ''}" data-range="last_7_days">
              ${isEn ? '7 days' : '7 hari'}
            </button>
          </div>

          <div class="filter-summary-row">
            <span class="muted small">
              ${isEn ? `Showing ${visible.length} of ${s.incomes.length} entries · Total ` : `Menampilkan ${visible.length} dari ${s.incomes.length} catatan · Total `}
              <strong>${formatIDR(totalVisible)}</strong>
            </span>
            ${hasActiveFilter ? `<button type="button" class="btn btn-ghost btn-sm filter-reset-btn">Reset Filter</button>` : ''}
          </div>
        </div>

        <ul class="tx-list">
          ${txItemsHtml}
        </ul>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.income-panel');
    if (!root) return;

    root.querySelector('#inc-date')?.addEventListener('input', (e) => {
      date = e.target.value;
    });

    root.querySelector('#inc-source')?.addEventListener('change', (e) => {
      source = e.target.value;
    });

    const amtInput = root.querySelector('#inc-amount');
    if (amtInput) {
      bindMoneyInput(amtInput, (val) => {
        amount = val;
        const submitBtn = root.querySelector('#form-income button[type="submit"]');
        if (submitBtn) submitBtn.disabled = amount <= 0;
      });
    }

    root.querySelector('#inc-dest')?.addEventListener('change', (e) => {
      destKey = e.target.value;
    });

    root.querySelector('#inc-receipt')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      receiptError = '';
      saveReceipt(file)
        .then((id) => {
          receiptId = id;
          render();
        })
        .catch(() => {
          receiptError = 'Gagal menyimpan bukti.';
          render();
        });
    });

    root.querySelector('.btn-detach-receipt')?.addEventListener('click', () => {
      const s = getCurrentState();
      const previous = editingId ? s.incomes.find((item) => item.id === editingId)?.receiptId : undefined;
      if (previous && previous !== receiptId) void deleteReceipt(previous);
      receiptId = null;
      render();
    });

    root.querySelector('#form-income')?.addEventListener('submit', submit);
    root.querySelector('.btn-cancel-edit')?.addEventListener('click', resetForm);

    root.querySelector('.input-search')?.addEventListener('input', (e) => {
      query = e.target.value;
      render();
    });

    root.querySelector('.filter-month-select')?.addEventListener('change', (e) => {
      filterMonth = e.target.value;
      render();
    });

    root.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        timeRange = btn.getAttribute('data-range') || 'all';
        render();
      });
    });

    root.querySelector('.filter-reset-btn')?.addEventListener('click', () => {
      query = '';
      filterMonth = 'all';
      timeRange = 'all';
      render();
    });

    bindTxActions(root);
  }

  function bindTxActions(root) {
    if (!root) return;
    root.querySelectorAll('.btn-edit-tx').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const s = getCurrentState();
        const inc = s.incomes.find((item) => item.id === id);
        if (inc) startEdit(inc);
      });
    });

    root.querySelectorAll('.btn-delete-tx').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) remove(id);
      });
    });

    root.querySelectorAll('.receipt-slot').forEach((slot) => {
      const id = slot.getAttribute('data-rcp');
      renderReceiptView(slot, { id, lang });
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
