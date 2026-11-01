/**
 * Notification Center (Pure Vanilla JS)
 */
import { ICON_CLOSE } from './icons.js';
import { lockBodyScroll } from '../lib/scrollLock.js';
import { escapeHtml } from '../lib/dom.js';

export function renderNotificationCenter(container, { items = [], onClose, onMarkAllRead, onMarkRead, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let filter = 'all'; // 'all' | 'finance' | 'reports'
  const unlock = lockBodyScroll();

  function cleanup() {
    unlock();
    window.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
      onClose?.();
    }
  }
  window.addEventListener('keydown', onKeyDown);

  function formatDate(isoString) {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  function render() {
    const filteredItems = items.filter((item) => {
      if (filter === 'finance') return item.kind === 'finance';
      if (filter === 'reports') return item.kind === 'admin_reply' || item.kind === 'report_status';
      return true;
    });

    const unreadCount = items.filter((item) => !item.read).length;

    container.innerHTML = `
      <div class="notif-backdrop" aria-hidden="true"></div>
      <div
        class="notif-dropdown card"
        role="region"
        aria-label="${isEn ? 'Notification Center' : 'Pusat Notifikasi'}"
      >
        <div class="notif-mobile-handle"></div>

        <div class="notif-header">
          <div class="notif-title-group">
            <h3>${isEn ? 'Updates & Notifications' : 'Kabar & Notifikasi'}</h3>
            ${unreadCount > 0 ? `<span class="notif-count-badge">${unreadCount} ${isEn ? 'new' : 'baru'}</span>` : ''}
          </div>
          <div class="notif-actions">
            ${
              unreadCount > 0
                ? `<button type="button" class="btn btn-ghost btn-sm notif-btn-action notif-btn-mark-all">
                    ${isEn ? 'Mark all as read' : 'Tandai sudah dibaca'}
                  </button>`
                : ''
            }
            <button
              type="button"
              class="btn btn-ghost btn-sm notif-close"
              aria-label="${isEn ? 'Close notifications' : 'Tutup notifikasi'}"
            >
              ${ICON_CLOSE}
            </button>
          </div>
        </div>

        <div class="notif-tabs">
          <button
            type="button"
            class="notif-tab${filter === 'all' ? ' notif-tab-active' : ''}"
            data-filter="all"
          >
            ${isEn ? `All (${items.length})` : `Semua (${items.length})`}
          </button>
          <button
            type="button"
            class="notif-tab${filter === 'finance' ? ' notif-tab-active' : ''}"
            data-filter="finance"
          >
            ${isEn ? 'Finance' : 'Keuangan'}
          </button>
          <button
            type="button"
            class="notif-tab${filter === 'reports' ? ' notif-tab-active' : ''}"
            data-filter="reports"
          >
            ${isEn ? 'Reports & Feedback' : 'Laporan & Bantuan'}
          </button>
        </div>

        <div class="notif-list" role="feed">
          ${
            filteredItems.length === 0
              ? `<div class="notif-empty">
                  <p class="muted">${isEn ? 'No notifications yet.' : 'Belum ada notifikasi baru.'}</p>
                </div>`
              : filteredItems.map((item) => `
                  <article
                    class="notif-item${!item.read ? ' notif-unread' : ''}"
                    data-id="${item.id}"
                  >
                    <div class="notif-item-header">
                      <span class="notif-kind notif-kind-${item.kind}">
                        ${
                          item.kind === 'finance'
                            ? (isEn ? 'Finance Alert' : 'Peringatan Keuangan')
                            : item.kind === 'admin_reply'
                            ? (isEn ? 'Admin Reply' : 'Balasan Admin')
                            : (isEn ? 'Report Status' : 'Status Laporan')
                        }
                      </span>
                      <time class="notif-time" datetime="${item.created_at}">${formatDate(item.created_at)}</time>
                    </div>
                    <h4 class="notif-item-title">${escapeHtml(item.title)}</h4>
                    <p class="notif-item-message">${escapeHtml(item.message)}</p>
                    ${
                      !item.read
                        ? `<button
                            type="button"
                            class="btn btn-ghost btn-sm notif-read-btn"
                            data-id="${item.id}"
                          >
                            ${isEn ? 'Mark as read' : 'Tandai dibaca'}
                          </button>`
                        : ''
                    }
                  </article>
                `).join('')
          }
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('.notif-backdrop')?.addEventListener('click', () => {
      cleanup();
      onClose?.();
    });

    container.querySelector('.notif-close')?.addEventListener('click', () => {
      cleanup();
      onClose?.();
    });

    container.querySelectorAll('.notif-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        filter = tab.dataset.filter;
        render();
      });
    });

    container.querySelector('.notif-btn-mark-all')?.addEventListener('click', () => {
      onMarkAllRead?.();
    });

    container.querySelectorAll('.notif-read-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        onMarkRead?.(id);
      });
    });
  }

  render();
}

