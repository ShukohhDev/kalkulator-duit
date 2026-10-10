import { useState } from 'react'
import type { Notify } from '../types'
import { sendUserReport, type ReportType } from '../lib/reports'
import { currentUser } from '../lib/auth'
import { CustomSelect } from './CustomSelect'

const TYPES = ['Bug', 'Kritik', 'Saran'] as const

function currentSection(): string {
  const active = document.querySelector('.section.active h1, .section.active h2, .section.active h3')
  const fallback = document.getElementById(location.hash.slice(1))?.querySelector('h1, h2, h3')
  return (active ?? fallback)?.textContent?.trim() ?? 'beranda'
}

export function ReportIssueCard({ notify }: { notify: Notify }) {
  const [type, setType] = useState<(typeof TYPES)[number]>('Bug')
  const [message, setMessage] = useState('')
  const [page, setPage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      notify('Tulis dulu masalahnya.', { error: true })
      return
    }

    setSubmitting(true)
    try {
      const username = currentUser() || 'Anonim'
      const err = await sendUserReport({
        username,
        type: type as ReportType,
        page: page.trim() || currentSection(),
        message: message.trim(),
      })

      if (err) {
        notify(err, { error: true })
      } else {
        notify('Laporan berhasil dikirim ke pemilik website!')
        setMessage('')
        setPage('')
      }
    } catch {
      notify('Gagal mengirim laporan.', { error: true })
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async () => {
    if (!message.trim()) {
      notify('Tulis dulu masalahnya.', { error: true })
      return
    }
    const template = [
      `[${type}] Kalkulator Uang Jajan`,
      `Browser: ${navigator.userAgent}`,
      `Halaman: ${page.trim() || currentSection()}`,
      '',
      `Pesan: ${message.trim()}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(template)
      notify('Laporan disalin ke clipboard. Tempel ke GitHub Issues.')
    } catch {
      notify('Gagal menyalin laporan', { error: true })
    }
  }

  return (
    <section className="card" aria-label="Laporkan Masalah">
      <header className="card-head">
        <h2>Laporkan Masalah</h2>
      </header>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="issue-type">Jenis</label>
          <CustomSelect
            id="issue-type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
            title="Pilih Jenis Laporan"
          >
            {TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div className="field">
          <label htmlFor="issue-page">Halaman (opsional)</label>
          <input
            id="issue-page"
            className="input"
            placeholder="otomatis: halaman aktif"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="issue-message">Ceritakan masalahnya</label>
          <textarea
            id="issue-message"
            className="input"
            rows={4}
            placeholder="Apa yang terjadi, langkah untuk mengulanginya, apa yang kamu harapkan"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="form-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSend}
            disabled={submitting}
          >
            {submitting ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
            Salin laporan
          </button>
        </div>
      </div>
      <p className="muted small">
        Laporan akan langsung terkirim ke panel Admin pemilik website, atau Anda juga dapat menyalinnya sebagai teks.
      </p>
    </section>
  )
}
