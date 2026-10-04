import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppState } from '../types'
import { buildCsv } from '../lib/csv'
import { sanitize } from '../lib/storage'

interface Props {
  state: AppState
  saved: boolean
  onImport: (state: AppState) => void
  onReset: () => void
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

export function DataControls({ state, saved, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

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
    setToast({ text: 'Cadangan tersimpan (.json).' })
  }

  const exportCsv = () => {
    download(
      `kalkulator-duitmu-${new Date().toISOString().slice(0, 10)}.csv`,
      new Blob([buildCsv(state)], { type: 'text/csv;charset=utf-8' }),
    )
    setToast({ text: 'File transaksi siap dibuka di Excel/Sheets.' })
  }

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = sanitize(JSON.parse(String(reader.result)))
        onImport(parsed)
        setToast({ text: 'Data dipulihkan dari cadangan.' })
      } catch {
        setToast({ text: 'File tidak valid — pilih file cadangan .json.', error: true })
      }
    }
    reader.readAsText(file)
  }

  const reset = () => {
    if (window.confirm('Hapus semua data (uang jajan, pengeluaran, target)? Tindakan ini tidak bisa dibatalkan.')) {
      onReset()
      setToast({ text: 'Semua data dihapus.' })
    }
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Data &amp; Cadangan</h2>
        <span className={`save-state${saved ? ' save-ok' : ''}`}>{saved ? 'Tersimpan otomatis' : 'Menyimpan…'}</span>
      </header>

      <div className="data-list">
        <DataAction
          icon={<DownloadIcon />}
          title="Cadangkan data"
          desc="Unduh salinan semua data (.json) — untuk backup atau pindah ke HP lain"
          onClick={exportFile}
        />
        <DataAction
          icon={<UploadIcon />}
          title="Pulihkan dari cadangan"
          desc="Muat kembali data dari file cadangan (.json) sebelumnya"
          onClick={() => fileRef.current?.click()}
        />
        <DataAction
          icon={<SheetIcon />}
          title="Unduh untuk Excel"
          desc="Daftar transaksi (.csv) yang bisa dibuka di Excel atau Google Sheets"
          onClick={exportCsv}
        />
        <DataAction
          icon={<TrashIcon />}
          title="Hapus semua data"
          desc="Kosongkan seluruh data di browser ini — permanen dan tidak bisa dibatalkan"
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

      <p className="muted small">Data disimpan di browser ini (localStorage), tidak dikirim ke mana pun.</p>

      {toast && (
        <div className={`toast${toast.error ? ' toast-error' : ''}`} role="status">
          {toast.text}
        </div>
      )}
    </section>
  )
}
