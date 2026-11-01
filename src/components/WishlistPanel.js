/**
 * Wishlist Incaran Impian (Pure Vanilla JS)
 */
import { formatIDR, todayISO } from '../lib/money.js';
import { SAVINGS_CATEGORY } from '../lib/state.js';
import { uid } from '../lib/id.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';

export function renderWishlistPanel(container, { state, derived, getState, update, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : (currentState || state);
  }

  const deposits = container._deposits || (container._deposits = {});

  function addItem() {
    update((s) => ({
      ...s,
      wishlist: [
        ...s.wishlist,
        {
          id: uid('wish'),
          name: isEn ? `Wishlist ${s.wishlist.length + 1}` : `Incaran ${s.wishlist.length + 1}`,
          price: 0,
          saved: 0,
        },
      ],
    }));
  }

  function patchItem(id, patch) {
    update((s) => ({
      ...s,
      wishlist: s.wishlist.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(id) {
    update((s) => ({ ...s, wishlist: s.wishlist.filter((item) => item.id !== id) }));
  }

  function setor(id) {
    const amount = deposits[id] ?? 0;
    if (amount <= 0) return;
    const s = getCurrentState();
    const item = s.wishlist.find((wish) => wish.id === id);
    update((prev) => ({
      ...prev,
      expenses: [
        {
          id: uid('exp'),
          date: todayISO(),
          categoryId: SAVINGS_CATEGORY,
          note: isEn ? `Deposit ${item?.name ?? 'wishlist'}`.trim() : `Setoran ${item?.name ?? 'incaran'}`.trim(),
          amount,
          wishlistId: id,
        },
        ...prev.expenses,
      ],
    }));
    deposits[id] = 0;
  }

  function render() {
    const s = getCurrentState();
    const existingRoot = container.querySelector('.wishlist-panel');
    const existingGoals = container.querySelectorAll('.wishlist-panel .goal');

    // In-place update if existing goals match current wishlist items
    if (existingRoot && existingGoals.length === s.wishlist.length) {
      let canUpdateInPlace = true;
      for (let i = 0; i < s.wishlist.length; i++) {
        if (existingGoals[i].dataset.id !== s.wishlist[i].id) {
          canUpdateInPlace = false;
          break;
        }
      }

      if (canUpdateInPlace) {
        s.wishlist.forEach((item) => {
          const goalEl = container.querySelector(`.goal[data-id="${item.id}"]`);
          if (!goalEl) return;
          const logged = derived.wishlistSavings[item.id] ?? 0;
          const effective = item.saved + logged;
          const percent = item.price > 0 ? Math.min(100, Math.round((effective / item.price) * 100)) : 0;
          const remaining = Math.max(0, item.price - effective);

          const bar = goalEl.querySelector('.progress-bar-fill');
          if (bar) bar.style.width = `${percent}%`;

          const meta = goalEl.querySelector('.goal-progress-meta');
          if (meta) {
            meta.innerHTML = `
              ${formatIDR(effective)} / ${formatIDR(item.price)} (${percent}%)
              ${
                item.price > 0
                  ? remaining > 0
                    ? isEn ? ` · ${formatIDR(remaining)} remaining` : ` · kurang ${formatIDR(remaining)} lagi`
                    : isEn ? ' · yay enough saved, ready to buy!' : ' · hore udah cukup, tinggal beli!'
                  : ''
              }
            `;
          }

          const loggedEl = goalEl.querySelector('.goal-progress-logged');
          if (loggedEl) {
            loggedEl.innerHTML = logged > 0
              ? isEn ? `= initial balance ${formatIDR(item.saved)} + recorded deposits ${formatIDR(logged)}` : `= saldo awal ${formatIDR(item.saved)} + setoran tercatat ${formatIDR(logged)}`
              : '';
          }
        });
        return;
      }
    }

    const itemsHtml = s.wishlist.map((item) => {
      const logged = derived.wishlistSavings[item.id] ?? 0;
      const effective = item.saved + logged;
      const percent = item.price > 0 ? Math.min(100, Math.round((effective / item.price) * 100)) : 0;
      const remaining = Math.max(0, item.price - effective);

      return `
        <article class="goal" data-id="${escapeHtml(item.id)}">
          <header class="goal-head">
            <input
              class="input input-name"
              value="${escapeHtml(item.name)}"
              aria-label="${isEn ? 'Wishlist item name' : 'Nama incaran'}"
            />
            <div class="goal-head-actions">
              <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-wish">
                ${translate('wishlist.deleteBtn', lang)}
              </button>
            </div>
          </header>

          <div class="form-grid form-grid-2">
            <div class="field">
              <label>${isEn ? 'Item price (Rp)' : 'Harga barang (Rp)'}</label>
              <input type="text" inputmode="numeric" class="input input-money input-wish-price" value="${item.price > 0 ? item.price.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label>${isEn ? 'Initial balance (optional)' : 'Saldo awal (opsional)'}</label>
              <input type="text" inputmode="numeric" class="input input-money input-wish-saved" value="${item.saved > 0 ? item.saved.toLocaleString('id-ID') : ''}" />
            </div>
          </div>

          <div class="goal-progress">
            <div class="progress-bar-track" style="height: 8px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin: 8px 0;">
              <div class="progress-bar-fill" style="width: ${percent}%; height: 100%; background: var(--accent); border-radius: 999px;"></div>
            </div>
            <span class="muted small goal-progress-meta">
              ${formatIDR(effective)} / ${formatIDR(item.price)} (${percent}%)
              ${
                item.price > 0
                  ? remaining > 0
                    ? isEn ? ` · ${formatIDR(remaining)} remaining` : ` · kurang ${formatIDR(remaining)} lagi`
                    : isEn ? ' · yay enough saved, ready to buy!' : ' · hore udah cukup, tinggal beli!'
                  : ''
              }
            </span>
            <span class="muted small goal-progress-logged">
              ${
                logged > 0
                  ? isEn ? `= initial balance ${formatIDR(item.saved)} + recorded deposits ${formatIDR(logged)}` : `= saldo awal ${formatIDR(item.saved)} + setoran tercatat ${formatIDR(logged)}`
                  : ''
              }
            </span>
          </div>

          <div class="inline-form">
            <input
              type="text"
              inputmode="numeric"
              class="input input-money input-wish-deposit"
              placeholder="${isEn ? 'How much to deposit?' : 'Mau setor berapa?'}"
              value="${(deposits[item.id] ?? 0) > 0 ? deposits[item.id].toLocaleString('id-ID') : ''}"
            />
            <button type="button" class="btn btn-sm btn-setor" ${(deposits[item.id] ?? 0) <= 0 ? 'disabled' : ''}>${translate('wishlist.depositBtn', lang)}</button>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <section class="card wishlist-panel">
        <header class="card-head">
          <h2>${translate('wishlist.title', lang)}</h2>
          <span class="muted small">${translate('wishlist.sub', lang)}</span>
        </header>

        <div class="goal-list">
          ${itemsHtml}
        </div>

        <button type="button" class="btn btn-ghost btn-add-wish">
          ${translate('wishlist.addBtn', lang)}
        </button>
        ${
          s.wishlist.length === 0
            ? `<p class="muted small">${translate('wishlist.empty', lang)}</p>`
            : ''
        }
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.wishlist-panel');
    if (!root) return;

    root.querySelector('.btn-add-wish')?.addEventListener('click', addItem);

    const s = getCurrentState();
    root.querySelectorAll('.goal').forEach((goalEl) => {
      const id = goalEl.dataset.id;
      const item = s.wishlist.find((w) => w.id === id);
      if (!item) return;

      goalEl.querySelector('.input-name')?.addEventListener('input', (e) => {
        patchItem(id, { name: e.target.value });
      });

      goalEl.querySelector('.btn-delete-wish')?.addEventListener('click', () => {
        removeItem(id);
      });

      const priceInput = goalEl.querySelector('.input-wish-price');
      if (priceInput) {
        bindMoneyInput(priceInput, (val) => patchItem(id, { price: val }));
      }

      const savedInput = goalEl.querySelector('.input-wish-saved');
      if (savedInput) {
        bindMoneyInput(savedInput, (val) => patchItem(id, { saved: val }));
      }

      const depInput = goalEl.querySelector('.input-wish-deposit');
      const setorBtn = goalEl.querySelector('.btn-setor');
      if (depInput) {
        bindMoneyInput(depInput, (val) => {
          deposits[id] = val;
          if (setorBtn) setorBtn.disabled = val <= 0;
        });
      }

      setorBtn?.addEventListener('click', () => {
        setor(id);
      });
    });
  }

  render();
}
