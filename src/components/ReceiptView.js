/**
 * Receipt View Modal (Pure Vanilla JS)
 */
import { getReceipt } from '../lib/receipts.js';
import { lockBodyScroll } from '../lib/scrollLock.js';

export function renderReceiptView(container, { id, lang = 'id' }) {
  if (!container || !id) return;
  const isEn = lang === 'en';

  let url = null;
  let missing = false;
  let unlockScroll = null;

  function cleanup() {
    if (url) {
      URL.revokeObjectURL(url);
      url = null;
    }
    if (unlockScroll) {
      unlockScroll();
      unlockScroll = null;
    }
  }

  function render() {
    if (missing) {
      container.innerHTML = `<span class="muted small">${isEn ? 'Receipt missing' : 'Bukti hilang'}</span>`;
      return;
    }

    container.innerHTML = `
      <button type="button" class="btn btn-ghost btn-sm btn-view-receipt">${isEn ? 'Receipt' : 'Bukti'}</button>
      ${
        url
          ? `<div class="overlay receipt-overlay" role="dialog" aria-modal="true">
              <img
                class="receipt-img"
                src="${url}"
                alt="${isEn ? 'Transaction receipt' : 'Bukti transaksi'}"
              />
              <button type="button" class="btn receipt-close">
                ${isEn ? 'Close' : 'Tutup'}
              </button>
            </div>`
          : ''
      }
    `;

    container.querySelector('.btn-view-receipt')?.addEventListener('click', async () => {
      const blob = await getReceipt(id);
      if (!blob) {
        missing = true;
        render();
        return;
      }
      cleanup();
      url = URL.createObjectURL(blob);
      unlockScroll = lockBodyScroll();
      render();
    });

    const overlay = container.querySelector('.receipt-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target.classList.contains('receipt-img')) return;
      cleanup();
      render();
    });

    container.querySelector('.receipt-close')?.addEventListener('click', () => {
      cleanup();
      render();
    });
  }

  render();
}

