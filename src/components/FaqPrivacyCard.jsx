import { useState } from 'react';
import { ICON_CHEVRON_DOWN } from './icons';
import { useI18n } from '../lib/i18n';
const FAQS = [
    {
        qId: 'Gimana cara nentuin alokasi uang saku?',
        qEn: 'How do I determine my allowance allocation?',
        aId: 'Pilih profil tinggal di rumah atau kos pada kartu Uang Jajan. Nanti sistem otomatis bagiin persentase anggaran buat makan, jajan, transportasi, dan tabungan yang bisa kamu sesuaikan sesuka hati.',
        aEn: 'Select your living profile (living at home or boarding house) on the Allowance card. The system automatically suggests budget ratios for meals, snacks, commute, and savings which you can adjust freely.',
    },
    {
        qId: 'Apakah aplikasi bisa dipakai saat offline tanpa internet?',
        qEn: 'Can the app be used offline without internet?',
        aId: 'Bisa banget! Kalkulator Uang Jajan dirancang sebagai Progressive Web App (PWA) lokal-first. Semua catatan transaksi dan bukti foto tersimpan aman di browsermu dan tetap berfungsi lancar walau lagi gak ada sinyal.',
        aEn: 'Absolutely! Kalkulator Uang Jajan is built as a local-first Progressive Web App (PWA). All transaction logs and photos are saved securely on your device and work seamlessly even offline.',
    },
    {
        qId: 'Gimana cara kerja bunga majemuk tabungan?',
        qEn: 'How does compound growth work for savings?',
        aId: 'Simulasi target tabungan menghitung imbal hasil majemuk 8% per tahun (sekitar 0,64% per bulan). Ini ngebantu kamu melihat seberapa cepat uang tabunganmu bertumbuh dari waktu ke waktu.',
        aEn: 'The savings goal simulation calculates an 8% annual compound return (~0.64% per month), helping you visualize how your savings grow over time.',
    },
    {
        qId: 'Ada biaya atau iklan tersembunyi gak?',
        qEn: 'Are there hidden fees or ads?',
        aId: 'Gak ada sama sekali! Kalkulator Uang Jajan 100% gratis, bebas iklan, dan gak ada biaya tersembunyi apa pun.',
        aEn: 'None at all! Kalkulator Uang Jajan is 100% free, ad-free, and has no hidden fees.',
    },
    {
        qId: 'Gimana cara mindahin data ke HP atau laptop lain?',
        qEn: 'How do I transfer data to another phone or laptop?',
        aId: 'Kamu bisa ekspor data ke file JSON lewat tab Data > Cadangkan, terus impor di perangkat barumu. Atau masuk pakai akun yang sama biar tersinkron otomatis lewat cloud.',
        aEn: 'You can export data to a JSON file via Data > Backup, then import on your new device. Or sign in with the same account for automatic cloud synchronization.',
    },
];
export function FaqPrivacyCard() {
    const { language } = useI18n();
    const [openFaq, setOpenFaq] = useState(null);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const toggleFaq = (idx) => {
        setOpenFaq((prev) => (prev === idx ? null : idx));
    };
    return (<section className="card" aria-label={language === 'en' ? 'Help, FAQ & Privacy Policy' : 'Bantuan, FAQ & Kebijakan Privasi'}>
      <header className="card-head">
        <h2>{language === 'en' ? 'Help & Privacy Policy' : 'Bantuan & Kebijakan Privasi'}</h2>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', margin: '4px 0', fontWeight: 600 }}>
          {language === 'en' ? 'Frequently Asked Questions (FAQ)' : 'Tanya Jawab (FAQ)'}
        </h3>
        <div className="faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (<div key={item.qId} style={{
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--bg-subtle, #f8fafc)',
                }}>
                <button type="button" onClick={() => toggleFaq(idx)} style={{
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
                }} aria-expanded={isOpen}>
                  <span>{language === 'en' ? item.qEn : item.qId}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    {ICON_CHEVRON_DOWN}
                  </span>
                </button>
                {isOpen && (<div style={{
                        padding: '0 14px 12px 14px',
                        fontSize: '0.85rem',
                        lineHeight: '1.5',
                        color: 'var(--text-muted, #64748b)',
                    }}>
                    {language === 'en' ? item.aEn : item.aId}
                  </div>)}
              </div>);
        })}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, #e2e8f0)', margin: '8px 0' }}/>

        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPrivacy((v) => !v)} style={{ fontWeight: 600 }}>
            {showPrivacy
            ? (language === 'en' ? 'Close Privacy Policy' : 'Tutup Kebijakan Privasi')
            : (language === 'en' ? 'View Privacy & Data Policy' : 'Lihat Kebijakan Privasi Data')}
          </button>

          {showPrivacy && (<div style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '8px',
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: 'var(--text-muted, #475569)',
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
                {language === 'en' ? 'Privacy Policy & Data Security' : 'Kebijakan Privasi & Keamanan Data'}
              </h4>
              <p style={{ margin: '0 0 8px 0' }}>
                {language === 'en'
                ? 'Your financial privacy is our top priority. Here is our commitment to transparency:'
                : 'Privasi keuangan kamu adalah prioritas utama kami. Ini komitmen keterbukaan kami:'}
              </p>
              <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }}>
                {language === 'en' ? (<>
                    <li><strong>Secure Local Storage:</strong> All expenses, budgets, and receipts are stored on your device (LocalStorage & IndexedDB).</li>
                    <li><strong>Hashed Passwords:</strong> Your password is cryptographically protected with SHA-256 before storage.</li>
                    <li><strong>No Ads or Trackers:</strong> We never sell your data, use tracking ads, or share information with third parties.</li>
                    <li><strong>Full User Control:</strong> You can export (JSON/Excel) or wipe all data at any time.</li>
                  </>) : (<>
                    <li><strong>Penyimpanan Aman di Perangkat:</strong> Semua catatan belanja, anggaran, dan foto struk tersimpan di perangkat kamu sendiri (LocalStorage & IndexedDB).</li>
                    <li><strong>Kata Sandi Terenkripsi:</strong> Kata sandi kamu diacak aman dengan standar kriptografi SHA-256 sebelum disimpan.</li>
                    <li><strong>Bebas Iklan & Pelacak:</strong> Kami gak jual data keuanganmu, gak pasang iklan pelacak, dan gak bagiin datamu ke siapa pun.</li>
                    <li><strong>Kendali Penuh di Tanganmu:</strong> Kamu bebas unduh data (JSON/Excel) atau reset semua data kapan pun kamu mau.</li>
                  </>)}
              </ul>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                {language === 'en'
                ? 'Have questions? Feel free to reach out via Report Issue anytime!'
                : 'Punya pertanyaan lain? Jangan ragu hubungi kami lewat menu Laporkan Masalah ya!'}
              </p>
            </div>)}
        </div>
      </div>
    </section>);
}
