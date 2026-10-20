import { useState } from 'react'
import { ICON_CHEVRON_DOWN } from './icons'

interface FaqItem {
  q: string
  a: string
}

const FAQS: FaqItem[] = [
  {
    q: 'Gimana cara nentuin alokasi uang saku?',
    a: 'Pilih profil tinggal di rumah atau kos pada kartu Uang Jajan. Nanti sistem otomatis bagiin persentase anggaran buat makan, jajan, transportasi, dan tabungan yang bisa kamu sesuaikan sesuka hati.',
  },
  {
    q: 'Apakah aplikasi bisa dipakai saat offline tanpa internet?',
    a: 'Bisa banget! Kalkulator Uang Jajan dirancang sebagai Progressive Web App (PWA) lokal-first. Semua catatan transaksi dan bukti foto tersimpan aman di browsermu dan tetap berfungsi lancar walau lagi gak ada sinyal.',
  },
  {
    q: 'Gimana cara kerja bunga majemuk tabungan?',
    a: 'Simulasi target tabungan menghitung imbal hasil majemuk 8% per tahun (sekitar 0,64% per bulan). Ini ngebantu kamu melihat seberapa cepat uang tabunganmu bertumbuh dari waktu ke waktu.',
  },
  {
    q: 'Ada biaya atau iklan tersembunyi gak?',
    a: 'Gak ada sama sekali! Kalkulator Uang Jajan 100% gratis, bebas iklan, dan gak ada biaya tersembunyi apa pun.',
  },
  {
    q: 'Gimana cara mindahin data ke HP atau laptop lain?',
    a: 'Kamu bisa ekspor data ke file JSON lewat tab Data > Cadangkan, terus impor di perangkat barumu. Atau masuk pakai akun yang sama biar tersinkron otomatis lewat cloud.',
  },
]

export function FaqPrivacyCard() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showPrivacy, setShowPrivacy] = useState(false)

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx))
  }

  return (
    <section className="card" aria-label="Bantuan, FAQ & Kebijakan Privasi">
      <header className="card-head">
        <h2>Bantuan & Kebijakan Privasi</h2>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', margin: '4px 0', fontWeight: 600 }}>Tanya Jawab (FAQ)</h3>
        <div className="faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={item.q}
                style={{
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'var(--bg-subtle, #f8fafc)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--text-main, #1e293b)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    {ICON_CHEVRON_DOWN}
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 14px 12px 14px',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      color: 'var(--text-muted, #64748b)',
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #e2e8f0)', margin: '8px 0' }} />

        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowPrivacy((v) => !v)}
            style={{ fontWeight: 600 }}
          >
            {showPrivacy ? 'Tutup Kebijakan Privasi' : 'Lihat Kebijakan Privasi Data'}
          </button>

          {showPrivacy && (
            <div
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '8px',
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: 'var(--text-muted, #475569)',
              }}
            >
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main, #0f172a)' }}>Kebijakan Privasi & Keamanan Data</h4>
              <p style={{ margin: '0 0 8px 0' }}>
                Privasi keuangan kamu adalah prioritas utama kami. Ini komitmen keterbukaan kami:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
                <li><strong>Penyimpanan Aman di Perangkat:</strong> Semua catatan belanja, anggaran, dan foto struk tersimpan di perangkat kamu sendiri (LocalStorage & IndexedDB).</li>
                <li><strong>Kata Sandi Terenkripsi:</strong> Kata sandi kamu diacak aman dengan standar kriptografi SHA-256 sebelum disimpan.</li>
                <li><strong>Bebas Iklan & Pelacak:</strong> Kami gak jual data keuanganmu, gak pasang iklan pelacak, dan gak bagiin datamu ke siapa pun.</li>
                <li><strong>Kendali Penuh di Tanganmu:</strong> Kamu bebas unduh data (JSON/Excel) atau reset semua data kapan pun kamu mau.</li>
              </ul>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                Punya pertanyaan lain? Jangan ragu hubungi kami lewat menu Laporkan Masalah ya!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
