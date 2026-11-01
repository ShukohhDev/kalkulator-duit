/**
 * Dana Musiman / Seasonal Funds (Pure Vanilla JS)
 */
import { formatIDR, todayISO } from '../lib/money.js';
import { END_SAVINGS_WALLET_ID, SAVINGS_CATEGORY } from '../lib/state.js';
import { uid } from '../lib/id.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';

export function renderSeasonalPanel(container, { state, derived, getState, update, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : (currentState || state);
  }

  const deposits = container._seasonalDeposits || (container._seasonalDeposits = {});
  const sources = container._seasonalSources || (container._seasonalSources = {});

  const newDeposit = (seasonalId, name, amount) => ({
    id: uid('exp'),
    date: todayISO(),
    categoryId: SAVINGS_CATEGORY,
    note: (isEn ? `Deposit ${name ?? 'seasonal fund'}` : `Setoran ${name ?? 'dana musiman'}`).trim(),
    amount,
    seasonalId,
  });

  function addItem() {
    const s = getCurrentState();
    update((prev) => ({
      ...prev,
      seasonal: [
        ...prev.seasonal,
        {
          id: uid('season'),
          name: isEn ? `Fund ${s.seasonal.length + 1}` : `Dana ${s.seasonal.length + 1}`,
          target: 0,
          saved: 0,
        },
      ],
    }));
  }

  function patchItem(id, patch) {
    update((s) => ({
      ...s,
      seasonal: s.seasonal.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(id) {
    update((s) => ({ ...s, seasonal: s.seasonal.filter((item) => item.id !== id) }));
  }

  function setor(id) {
    const s = getCurrentState();
    const amount = deposits[id] ?? 0;
    if (amount <= 0) return;
    const item = s.seasonal.find((fund) => fund.id === id);
    const sourceKey = sources[id] ?? `wallet:${s.wallets[0]?.id ?? ''}`;

    if (sourceKey === 'pot') {
      if (amount > s.endSavings) {
        notify?.(
          isEn
            ? `Savings Pocket balance is insufficient (balance ${formatIDR(s.endSavings)}).`
            : `Saku Tabungan tidak cukup (saldo ${formatIDR(s.endSavings)}).`
        );
        return;
      }
      update((prev) => ({
        ...prev,
        endSavings: Math.max(0, prev.endSavings - amount),
        expenses: [newDeposit(id, item?.name, amount), ...prev.expenses],
      }));
      deposits[id] = 0;
      return;
    }

    const walletId = sourceKey.startsWith('wallet:') ? sourceKey.slice(7) : '';
    const wallet = s.wallets.find((entry) => entry.id === walletId);
    if (!wallet || amount > wallet.balance) {
      notify?.(
        isEn
          ? `${wallet?.name ?? 'Wallet'} balance is insufficient (balance ${formatIDR(wallet?.balance ?? 0)}).`
          : `${wallet?.name ?? 'Dompet'} tidak cukup (saldo ${formatIDR(wallet?.balance ?? 0)}).`
      );
      return;
    }

    update((prev) => ({
      ...prev,
      wallets: prev.wallets.map((entry) =>
        entry.id === walletId ? { ...entry, balance: Math.max(0, entry.balance - amount) } : entry
      ),
      expenses: [{ ...newDeposit(id, item?.name, amount), walletId }, ...prev.expenses],
    }));
    deposits[id] = 0;
  }

  function render() {
    const s = getCurrentState();
    const existingRoot = container.querySelector('.seasonal-panel');
    const existingGoals = container.querySelectorAll('.seasonal-panel .goal');

    if (existingRoot && existingGoals.length === s.seasonal.length) {
      let canUpdateInPlace = true;
      for (let i = 0; i < s.seasonal.length; i++) {
        if (existingGoals[i].dataset.id !== s.seasonal[i].id) {
          canUpdateInPlace = false;
          break;
        }
      }

      if (canUpdateInPlace) {
        s.seasonal.forEach((item) => {
          const goalEl = container.querySelector(`.goal[data-id="${item.id}"]`);
          if (!goalEl) return;
          const logged = derived.seasonalSavings[item.id] ?? 0;
          const effective = item.saved + logged;
          const percent = item.target > 0 ? Math.min(100, Math.round((effective / item.target) * 100)) : 0;
          const remaining = Math.max(0, item.target - effective);
          const daysLeft = item.dueDate && item.dueDate >= todayISO()
            ? Math.ceil((new Date(item.dueDate).getTime() - new Date(todayISO()).getTime()) / 86400000)
            : null;

          const bar = goalEl.querySelector('.progress-bar-fill');
          if (bar) bar.style.width = `${percent}%`;

          const meta = goalEl.querySelector('.seasonal-progress-meta');
          if (meta) {
            meta.innerHTML = `
              ${formatIDR(effective)} / ${formatIDR(item.target)} (${percent}%)
              ${
                item.target > 0
                  ? remaining > 0
                    ? isEn ? ` · ${formatIDR(remaining)} left` : ` · kurang ${formatIDR(remaining)} lagi`
                    : isEn ? ' · target reached!' : ' · asik, target udah tembus!'
                  : ''
              }
            `;
          }

          const loggedEl = goalEl.querySelector('.seasonal-progress-logged');
          if (loggedEl) {
            loggedEl.innerHTML = logged > 0
              ? isEn ? `= initial ${formatIDR(item.saved)} + recorded deposits ${formatIDR(logged)}` : `= saldo awal ${formatIDR(item.saved)} + setoran tercatat ${formatIDR(logged)}`
              : '';
          }

          const daysBadge = goalEl.querySelector('.chip-days-left');
          if (daysBadge) {
            daysBadge.textContent = daysLeft !== null ? (isEn ? `${daysLeft} days left` : `${daysLeft} hari lagi`) : '';
            daysBadge.style.display = daysLeft !== null ? '' : 'none';
          }
        });
        return;
      }
    }

    const itemsHtml = s.seasonal.map((item) => {
      const logged = derived.seasonalSavings[item.id] ?? 0;
      const effective = item.saved + logged;
      const percent = item.target > 0 ? Math.min(100, Math.round((effective / item.target) * 100)) : 0;
      const remaining = Math.max(0, item.target - effective);
      const daysLeft =
        item.dueDate && item.dueDate >= todayISO()
          ? Math.ceil((new Date(item.dueDate).getTime() - new Date(todayISO()).getTime()) / 86400000)
          : null;
      const sourceVal = sources[item.id] ?? `wallet:${s.wallets[0]?.id ?? ''}`;

      return `
        <article class="goal" data-id="${escapeHtml(item.id)}">
          <header class="goal-head">
            <input
              class="input input-name"
              value="${escapeHtml(item.name)}"
              aria-label="${isEn ? 'Seasonal fund name' : 'Nama dana musiman'}"
            />
            <div class="goal-head-actions">
              <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-seasonal">${isEn ? 'Delete' : 'Hapus'}</button>
            </div>
          </header>

          <div class="form-grid form-grid-2">
            <div class="field">
              <label>Target (Rp)</label>
              <input type="text" inputmode="numeric" class="input input-money input-season-target" value="${item.target > 0 ? item.target.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label>${isEn ? 'Initial balance (optional)' : 'Saldo awal (opsional)'}</label>
              <input type="text" inputmode="numeric" class="input input-money input-season-saved" value="${item.saved > 0 ? item.saved.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label for="season-due-${escapeHtml(item.id)}">${isEn ? 'Target date (optional)' : 'Tanggal tujuan (opsional)'}</label>
              <input
                id="season-due-${escapeHtml(item.id)}"
                class="input input-season-due"
                type="date"
                value="${escapeHtml(item.dueDate ?? '')}"
              />
            </div>
            <div class="field" style="display: flex; align-items: flex-end;">
              <span class="chip chip-days-left" style="${daysLeft !== null ? '' : 'display: none;'}">
                ${daysLeft !== null ? (isEn ? `${daysLeft} days left` : `${daysLeft} hari lagi`) : ''}
              </span>
            </div>
          </div>

          <div class="goal-progress">
            <div class="progress-bar-track" style="height: 8px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin: 8px 0;">
              <div class="progress-bar-fill" style="width: ${percent}%; height: 100%; background: var(--accent); border-radius: 999px;"></div>
            </div>
            <span class="muted small seasonal-progress-meta">
              ${formatIDR(effective)} / ${formatIDR(item.target)} (${percent}%)
              ${
                item.target > 0
                  ? remaining > 0
                    ? isEn ? ` · ${formatIDR(remaining)} left` : ` · kurang ${formatIDR(remaining)} lagi`
                    : isEn ? ' · target reached!' : ' · asik, target udah tembus!'
                  : ''
              }
            </span>
            <span class="muted small seasonal-progress-logged">
              ${
                logged > 0
                  ? isEn ? `= initial ${formatIDR(item.saved)} + recorded deposits ${formatIDR(logged)}` : `= saldo awal ${formatIDR(item.saved)} + setoran tercatat ${formatIDR(logged)}`
                  : ''
              }
            </span>
          </div>

          <div class="inline-form">
            <select
              class="input select-season-source"
              aria-label="${isEn ? 'Deposit source' : 'Sumber setoran'} ${escapeHtml(item.name)}"
              title="${isEn ? 'Select Deposit Source for' : 'Pilih Sumber Setoran'} ${escapeHtml(item.name)}"
            >
              <option value="pot"${sourceVal === 'pot' ? ' selected' : ''}>
                ${isEn ? 'Savings Pocket' : 'Saku Tabungan'} (${formatIDR(s.endSavings)})
              </option>
              ${s.wallets
                .filter((w) => w.id !== END_SAVINGS_WALLET_ID)
                .map((w) => `
                  <option value="wallet:${escapeHtml(w.id)}"${sourceVal === `wallet:${w.id}` ? ' selected' : ''}>
                    ${escapeHtml(w.name)} (${formatIDR(w.balance)})
                  </option>
                `).join('')}
            </select>
            <input
              type="text"
              inputmode="numeric"
              class="input input-money input-season-deposit"
              placeholder="${isEn ? 'Deposit amount' : 'Nominal setoran'}"
              value="${(deposits[item.id] ?? 0) > 0 ? deposits[item.id].toLocaleString('id-ID') : ''}"
            />
            <button
              type="button"
              class="btn btn-sm btn-setor-seasonal"
              ${(deposits[item.id] ?? 0) <= 0 ? 'disabled' : ''}
            >${isEn ? 'Deposit' : 'Setor'}</button>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <section class="card seasonal-panel">
        <header class="card-head">
          <h2>${translate('seasonal.title', lang)}</h2>
          <span class="muted small">${translate('seasonal.sub', lang)}</span>
        </header>

        <div class="goal-list">
          ${itemsHtml}
        </div>

        <button type="button" class="btn btn-ghost btn-add-seasonal">${isEn ? '+ Add seasonal fund' : '+ Tambah dana musiman'}</button>
        ${
          s.seasonal.length === 0
            ? `<p class="muted small">${translate('seasonal.empty', lang)}</p>`
            : ''
        }
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.seasonal-panel');
    if (!root) return;

    root.querySelector('.btn-add-seasonal')?.addEventListener('click', addItem);

    const s = getCurrentState();
    root.querySelectorAll('.goal').forEach((goalEl) => {
      const id = goalEl.dataset.id;
      const item = s.seasonal.find((fund) => fund.id === id);
      if (!item) return;

      goalEl.querySelector('.input-name')?.addEventListener('input', (e) => {
        patchItem(id, { name: e.target.value });
      });

      goalEl.querySelector('.btn-delete-seasonal')?.addEventListener('click', () => {
        removeItem(id);
      });

      const targetInput = goalEl.querySelector('.input-season-target');
      if (targetInput) {
        bindMoneyInput(targetInput, (val) => patchItem(id, { target: val }));
      }

      const savedInput = goalEl.querySelector('.input-season-saved');
      if (savedInput) {
        bindMoneyInput(savedInput, (val) => patchItem(id, { saved: val }));
      }

      const onDueChange = (e) => {
        patchItem(id, { dueDate: e.target.value === '' ? undefined : e.target.value });
      };
      const dueInput = goalEl.querySelector('.input-season-due');
      dueInput?.addEventListener('input', onDueChange);
      dueInput?.addEventListener('change', onDueChange);

      goalEl.querySelector('.select-season-source')?.addEventListener('change', (e) => {
        sources[id] = e.target.value;
      });

      const depInput = goalEl.querySelector('.input-season-deposit');
      const setorBtn = goalEl.querySelector('.btn-setor-seasonal');
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
