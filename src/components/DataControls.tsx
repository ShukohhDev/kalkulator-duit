import { useRef, useState, type ReactNode } from 'react'
import type { AppState, Notify } from '../types'
import { exportXlsx } from '../lib/xlsx'
import { sanitize } from '../lib/storage'
import type { CloudStatus } from '../hooks/useAppState'

interface Props {
  state: AppState
  saved: boolean
  onImport: (state: AppState) => void
  onReset: () => void
  notify: Notify
  cloudStatus?: CloudStatus
  lastSyncTime?: string | null
  onSyncNow?: () => Promise<boolean>
  onPullNow?: () => Promise<boolean>
}

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
} as const

const DownloadIcon = () => (
  <svg {...svgProps}>
    <path d="M12 3v10m0 0 4-4m-4 4-4-4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
)

const UploadIcon = () => (
  <svg {...svgProps}>
    <path d="M12 13V3m0 0 4 4m-4-4L8 7" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
)

const SheetIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 10v10M15 10v10" />
  </svg>
)

const TrashIcon = () => (
  <svg {...svgProps}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

const CloudIcon = () => (
  <svg {...svgProps}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
)

interface ActionProps {
  icon: ReactNode
  title: string
  desc: string
  danger?: boolean
  onClick: () => void
}

function DataAction({ icon, title, desc, danger, onClick }: ActionProps) {
  return (
    <button type="button" className={`data-action${danger ? ' data-action-danger' : ''}`} onClick={onClick}>
      <span className="data-action-icon">{icon}</span>
      <span className="data-action-text">
        <strong className="data-action-title">{title}</strong>
        <span className="data-action-desc">{desc}</span>
      </span>
    </button>
  )
}

export function DataControls({
  state,
  saved,
  onImport,
  onReset,
  notify,
  cloudStatus = 'idle',
  lastSyncTime,
  onSyncNow,
  onPullNow,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [syncBusy, setSyncBusy] = useState(false)

  const download = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportFile = () => {
    download(
      `kalkulator-duitmu-${new Date().toISOString().slice(0, 10)}.json`,
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    )
    notify('Cadangan tersimpan (.json).')
  }

  const exportExcel = async () => {
    try {
      await exportXlsx(state)
      notify('File Excel siap diunduh (.xlsx).')
    } catch {
      notify('Gagal membuat file Excel.', { error: true })
    }
  }

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = sanitize(JSON.parse(String(reader.result)))
        onImport(parsed)
        notify('Data dipulihkan dari cadangan.')
      } catch {
        notify('File tidak valid, pilih file cadangan .json.', { error: true })
      }
    }
    reader.readAsText(file)
  }

  const reset = () => {
    if (window.confirm('Hapus semua data (uang jajan, pengeluaran, target)? Tindakan ini tidak bisa dibatalkan.')) {
      onReset()
      notify('Semua data dihapus.')
    }
  }

  const handleManualSync = async () => {
    if (!onSyncNow || syncBusy) return
    setSyncBusy(true)
    const ok = await onSyncNow()
    setSyncBusy(false)
    if (ok) {
      notify('Data berhasil disinkronkan ke cloud!')
    } else {
      notify('Gagal menyinkronkan data ke cloud.', { error: true })
    }
  }

  const handleManualPull = async () => {
    if (!onPullNow || syncBusy) return
    if (!window.confirm('Muat data terbaru dari cloud? Data lokal yang belum terunggah akan digantikan.')) return
    setSyncBusy(true)
    const ok = await onPullNow()
    setSyncBusy(false)
    if (ok) {
      notify('Data terbaru berhasil dimuat dari cloud!')
    } else {
      notify('Gagal memuat data dari cloud.', { error: true })
    }
  }

  const formatLastSync = (iso: string | null | undefined) => {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return null
    }
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Data &amp; Cadangan</h2>
        <span className={`save-state${saved ? ' save-ok' : ''}`}>{saved ? 'Tersimpan otomatis' : 'Menyimpan…'}</span>
      </header>

      {cloudStatus !== 'disabled' && (
        <div className="cloud-sync-box">
          <div className="cloud-sync-header">
            <span className="cloud-sync-icon">
              <CloudIcon />
            </span>
            <div className="cloud-sync-details">
              <strong>Sinkronisasi Cloud Antar-Perangkat</strong>
              <p className="muted small">
                {cloudStatus === 'syncing' || syncBusy
                  ? 'Sedang menyinkronkan data ke server...'
                  : cloudStatus === 'synced'
                  ? `Data tersinkron otomatis${lastSyncTime ? ` · Terakhir pkl ${formatLastSync(lastSyncTime)}` : ''}`
                  : cloudStatus === 'error'
                  ? 'Gagal menyinkronkan (periksa koneksi)'
                  : 'Aktif otomatis setiap perubahan'}
              </p>
            </div>
            <span className={`cloud-pill-status cloud-pill-${cloudStatus}`}>
              {cloudStatus === 'synced' ? 'Tersinkron' : cloudStatus === 'syncing' ? 'Menyinkron' : 'Siap'}
            </span>
          </div>
          <div className="cloud-sync-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleManualSync}
              disabled={syncBusy || cloudStatus === 'syncing'}
            >
              {syncBusy ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleManualPull}
              disabled={syncBusy || cloudStatus === 'syncing'}
            >
              Unduh dari Cloud
            </button>
          </div>
        </div>
      )}

      <div className="data-list">
        <DataAction
          icon={<DownloadIcon />}
          title="Cadangkan"
          desc="Simpan salinan (.json)"
          onClick={exportFile}
        />
        <DataAction
          icon={<UploadIcon />}
          title="Pulihkan"
          desc="Buka file cadangan"
          onClick={() => fileRef.current?.click()}
        />
        <DataAction
          icon={<SheetIcon />}
          title="Excel"
          desc="Ekspor transaksi (.xlsx)"
          onClick={exportExcel}
        />
        <DataAction
          icon={<TrashIcon />}
          title="Hapus semua"
          desc="Permanen"
          danger
          onClick={reset}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) importFile(file)
          event.target.value = ''
        }}
      />
    </section>
  )
}
