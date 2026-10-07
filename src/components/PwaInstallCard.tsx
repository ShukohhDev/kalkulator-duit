import { useEffect, useState } from 'react'
import type { Notify } from '../types'
import { ICON_INSTALL, ICON_PHONE, ICON_WIFI } from './icons'

interface Props {
  notify: Notify
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallCard({ notify }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      // @ts-expect-error navigator.standalone exists on iOS Safari
      Boolean(typeof navigator !== 'undefined' && navigator.standalone)
    )
  })
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isIos] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Tangkap event instalasi browser (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Monitor status online/offline
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
        notify('Di Safari iOS: Ketuk tombol Share [⎋] di bawah lalu pilih "Tambah ke Layar Utama".')
      } else {
        notify('Buka menu browser (titik 3) lalu pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama".')
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        notify('Aplikasi berhasil dipasang di layar utama!')
        setDeferredPrompt(null)
        setIsStandalone(true)
      }
    } catch {
      notify('Gagal memicu pemasangan otomatis. Kamu bisa memasangnya lewat menu browser.')
    }
  }

  // Tautan yang bisa dibuka di HP (menggunakan IP atau hostname saat ini)
  const host = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ''
  const mobileUrl = `${window.location.protocol}//${host === 'localhost' ? '192.168.100.101' : host}${port}`

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl)
      setCopied(true)
      notify(`Tautan HP disalin: ${mobileUrl}`)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      notify(`Tautan HP: ${mobileUrl}`)
    }
  }

  return (
    <section className="card pwa-card" id="pwa-install-card">
      <header className="card-head">
        <div className="pwa-head-title">
          <div className="pwa-head-icon" aria-hidden="true">
            {ICON_PHONE}
          </div>
          <div>
            <h2>Aplikasi HP & Mode Offline (PWA)</h2>
            <p className="muted small">
              Buka di ponsel pintar kamu dan pasang ke layar utama untuk pengalaman layaknya aplikasi native.
            </p>
          </div>
        </div>
        <div className="pwa-head-badges">
          <span className={`chip ${isOnline ? 'chip-online' : 'chip-offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {isStandalone && (
            <span className="chip chip-standalone">
              Terpasang di HP
            </span>
          )}
        </div>
      </header>

      {/* Box Aksi Instalasi */}
      <div className="pwa-action-box">
        {isStandalone ? (
          <div className="pwa-status-box pwa-status-installed">
            <strong className="small">Aplikasi Sudah Terpasang (Standalone)</strong>
            <p className="muted small">
              Kamu sedang menggunakan versi aplikasi penuh di layar perangkatmu. Data tersimpan lokal di HP dan bisa digunakan secara lancar tanpa koneksi internet.
            </p>
          </div>
        ) : (
          <div className="pwa-install-banner">
            <div className="pwa-banner-text">
              <strong className="pwa-banner-title">Pasang Aplikasi ke Layar Utama</strong>
              <p className="muted small">
                Akses cepat dari Home Screen tanpa perlu buka browser terlebih dahulu, hemat memori, dan tetap berfungsi saat offline.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary pwa-install-btn"
              onClick={handleInstallClick}
              id="pwa-install-button"
            >
              <span className="pwa-btn-icon" aria-hidden="true">{ICON_INSTALL}</span>
              <span>{deferredPrompt ? 'Pasang Sekarang' : 'Pasang ke HP'}</span>
            </button>
          </div>
        )}

        {/* Petunjuk khusus iOS Safari jika belum terpasang */}
        {!isStandalone && isIos && (
          <div className="pwa-ios-instructions">
            <strong className="small">Panduan Pengguna iPhone / iPad (Safari):</strong>
            <ol className="pwa-steps-list small">
              <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah browser Safari.</li>
              <li>Gulir menu ke bawah lalu pilih opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
              <li>Ketuk tombol <strong>Tambah</strong> di pojok kanan atas.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Panduan Membuka di HP Lewat Jaringan Wi-Fi Komputer */}
      <div className="pwa-network-box">
        <div className="pwa-network-head">
          <span className="pwa-network-icon" aria-hidden="true">{ICON_WIFI}</span>
          <strong className="small">Cara Membuka di HP Lewat Wi-Fi yang Sama:</strong>
        </div>

        <p className="muted small">
          Hubungkan ponsel ke jaringan Wi-Fi yang sama dengan laptop/komputer ini (atau nyalakan Hotspot HP), lalu buka alamat berikut di browser HP:
        </p>

        <div className="pwa-url-bar">
          <code className="pwa-url-code">{mobileUrl}</code>
          <button
            type="button"
            className="btn btn-ghost btn-sm pwa-copy-btn"
            onClick={handleCopyUrl}
            id="pwa-copy-url-btn"
          >
            {copied ? 'Tersalin' : 'Salin Tautan'}
          </button>
        </div>

        <ul className="pwa-tips-list muted small">
          <li><strong>Otomatis Offline:</strong> Setelah dibuka pertama kali di HP, aplikasi akan menyimpan cache otomatis dan dapat dibuka tanpa kuota.</li>
          <li><strong>Sinkronisasi Cloud:</strong> Masuk dengan akun yang sama di HP dan laptop agar uang jajan kamu tersinkron otomatis via cloud Supabase.</li>
        </ul>
      </div>
    </section>
  )
}
