/**
 * PWA Install & Offline Setup Card (Pure Vanilla JS)
 */
import { ICON_INSTALL, ICON_WIFI } from './icons.js';
import { escapeHtml } from '../lib/dom.js';

export function renderPwaInstallCard(container, { notify, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let deferredPrompt = null;
  let isStandalone =
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean(typeof navigator !== 'undefined' && navigator.standalone);
  let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  let showIosGuide = isIos;
  let copied = false;

  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault();
    deferredPrompt = e;
    render();
  };

  const handleOnline = () => {
    isOnline = true;
    render();
  };

  const handleOffline = () => {
    isOnline = false;
    render();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  const host = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const mobileUrl = `${window.location.protocol}//${host === 'localhost' ? '192.168.100.101' : host}${port}`;

  async function handleInstallClick() {
    if (!deferredPrompt) {
      if (isIos) {
        notify?.(
          isEn
            ? 'On iOS Safari: Tap the Share button in Safari, then choose "Add to Home Screen".'
            : 'Di Safari iOS: Ketuk tombol Share di bawah lalu pilih "Tambah ke Layar Utama".'
        );
      } else {
        notify?.(
          isEn
            ? 'Open your browser menu (3 dots) and select "Install App" or "Add to Home screen".'
            : 'Buka menu browser (titik 3) lalu pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama".'
        );
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        notify?.(
          isEn
            ? 'App installed successfully to your home screen!'
            : 'Aplikasi berhasil dipasang di layar utama!'
        );
        deferredPrompt = null;
        isStandalone = true;
        render();
      }
    } catch {
      notify?.(
        isEn
          ? 'Failed to trigger automatic installation. You can install via your browser menu.'
          : 'Gagal memicu pemasangan otomatis. Kamu bisa memasangnya lewat menu browser.'
      );
    }
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      copied = true;
      notify?.(isEn ? `Mobile link copied: ${mobileUrl}` : `Tautan HP disalin: ${mobileUrl}`);
      render();
      setTimeout(() => {
        copied = false;
        render();
      }, 2500);
    } catch {
      notify?.(isEn ? `Mobile link: ${mobileUrl}` : `Tautan HP: ${mobileUrl}`);
    }
  }

  function render() {
    container.innerHTML = `
      <section class="card pwa-card" id="pwa-install-card">
        <header class="card-head">
          <div class="pwa-head-title">
            <div class="pwa-head-icon" aria-hidden="true">
              <img src="/favicon.png" alt="" width="26" height="26" style="border-radius: 6px; display: block;" />
            </div>
            <div>
              <h2>${isEn ? 'Mobile App & Offline Mode (PWA)' : 'Aplikasi HP & Mode Offline (PWA)'}</h2>
              <p class="muted small">
                ${isEn ? 'Install on your phone for home screen access like a native app, plus full offline capability!' : 'Pasang di HP biar bisa langsung dibuka dari layar utama kayak aplikasi beneran, plus bisa offline!'}
              </p>
            </div>
          </div>
          <div class="pwa-head-badges">
            <span class="chip ${isOnline ? 'chip-online' : 'chip-offline'}">
              ${isOnline ? 'Online' : 'Offline'}
            </span>
            ${
              isStandalone
                ? `<span class="chip chip-standalone">
                    ${isEn ? 'Installed' : 'Terpasang di HP'}
                  </span>`
                : ''
            }
          </div>
        </header>

        <div class="pwa-action-box">
          ${
            isStandalone
              ? `<div class="pwa-status-box pwa-status-installed">
                  <strong class="small">${isEn ? 'App Installed (Standalone)' : 'Aplikasi Sudah Terpasang (Standalone)'}</strong>
                  <p class="muted small">
                    ${isEn ? 'App is installed on your device screen! Data remains safe locally and functions smoothly even without network.' : 'Aplikasi udah nempel di layar perangkatmu! Data tetap aman tersimpan di HP dan bisa dipake santai walau lagi gak ada sinyal.'}
                  </p>
                </div>`
              : `<div class="pwa-install-banner">
                  <div class="pwa-banner-text">
                    <strong class="pwa-banner-title">${isEn ? 'Install App to Home Screen' : 'Pasang Aplikasi ke Layar Utama'}</strong>
                    <p class="muted small">
                      ${isEn ? 'Launch directly from your Home Screen without opening a browser first, saves memory, works offline.' : 'Buka langsung dari Home Screen tanpa perlu buka browser dulu, hemat memori, dan tetap nyala pas offline.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-primary pwa-install-btn"
                    id="pwa-install-button"
                  >
                    <span class="pwa-btn-icon" aria-hidden="true">${ICON_INSTALL}</span>
                    <span>
                      ${deferredPrompt ? (isEn ? 'Install Now' : 'Pasang Sekarang') : (isEn ? 'Install to Phone' : 'Pasang ke HP')}
                    </span>
                  </button>
                </div>`
          }

          ${
            !isStandalone
              ? `<div class="pwa-ios-instructions">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm pwa-ios-toggle-btn"
                    aria-expanded="${showIosGuide}"
                    style="width: 100%; justify-content: space-between; margin-bottom: ${showIosGuide ? '10px' : '0'};"
                  >
                    <span>${isEn ? 'iOS Guide: Install on iPhone / iPad (Safari iOS)' : 'Panduan Pasang di iPhone / iPad (Safari iOS)'}</span>
                    <span>
                      ${showIosGuide ? (isEn ? '▲ Hide Guide' : '▲ Sembunyikan') : (isEn ? '▼ View Guide' : '▼ Lihat Cara Pasang')}
                    </span>
                  </button>
                  ${
                    showIosGuide
                      ? `<ol class="pwa-steps-list small" style="margin-top: 8px;">
                          ${
                            isEn
                              ? `<li>Open this website link in <strong>Safari</strong> on your iPhone/iPad.</li>
                                 <li>Tap the <strong>Share</strong> button at the bottom navigation bar of Safari.</li>
                                 <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                                 <li>Tap <strong>Add</strong> in the top right corner. The app is now on your home screen without browser bars!</li>`
                              : `<li>Buka link aplikasi ini di browser <strong>Safari</strong> iPhone/iPad kamu.</li>
                                 <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah navigasi bawah Safari.</li>
                                 <li>Gulir menu ke bawah lalu pilih opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
                                 <li>Ketuk tombol <strong>Tambah (Add)</strong> di pojok kanan atas. Aplikasi siap dibuka dari layar utama tanpa browser bar!</li>`
                          }
                        </ol>`
                      : ''
                  }
                </div>`
              : ''
          }
        </div>

        <div class="pwa-network-box">
          <div class="pwa-network-head">
            <span class="pwa-network-icon" aria-hidden="true">${ICON_WIFI}</span>
            <strong class="small">${isEn ? 'Want to open on your phone? Easy:' : 'Mau Buka di HP? Gampang:'}</strong>
          </div>

          <p class="muted small">
            ${isEn ? 'Connect your phone to the same Wi-Fi network as this computer, then open this URL in your mobile browser:' : 'Sambungin HP kamu ke Wi-Fi yang sama dengan laptop (atau nyalakan Hotspot HP), trus buka alamat ini di browser HP:'}
          </p>

          <div class="pwa-url-bar">
            <code class="pwa-url-code">${escapeHtml(mobileUrl)}</code>
            <button
              type="button"
              class="btn btn-ghost btn-sm pwa-copy-btn"
              id="pwa-copy-url-btn"
            >
              ${copied ? (isEn ? 'Copied' : 'Tersalin') : (isEn ? 'Copy Link' : 'Salin Tautan')}
            </button>
          </div>

          <ul class="pwa-tips-list muted small">
            ${
              isEn
                ? `<li><strong>Automatic Offline:</strong> After opening once, the app caches files locally and works offline.</li>
                   <li><strong>Cloud Sync:</strong> Sign in with the same account across devices to automatically sync via Supabase.</li>`
                : `<li><strong>Otomatis Offline:</strong> Setelah dibuka pertama kali di HP, aplikasi akan menyimpan cache otomatis dan dapat dibuka tanpa kuota.</li>
                   <li><strong>Sinkronisasi Cloud:</strong> Masuk dengan akun yang sama di HP dan laptop agar uang jajan kamu tersinkron otomatis via cloud Supabase.</li>`
            }
          </ul>
        </div>
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('#pwa-install-card');
    if (!root) return;

    root.querySelector('#pwa-install-button')?.addEventListener('click', handleInstallClick);

    root.querySelector('.pwa-ios-toggle-btn')?.addEventListener('click', () => {
      showIosGuide = !showIosGuide;
      render();
    });

    root.querySelector('#pwa-copy-url-btn')?.addEventListener('click', handleCopyUrl);
  }

  render();
}

