/**
 * Total Assets Summary Card (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import { loadPrefs, savePrefs } from '../lib/prefs.js';
import { translate } from '../lib/i18n.js';
import { EYE_OFF, EYE_OPEN } from './icons.js';

export function renderTotalAsetCard(container, { state, lang = 'id' }) {
  if (!container) return;

  let visible = loadPrefs().asetVisible ?? true;

  function render() {
    const total = state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const titleText = translate('aset.title', lang);
    const emptyText = translate('aset.empty', lang);
    const walletsText = translate('aset.walletsPrefix', lang, { count: state.wallets.length });
    const hideText = translate('aset.hide', lang);
    const showText = translate('aset.show', lang);

    container.innerHTML = `
      <section class="card aset-card" aria-label="${titleText}">
        <header class="card-head">
          <div>
            <h2>${titleText}</h2>
            <p class="aset-total">${visible ? formatIDR(total) : 'Rp ••••••'}</p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm aset-eye"
            aria-label="${visible ? hideText : showText}"
            title="${visible ? hideText : showText}"
          >
            ${visible ? EYE_OPEN : EYE_OFF}
          </button>
        </header>
        <p class="muted small" style="margin: 0;">
          ${total > 0 ? walletsText : emptyText}
        </p>
      </section>
    `;

    container.querySelector('.aset-eye')?.addEventListener('click', () => {
      visible = !visible;
      savePrefs({ asetVisible: visible });
      render();
    });
  }

  render();
}
