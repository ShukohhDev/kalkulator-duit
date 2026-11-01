/**
 * Activity Log Panel Component (Pure Vanilla JS)
 */
import { escapeHtml } from '../lib/dom.js';

function formatTime(ts, lang) {
  if (!Number.isFinite(ts) || ts <= 0) return '-';
  return new Date(ts).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getKindLabel(kind, lang) {
  if (lang === 'en') {
    switch (kind) {
      case 'pemasukan': return 'Income';
      case 'pengeluaran': return 'Expense';
      case 'login': return 'Sign In';
      case 'logout': return 'Sign Out';
    }
  }
  switch (kind) {
    case 'pemasukan': return 'Pemasukan';
    case 'pengeluaran': return 'Pengeluaran';
    case 'login': return 'Masuk';
    case 'logout': return 'Keluar';
  }
}

export function renderActivityPanel(container, { state, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';
  const items = state.activity || [];

  const listHtml = items.map((item) => `
    <li class="activity-item">
      <span class="activity-kind activity-${escapeHtml(item.kind)}">${escapeHtml(getKindLabel(item.kind, lang))}</span>
      <span class="activity-text">${escapeHtml(item.text)}</span>
      <span class="activity-time muted small">${escapeHtml(formatTime(item.ts, lang))}</span>
    </li>
  `).join('');

  container.innerHTML = `
    <section class="card activity-panel">
      <header class="card-head">
        <h2>${isEn ? 'Activity Log' : 'Catatan Aktivitas'}</h2>
        <span class="muted small">
          ${items.length} ${isEn ? (items.length === 1 ? 'entry' : 'entries') : 'entri'}
        </span>
      </header>
      ${
        items.length === 0
          ? `<p class="empty">
              ${isEn ? 'No activity history yet. Income, expenses, and login activities will appear here.' : 'Belum ada riwayat aktivitas nih. Transaksi masuk, keluar, dan login kamu bakal nongol di sini.'}
            </p>`
          : `<ul class="activity-list">
              ${listHtml}
            </ul>`
      }
    </section>
  `;
}

