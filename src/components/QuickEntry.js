/**
 * Quick Expense / Income Entry Popover (Pure Vanilla JS)
 */
import { INCOME_SOURCES, SAVINGS_CATEGORY, primaryGoal, isSavingsOrEmergencyCategory } from '../lib/state.js';
import { formatIDR, todayISO } from '../lib/money.js';
import { uid } from '../lib/id.js';
import { deleteReceipt, saveReceipt } from '../lib/receipts.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';

const CLOSE_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>`;

export function renderQuickEntry(container, { mode = 'expense', state, update, notify, onClose, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let date = todayISO();
  const allocatedCategories = state.categories.filter((c) => c.ratio > 0 && !c.off);

  let categoryId = allocatedCategories[0]?.id ?? state.categories[0]?.id ?? 'makan';
  let source = INCOME_SOURCES[0];
  let note = '';
  let amount = 0;
  let walletId = '';
  let receiptId = null;
  let receiptError = '';

  function submit(event) {
    event.preventDefault();
    if (amount <= 0) return;
    if (mode === 'expense') {
      const isSavings = isSavingsOrEmergencyCategory(categoryId, state.categories);
      const expense = {
        id: uid('exp'),
        date,
        categoryId,
        note: note.trim(),
        amount,
        goalId: categoryId === SAVINGS_CATEGORY ? primaryGoal(state.goals)?.id : undefined,
        receiptId: receiptId ?? undefined,
        walletId: walletId || undefined,
      };
      update((s) => {
        let nextWallets = s.wallets;
        if (walletId) {
          nextWallets = s.wallets.map((w) =>
            w.id === walletId ? { ...w, balance: Math.max(0, w.balance - amount) } : w,
          );
        }
        return {
          ...s,
          endSavings: isSavings ? Math.max(0, s.endSavings - amount) : s.endSavings,
          wallets: nextWallets,
          expenses: [expense, ...s.expenses],
        };
      });
      notify?.(isEn ? 'Expense recorded' : 'Pengeluaran dicatat');
      receiptId = null;
      walletId = '';
    } else {
      const income = { id: uid('inc'), date, source, amount };
      update((s) => ({ ...s, incomes: [income, ...s.incomes] }));
      notify?.(isEn ? 'Income recorded' : 'Pemasukan dicatat');
    }
    amount = 0;
    note = '';
    render();
  }

  function render() {
    container.innerHTML = `
      <section class="card quick-form quick-pop">
        <header class="card-head">
          <h2>
            ${mode === 'expense'
              ? (isEn ? 'Log Expense' : 'Catat Pengeluaran')
              : (isEn ? 'Log Income' : 'Catat Pemasukan')}
          </h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm window-close"
            id="btn-close-quick"
            aria-label="${isEn ? 'Close quick entry' : 'Tutup form catat cepat'}"
            title="${isEn ? 'Close' : 'Tutup'}"
          >
            ${CLOSE_ICON}
          </button>
        </header>

        <form class="form-grid" id="quick-form-el">
          <div class="field">
            <label for="qk-date">${isEn ? 'Date' : 'Tanggal'}</label>
            <input id="qk-date" class="input" type="date" value="${date}" required />
          </div>

          ${mode === 'expense' ? `
            <div class="field">
              <label for="qk-cat">${isEn ? 'Category' : 'Kategori'}</label>
              <select id="qk-cat" class="input" title="${isEn ? 'Select Category' : 'Pilih Kategori'}">
                ${allocatedCategories.map((cat) => `
                  <option value="${escapeHtml(cat.id)}"${cat.id === categoryId ? ' selected' : ''}>
                    ${escapeHtml(cat.name)}${cat.ratio > 0 ? ` (${Math.round(cat.ratio * 100)}%)` : ''}
                  </option>
                `).join('')}
              </select>
              ${isSavingsOrEmergencyCategory(categoryId, state.categories) ? `
                <p class="small" style="color: var(--primary); margin: 4px 0 0 0;">
                  ${isEn
                    ? `Deducts End-of-Period Savings (${formatIDR(state.endSavings)}).`
                    : `Memotong Tabungan Akhir Periode (${formatIDR(state.endSavings)}).`}
                </p>
              ` : ''}
            </div>
          ` : `
            <div class="field">
              <label for="qk-source">${isEn ? 'Source' : 'Sumber'}</label>
              <select id="qk-source" class="input" title="${isEn ? 'Select Source' : 'Pilih Sumber'}">
                ${INCOME_SOURCES.map((item) => `
                  <option value="${escapeHtml(item)}"${item === source ? ' selected' : ''}>
                    ${escapeHtml(item)}
                  </option>
                `).join('')}
              </select>
            </div>
          `}

          ${mode === 'expense' ? `
            <div class="field">
              <label for="qk-wallet">${isEn ? 'Wallet / Source' : 'Sumber dana / Dompet'}</label>
              <select id="qk-wallet" class="input" title="${isEn ? 'Select Wallet' : 'Pilih Dompet / E-Wallet'}">
                <option value="">${isEn ? 'Do not deduct wallet' : 'Tanpa potong dompet'}</option>
                ${state.wallets.map((wallet) => `
                  <option value="${escapeHtml(wallet.id)}"${wallet.id === walletId ? ' selected' : ''}>
                    ${escapeHtml(wallet.name)} (${isEn ? 'Balance:' : 'Saldo:'} ${formatIDR(wallet.balance)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="field">
              <label for="qk-note">${isEn ? 'Description' : 'Untuk apa'}</label>
              <input
                id="qk-note"
                class="input"
                placeholder="${isEn ? 'e.g. lunch at cafeteria' : 'mis. nasi goreng di kantin'}"
                value="${escapeHtml(note)}"
              />
            </div>
          ` : ''}

          <div class="field">
            <label for="qk-amount">${isEn ? 'Amount' : 'Nominal'}</label>
            <input
              id="qk-amount"
              class="input"
              type="text"
              inputmode="numeric"
              placeholder="0"
              value="${amount > 0 ? amount.toLocaleString('id-ID') : ''}"
              autofocus
            />
          </div>

          ${mode === 'expense' ? `
            <div class="field">
              <label for="qk-receipt">${isEn ? 'Receipt (optional)' : 'Bukti (opsional)'}</label>
              <input
                id="qk-receipt"
                class="input"
                type="file"
                accept="image/*"
              />
              ${receiptId ? `
                <div class="inline-form">
                  <span class="chip">${isEn ? 'Receipt attached' : 'Bukti terlampir'}</span>
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-del-receipt">
                    ${isEn ? 'Remove' : 'Lepas'}
                  </button>
                </div>
              ` : ''}
              ${receiptError ? `<p class="error-msg">${escapeHtml(receiptError)}</p>` : ''}
            </div>
          ` : ''}

          <button type="submit" class="btn btn-primary" id="btn-quick-submit">
            ${mode === 'expense'
              ? (isEn ? 'Record Expense' : 'Catat pengeluaran')
              : (isEn ? 'Record Income' : 'Catat pemasukan')}
          </button>
        </form>
      </section>
    `;

    // Listeners
    container.querySelector('#btn-close-quick')?.addEventListener('click', () => {
      onClose?.();
    });

    const dateInp = container.querySelector('#qk-date');
    dateInp?.addEventListener('input', (e) => {
      date = e.target.value;
    });

    const catSel = container.querySelector('#qk-cat');
    catSel?.addEventListener('change', (e) => {
      categoryId = e.target.value;
    });

    const sourceSel = container.querySelector('#qk-source');
    sourceSel?.addEventListener('change', (e) => {
      source = e.target.value;
    });

    const walletSel = container.querySelector('#qk-wallet');
    walletSel?.addEventListener('change', (e) => {
      walletId = e.target.value;
    });

    const noteInp = container.querySelector('#qk-note');
    noteInp?.addEventListener('input', (e) => {
      note = e.target.value;
    });

    const amountInp = container.querySelector('#qk-amount');
    bindMoneyInput(amountInp, (num) => {
      amount = num;
    });

    const receiptInp = container.querySelector('#qk-receipt');
    receiptInp?.addEventListener('change', (e) => {
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
          receiptError = isEn ? 'Failed to save receipt.' : 'Gagal menyimpan bukti di browser.';
          render();
        });
    });

    container.querySelector('#btn-del-receipt')?.addEventListener('click', () => {
      if (receiptId) deleteReceipt(receiptId);
      receiptId = null;
      render();
    });

    container.querySelector('#quick-form-el')?.addEventListener('submit', submit);
  }

  render();
}
