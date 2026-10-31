/**
 * Shopping List Card (Pure Vanilla JS)
 */
import { formatIDR, todayISO } from '../lib/money.js';
import { uid } from '../lib/id.js';
import { escapeHtml } from '../lib/dom.js';
import { ICON_CART, ICON_CHECKLIST, ICON_CLOSE } from './icons.js';
import { bindMoneyInput, formatMoneyValue } from './MoneyInput.js';

const QUICK_SUGGESTIONS = [
  'Beras',
  'Minyak Goreng',
  'Telur',
  'Sayur & Bumbu',
  'Sabun Cuci',
  'Kopi & Teh',
  'Camilan',
];

export function renderShoppingListCard(container, { state, update, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let name = '';
  let estimatedPrice = 0;
  let filterTab = 'all'; // 'all' | 'pending' | 'checked'

  const allocatedCategories = state.categories.filter((c) => c.ratio > 0 && !c.off);
  const categories = allocatedCategories.length > 0 ? allocatedCategories : state.categories;
  let categoryId = categories[0]?.id ?? 'makan';

  function render() {
    const shoppingList = state.shoppingList ?? [];
    const pendingCount = shoppingList.filter((item) => !item.checked).length;
    const checkedCount = shoppingList.filter((item) => item.checked).length;

    const filteredItems = shoppingList.filter((item) => {
      if (filterTab === 'pending') return !item.checked;
      if (filterTab === 'checked') return item.checked;
      return true;
    });

    const categoryMap = new Map();
    state.categories.forEach((cat) => categoryMap.set(cat.id, cat.name));

    const categoryOptionsHtml = categories.map((cat) => `
      <option value="${escapeHtml(cat.id)}"${cat.id === categoryId ? ' selected' : ''}>
        ${escapeHtml(cat.name)}
      </option>
    `).join('');

    const suggestionsHtml = QUICK_SUGGESTIONS.map((item) => `
      <button type="button" class="chip-suggestion" data-val="${escapeHtml(item)}">
        + ${escapeHtml(item)}
      </button>
    `).join('');

    const itemsHtml = filteredItems.length === 0
      ? `<div class="empty muted small" style="text-align: center; padding: 24px 0;">
          ${isEn ? 'Shopping list is currently empty.' : 'Daftar belanja masih kosong'}
        </div>`
      : `<ul class="shopping-item-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
          ${filteredItems.map((item) => `
            <li class="shopping-item${item.checked ? ' item-checked' : ''}" data-id="${escapeHtml(item.id)}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background: var(--bg-surface-soft, rgba(0,0,0,0.03));">
              <label style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer;">
                <input type="checkbox" class="shopping-check" data-id="${escapeHtml(item.id)}"${item.checked ? ' checked' : ''} />
                <span class="item-name"${item.checked ? ' style="text-decoration: line-through; opacity: 0.6;"' : ''}>
                  ${escapeHtml(item.name)}
                </span>
                <span class="muted small item-cat" style="font-size: 0.75rem; background: var(--border-color); padding: 2px 6px; border-radius: 4px;">
                  ${escapeHtml(categoryMap.get(item.categoryId) || item.categoryId)}
                </span>
              </label>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${item.estimatedPrice > 0 ? `<strong class="item-price" style="font-size: 0.85rem;">${formatIDR(item.estimatedPrice)}</strong>` : ''}
                <button type="button" class="btn btn-ghost btn-sm btn-danger shopping-delete-btn" data-id="${escapeHtml(item.id)}" aria-label="${isEn ? 'Delete item' : 'Hapus barang'}" style="padding: 2px 6px;">
                  ${ICON_CLOSE}
                </button>
              </div>
            </li>
          `).join('')}
        </ul>`;

    container.innerHTML = `
      <section class="card shopping-list-card" aria-label="${isEn ? 'Shopping Planner' : 'Daftar Rencana Belanja'}">
        <header class="card-head" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <h2 style="display: flex; align-items: center; gap: 8px; margin: 0;">
              ${ICON_CART}
              <span>${isEn ? 'Shopping Planner' : 'Daftar Rencana Belanja'}</span>
            </h2>
            <p class="muted small" style="margin: 4px 0 0;">
              ${isEn ? 'Plan groceries, tick items off, and log them directly to expenses.' : 'Catat rencana belanja, centang saat beli, lalu langsung bukukan ke pengeluaran.'}
            </p>
          </div>
          <div class="shopping-badges" style="display: flex; gap: 6px;">
            <span class="badge" style="font-size: 0.75rem;">${pendingCount} ${isEn ? 'pending' : 'belum dibeli'}</span>
            <span class="badge badge-accent" style="font-size: 0.75rem;">${checkedCount} ${isEn ? 'in cart' : 'di keranjang'}</span>
          </div>
        </header>

        <form class="shopping-add-form" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <input
              id="shopping-name-input"
              class="input"
              type="text"
              placeholder="${isEn ? 'Item name (e.g. Eggs 1kg)...' : 'Nama barang (mis. Telur 1kg)...'}"
              value="${escapeHtml(name)}"
              style="flex: 2; min-width: 160px;"
            />
            <input
              id="shopping-price-input"
              class="input input-money"
              type="text"
              inputmode="numeric"
              placeholder="${isEn ? 'Est. price' : 'Perkiraan harga'}"
              value="${formatMoneyValue(estimatedPrice)}"
              style="flex: 1; min-width: 100px;"
            />
            <select id="shopping-cat-select" class="input" style="flex: 1; min-width: 120px;">
              ${categoryOptionsHtml}
            </select>
            <button
              id="shopping-add-btn"
              type="submit"
              class="btn btn-primary"
              ${!name.trim() ? 'disabled' : ''}
              style="white-space: nowrap;"
            >
              ${isEn ? '+ Add' : '+ Tambah'}
            </button>
          </div>

          <div class="quick-suggestions-bar" style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            <span class="muted small" style="font-size: 0.75rem;">${isEn ? 'Quick pick:' : 'Pilihan cepat:'}</span>
            ${suggestionsHtml}
          </div>
        </form>

        <div class="shopping-list-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div class="filter-tabs" style="display: flex; gap: 4px;">
            <button type="button" class="btn btn-ghost btn-sm filter-tab${filterTab === 'all' ? ' btn-active' : ''}" data-tab="all">${isEn ? 'All' : 'Semua'} (${shoppingList.length})</button>
            <button type="button" class="btn btn-ghost btn-sm filter-tab${filterTab === 'pending' ? ' btn-active' : ''}" data-tab="pending">${isEn ? 'Pending' : 'Belum'} (${pendingCount})</button>
            <button type="button" class="btn btn-ghost btn-sm filter-tab${filterTab === 'checked' ? ' btn-active' : ''}" data-tab="checked">${isEn ? 'In Cart' : 'Selesai'} (${checkedCount})</button>
          </div>
          ${checkedCount > 0 ? `
            <button id="shopping-checkout-button" type="button" class="btn btn-sm btn-accent" style="display: flex; align-items: center; gap: 6px;">
              ${ICON_CHECKLIST}
              <span>${isEn ? `Log ${checkedCount} items to Expenses` : `Catat ${checkedCount} Belanjaan ke Pengeluaran`}</span>
            </button>
          ` : ''}
        </div>

        <div class="shopping-items-container">
          ${itemsHtml}
        </div>
      </section>
    `;

    // Bind form events
    const nameInput = container.querySelector('#shopping-name-input');
    const priceInput = container.querySelector('#shopping-price-input');
    const catSelect = container.querySelector('#shopping-cat-select');
    const addBtn = container.querySelector('#shopping-add-btn');
    const form = container.querySelector('.shopping-add-form');

    nameInput?.addEventListener('input', (e) => {
      name = e.target.value;
      if (addBtn) addBtn.disabled = !name.trim();
    });

    if (priceInput) {
      bindMoneyInput(priceInput, (num) => {
        estimatedPrice = num;
      });
    }

    catSelect?.addEventListener('change', (e) => {
      categoryId = e.target.value;
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;

      const newItem = {
        id: uid('item'),
        name: trimmed,
        estimatedPrice,
        checked: false,
        categoryId,
      };

      update((s) => ({
        ...s,
        shoppingList: [...(s.shoppingList ?? []), newItem],
      }));

      name = '';
      estimatedPrice = 0;
      render();
    });

    // Suggestion chips
    container.querySelectorAll('.chip-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        name = btn.dataset.val;
        if (nameInput) {
          nameInput.value = name;
          nameInput.focus();
        }
        if (addBtn) addBtn.disabled = false;
      });
    });

    // Tabs
    container.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        filterTab = tab.dataset.tab;
        render();
      });
    });

    // Checkboxes
    container.querySelectorAll('.shopping-check').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const id = chk.dataset.id;
        const isChecked = e.target.checked;
        update((s) => ({
          ...s,
          shoppingList: (s.shoppingList ?? []).map((it) => it.id === id ? { ...it, checked: isChecked } : it),
        }));
        render();
      });
    });

    // Delete item
    container.querySelectorAll('.shopping-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const currentList = state.shoppingList ?? [];
        const itemToDelete = currentList.find((it) => it.id === id);
        if (!itemToDelete) return;

        update((s) => ({
          ...s,
          shoppingList: (s.shoppingList ?? []).filter((it) => it.id !== id),
        }));

        notify?.(isEn ? `Item "${itemToDelete.name}" deleted.` : `Barang "${itemToDelete.name}" dihapus.`, {
          undo: () => {
            update((s) => ({
              ...s,
              shoppingList: [...(s.shoppingList ?? []), itemToDelete],
            }));
            render();
          },
        });
        render();
      });
    });

    // Checkout button
    container.querySelector('#shopping-checkout-button')?.addEventListener('click', () => {
      const currentList = state.shoppingList ?? [];
      const checkedItems = currentList.filter((it) => it.checked);
      if (checkedItems.length === 0) return;

      const newExpenses = checkedItems.map((it) => ({
        id: uid('exp'),
        amount: it.estimatedPrice > 0 ? it.estimatedPrice : 0,
        note: `Belanja: ${it.name}`,
        categoryId: it.categoryId || 'makan',
        date: todayISO(),
      }));

      update((s) => ({
        ...s,
        expenses: [...newExpenses, ...s.expenses],
        shoppingList: (s.shoppingList ?? []).filter((it) => !it.checked),
      }));

      notify?.(isEn ? `Successfully logged ${checkedItems.length} shopping items to expenses!` : `Berhasil mencatat belanjaan ke pengeluaran! (${checkedItems.length} barang)`, {
        undo: () => {
          const newIds = new Set(newExpenses.map((e) => e.id));
          update((s) => ({
            ...s,
            expenses: s.expenses.filter((e) => !newIds.has(e.id)),
            shoppingList: [...(s.shoppingList ?? []), ...checkedItems],
          }));
          render();
        },
      });
      render();
    });
  }

  render();
}
