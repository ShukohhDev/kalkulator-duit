import { useRef, useState } from 'react';
import { exportXlsx } from '../lib/xlsx';
import { sanitize } from '../lib/storage';
import { useI18n } from '../lib/i18n';
const svgProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
};
const DownloadIcon = () => (<svg {...svgProps}>
    <path d="M12 3v10m0 0 4-4m-4 4-4-4"/>
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
  </svg>);
const UploadIcon = () => (<svg {...svgProps}>
    <path d="M12 13V3m0 0 4 4m-4-4L8 7"/>
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
  </svg>);
const SheetIcon = () => (<svg {...svgProps}>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <path d="M3 10h18M9 10v10M15 10v10"/>
  </svg>);
const TrashIcon = () => (<svg {...svgProps}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>);
const CloudIcon = () => (<svg {...svgProps}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
  </svg>);
function DataAction({ icon, title, desc, danger, onClick }) {
    return (<button type="button" className={`data-action${danger ? ' data-action-danger' : ''}`} onClick={onClick}>
      <span className="data-action-icon">{icon}</span>
      <span className="data-action-text">
        <strong className="data-action-title">{title}</strong>
        <span className="data-action-desc">{desc}</span>
      </span>
    </button>);
}
export function DataControls({ state, saved, onImport, onReset, notify, cloudStatus = 'idle', lastSyncTime, onSyncNow, onPullNow, }) {
    const { language } = useI18n();
    const fileRef = useRef(null);
    const [syncBusy, setSyncBusy] = useState(false);
    const download = (filename, blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };
    const exportFile = () => {
        download(`kalkulator-duitmu-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
        notify(language === 'en' ? 'Backup saved (.json).' : 'Cadangan tersimpan (.json).');
    };
    const exportExcel = async () => {
        try {
            await exportXlsx(state);
            notify(language === 'en' ? 'Excel file ready to download (.xlsx).' : 'File Excel siap diunduh (.xlsx).');
        }
        catch {
            notify(language === 'en' ? 'Failed to generate Excel file.' : 'Gagal membuat file Excel.', { error: true });
        }
    };
    const importFile = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = sanitize(JSON.parse(String(reader.result)));
                onImport(parsed);
                notify(language === 'en' ? 'Data restored from backup.' : 'Data dipulihkan dari cadangan.');
            }
            catch {
                notify(language === 'en'
                    ? 'Invalid file, please choose a .json backup file.'
                    : 'File tidak valid, pilih file cadangan .json.', { error: true });
            }
        };
        reader.readAsText(file);
    };
    const reset = () => {
        const confirmMessage = language === 'en'
            ? 'Are you sure you want to delete all data (allowance, expenses, savings goals)? This action cannot be undone.'
            : 'Yakin mau hapus semua data (uang jajan, catatan belanja, target nabung)? Tindakan ini gak bisa dibatalkan ya.';
        if (window.confirm(confirmMessage)) {
            onReset();
            notify(language === 'en' ? 'All data successfully cleared.' : 'Semua data berhasil dibersihkan.');
        }
    };
    const handleManualSync = async () => {
        if (!onSyncNow || syncBusy)
            return;
        setSyncBusy(true);
        const ok = await onSyncNow();
        setSyncBusy(false);
        if (ok) {
            notify(language === 'en' ? 'Data synced to cloud successfully!' : 'Data berhasil disinkronkan ke cloud!');
        }
        else {
            notify(language === 'en' ? 'Failed to sync data to cloud.' : 'Gagal menyinkronkan data ke cloud.', { error: true });
        }
    };
    const handleManualPull = async () => {
        if (!onPullNow || syncBusy)
            return;
        const confirmMessage = language === 'en'
            ? 'Load latest data from cloud? Unsynced local records will be overwritten.'
            : 'Muat data terbaru dari cloud? Catatan lokal yang belum tersinkron bakal ditimpa data cloud ya.';
        if (!window.confirm(confirmMessage))
            return;
        setSyncBusy(true);
        const ok = await onPullNow();
        setSyncBusy(false);
        if (ok) {
            notify(language === 'en' ? 'Latest data loaded from cloud!' : 'Data terbaru berhasil dimuat dari cloud!');
        }
        else {
            notify(language === 'en' ? 'Failed to load data from cloud.' : 'Gagal memuat data dari cloud.', { error: true });
        }
    };
    const formatLastSync = (iso) => {
        if (!iso)
            return null;
        try {
            return new Date(iso).toLocaleTimeString(language === 'en' ? 'en-US' : 'id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        }
        catch {
            return null;
        }
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{language === 'en' ? 'Data & Backup' : 'Data & Cadangan'}</h2>
        <span className={`save-state${saved ? ' save-ok' : ''}`}>
          {saved
            ? (language === 'en' ? 'Saved automatically' : 'Tersimpan otomatis')
            : (language === 'en' ? 'Saving…' : 'Menyimpan…')}
        </span>
      </header>

      {cloudStatus !== 'disabled' && (<div className="cloud-sync-box">
          <div className="cloud-sync-header">
            <span className="cloud-sync-icon">
              <CloudIcon />
            </span>
            <div className="cloud-sync-details">
              <strong>{language === 'en' ? 'Cross-Device Cloud Sync' : 'Sinkronisasi Cloud Antar-Perangkat'}</strong>
              <p className="muted small">
                {cloudStatus === 'syncing' || syncBusy
                ? (language === 'en' ? 'Syncing data to server...' : 'Sedang menyinkronkan data ke server...')
                : cloudStatus === 'synced'
                    ? language === 'en'
                        ? `Data synced automatically${lastSyncTime ? ` · Last synced at ${formatLastSync(lastSyncTime)}` : ''}`
                        : `Data tersinkron otomatis${lastSyncTime ? ` · Terakhir pkl ${formatLastSync(lastSyncTime)}` : ''}`
                    : cloudStatus === 'error'
                        ? (language === 'en' ? 'Sync failed (check connection)' : 'Gagal menyinkronkan (periksa koneksi)')
                        : (language === 'en' ? 'Active automatically on each change' : 'Aktif otomatis setiap perubahan')}
              </p>
            </div>
            <span className={`cloud-pill-status cloud-pill-${cloudStatus}`}>
              {cloudStatus === 'synced'
                ? (language === 'en' ? 'Synced' : 'Tersinkron')
                : cloudStatus === 'syncing'
                    ? (language === 'en' ? 'Syncing' : 'Menyinkron')
                    : (language === 'en' ? 'Ready' : 'Siap')}
            </span>
          </div>
          <div className="cloud-sync-actions">
            <button type="button" className="btn btn-sm" onClick={handleManualSync} disabled={syncBusy || cloudStatus === 'syncing'}>
              {syncBusy
                ? (language === 'en' ? 'Syncing...' : 'Menyinkronkan...')
                : (language === 'en' ? 'Sync Now' : 'Sinkronkan Sekarang')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleManualPull} disabled={syncBusy || cloudStatus === 'syncing'}>
              {language === 'en' ? 'Pull from Cloud' : 'Unduh dari Cloud'}
            </button>
          </div>
        </div>)}

      <div className="data-list">
        <DataAction icon={<DownloadIcon />} title={language === 'en' ? 'Backup' : 'Cadangkan'} desc={language === 'en' ? 'Save copy (.json)' : 'Simpan salinan (.json)'} onClick={exportFile}/>
        <DataAction icon={<UploadIcon />} title={language === 'en' ? 'Restore' : 'Pulihkan'} desc={language === 'en' ? 'Open backup file' : 'Buka file cadangan'} onClick={() => fileRef.current?.click()}/>
        <DataAction icon={<SheetIcon />} title="Excel" desc={language === 'en' ? 'Export transactions (.xlsx)' : 'Ekspor transaksi (.xlsx)'} onClick={exportExcel}/>
        <DataAction icon={<TrashIcon />} title={language === 'en' ? 'Delete all' : 'Hapus semua'} desc={language === 'en' ? 'Permanent' : 'Permanen'} danger onClick={reset}/>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => {
            const file = event.target.files?.[0];
            if (file)
                importFile(file);
            event.target.value = '';
        }}/>
    </section>);
}
