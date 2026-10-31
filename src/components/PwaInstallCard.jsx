import { useEffect, useState } from 'react';
import { ICON_INSTALL, ICON_WIFI } from './icons';
import { useI18n } from '../lib/i18n';
export function PwaInstallCard({ notify }) {
    const { language } = useI18n();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return ((typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
            // @ts-expect-error navigator.standalone exists on iOS Safari
            Boolean(typeof navigator !== 'undefined' && navigator.standalone));
    });
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isIos] = useState(() => {
        if (typeof navigator === 'undefined')
            return false;
        return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    });
    const [showIosGuide, setShowIosGuide] = useState(() => isIos);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        // Tangkap event instalasi browser (Chrome / Edge / Android)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        // Monitor status online/offline
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            if (isIos) {
                notify(language === 'en'
                    ? 'On iOS Safari: Tap the Share button in Safari, then choose "Add to Home Screen".'
                    : 'Di Safari iOS: Ketuk tombol Share di bawah lalu pilih "Tambah ke Layar Utama".');
            }
            else {
                notify(language === 'en'
                    ? 'Open your browser menu (3 dots) and select "Install App" or "Add to Home screen".'
                    : 'Buka menu browser (titik 3) lalu pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama".');
            }
            return;
        }
        try {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice.outcome === 'accepted') {
                notify(language === 'en'
                    ? 'App installed successfully to your home screen!'
                    : 'Aplikasi berhasil dipasang di layar utama!');
                setDeferredPrompt(null);
                setIsStandalone(true);
            }
        }
        catch {
            notify(language === 'en'
                ? 'Failed to trigger automatic installation. You can install via your browser menu.'
                : 'Gagal memicu pemasangan otomatis. Kamu bisa memasangnya lewat menu browser.');
        }
    };
    // Tautan yang bisa dibuka di HP (menggunakan IP atau hostname saat ini)
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const mobileUrl = `${window.location.protocol}//${host === 'localhost' ? '192.168.100.101' : host}${port}`;
    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(mobileUrl);
            setCopied(true);
            notify(language === 'en' ? `Mobile link copied: ${mobileUrl}` : `Tautan HP disalin: ${mobileUrl}`);
            setTimeout(() => setCopied(false), 2500);
        }
        catch {
            notify(language === 'en' ? `Mobile link: ${mobileUrl}` : `Tautan HP: ${mobileUrl}`);
        }
    };
    return (<section className="card pwa-card" id="pwa-install-card">
      <header className="card-head">
        <div className="pwa-head-title">
          <div className="pwa-head-icon" aria-hidden="true">
            <img src="/favicon.png" alt="" width="26" height="26" style={{ borderRadius: 6, display: 'block' }}/>
          </div>
          <div>
            <h2>{language === 'en' ? 'Mobile App & Offline Mode (PWA)' : 'Aplikasi HP & Mode Offline (PWA)'}</h2>
            <p className="muted small">
              {language === 'en'
            ? 'Install on your phone for home screen access like a native app, plus full offline capability!'
            : 'Pasang di HP biar bisa langsung dibuka dari layar utama kayak aplikasi beneran, plus bisa offline!'}
            </p>
          </div>
        </div>
        <div className="pwa-head-badges">
          <span className={`chip ${isOnline ? 'chip-online' : 'chip-offline'}`}>
            {isOnline ? (language === 'en' ? 'Online' : 'Online') : (language === 'en' ? 'Offline' : 'Offline')}
          </span>
          {isStandalone && (<span className="chip chip-standalone">
              {language === 'en' ? 'Installed' : 'Terpasang di HP'}
            </span>)}
        </div>
      </header>

      {/* Box Aksi Instalasi */}
      <div className="pwa-action-box">
        {isStandalone ? (<div className="pwa-status-box pwa-status-installed">
            <strong className="small">{language === 'en' ? 'App Installed (Standalone)' : 'Aplikasi Sudah Terpasang (Standalone)'}</strong>
            <p className="muted small">
              {language === 'en'
                ? 'App is installed on your device screen! Data remains safe locally and functions smoothly even without network.'
                : 'Aplikasi udah nempel di layar perangkatmu! Data tetap aman tersimpan di HP dan bisa dipake santai walau lagi gak ada sinyal.'}
            </p>
          </div>) : (<div className="pwa-install-banner">
            <div className="pwa-banner-text">
              <strong className="pwa-banner-title">{language === 'en' ? 'Install App to Home Screen' : 'Pasang Aplikasi ke Layar Utama'}</strong>
              <p className="muted small">
                {language === 'en'
                ? 'Launch directly from your Home Screen without opening a browser first, saves memory, works offline.'
                : 'Buka langsung dari Home Screen tanpa perlu buka browser dulu, hemat memori, dan tetap nyala pas offline.'}
              </p>
            </div>
            <button type="button" className="btn btn-primary pwa-install-btn" onClick={handleInstallClick} id="pwa-install-button">
              <span className="pwa-btn-icon" aria-hidden="true">{ICON_INSTALL}</span>
              <span>
                {deferredPrompt
                ? (language === 'en' ? 'Install Now' : 'Pasang Sekarang')
                : (language === 'en' ? 'Install to Phone' : 'Pasang ke HP')}
              </span>
            </button>
          </div>)}

        {/* Petunjuk instalasi iOS Safari yang dapat dibuka oleh siapa saja */}
        {!isStandalone && (<div className="pwa-ios-instructions">
            <button type="button" className="btn btn-ghost btn-sm pwa-ios-toggle-btn" onClick={() => setShowIosGuide((prev) => !prev)} aria-expanded={showIosGuide} style={{ width: '100%', justifyContent: 'space-between', marginBottom: showIosGuide ? 10 : 0 }}>
              <span>{language === 'en' ? 'iOS Guide: Install on iPhone / iPad (Safari iOS)' : 'Panduan Pasang di iPhone / iPad (Safari iOS)'}</span>
              <span>
                {showIosGuide
                ? (language === 'en' ? '▲ Hide Guide' : '▲ Sembunyikan')
                : (language === 'en' ? '▼ View Guide' : '▼ Lihat Cara Pasang')}
              </span>
            </button>
            {showIosGuide && (<ol className="pwa-steps-list small" style={{ marginTop: 8 }}>
                {language === 'en' ? (<>
                    <li>Open this website link in <strong>Safari</strong> on your iPhone/iPad.</li>
                    <li>Tap the <strong>Share</strong> button at the bottom navigation bar of Safari.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right corner. The app is now on your home screen without browser bars!</li>
                  </>) : (<>
                    <li>Buka link aplikasi ini di browser <strong>Safari</strong> iPhone/iPad kamu.</li>
                    <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah navigasi bawah Safari.</li>
                    <li>Gulir menu ke bawah lalu pilih opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
                    <li>Ketuk tombol <strong>Tambah (Add)</strong> di pojok kanan atas. Aplikasi siap dibuka dari layar utama tanpa browser bar!</li>
                  </>)}
              </ol>)}
          </div>)}
      </div>

      {/* Panduan Membuka di HP Lewat Jaringan Wi-Fi Komputer */}
      <div className="pwa-network-box">
        <div className="pwa-network-head">
          <span className="pwa-network-icon" aria-hidden="true">{ICON_WIFI}</span>
          <strong className="small">{language === 'en' ? 'Want to open on your phone? Easy:' : 'Mau Buka di HP? Gampang:'}</strong>
        </div>

        <p className="muted small">
          {language === 'en'
            ? 'Connect your phone to the same Wi-Fi network as this computer, then open this URL in your mobile browser:'
            : 'Sambungin HP kamu ke Wi-Fi yang sama dengan laptop (atau nyalakan Hotspot HP), trus buka alamat ini di browser HP:'}
        </p>

        <div className="pwa-url-bar">
          <code className="pwa-url-code">{mobileUrl}</code>
          <button type="button" className="btn btn-ghost btn-sm pwa-copy-btn" onClick={handleCopyUrl} id="pwa-copy-url-btn">
            {copied
            ? (language === 'en' ? 'Copied' : 'Tersalin')
            : (language === 'en' ? 'Copy Link' : 'Salin Tautan')}
          </button>
        </div>

        <ul className="pwa-tips-list muted small">
          {language === 'en' ? (<>
              <li><strong>Automatic Offline:</strong> After opening once, the app caches files locally and works offline.</li>
              <li><strong>Cloud Sync:</strong> Sign in with the same account across devices to automatically sync via Supabase.</li>
            </>) : (<>
              <li><strong>Otomatis Offline:</strong> Setelah dibuka pertama kali di HP, aplikasi akan menyimpan cache otomatis dan dapat dibuka tanpa kuota.</li>
              <li><strong>Sinkronisasi Cloud:</strong> Masuk dengan akun yang sama di HP dan laptop agar uang jajan kamu tersinkron otomatis via cloud Supabase.</li>
            </>)}
        </ul>
      </div>
    </section>);
}
