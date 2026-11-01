/**
 * Data Management & Backup Controls (Pure Vanilla JS)
 */
import { exportXlsx } from '../lib/xlsx.js';
import { sanitize } from '../lib/storage.js';

const DOWNLOAD_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3v10m0 0 4-4m-4 4-4-4"></path>
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>
  </svg>
`;

const UPLOAD_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 13V3m0 0 4 4m-4-4L8 7"></path>
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>
  </svg>
`;

const SHEET_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
    <path d="M3 10h18M9 10v10M15 10v10"></path>
  </svg>
`;

const TRASH_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"></path>
    <path d="M10 11v6M14 11v6"></path>
  </svg>
`;

const CLOUD_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
  </svg>
`;

export function renderDataControls(container, {
  state,
  saved,
  onImport,
  onReset,
  notify,
  cloudStatus = 'idle',
  lastSyncTime,
  onSyncNow,
  onPullNow,
  lang = 'id',
}) {
  if (!container) return;
  const isEn = lang === 'en';

  let syncBusy = false;

  function download(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportFile() {
    download(
      `kalkulator-duitmu-${new Date().toISOString().slice(0, 10)}.json`,
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    );
    notify?.(isEn ? 'Backup saved (.json).' : 'Cadangan tersimpan (.json).');
  }

  async function exportExcel() {
    try {
      await exportXlsx(state);
      notify?.(isEn ? 'Excel file ready to download (.xlsx).' : 'File Excel siap diunduh (.xlsx).');
    } catch {
      notify?.(isEn ? 'Failed to generate Excel file.' : 'Gagal membuat file Excel.', { error: true });
    }
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = sanitize(JSON.parse(String(reader.result)));
        onImport?.(parsed);
        notify?.(isEn ? 'Data restored from backup.' : 'Data dipulihkan dari cadangan.');
      } catch {
        notify?.(
          isEn ? 'Invalid file, please choose a .json backup file.' : 'File tidak valid, pilih file cadangan .json.',
          { error: true }
        );
      }
    };
    reader.readAsText(file);
  }

  function reset() {
    const confirmMessage = isEn
      ? 'Are you sure you want to delete all data (allowance, expenses, savings goals)? This action cannot be undone.'
      : 'Yakin mau hapus semua data (uang jajan, catatan belanja, target nabung)? Tindakan ini gak bisa dibatalkan ya.';
    if (window.confirm(confirmMessage)) {
      onReset?.();
      notify?.(isEn ? 'All data successfully cleared.' : 'Semua data berhasil dibersihkan.');
    }
  }

  async function handleManualSync() {
    if (!onSyncNow || syncBusy) return;
    syncBusy = true;
    render();
    const ok = await onSyncNow();
    syncBusy = false;
    render();
    if (ok) {
      notify?.(isEn ? 'Data synced to cloud successfully!' : 'Data berhasil disinkronkan ke cloud!');
    } else {
      notify?.(isEn ? 'Failed to sync data to cloud.' : 'Gagal menyinkronkan data ke cloud.', { error: true });
    }
  }

  async function handleManualPull() {
    if (!onPullNow || syncBusy) return;
    const confirmMessage = isEn
      ? 'Load latest data from cloud? Unsynced local records will be overwritten.'
      : 'Muat data terbaru dari cloud? Catatan lokal yang belum tersinkron bakal ditimpa data cloud ya.';
    if (!window.confirm(confirmMessage)) return;
    syncBusy = true;
    render();
    const ok = await onPullNow();
    syncBusy = false;
    render();
    if (ok) {
      notify?.(isEn ? 'Latest data loaded from cloud!' : 'Data terbaru berhasil dimuat dari cloud!');
    } else {
      notify?.(isEn ? 'Failed to load data from cloud.' : 'Gagal memuat data dari cloud.', { error: true });
    }
  }

  function formatLastSync(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString(isEn ? 'en-US' : 'id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return null;
    }
  }

  function render() {
    container.innerHTML = `
      <section class="card data-controls-panel">
        <header class="card-head">
          <h2>${isEn ? 'Data & Backup' : 'Data & Cadangan'}</h2>
          <span class="save-state${saved ? ' save-ok' : ''}">
            ${saved ? (isEn ? 'Saved automatically' : 'Tersimpan otomatis') : (isEn ? 'Saving…' : 'Menyimpan…')}
          </span>
        </header>

        ${
          cloudStatus !== 'disabled'
            ? `<div class="cloud-sync-box">
                <div class="cloud-sync-header">
                  <span class="cloud-sync-icon">
                    ${CLOUD_ICON}
                  </span>
                  <div class="cloud-sync-details">
                    <strong>${isEn ? 'Cross-Device Cloud Sync' : 'Sinkronisasi Cloud Antar-Perangkat'}</strong>
                    <p class="muted small">
                      ${
                        cloudStatus === 'syncing' || syncBusy
                          ? (isEn ? 'Syncing data to server...' : 'Sedang menyinkronkan data ke server...')
                          : cloudStatus === 'synced'
                          ? isEn
                            ? `Data synced automatically${lastSyncTime ? ` · Last synced at ${formatLastSync(lastSyncTime)}` : ''}`
                            : `Data tersinkron otomatis${lastSyncTime ? ` · Terakhir pkl ${formatLastSync(lastSyncTime)}` : ''}`
                          : cloudStatus === 'error'
                          ? (isEn ? 'Sync failed (check connection)' : 'Gagal menyinkronkan (periksa koneksi)')
                          : (isEn ? 'Active automatically on each change' : 'Aktif otomatis setiap perubahan')
                      }
                    </p>
                  </div>
                  <span class="cloud-pill-status cloud-pill-${cloudStatus}">
                    ${
                      cloudStatus === 'synced'
                        ? (isEn ? 'Synced' : 'Tersinkron')
                        : cloudStatus === 'syncing'
                        ? (isEn ? 'Syncing' : 'Menyinkron')
                        : (isEn ? 'Ready' : 'Siap')
                    }
                  </span>
                </div>
                <div class="cloud-sync-actions">
                  <button
                    type="button"
                    class="btn btn-sm btn-manual-sync"
                    ${syncBusy || cloudStatus === 'syncing' ? 'disabled' : ''}
                  >
                    ${syncBusy ? (isEn ? 'Syncing...' : 'Menyinkronkan...') : (isEn ? 'Sync Now' : 'Sinkronkan Sekarang')}
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-manual-pull"
                    ${syncBusy || cloudStatus === 'syncing' ? 'disabled' : ''}
                  >
                    ${isEn ? 'Pull from Cloud' : 'Unduh dari Cloud'}
                  </button>
                </div>
              </div>`
            : ''
        }

        <div class="data-list">
          <button type="button" class="data-action btn-export-json">
            <span class="data-action-icon">${DOWNLOAD_ICON}</span>
            <span class="data-action-text">
              <strong class="data-action-title">${isEn ? 'Backup' : 'Cadangkan'}</strong>
              <span class="data-action-desc">${isEn ? 'Save copy (.json)' : 'Simpan salinan (.json)'}</span>
            </span>
          </button>
          <button type="button" class="data-action btn-import-json">
            <span class="data-action-icon">${UPLOAD_ICON}</span>
            <span class="data-action-text">
              <strong class="data-action-title">${isEn ? 'Restore' : 'Pulihkan'}</strong>
              <span class="data-action-desc">${isEn ? 'Open backup file' : 'Buka file cadangan'}</span>
            </span>
          </button>
          <button type="button" class="data-action btn-export-excel">
            <span class="data-action-icon">${SHEET_ICON}</span>
            <span class="data-action-text">
              <strong class="data-action-title">Excel</strong>
              <span class="data-action-desc">${isEn ? 'Export transactions (.xlsx)' : 'Ekspor transaksi (.xlsx)'}</span>
            </span>
          </button>
          <button type="button" class="data-action data-action-danger btn-reset-data">
            <span class="data-action-icon">${TRASH_ICON}</span>
            <span class="data-action-text">
              <strong class="data-action-title">${isEn ? 'Delete all' : 'Hapus semua'}</strong>
              <span class="data-action-desc">${isEn ? 'Permanent' : 'Permanen'}</span>
            </span>
          </button>
        </div>

        <input
          class="file-input-backup"
          type="file"
          accept="application/json,.json"
          hidden
        />
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.data-controls-panel');
    if (!root) return;

    root.querySelector('.btn-manual-sync')?.addEventListener('click', handleManualSync);
    root.querySelector('.btn-manual-pull')?.addEventListener('click', handleManualPull);
    root.querySelector('.btn-export-json')?.addEventListener('click', exportFile);

    const fileInput = root.querySelector('.file-input-backup');
    root.querySelector('.btn-import-json')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) importFile(file);
      e.target.value = '';
    });

    root.querySelector('.btn-export-excel')?.addEventListener('click', exportExcel);
    root.querySelector('.btn-reset-data')?.addEventListener('click', reset);
  }

  render();
}

