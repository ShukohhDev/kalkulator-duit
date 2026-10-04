import { useRef, useState } from 'react'
import type { AppState } from '../types'
import { buildCsv } from '../lib/csv'
import { sanitize } from '../lib/storage'

interface Props {
  state: AppState
  saved: boolean
  onImport: (state: AppState) => void
  onReset: () => void
  onToggleTheme: () => void
}

export function DataControls({ state, saved, onImport, onReset, onToggleTheme }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

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
    setMessage('Data berhasil diekspor.')
  }

  const exportCsv = () => {
    download(
      `kalkulator-duitmu-${new Date().toISOString().slice(0, 10)}.csv`,
      new Blob([buildCsv(state)], { type: 'text/csv;charset=utf-8' }),
    )
    setMessage('CSV berhasil diekspor.')
  }

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = sanitize(JSON.parse(String(reader.result)))
        onImport(parsed)
        setMessage('Data berhasil dimuat.')
      } catch {
        setMessage('File tidak valid.')
      }
    }
    reader.readAsText(file)
  }

  const reset = () => {
    if (window.confirm('Hapus semua data (uang jajan, pengeluaran, target)? Tindakan ini tidak bisa dibatalkan.')) {
      onReset()
      setMessage('Semua data dihapus.')
    }
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Data &amp; Tema</h2>
        <span className={`save-state${saved ? ' save-ok' : ''}`}>{saved ? 'Tersimpan otomatis' : 'Menyimpan…'}</span>
      </header>

      <div className="btn-row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportFile}>
          Ekspor JSON
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
          Ekspor CSV
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          Impor JSON
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onToggleTheme}>
          Ganti tema
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={reset}>
          Reset data
        </button>
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

      {message && <p className="muted small">{message}</p>}
      <p className="muted small">Data disimpan di browser ini (localStorage), tidak dikirim ke mana pun.</p>
    </section>
  )
}
