/**
 * End of Period Savings Pot Card (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import { END_SAVINGS_WALLET_ID, syncEndSavingsWallet } from '../lib/state.js';
import { appendActivity } from '../lib/activity.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';

export function renderEndSavingsCard(container, { state, getState, update, notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : currentState;
  }

  let isTransferOpen = Boolean(container._tfOpen);
  let transferDestId = container._tfDest || '';
  let transferAmount = container._tfAmt || 0;

  function render() {
    const s = getCurrentState() || {};
    const currentTargetId = s.endSavingsTargetWalletId ?? END_SAVINGS_WALLET_ID;
    const wallets = Array.isArray(s.wallets) ? s.wallets : [];
    const userWallets = wallets.filter((w) => w && w.id !== END_SAVINGS_WALLET_ID);
    const targetWallet = wallets.find((w) => w && w.id === currentTargetId);

    let section = container.querySelector('.end-savings-card');
    if (!section) {
      section = document.createElement('section');
      section.className = 'card aset-card end-savings-card';
      section.setAttribute('aria-label', isEn ? 'End-of-period savings' : 'Tabungan akhir periode');
      container.innerHTML = '';
      container.appendChild(section);
    }

    section.innerHTML = `
      <header class="card-head">
        <h2>${translate('endsavings.title', lang)}</h2>
        <span
          class="badge badge-accent"
          style="font-size: 0.75rem; padding: 4px 8px;"
          title="Tujuan saat ini: ${targetWallet ? escapeHtml(targetWallet.name) : 'Dompet Khusus'}"
        >
          ${currentTargetId === END_SAVINGS_WALLET_ID ? translate('endsavings.specialBadge', lang) : escapeHtml(targetWallet?.name ?? translate('endsavings.selectedBadge', lang))}
        </span>
      </header>
      <p class="aset-total">${formatIDR(s.endSavings)}</p>

      ${
        update
          ? `<div class="end-savings-target-box" style="margin-top: 12px;">
              <label for="end-savings-target-select" class="label small" style="display: block; margin-bottom: 6px;">
                ${translate('endsavings.targetLabel', lang)}
              </label>
              <select
                id="end-savings-target-select"
                class="input"
                style="width: 100%;"
              >
                <option value="${END_SAVINGS_WALLET_ID}"${currentTargetId === END_SAVINGS_WALLET_ID ? ' selected' : ''}>
                  ${translate('endsavings.defaultOption', lang)}
                </option>
                ${userWallets.map((w) => `
                  <option value="${escapeHtml(w.id)}"${currentTargetId === w.id ? ' selected' : ''}>
                    ${escapeHtml(w.name)} (${formatIDR(w.balance)})
                  </option>
                `).join('')}
              </select>
            </div>`
          : ''
      }

      <p class="muted small" style="margin-top: 10px; line-height: 1.5;">
        ${
          currentTargetId === END_SAVINGS_WALLET_ID
            ? s.endSavings > 0
              ? translate('endsavings.filledSpecial', lang)
              : translate('endsavings.emptySpecial', lang)
            : translate('endsavings.targetAllocated', lang, { wallet: targetWallet?.name ?? 'dompet tujuan' })
        }
      </p>

      ${
        update && s.endSavings > 0 && userWallets.length > 0
          ? `<div class="end-savings-actions" style="margin-top: 14px;">
              ${
                !isTransferOpen
                  ? `<button
                      type="button"
                      class="btn btn-sm btn-ghost btn-transfer-savings"
                      style="width: 100%;"
                    >${translate('endsavings.btnOpenTransfer', lang)}</button>`
                  : `<div
                      class="transfer-form-card"
                      style="background: var(--surface-muted, rgba(0, 0, 0, 0.03)); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-top: 8px;"
                    >
                      <h4 style="margin: 0 0 10px 0; font-size: 0.9rem;">${translate('endsavings.transferTitle', lang)}</h4>
                      <div style="margin-bottom: 10px;">
                        <label for="tf-dest-wallet" class="label small" style="display: block; margin-bottom: 4px;">
                          ${translate('endsavings.chooseDest', lang)}
                        </label>
                        <select
                          id="tf-dest-wallet"
                          class="input input-sm"
                          style="width: 100%;"
                        >
                          ${userWallets.map((w) => `
                            <option value="${escapeHtml(w.id)}"${(transferDestId || userWallets[0]?.id) === w.id ? ' selected' : ''}>
                              ${escapeHtml(w.name)} (${formatIDR(w.balance)})
                            </option>
                          `).join('')}
                        </select>
                      </div>

                      <div style="margin-bottom: 12px;">
                        <label for="tf-end-savings-amt" class="label small" style="display: block; margin-bottom: 4px;">
                          ${translate('endsavings.amountLabel', lang)}
                        </label>
                        <div style="display: flex; gap: 6px; align-items: center;">
                          <div style="flex: 1;">
                            <input
                              id="tf-end-savings-amt"
                              class="input input-money"
                              type="text"
                              inputmode="numeric"
                              value="${transferAmount > 0 ? transferAmount.toLocaleString('id-ID') : ''}"
                            />
                          </div>
                          <button
                            type="button"
                            class="btn btn-sm btn-ghost btn-all-amt"
                            title="Pindahkan seluruh saldo"
                          >${translate('endsavings.allBtn', lang)}</button>
                        </div>
                      </div>

                      <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button
                          type="button"
                          class="btn btn-sm btn-ghost btn-cancel-transfer"
                        >${translate('endsavings.cancelBtn', lang)}</button>
                        <button
                          type="button"
                          class="btn btn-sm btn-primary btn-confirm-transfer"
                        >${translate('endsavings.confirmBtn', lang)}</button>
                      </div>
                    </div>`
              }
            </div>`
          : ''
      }
    `;

    bindEvents(section);
  }

  function bindEvents(root) {
    if (!root) return;
    const s = getCurrentState() || {};
    const wallets = Array.isArray(s.wallets) ? s.wallets : [];
    const userWallets = wallets.filter((w) => w && w.id !== END_SAVINGS_WALLET_ID);

    root.querySelector('#end-savings-target-select')?.addEventListener('change', (e) => {
      const nextTargetId = e.target.value;
      const cur = getCurrentState();
      const nextTargetWallet = cur.wallets.find((w) => w.id === nextTargetId);
      const targetName =
        nextTargetId === END_SAVINGS_WALLET_ID
          ? 'Dompet Khusus (Tabungan Akhir Periode)'
          : (nextTargetWallet?.name ?? 'dompet tujuan');

      const endWallet = cur.wallets.find((w) => w.id === END_SAVINGS_WALLET_ID);
      const currentEndBalance = endWallet ? endWallet.balance : 0;

      if (nextTargetId !== END_SAVINGS_WALLET_ID && currentEndBalance > 0 && nextTargetWallet) {
        const confirmMove = window.confirm(
          `Anda memilih ${targetName} sebagai tujuan Tabungan Akhir Periode.\n\nApakah Anda ingin memindahkan saldo saat ini (${formatIDR(currentEndBalance)}) ke ${targetName}?`
        );
        if (confirmMove) {
          update((prev) => {
            const nextWallets = prev.wallets.map((w) => {
              if (w.id === END_SAVINGS_WALLET_ID) return { ...w, balance: 0 };
              if (w.id === nextTargetId) return { ...w, balance: w.balance + currentEndBalance };
              return w;
            });
            const updatedState = appendActivity(
              prev,
              'pemasukan',
              `Memindahkan saldo Tabungan Akhir Periode ${formatIDR(currentEndBalance)} ke ${targetName}`
            );
            const next = {
              ...updatedState,
              endSavingsTargetWalletId: nextTargetId,
              wallets: nextWallets,
            };
            currentState = next;
            return next;
          });
          notify?.(`Tujuan diubah ke ${targetName} dan saldo ${formatIDR(currentEndBalance)} berhasil dipindahkan.`);
          render();
          return;
        }
      }

      update((prev) => {
        const next = {
          ...prev,
          endSavingsTargetWalletId: nextTargetId,
          wallets: syncEndSavingsWallet(prev.wallets, prev.endSavings, nextTargetId),
        };
        currentState = next;
        return next;
      });
      notify?.(`Tujuan Tabungan Akhir Periode disetel ke ${targetName}.`);
      render();
    });

    root.querySelector('.btn-transfer-savings')?.addEventListener('click', () => {
      isTransferOpen = true;
      container._tfOpen = true;
      const cur = getCurrentState();
      transferAmount = cur.endSavings;
      container._tfAmt = transferAmount;
      if (!transferDestId && userWallets.length > 0) {
        transferDestId = userWallets[0].id;
        container._tfDest = transferDestId;
      }
      render();
    });

    root.querySelector('#tf-dest-wallet')?.addEventListener('change', (e) => {
      transferDestId = e.target.value;
      container._tfDest = transferDestId;
    });

    const amtInput = root.querySelector('#tf-end-savings-amt');
    if (amtInput) {
      bindMoneyInput(amtInput, (val) => {
        transferAmount = val;
        container._tfAmt = val;
      });
    }

    root.querySelector('.btn-all-amt')?.addEventListener('click', () => {
      const cur = getCurrentState();
      transferAmount = cur.endSavings;
      container._tfAmt = transferAmount;
      render();
    });

    root.querySelector('.btn-cancel-transfer')?.addEventListener('click', () => {
      isTransferOpen = false;
      container._tfOpen = false;
      render();
    });

    root.querySelector('.btn-confirm-transfer')?.addEventListener('click', () => {
      const cur = getCurrentState();
      if (transferAmount <= 0) {
        notify?.('Masukkan nominal pemindahan di atas Rp 0.', { error: true });
        return;
      }
      if (transferAmount > cur.endSavings) {
        notify?.('Nominal pemindahan melebihi saldo Tabungan Akhir Periode.', { error: true });
        return;
      }
      const dest = userWallets.find((w) => w.id === (transferDestId || userWallets[0]?.id));
      if (!dest) {
        notify?.('Pilih dompet tujuan pemindahan terlebih dahulu.', { error: true });
        return;
      }

      update((prev) => {
        const nextEndSavings = Math.max(0, prev.endSavings - transferAmount);
        const nextWallets = prev.wallets.map((w) => {
          if (w.id === END_SAVINGS_WALLET_ID) {
            return { ...w, balance: Math.max(0, w.balance - transferAmount) };
          }
          if (w.id === dest.id) {
            return { ...w, balance: w.balance + transferAmount };
          }
          return w;
        });
        const updatedState = appendActivity(
          prev,
          'pemasukan',
          `Memindahkan saldo Tabungan Akhir Periode ${formatIDR(transferAmount)} ke ${dest.name}`
        );
        const next = {
          ...updatedState,
          endSavings: nextEndSavings,
          wallets: nextWallets,
        };
        currentState = next;
        return next;
      });
      notify?.(`Berhasil memindahkan ${formatIDR(transferAmount)} ke ${dest.name}.`);
      isTransferOpen = false;
      container._tfOpen = false;
      transferAmount = 0;
      container._tfAmt = 0;
      render();
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
