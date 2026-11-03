/**
 * Wallets & Accounts Management (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import { loadPrefs, savePrefs } from '../lib/prefs.js';
import { onRateUpdate, refreshUsdRate } from '../lib/rates.js';
import { uid } from '../lib/id.js';
import { END_SAVINGS_WALLET_ID } from '../lib/state.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';

function formatUSD(value) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatRateAt(at, isEn) {
  const stamp = Date.parse(at);
  if (!Number.isFinite(stamp)) return '';
  return new Date(stamp).toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function renderDompetPanel(container, { state, getState, update, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : currentState;
  }

  let currency = loadPrefs().walletCurrency || 'idr';
  let rateInfo = { rate: loadPrefs().usdRate, at: loadPrefs().usdRateAt };

  onRateUpdate(() => {
    const prefs = loadPrefs();
    rateInfo = { rate: prefs.usdRate, at: prefs.usdRateAt };
    render();
  });

  function pickCurrency(next) {
    currency = next;
    savePrefs({ walletCurrency: next });
    if (next === 'usd') void refreshUsdRate();
    render();
  }

  function addWallet() {
    update((s) => {
      const next = {
        ...s,
        wallets: [
          ...s.wallets,
          {
            id: uid('wallet'),
            name: isEn ? `Wallet ${s.wallets.length + 1}` : `Dompet ${s.wallets.length + 1}`,
            balance: 0,
          },
        ],
      };
      currentState = next;
      return next;
    });
  }

  function editWallet(id, patch) {
    update((s) => {
      const isEnd = id === END_SAVINGS_WALLET_ID;
      const nextEndSavings = isEnd && patch.balance !== undefined ? Math.max(0, patch.balance) : s.endSavings;
      const nextWallets = s.wallets.map((wallet) =>
        wallet.id === id
          ? {
              ...wallet,
              ...patch,
              balance: patch.balance !== undefined ? Math.max(0, patch.balance) : wallet.balance,
            }
          : wallet
      );
      const next = {
        ...s,
        endSavings: nextEndSavings,
        wallets: nextWallets,
      };
      currentState = next;
      return next;
    });
  }

  function removeWallet(id) {
    if (id === END_SAVINGS_WALLET_ID) return;
    update((s) => {
      const next = {
        ...s,
        wallets: s.wallets.filter((wallet) => wallet.id !== id),
        endSavingsTargetWalletId:
          s.endSavingsTargetWalletId === id ? END_SAVINGS_WALLET_ID : s.endSavingsTargetWalletId,
      };
      currentState = next;
      return next;
    });
  }

  function render() {
    const s = getCurrentState() || {};
    const wallets = Array.isArray(s.wallets) ? s.wallets : [];
    const total = wallets.reduce((sum, wallet) => sum + (wallet ? wallet.balance : 0), 0);
    const inUsd = currency === 'usd' && rateInfo.rate > 0;

    const existingPanel = container.querySelector('.dompet-panel');
    const existingGoalList = existingPanel?.querySelector('.goal-list');

    if (existingPanel && existingGoalList) {
      // 1. Total & rate note
      const totalEl = existingPanel.querySelector('.wallet-total-value');
      if (totalEl) {
        totalEl.textContent = inUsd ? formatUSD(Math.round(total / rateInfo.rate)) : formatIDR(total);
      }
      let noteEl = existingPanel.querySelector('[data-testid="rate-note"]');
      if (inUsd) {
        if (!noteEl) {
          noteEl = document.createElement('span');
          noteEl.className = 'muted small wallet-rate';
          noteEl.setAttribute('data-testid', 'rate-note');
          existingPanel.querySelector('.wallet-total')?.appendChild(noteEl);
        }
        noteEl.textContent = `1 USD = Rp ${Math.round(rateInfo.rate).toLocaleString('id-ID')} · ${rateInfo.at ? translate('dompet.rateAuto', lang, { at: formatRateAt(rateInfo.at, isEn) }) : translate('dompet.rateOffline', lang)}`;
      } else if (noteEl) {
        noteEl.remove();
      }

      // 2. Currency toggle active classes
      existingPanel.querySelector('.btn-curr-idr')?.classList.toggle('nav-chip-on', currency === 'idr');
      existingPanel.querySelector('.btn-curr-usd')?.classList.toggle('nav-chip-on', currency === 'usd');

      // 3. Remove deleted rows
      existingGoalList.querySelectorAll('.ob-row').forEach((row) => {
        const rowId = row.getAttribute('data-id');
        if (!wallets.some((w) => w.id === rowId)) {
          row.remove();
        }
      });

      // 4. Update existing rows or append new ones
      wallets.forEach((wallet) => {
        const isEnd = wallet.id === END_SAVINGS_WALLET_ID;
        const isTarget = (s.endSavingsTargetWalletId ?? END_SAVINGS_WALLET_ID) === wallet.id;
        let row = existingGoalList.querySelector(`.ob-row[data-id="${wallet.id}"]`);

        if (row) {
          const balInp = row.querySelector('.wallet-bal-input');
          if (balInp && document.activeElement !== balInp) {
            balInp.value = wallet.balance > 0 ? wallet.balance.toLocaleString('id-ID') : '';
          }
          const nameInp = row.querySelector('.input-name');
          if (nameInp && document.activeElement !== nameInp) {
            nameInp.value = wallet.name;
          }
          const actionsEl = row.querySelector('.ob-actions');
          if (actionsEl) {
            actionsEl.innerHTML = isEnd
              ? `<span class="badge" style="font-size: 0.75rem; padding: 4px 8px;">
                  ${isTarget ? translate('dompet.autoBadge', lang) : translate('dompet.specialBadge', lang)}
                </span>`
              : `
                ${
                  isTarget
                    ? `<span class="badge badge-accent" style="font-size: 0.75rem; padding: 4px 8px; margin-right: 4px;">
                        ${translate('dompet.savingsTargetBadge', lang)}
                      </span>`
                    : ''
                }
                <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-w">
                  ${translate('dompet.deleteBtn', lang)}
                </button>
              `;
            actionsEl.querySelector('.btn-delete-w')?.addEventListener('click', () => {
              removeWallet(wallet.id);
            });
          }
        } else {
          // New wallet added: create DOM element and append
          const template = document.createElement('div');
          template.innerHTML = `
            <article class="ob-row" data-id="${escapeHtml(wallet.id)}">
              <input
                class="input input-name"
                aria-label="${isEn ? `Wallet name ${wallet.name}` : `Nama dompet ${wallet.name}`}"
                value="${escapeHtml(wallet.name)}"
                ${isEnd ? 'readonly' : ''}
              />
              <input
                type="text"
                inputmode="numeric"
                class="input input-money wallet-bal-input"
                id="w-bal-${escapeHtml(wallet.id)}"
                value="${wallet.balance > 0 ? wallet.balance.toLocaleString('id-ID') : ''}"
              />
              <div class="ob-actions">
                ${
                  isEnd
                    ? `<span class="badge" style="font-size: 0.75rem; padding: 4px 8px;">
                        ${isTarget ? translate('dompet.autoBadge', lang) : translate('dompet.specialBadge', lang)}
                      </span>`
                    : `
                      ${
                        isTarget
                          ? `<span class="badge badge-accent" style="font-size: 0.75rem; padding: 4px 8px; margin-right: 4px;">
                              ${translate('dompet.savingsTargetBadge', lang)}
                            </span>`
                          : ''
                      }
                      <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-w">
                        ${translate('dompet.deleteBtn', lang)}
                      </button>
                    `
                }
              </div>
            </article>
          `;
          const newRow = template.firstElementChild;
          existingGoalList.appendChild(newRow);

          const nameInp = newRow.querySelector('.input-name');
          nameInp?.addEventListener('input', (e) => {
            editWallet(wallet.id, { name: e.target.value });
          });
          const balInp = newRow.querySelector('.wallet-bal-input');
          if (balInp) {
            bindMoneyInput(balInp, (val) => {
              editWallet(wallet.id, { balance: val });
            });
          }
          newRow.querySelector('.btn-delete-w')?.addEventListener('click', () => {
            removeWallet(wallet.id);
          });
        }
      });

      return;
    }

    const walletsHtml = wallets.map((wallet) => {
      const isEnd = wallet.id === END_SAVINGS_WALLET_ID;
      const isTarget = (s.endSavingsTargetWalletId ?? END_SAVINGS_WALLET_ID) === wallet.id;

      return `
        <article class="ob-row" data-id="${escapeHtml(wallet.id)}">
          <input
            class="input input-name"
            aria-label="${isEn ? `Wallet name ${wallet.name}` : `Nama dompet ${wallet.name}`}"
            value="${escapeHtml(wallet.name)}"
            ${isEnd ? 'readonly' : ''}
            title="${isEnd ? (isEn ? 'Wallet automatically linked to End-of-period Savings' : 'Dompet otomatis terhubung ke Tabungan Akhir Periode') : ''}"
          />
          <input
            type="text"
            inputmode="numeric"
            class="input input-money wallet-bal-input"
            id="w-bal-${escapeHtml(wallet.id)}"
            value="${wallet.balance > 0 ? wallet.balance.toLocaleString('id-ID') : ''}"
          />
          <div class="ob-actions">
            ${
              isEnd
                ? `<span class="badge" style="font-size: 0.75rem; padding: 4px 8px;">
                    ${isTarget ? translate('dompet.autoBadge', lang) : translate('dompet.specialBadge', lang)}
                  </span>`
                : `
                  ${
                    isTarget
                      ? `<span class="badge badge-accent" style="font-size: 0.75rem; padding: 4px 8px; margin-right: 4px;">
                          ${translate('dompet.savingsTargetBadge', lang)}
                        </span>`
                      : ''
                  }
                  <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-w">
                    ${translate('dompet.deleteBtn', lang)}
                  </button>
                `
            }
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <section class="card dompet-panel">
        <header class="card-head">
          <h2>${translate('dompet.title', lang)}</h2>
          <div class="profile-chips">
            <button
              type="button"
              class="nav-chip btn-curr-idr${currency === 'idr' ? ' nav-chip-on' : ''}"
            >Rp</button>
            <button
              type="button"
              class="nav-chip btn-curr-usd${currency === 'usd' ? ' nav-chip-on' : ''}"
            >USD</button>
          </div>
        </header>

        <div class="wallet-total">
          <span class="muted small">${translate('dompet.totalAsset', lang)}</span>
          <strong class="wallet-total-value">${inUsd ? formatUSD(Math.round(total / rateInfo.rate)) : formatIDR(total)}</strong>
          ${
            inUsd
              ? `<span class="muted small wallet-rate" data-testid="rate-note">
                  1 USD = Rp ${Math.round(rateInfo.rate).toLocaleString('id-ID')} · ${rateInfo.at ? translate('dompet.rateAuto', lang, { at: formatRateAt(rateInfo.at, isEn) }) : translate('dompet.rateOffline', lang)}
                </span>`
              : ''
          }
        </div>

        <div class="goal-list">
          ${walletsHtml}
        </div>

        <button type="button" class="btn btn-ghost btn-add-w" style="margin-top: 10px;">
          ${translate('dompet.addBtn', lang)}
        </button>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.dompet-panel');
    if (!root) return;

    root.querySelector('.btn-curr-idr')?.addEventListener('click', () => pickCurrency('idr'));
    root.querySelector('.btn-curr-usd')?.addEventListener('click', () => pickCurrency('usd'));
    root.querySelector('.btn-add-w')?.addEventListener('click', addWallet);

    root.querySelectorAll('.ob-row').forEach((row) => {
      const id = row.getAttribute('data-id');
      if (!id) return;

      const nameInp = row.querySelector('.input-name');
      nameInp?.addEventListener('input', (e) => {
        editWallet(id, { name: e.target.value });
      });

      const balInp = row.querySelector('.wallet-bal-input');
      if (balInp) {
        bindMoneyInput(balInp, (val) => {
          editWallet(id, { balance: val });
        });
      }

      row.querySelector('.btn-delete-w')?.addEventListener('click', () => {
        removeWallet(id);
      });
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
