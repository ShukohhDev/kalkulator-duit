import { useState } from 'react'
import type { Notify } from '../types'
import { sendUserReport, type ReportType } from '../lib/reports'
import { currentUser } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { CustomSelect } from './CustomSelect'

const TYPES: { value: ReportType; labelId: string; labelEn: string }[] = [
  { value: 'Bug', labelId: 'Bug', labelEn: 'Bug' },
  { value: 'Kritik', labelId: 'Kritik', labelEn: 'Critique' },
  { value: 'Saran', labelId: 'Saran', labelEn: 'Suggestion' },
]

function currentSection(): string {
  const active = document.querySelector('.section.active h1, .section.active h2, .section.active h3')
  const fallback = document.getElementById(location.hash.slice(1))?.querySelector('h1, h2, h3')
  return (active ?? fallback)?.textContent?.trim() ?? 'beranda'
}

export function ReportIssueCard({ notify }: { notify: Notify }) {
  const { language } = useI18n()
  const [type, setType] = useState<ReportType>('Bug')
  const [message, setMessage] = useState('')
  const [page, setPage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleSend = async () => {
    // Anti-spam honeypot check: bot otomatis mengisi input tersembunyi
    if (honeypot) {
      notify(language === 'en' ? 'Report processed.' : 'Laporan diproses.')
      return
    }

    // Rate-limit anti spam: jeda minimal 5 detik antar laporan
    const now = Date.now()
    if (now - lastSubmitTime < 5000) {
      notify(
        language === 'en'
          ? 'Please wait a few seconds before sending another report.'
          : 'Mohon tunggu beberapa detik sebelum mengirim laporan lagi.',
        { error: true },
      )
      return
    }

    if (!message.trim()) {
      notify(language === 'en' ? 'Please describe the issue first.' : 'Tulis dulu masalahnya.', { error: true })
      return
    }

    setSubmitting(true)
    try {
      const username = currentUser() || (language === 'en' ? 'Anonymous' : 'Anonim')
      const err = await sendUserReport({
        username,
        type,
        page: page.trim() || currentSection(),
        message: message.trim(),
      })

      if (err) {
        notify(err, { error: true })
      } else {
        notify(
          language === 'en'
            ? 'Report sent to administrator successfully!'
            : 'Laporan berhasil dikirim ke pemilik website!',
        )
        setMessage('')
        setPage('')
        setLastSubmitTime(now)
      }
    } catch {
      notify(language === 'en' ? 'Failed to send report.' : 'Gagal mengirim laporan.', { error: true })
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async () => {
    if (!message.trim()) {
      notify(language === 'en' ? 'Please describe the issue first.' : 'Tulis dulu masalahnya.', { error: true })
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
      notify(
        language === 'en'
          ? 'Report copied to clipboard. Paste to GitHub Issues.'
          : 'Laporan disalin ke clipboard. Tempel ke GitHub Issues.',
      )
    } catch {
      notify(language === 'en' ? 'Failed to copy report' : 'Gagal menyalin laporan', { error: true })
    }
  }

  return (
    <section className="card" aria-label={language === 'en' ? 'Report an Issue' : 'Laporkan Masalah'}>
      <header className="card-head">
        <h2>{language === 'en' ? 'Report an Issue' : 'Laporkan Masalah'}</h2>
      </header>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="issue-type">{language === 'en' ? 'Type' : 'Jenis'}</label>
          <CustomSelect
            id="issue-type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
            title={language === 'en' ? 'Select Issue Type' : 'Pilih Jenis Laporan'}
          >
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {language === 'en' ? item.labelEn : item.labelId}
              </option>
            ))}
          </CustomSelect>
        </div>
        <div className="field">
          <label htmlFor="issue-page">{language === 'en' ? 'Page (optional)' : 'Halaman (opsional)'}</label>
          <input
            id="issue-page"
            className="input"
            placeholder={language === 'en' ? 'automatic: active page' : 'otomatis: halaman aktif'}
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="issue-message">{language === 'en' ? 'Describe the issue' : 'Ceritakan masalahnya'}</label>
          <textarea
            id="issue-message"
            className="input"
            rows={4}
            placeholder={
              language === 'en'
                ? 'Found a bug, critique, or have an idea? Describe what happened and steps to reproduce...'
                : 'Ada bug, kritik, atau ide baru nih? Ceritakan apa yang terjadi dan langkah-langkahnya ya...'
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {/* Anti-spam honeypot - tersembunyi dari pengguna manusia */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="issue-website">Website</label>
          <input
            id="issue-website"
            type="text"
            value={honeypot}
            tabIndex={-1}
            autoComplete="off"
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
        <div className="form-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSend}
            disabled={submitting}
          >
            {submitting
              ? (language === 'en' ? 'Sending...' : 'Mengirim...')
              : (language === 'en' ? 'Send Report' : 'Kirim Laporan')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
            {language === 'en' ? 'Copy report' : 'Salin laporan'}
          </button>
        </div>
      </div>
      <p className="muted small">
        {language === 'en'
          ? 'Your report will be sent directly to the site administrator, or you can copy the text.'
          : 'Laporanmu bakal langsung masuk ke admin website ini, atau kamu juga bisa salin teksnya.'}
      </p>
    </section>
  )
}
