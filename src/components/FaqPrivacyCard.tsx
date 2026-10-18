import { useState } from 'react'

interface FaqItem {
  q: string
  a: string
}

const FAQS: FaqItem[] = [
  {
    q: 'Bagaimana cara menentukan alokasi uang saku?',
    a: 'Pilih profil tinggal di rumah atau kos pada kartu Uang Saku. Sistem akan membagikan persentase anggaran kebutuhan pokok, jajan, transportasi, dan tabungan secara otomatis yang dapat disesuaikan sesuka hati.',
  },
  {
    q: 'Apakah aplikasi bisa dipakai saat offline tanpa internet?',
    a: 'Bisa! Kalkulator Uang Jajan dirancang sebagai Progressive Web App (PWA) lokal-first. Seluruh pencatatan transaksi dan bukti foto tersimpan di browser Anda (IndexedDB) dan tetap berfungsi penuh saat tanpa internet.',
  },
  {
    q: 'Bagaimana cara kerja bunga majemuk tabungan?',
    a: 'Simulasi target tabungan menghitung imbal hasil majemuk 8% per tahun (sekitar 0,64% per bulan). Ini membantu Anda memvisualisasikan pertumbuhan uang simpanan dari waktu ke waktu.',
  },
  {
    q: 'Apakah ada biaya atau iklan pada aplikasi ini?',
    a: 'Tidak ada. Kalkulator Uang Jajan 100% gratis, bebas iklan, dan tidak memiliki transaksi pembelian terselubung.',
  },
  {
    q: 'Bagaimana cara memindahkan data ke HP atau laptop lain?',
    a: 'Anda bisa mengekspor data ke file JSON melalui menu Data > Cadangkan Data, lalu mengimpornya di perangkat baru. Atau aktifkan fitur Sinkronisasi Cloud Supabase saat login.',
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
                  <span style={{ fontSize: '1.1rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
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
                Privasi keuangan Anda adalah prioritas utama kami. Berikut komitmen transparansi kami:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
                <li><strong>Penyimpanan Lokal Mandiri:</strong> Seluruh rincian transaksi, anggaran, dan foto struk bukti tersimpan di perangkat Anda (LocalStorage & IndexedDB).</li>
                <li><strong>Kata Sandi Terenkripsi:</strong> Kata sandi Anda di-hash dengan standar SHA-256 dan salt acak kriptografi sebelum disimpan.</li>
                <li><strong>Bebas Pelacak Pihak Ketiga:</strong> Kami tidak menjual data keuangan, tidak menyisipkan iklan pelacak, dan tidak membagikan data kepada pihak manapun.</li>
                <li><strong>Kontrol Penuh:</strong> Anda dapat mengunduh salinan data (JSON/Excel) maupun menghapus seluruh akun dan data secara instan kapan saja.</li>
              </ul>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                Pertanyaan lebih lanjut? Hubungi pengembang melalui menu Laporkan Masalah.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
