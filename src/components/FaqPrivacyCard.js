/**
 * Help, FAQ & Privacy Policy Card (Pure Vanilla JS)
 */
import { ICON_CHEVRON_DOWN } from './icons.js';

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

export function renderFaqPrivacyCard(container, { lang = 'id' } = {}) {
  if (!container) return;
  const isEn = lang === 'en';

  let openFaq = null;
  let showPrivacy = false;

  function render() {
    const faqItemsHtml = FAQS.map((item, idx) => {
      const isOpen = openFaq === idx;
      return `
        <div
          class="faq-item"
          style="border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden; background: var(--bg-subtle, #f8fafc);"
        >
          <button
            type="button"
            class="faq-question-btn"
            data-idx="${idx}"
            style="width: 100%; padding: 12px 14px; text-align: left; background: none; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem; color: var(--text-main, #1e293b); display: flex; justify-content: space-between; align-items: center;"
            aria-expanded="${isOpen}"
          >
            <span>${isEn ? item.qEn : item.qId}</span>
            <span style="display: inline-flex; align-items: center; transform: ${isOpen ? 'rotate(180deg)' : 'none'}; transition: transform 0.2s;">
              ${ICON_CHEVRON_DOWN}
            </span>
          </button>
          ${
            isOpen
              ? `<div style="padding: 0 14px 12px 14px; font-size: 0.85rem; line-height: 1.5; color: var(--text-muted, #64748b);">
                  ${isEn ? item.aEn : item.aId}
                </div>`
              : ''
          }
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <section class="card faq-privacy-card" aria-label="${isEn ? 'Help, FAQ & Privacy Policy' : 'Bantuan, FAQ & Kebijakan Privasi'}">
        <header class="card-head">
          <h2>${isEn ? 'Help & Privacy Policy' : 'Bantuan & Kebijakan Privasi'}</h2>
        </header>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <h3 style="font-size: 1rem; margin: 4px 0; font-weight: 600;">
            ${isEn ? 'Frequently Asked Questions (FAQ)' : 'Tanya Jawab (FAQ)'}
          </h3>
          <div class="faq-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${faqItemsHtml}
          </div>

          <hr style="border: none; border-top: 1px solid var(--border-color, #e2e8f0); margin: 8px 0;" />

          <div>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-toggle-privacy"
              style="font-weight: 600;"
            >
              ${
                showPrivacy
                  ? (isEn ? 'Close Privacy Policy' : 'Tutup Kebijakan Privasi')
                  : (isEn ? 'View Privacy & Data Policy' : 'Lihat Kebijakan Privasi Data')
              }
            </button>

            ${
              showPrivacy
                ? `<div
                    class="privacy-policy-box"
                    style="margin-top: 10px; padding: 14px; border-radius: 8px; background: var(--bg-subtle, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); font-size: 0.85rem; line-height: 1.6; color: var(--text-muted, #475569);"
                  >
                    <h4 style="margin: 0 0 6px 0; color: var(--text-main, #0f172a);">
                      ${isEn ? 'Privacy Policy & Data Security' : 'Kebijakan Privasi & Keamanan Data'}
                    </h4>
                    <p style="margin: 0 0 8px 0;">
                      ${isEn ? 'Your financial privacy is our top priority. Here is our commitment to transparency:' : 'Privasi keuangan kamu adalah prioritas utama kami. Ini komitmen keterbukaan kami:'}
                    </p>
                    <ul style="padding-left: 20px; margin: 0 0 8px 0;">
                      ${
                        isEn
                          ? `<li><strong>Secure Local Storage:</strong> All expenses, budgets, and receipts are stored on your device (LocalStorage & IndexedDB).</li>
                             <li><strong>Hashed Passwords:</strong> Your password is cryptographically protected with SHA-256 before storage.</li>
                             <li><strong>No Ads or Trackers:</strong> We never sell your data, use tracking ads, or share information with third parties.</li>
                             <li><strong>Full User Control:</strong> You can export (JSON/Excel) or wipe all data at any time.</li>`
                          : `<li><strong>Penyimpanan Aman di Perangkat:</strong> Semua catatan belanja, anggaran, dan foto struk tersimpan di perangkat kamu sendiri (LocalStorage & IndexedDB).</li>
                             <li><strong>Kata Sandi Terenkripsi:</strong> Kata sandi kamu diacak aman dengan standar kriptografi SHA-256 sebelum disimpan.</li>
                             <li><strong>Bebas Iklan & Pelacak:</strong> Kami gak jual data keuanganmu, gak pasang iklan pelacak, dan gak bagiin datamu ke siapa pun.</li>
                             <li><strong>Kendali Penuh di Tanganmu:</strong> Kamu bebas unduh data (JSON/Excel) atau reset semua data kapan pun kamu mau.</li>`
                      }
                    </ul>
                    <p style="margin: 0; font-size: 0.8rem;">
                      ${isEn ? 'Have questions? Feel free to reach out via Report Issue anytime!' : 'Punya pertanyaan lain? Jangan ragu hubungi kami lewat menu Laporkan Masalah ya!'}
                    </p>
                  </div>`
                : ''
            }
          </div>
        </div>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.faq-privacy-card');
    if (!root) return;

    root.querySelectorAll('.faq-question-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        openFaq = openFaq === idx ? null : idx;
        render();
      });
    });

    root.querySelector('.btn-toggle-privacy')?.addEventListener('click', () => {
      showPrivacy = !showPrivacy;
      render();
    });
  }

  render();
}

