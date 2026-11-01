/**
 * Expenses Panel Component (Pure Vanilla JS)
 */
import { CATEGORY_COLORS, SAVINGS_CATEGORY, primaryGoal, isSavingsOrEmergencyCategory } from '../lib/state.js';
import { deleteReceipt, saveReceipt } from '../lib/receipts.js';
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money.js';
import { uid } from '../lib/id.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';
import { renderReceiptView } from './ReceiptView.js';
import { ICON_CLOSE } from './icons.js';

const QUICK_ADDS = [5_000, 10_000, 20_000];

export function renderExpensesPanel(container, { state, getState, update, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    if (getState) currentState = getState();
    return currentState;
  }

  let date = todayISO();
  let categoryId = (() => {
    const s = getCurrentState();
    const firstAllocated = s.categories.find((c) => c.ratio > 0 && !c.off);
    return firstAllocated?.id ?? s.categories[0]?.id ?? 'makan';
  })();
  let customAddedId = null;
  let note = '';
  let amount = 0;
  let walletId = '';
  let goalTarget = 'auto';
  let editingId = null;
  let receiptId = null;
  let receiptError = '';

  let query = '';
  let filterCategory = 'all';
  let filterMonth = 'all';
  let timeRange = 'all';
  let sortBy = 'date';

  let showCategoryForm = false;
  let newCategory = '';

  function resetForm() {
    note = '';
    amount = 0;
    goalTarget = 'auto';
    walletId = '';
    editingId = null;
    customAddedId = null;
    const s = getCurrentState();
    const allocated = s.categories.filter((c) => c.ratio > 0 && !c.off);
    if (allocated[0]) {
      categoryId = allocated[0].id;
    }
    receiptId = null;
    receiptError = '';
    render();
  }

  function resolveTarget() {
    const s = getCurrentState();
    if (categoryId !== SAVINGS_CATEGORY || goalTarget === 'none') return {};
    if (goalTarget.startsWith('wish:')) return { wishlistId: goalTarget.slice(5) };
    if (goalTarget === 'auto') return { goalId: primaryGoal(s.goals)?.id };
    return { goalId: goalTarget };
  }

  function submit(e) {
    if (e) e.preventDefault();
    if (amount <= 0) return;
    const { goalId, wishlistId } = resolveTarget();
    const s = getCurrentState();

    if (editingId) {
      const previous = s.expenses.find((item) => item.id === editingId);
      const wasSavings = previous ? isSavingsOrEmergencyCategory(previous.categoryId, s.categories) : false;
      const isSavings = isSavingsOrEmergencyCategory(categoryId, s.categories);

      update((prev) => {
        let nextEndSavings = prev.endSavings;
        if (wasSavings && isSavings) {
          const delta = amount - (previous?.amount ?? 0);
          nextEndSavings = Math.max(0, nextEndSavings - delta);
        } else if (wasSavings && !isSavings) {
          nextEndSavings = nextEndSavings + (previous?.amount ?? 0);
        } else if (!wasSavings && isSavings) {
          nextEndSavings = Math.max(0, nextEndSavings - amount);
        }

        let nextWallets = prev.wallets;
        const prevWalletId = previous?.walletId;
        const prevAmount = previous?.amount ?? 0;

        if (prevWalletId === walletId && walletId) {
          const delta = amount - prevAmount;
          nextWallets = nextWallets.map((w) =>
            w.id === walletId ? { ...w, balance: Math.max(0, w.balance - delta) } : w
          );
        } else {
          if (prevWalletId) {
            nextWallets = nextWallets.map((w) =>
              w.id === prevWalletId ? { ...w, balance: w.balance + prevAmount } : w
            );
          }
          if (walletId) {
            nextWallets = nextWallets.map((w) =>
              w.id === walletId ? { ...w, balance: Math.max(0, w.balance - amount) } : w
            );
          }
        }

        const next = {
          ...prev,
          endSavings: nextEndSavings,
          wallets: nextWallets,
          expenses: prev.expenses.map((item) =>
            item.id === editingId
              ? {
                ...item,
                date,
                categoryId,
                note,
                amount,
                goalId,
                wishlistId,
                receiptId: receiptId ?? undefined,
                walletId: walletId || undefined,
              }
              : item
          ),
        };
        currentState = next;
        return next;
      });
      if (previous?.receiptId && previous.receiptId !== receiptId) void deleteReceipt(previous.receiptId);
    } else {
      const isSavings = isSavingsOrEmergencyCategory(categoryId, s.categories);
      const expense = {
        id: uid('exp'),
        date,
        categoryId,
        note: note.trim(),
        amount,
        goalId,
        wishlistId,
        receiptId: receiptId ?? undefined,
        walletId: walletId || undefined,
      };
      update((prev) => {
        let nextWallets = prev.wallets;
        if (walletId) {
          nextWallets = prev.wallets.map((w) =>
            w.id === walletId ? { ...w, balance: Math.max(0, w.balance - amount) } : w
          );
        }
        const next = {
          ...prev,
          endSavings: isSavings ? Math.max(0, prev.endSavings - amount) : prev.endSavings,
          wallets: nextWallets,
          expenses: [expense, ...prev.expenses],
        };
        currentState = next;
        return next;
      });
    }
    resetForm();
  }

  function startEdit(expense) {
    editingId = expense.id;
    date = expense.date;
    categoryId = expense.categoryId;
    note = expense.note;
    amount = expense.amount;
    walletId = expense.walletId || '';
    if (expense.wishlistId) goalTarget = `wish:${expense.wishlistId}`;
    else if (expense.goalId) goalTarget = expense.goalId;
    else goalTarget = 'none';
    receiptId = expense.receiptId ?? null;
    receiptError = '';
    render();
  }

  function remove(id) {
    const s = getCurrentState();
    const index = s.expenses.findIndex((item) => item.id === id);
    const target = s.expenses[index];
    if (!target) return;
    const wasSavings = isSavingsOrEmergencyCategory(target.categoryId, s.categories);

    update((prev) => {
      let nextEndSavings = prev.endSavings;
      if (wasSavings) {
        nextEndSavings = nextEndSavings + target.amount;
      }
      let nextWallets = prev.wallets;
      if (target.walletId) {
        nextWallets = prev.wallets.map((w) =>
          w.id === target.walletId ? { ...w, balance: w.balance + target.amount } : w
        );
      }
      const next = {
        ...prev,
        endSavings: nextEndSavings,
        wallets: nextWallets,
        expenses: prev.expenses.filter((item) => item.id !== id),
      };
      currentState = next;
      return next;
    });

    if (target.receiptId) void deleteReceipt(target.receiptId);
    if (editingId === id) resetForm();

    notify?.(translate('expenses.deletedToast', lang), {
      undo: () => {
        update((prev) => {
          let nextEndSavings = prev.endSavings;
          if (wasSavings) {
            nextEndSavings = Math.max(0, nextEndSavings - target.amount);
          }
          let nextWallets = prev.wallets;
          if (target.walletId) {
            nextWallets = prev.wallets.map((w) =>
              w.id === target.walletId ? { ...w, balance: Math.max(0, w.balance - target.amount) } : w
            );
          }
          const nextExpenses = [...prev.expenses];
          nextExpenses.splice(Math.min(index, nextExpenses.length), 0, { ...target, receiptId: undefined });
          const next = {
            ...prev,
            endSavings: nextEndSavings,
            wallets: nextWallets,
            expenses: nextExpenses,
          };
          currentState = next;
          return next;
        });
      },
    });
  }

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const s = getCurrentState();
    const id = uid('cat');
    const category = {
      id,
      name: trimmed,
      ratio: 0,
      builtin: false,
      color: CATEGORY_COLORS[s.categories.length % CATEGORY_COLORS.length],
    };
    update((prev) => {
      const next = { ...prev, categories: [...prev.categories, category] };
      currentState = next;
      return next;
    });
    customAddedId = id;
    categoryId = id;
    showCategoryForm = false;
    newCategory = '';
    render();
  }

  function render() {
    const s = getCurrentState();

    const allocatedCategories = (() => {
      const list = s.categories.filter((c) => c.ratio > 0 && !c.off);
      return list.length > 0 ? list : s.categories;
    })();

    const formCategories = (() => {
      const list = [...allocatedCategories];
      if (editingId && !list.some((c) => c.id === categoryId)) {
        const match = s.categories.find((c) => c.id === categoryId);
        if (match) list.push(match);
      }
      if (customAddedId && !list.some((c) => c.id === customAddedId)) {
        const match = s.categories.find((c) => c.id === customAddedId);
        if (match) list.push(match);
      }
      return list;
    })();

    const filterCategories = (() => {
      const expenseCatIds = new Set(s.expenses.map((item) => item.categoryId));
      return s.categories.filter((cat) => (cat.ratio > 0 && !cat.off) || expenseCatIds.has(cat.id));
    })();

    const monthKeys = [...new Set(s.expenses.map((item) => monthKey(item.date)))].sort().reverse();

    const categoryMap = new Map();
    s.categories.forEach((cat) => categoryMap.set(cat.id, cat));

    const keyword = query.trim().toLowerCase();
    const nowISO = todayISO();
    const thisMonth = monthKey(nowISO);

    const visible = s.expenses.filter((item) => {
      if (filterCategory !== 'all' && item.categoryId !== filterCategory) return false;
      if (filterMonth !== 'all' && monthKey(item.date) !== filterMonth) return false;
      if (timeRange === 'this_month' && monthKey(item.date) !== thisMonth) return false;
      if (timeRange === 'last_7_days') {
        const itemDate = new Date(item.date);
        const diffMs = Date.now() - itemDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 7) return false;
      }
      if (keyword) {
        const catName = categoryMap.get(item.categoryId)?.name ?? '';
        const walletName = item.walletId ? s.wallets.find((w) => w.id === item.walletId)?.name ?? '' : '';
        const haystack = `${item.note} ${catName} ${walletName} ${item.amount} ${formatIDR(item.amount)}`.toLowerCase();
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
    const hasActiveFilter = query !== '' || filterCategory !== 'all' || filterMonth !== 'all' || timeRange !== 'all';

    const selectedWallet = s.wallets.find((w) => w.id === walletId);
    const walletRemaining = selectedWallet ? Math.max(0, selectedWallet.balance - amount) : 0;

    const txItemsHtml = visible.length === 0
      ? `<li class="empty empty-state-box">
          <strong>${isEn ? 'No expense entries yet' : 'Belum ada catatan pengeluaran'}</strong>
          <span class="muted small">
            ${hasActiveFilter ? (isEn ? 'No expenses match your active filter.' : 'Tidak ada pengeluaran yang cocok dengan filter kamu.') : (isEn ? 'Start recording your expenses with the form above or the [+ Expense] button!' : 'Yuk catat pengeluaran pertamamu lewat form di atas atau tombol [+ Pengeluaran]!')}
          </span>
        </li>`
      : visible.map((item) => {
        const category = categoryMap.get(item.categoryId);
        const wallet = item.walletId ? s.wallets.find((w) => w.id === item.walletId) : undefined;
        return `
          <li class="tx${editingId === item.id ? ' tx-active' : ''}" data-id="${escapeHtml(item.id)}">
            <span class="tx-dot" style="background: ${category?.color ?? '#868e96'};"></span>
            <span class="tx-main">
              <strong>${escapeHtml(item.note || category?.name || (isEn ? 'Expense' : 'Pengeluaran'))}</strong>
              <span class="muted small">
                ${formatShortDate(item.date)} · ${escapeHtml(category?.name ?? (isEn ? 'Uncategorized' : 'Tanpa kategori'))}
                ${wallet ? ` · ${escapeHtml(wallet.name)}` : ''}
              </span>
            </span>
            <span class="tx-amount tx-out tabular-nums">
              <span class="tx-kind-badge tx-kind-out" aria-label="${isEn ? 'Expense' : 'Pengeluaran'}">
                <span aria-hidden="true">↓</span> ${isEn ? 'Out' : 'Keluar'}
              </span>
              −${formatIDR(item.amount)}
            </span>
            <span class="tx-actions">
              ${item.receiptId ? `<span class="receipt-slot" data-rcp="${escapeHtml(item.receiptId)}"></span>` : ''}
              <button type="button" class="btn btn-ghost btn-sm btn-edit-tx" data-id="${escapeHtml(item.id)}">${translate('expenses.edit', lang)}</button>
              <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-tx" data-id="${escapeHtml(item.id)}">${translate('expenses.delete', lang)}</button>
            </span>
          </li>
        `;
      }).join('');

    const existingPanel = container.querySelector('.expenses-panel');
    const existingForm = existingPanel?.querySelector('#form-expense');
    const existingList = existingPanel?.querySelector('.tx-list');

    if (existingPanel && existingForm && existingList) {
      // In-place update to prevent DOM detachment of txList and form
      const chipEl = existingPanel.querySelector('.card-head-actions .chip');
      if (chipEl) {
        chipEl.textContent = isEn
          ? `${s.expenses.length} ${s.expenses.length === 1 ? 'entry' : 'entries'}`
          : `${s.expenses.length} catatan`;
      }

      const countEl = existingPanel.querySelector('.filter-summary-row');
      if (countEl) {
        countEl.innerHTML = `
          <span class="muted small">
            ${isEn ? `Showing ${visible.length} of ${s.expenses.length} entries · Total ` : `Menampilkan ${visible.length} dari ${s.expenses.length} catatan · Total `}
            <strong>${formatIDR(totalVisible)}</strong>
          </span>
          ${hasActiveFilter ? `<button type="button" class="btn btn-ghost btn-sm filter-reset-btn">Reset Filter</button>` : ''}
        `;
        countEl.querySelector('.filter-reset-btn')?.addEventListener('click', () => {
          query = '';
          filterCategory = 'all';
          filterMonth = 'all';
          timeRange = 'all';
          sortBy = 'date';
          render();
        });
      }

      const dateInp = existingForm.querySelector('#exp-date');
      if (dateInp && document.activeElement !== dateInp) dateInp.value = date;

      const catSelect = existingForm.querySelector('#exp-cat');
      if (catSelect) {
        const currentOptions = [...catSelect.options].map((o) => o.value).join(',');
        const newOptions = formCategories.map((c) => c.id).join(',');
        if (currentOptions !== newOptions) {
          catSelect.innerHTML = formCategories.map((c) => `
            <option value="${escapeHtml(c.id)}"${c.id === categoryId ? ' selected' : ''}>
              ${escapeHtml(c.name)}${c.ratio > 0 ? ` (${Math.round(c.ratio * 100)}%)` : ''}
            </option>
          `).join('');
        } else if (document.activeElement !== catSelect) {
          catSelect.value = categoryId;
        }
      }

      const shouldHaveGoal = categoryId === SAVINGS_CATEGORY && (s.goals.length > 0 || s.wishlist.length > 0);
      let goalField = existingForm.querySelector('#exp-goal')?.closest('.field');
      if (shouldHaveGoal) {
        const goalHtml = `
          <label for="exp-goal">${translate('expenses.targetLabel', lang)}</label>
          <select id="exp-goal" class="input" title="${isEn ? 'Allocate to Goal' : 'Masukkan ke Target Tabungan'}">
            ${s.goals.length > 0 ? `<option value="auto"${goalTarget === 'auto' ? ' selected' : ''}>${translate('expenses.autoGoal', lang)}</option>` : ''}
            <option value="none"${goalTarget === 'none' ? ' selected' : ''}>${translate('expenses.noneGoal', lang)}</option>
            ${s.goals.map((g) => `<option value="${escapeHtml(g.id)}"${goalTarget === g.id ? ' selected' : ''}>${escapeHtml(g.name)} · ${translate('expenses.targetGoalSuffix', lang)}</option>`).join('')}
            ${s.wishlist.map((w) => `<option value="wish:${escapeHtml(w.id)}"${goalTarget === `wish:${w.id}` ? ' selected' : ''}>${escapeHtml(w.name)} · ${translate('expenses.targetWishSuffix', lang)}</option>`).join('')}
          </select>
          <span class="muted small">${translate('expenses.targetNotice', lang)}</span>
        `;
        if (!goalField) {
          goalField = document.createElement('div');
          goalField.className = 'field';
          goalField.innerHTML = goalHtml;
          const catField = existingForm.querySelector('#exp-cat')?.closest('.field');
          catField?.insertAdjacentElement('afterend', goalField);
        } else {
          goalField.innerHTML = goalHtml;
        }
        goalField.querySelector('#exp-goal')?.addEventListener('change', (e) => {
          goalTarget = e.target.value;
        });
      } else if (goalField) {
        goalField.remove();
      }

      const walletSelect = existingForm.querySelector('#exp-wallet');
      if (walletSelect) {
        const currentWallets = [...walletSelect.options].map((o) => o.value).join(',');
        const newWallets = ['', ...s.wallets.map((w) => w.id)].join(',');
        if (currentWallets !== newWallets) {
          walletSelect.innerHTML = `
            <option value="">${translate('expenses.walletNoneOption', lang)}</option>
            ${s.wallets.map((w) => `
              <option value="${escapeHtml(w.id)}"${w.id === walletId ? ' selected' : ''}>
                ${escapeHtml(w.name)} (${isEn ? 'Balance:' : 'Saldo:'} ${formatIDR(w.balance)})
              </option>
            `).join('')}
          `;
        } else if (document.activeElement !== walletSelect) {
          walletSelect.value = walletId;
        }
      }

      const noteInp = existingForm.querySelector('#exp-note');
      if (noteInp && document.activeElement !== noteInp) noteInp.value = note;

      const amtInp = existingForm.querySelector('#exp-amount');
      if (amtInp && document.activeElement !== amtInp) {
        amtInp.value = amount > 0 ? amount.toLocaleString('id-ID') : '';
      }

      const receiptField = existingForm.querySelector('#exp-receipt')?.closest('.field');
      if (receiptField) {
        let attachedRow = receiptField.querySelector('.receipt-attached-row');
        if (receiptId) {
          if (!attachedRow) {
            attachedRow = document.createElement('div');
            attachedRow.className = 'receipt-attached-row';
            attachedRow.style.cssText = 'margin-top: 6px; display: flex; gap: 8px; align-items: center;';
            attachedRow.innerHTML = `
              <span class="chip">${translate('expenses.receiptAttached', lang)}</span>
              <button type="button" class="btn btn-ghost btn-sm btn-detach-receipt">
                ${translate('expenses.detachReceipt', lang)}
              </button>
            `;
            receiptField.appendChild(attachedRow);
            attachedRow.querySelector('.btn-detach-receipt')?.addEventListener('click', () => {
              receiptId = null;
              render();
            });
          }
        } else if (attachedRow) {
          attachedRow.remove();
        }
      }

      const submitBtn = existingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = amount <= 0;
        submitBtn.textContent = editingId ? translate('expenses.saveChange', lang) : translate('expenses.submit', lang);
      }

      existingList.innerHTML = txItemsHtml;
      bindTxActions(existingList);
      return;
    }

    container.innerHTML = `
      <section class="card expenses-panel">
        <header class="card-head">
          <h2>${translate('expenses.title', lang)}</h2>
          <div class="card-head-actions">
            <span class="chip">
              ${isEn ? `${s.expenses.length} ${s.expenses.length === 1 ? 'entry' : 'entries'}` : `${s.expenses.length} catatan`}
            </span>
          </div>
        </header>

        <form class="form-grid" id="form-expense">
          <div class="field">
            <label for="exp-date">${translate('expenses.date', lang)}</label>
            <input id="exp-date" class="input input-date" type="date" value="${date}" required />
          </div>

          <div class="field">
            <label for="exp-cat">${translate('expenses.category', lang)}</label>
            <select id="exp-cat" class="input" title="${isEn ? 'Select Expense Category' : 'Pilih Kategori Pengeluaran'}">
              ${formCategories.map((c) => `
                <option value="${escapeHtml(c.id)}"${c.id === categoryId ? ' selected' : ''}>
                  ${escapeHtml(c.name)}${c.ratio > 0 ? ` (${Math.round(c.ratio * 100)}%)` : ''}
                </option>
              `).join('')}
            </select>
            ${isSavingsOrEmergencyCategory(categoryId, s.categories)
        ? `<p class="small" style="color: var(--primary); margin: 4px 0 0 0;">
                    ${isEn ? `Spending in this category automatically deducts from your End-of-Period Savings (current balance: ${formatIDR(s.endSavings)}).` : `Pengeluaran di kategori ini otomatis motong Tabungan Akhir Periode kamu ya (saldo saat ini: ${formatIDR(s.endSavings)}).`}
                  </p>`
        : ''
      }
            <div style="display: flex; gap: 8px; margin-top: 6px; align-items: center;">
              <button type="button" class="btn btn-ghost btn-sm btn-toggle-add-cat" style="font-size: 11px;">
                ${showCategoryForm ? (isEn ? 'Cancel add category' : 'Batal tambah kategori') : (isEn ? '+ Custom category' : '+ Kategori kustom')}
              </button>
            </div>
            ${showCategoryForm
        ? `<div class="add-cat-box" style="margin-top: 8px; display: flex; gap: 6px;">
                    <input
                      type="text"
                      class="input input-sm input-new-cat"
                      placeholder="${isEn ? 'Category name...' : 'Nama kategori...'}"
                      value="${escapeHtml(newCategory)}"
                    />
                    <button type="button" class="btn btn-primary btn-sm btn-submit-add-cat">
                      ${isEn ? 'Save' : 'Simpan'}
                    </button>
                  </div>`
        : ''
      }
          </div>

          ${categoryId === SAVINGS_CATEGORY && (s.goals.length > 0 || s.wishlist.length > 0)
        ? `<div class="field">
                  <label for="exp-goal">${translate('expenses.targetLabel', lang)}</label>
                  <select id="exp-goal" class="input" title="${isEn ? 'Allocate to Goal' : 'Masukkan ke Target Tabungan'}">
                    ${s.goals.length > 0 ? `<option value="auto"${goalTarget === 'auto' ? ' selected' : ''}>${translate('expenses.autoGoal', lang)}</option>` : ''}
                    <option value="none"${goalTarget === 'none' ? ' selected' : ''}>${translate('expenses.noneGoal', lang)}</option>
                    ${s.goals.map((g) => `<option value="${escapeHtml(g.id)}"${goalTarget === g.id ? ' selected' : ''}>${escapeHtml(g.name)} · ${translate('expenses.targetGoalSuffix', lang)}</option>`).join('')}
                    ${s.wishlist.map((w) => `<option value="wish:${escapeHtml(w.id)}"${goalTarget === `wish:${w.id}` ? ' selected' : ''}>${escapeHtml(w.name)} · ${translate('expenses.targetWishSuffix', lang)}</option>`).join('')}
                  </select>
                  <span class="muted small">${translate('expenses.targetNotice', lang)}</span>
                </div>`
        : ''
      }

          <div class="field">
            <label for="exp-wallet">${translate('expenses.walletSourceLabel', lang)}</label>
            <select id="exp-wallet" class="input" title="${isEn ? 'Select Source Wallet' : 'Pilih Dompet / E-Wallet Sumber'}">
              <option value="">${translate('expenses.walletNoneOption', lang)}</option>
              ${s.wallets.map((w) => `
                <option value="${escapeHtml(w.id)}"${w.id === walletId ? ' selected' : ''}>
                  ${escapeHtml(w.name)} (${isEn ? 'Balance:' : 'Saldo:'} ${formatIDR(w.balance)})
                </option>
              `).join('')}
            </select>
            ${walletId && selectedWallet
        ? `<span class="muted small">
                    ${isEn ? 'Remaining wallet balance: ' : 'Sisa saldo dompet ini: '}<strong>${formatIDR(walletRemaining)}</strong>
                  </span>`
        : ''
      }
          </div>

          <div class="field">
            <label for="exp-note">${translate('expenses.noteLabel', lang)}</label>
            <input
              id="exp-note"
              class="input"
              placeholder="${translate('expenses.notePlaceholder', lang)}"
              value="${escapeHtml(note)}"
            />
          </div>

          <div class="field">
            <label for="exp-amount">${translate('expenses.amountLabel', lang)}</label>
            <input id="exp-amount" class="input input-money" type="text" inputmode="numeric" value="${amount > 0 ? amount.toLocaleString('id-ID') : ''}" />
            <div class="quick-add-group" style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
              ${QUICK_ADDS.map((val) => `
                <button type="button" class="chip btn-quick-add" data-val="${val}">
                  +${formatIDR(val)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="field">
            <label for="exp-receipt">${translate('expenses.receiptLabel', lang)}</label>
            <input
              id="exp-receipt"
              class="input input-receipt"
              type="file"
              accept="image/*"
              title="${isEn ? 'Upload Receipt Image' : 'Unggah Foto Bukti Transaksi'}"
            />
            ${receiptId
        ? `<div class="receipt-attached-row" style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
                    <span class="chip">${translate('expenses.receiptAttached', lang)}</span>
                    <button type="button" class="btn btn-ghost btn-sm btn-detach-receipt">
                      ${translate('expenses.detachReceipt', lang)}
                    </button>
                  </div>`
        : ''
      }
            ${receiptError ? `<p class="error-msg">${escapeHtml(receiptError)}</p>` : ''}
          </div>

          <div class="form-actions" style="display: flex; gap: 8px;">
            <button type="submit" class="btn btn-primary" ${amount <= 0 ? 'disabled' : ''}>
              ${editingId ? translate('expenses.saveChange', lang) : translate('expenses.submit', lang)}
            </button>
            ${editingId
        ? `<button type="button" class="btn btn-ghost btn-cancel-edit">
                    ${translate('expenses.cancel', lang)}
                  </button>`
        : ''
      }
          </div>
        </form>

        <div class="tx-filter-bar">
          <div class="filter-controls-grid">
            <div class="search-input-wrap">
              <input
                type="text"
                class="input input-sm input-search"
                placeholder="${translate('expenses.searchPlaceholder', lang)}"
                value="${escapeHtml(query)}"
              />
              ${query
        ? `<button type="button" class="search-clear-btn" aria-label="${isEn ? 'Clear search' : 'Hapus pencarian'}">
                      ${ICON_CLOSE}
                    </button>`
        : ''
      }
            </div>
            <select class="input select-filter-cat" aria-label="Filter kategori">
              <option value="all">${translate('expenses.filterCatAll', lang)}</option>
              ${filterCategories.map((c) => `<option value="${escapeHtml(c.id)}"${c.id === filterCategory ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
            <select class="input select-filter-month" aria-label="Filter bulan">
              <option value="all">${translate('expenses.filterMonthAll', lang)}</option>
              ${monthKeys.map((k) => `<option value="${escapeHtml(k)}"${k === filterMonth ? ' selected' : ''}>${escapeHtml(monthLabel(k))}</option>`).join('')}
            </select>
            <select class="input select-sort-by" aria-label="Urutan">
              <option value="date"${sortBy === 'date' ? ' selected' : ''}>${translate('expenses.sortNewest', lang)}</option>
              <option value="date_asc"${sortBy === 'date_asc' ? ' selected' : ''}>${translate('expenses.sortOldest', lang)}</option>
              <option value="amount"${sortBy === 'amount' ? ' selected' : ''}>${translate('expenses.sortLargest', lang)}</option>
              <option value="amount_asc"${sortBy === 'amount_asc' ? ' selected' : ''}>${translate('expenses.sortSmallest', lang)}</option>
            </select>
          </div>

          <div class="quick-filter-chips">
            <button type="button" class="filter-chip${timeRange === 'all' ? ' filter-chip-active' : ''}" data-range="all">
              ${translate('expenses.rangeAll', lang)}
            </button>
            <button type="button" class="filter-chip${timeRange === 'this_month' ? ' filter-chip-active' : ''}" data-range="this_month">
              ${translate('expenses.rangeThisMonth', lang)}
            </button>
            <button type="button" class="filter-chip${timeRange === 'last_7_days' ? ' filter-chip-active' : ''}" data-range="last_7_days">
              ${translate('expenses.range7Days', lang)}
            </button>
          </div>

          <div class="filter-summary-row">
            <span class="muted small">
              ${isEn ? `Showing ${visible.length} of ${s.expenses.length} entries · Total ` : `Menampilkan ${visible.length} dari ${s.expenses.length} catatan · Total `}
              <strong>${formatIDR(totalVisible)}</strong>
            </span>
            ${hasActiveFilter
        ? `<button type="button" class="btn btn-ghost btn-sm filter-reset-btn">
                    Reset Filter
                  </button>`
        : ''
      }
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
    const root = container.querySelector('.expenses-panel');
    if (!root) return;

    // Date
    root.querySelector('#exp-date')?.addEventListener('change', (e) => {
      date = e.target.value;
    });

    // Category
    root.querySelector('#exp-cat')?.addEventListener('change', (e) => {
      categoryId = e.target.value;
      render();
    });

    // Toggle add category form
    root.querySelector('.btn-toggle-add-cat')?.addEventListener('click', () => {
      showCategoryForm = !showCategoryForm;
      render();
    });

    // Add category input & submit
    root.querySelector('.input-new-cat')?.addEventListener('input', (e) => {
      newCategory = e.target.value;
    });
    root.querySelector('.btn-submit-add-cat')?.addEventListener('click', addCategory);

    // Goal
    root.querySelector('#exp-goal')?.addEventListener('change', (e) => {
      goalTarget = e.target.value;
    });

    // Wallet
    root.querySelector('#exp-wallet')?.addEventListener('change', (e) => {
      walletId = e.target.value;
      render();
    });

    // Note
    root.querySelector('#exp-note')?.addEventListener('input', (e) => {
      note = e.target.value;
    });

    // Amount (MoneyInput)
    const amountInput = root.querySelector('#exp-amount');
    if (amountInput) {
      bindMoneyInput(amountInput, (val) => {
        amount = val;
        const submitBtn = root.querySelector('#form-expense button[type="submit"]');
        if (submitBtn) submitBtn.disabled = amount <= 0;
      });
    }

    // Quick add chips
    root.querySelectorAll('.btn-quick-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = Number(btn.getAttribute('data-val')) || 0;
        amount += val;
        render();
      });
    });

    // Receipt upload
    root.querySelector('#exp-receipt')?.addEventListener('change', (e) => {
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
          receiptError = translate('expenses.receiptError', lang);
          render();
        });
    });

    // Detach receipt
    root.querySelector('.btn-detach-receipt')?.addEventListener('click', () => {
      const s = getCurrentState();
      const previous = editingId
        ? s.expenses.find((item) => item.id === editingId)?.receiptId
        : undefined;
      if (previous && previous !== receiptId) void deleteReceipt(previous);
      receiptId = null;
      render();
    });

    // Form submit
    root.querySelector('#form-expense')?.addEventListener('submit', submit);

    // Cancel edit
    root.querySelector('.btn-cancel-edit')?.addEventListener('click', resetForm);

    // Filter query
    const searchInput = root.querySelector('.input-search');
    searchInput?.addEventListener('input', (e) => {
      query = e.target.value;
      render();
    });

    root.querySelector('.search-clear-btn')?.addEventListener('click', () => {
      query = '';
      render();
    });

    // Filter selects
    root.querySelector('.select-filter-cat')?.addEventListener('change', (e) => {
      filterCategory = e.target.value;
      render();
    });

    root.querySelector('.select-filter-month')?.addEventListener('change', (e) => {
      filterMonth = e.target.value;
      render();
    });

    root.querySelector('.select-sort-by')?.addEventListener('change', (e) => {
      sortBy = e.target.value;
      render();
    });

    // Filter chips
    root.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        timeRange = chip.getAttribute('data-range') || 'all';
        render();
      });
    });

    // Filter reset
    root.querySelector('.filter-reset-btn')?.addEventListener('click', () => {
      query = '';
      filterCategory = 'all';
      filterMonth = 'all';
      timeRange = 'all';
      sortBy = 'date';
      render();
    });

    // Transaction actions (Edit, Delete, Receipt)
    bindTxActions(root);
  }

  function bindTxActions(root) {
    if (!root) return;
    root.querySelectorAll('.btn-edit-tx').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const s = getCurrentState();
        const expense = s.expenses.find((item) => item.id === id);
        if (expense) startEdit(expense);
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
