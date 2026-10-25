export type Language = 'id' | 'en'

export const DEFAULT_LANGUAGE: Language = 'id'
export const DEVICE_LANGUAGE_KEY = 'kalkulator-duitmu:device-language'

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  id: {
    // Navigasi
    'nav.beranda': 'Beranda',
    'nav.catat': 'Catat',
    'nav.kewajiban': 'Kewajiban',
    'nav.analisis': 'Analisis',
    'nav.tabungan': 'Tabungan',
    'nav.laporan': 'Laporan',
    'nav.data': 'Data',
    'nav.admin': 'Admin',

    // Topbar & Header
    'topbar.expense': '+ Pengeluaran',
    'topbar.income': '+ Pemasukan',
    'topbar.periodPrefix': 'Periode: ',
    'topbar.periodWeek': '1 Minggu',
    'topbar.periodMonth': '1 Bulan',
    'topbar.saved': 'Tersimpan aman',
    'topbar.saving': 'Menyimpan…',
    'topbar.logout': 'Keluar',
    'topbar.adminBadge': 'Admin',
    'topbar.themeDark': 'Mode gelap',
    'topbar.themeLight': 'Mode terang',
    'topbar.cloudSynced': 'Cloud',
    'topbar.cloudSyncing': 'Sync…',
    'topbar.cloudOffline': 'Offline',

    // Beranda Hero
    'hero.title': 'Ringkasan Uang Jajan',
    'hero.desc': 'Yuk pantau jatah jajan, batas aman belanja hari ini, dan kondisi dompetmu!',
    'hero.weekBadge': 'Periode Mingguan',
    'hero.monthBadge': 'Periode Bulanan',

    // WeekCard / Jatah Hari Ini
    'week.title': '7 Hari Terakhir',
    'week.copy': 'Salin ringkasan hari ini',
    'week.meterTitle': 'Jatah Jajan Hari Ini',
    'week.dailyBudget': 'Jatah Hari Ini',
    'week.spent': 'Terpakai',
    'week.remaining': 'Sisa Hari Ini',
    'week.statusSafe': 'Masih Aman',
    'week.statusWarning': 'Hampir Habis',
    'week.statusOver': 'Lebih',
    'week.noBudget': 'Belum ada jatah jajan',
    'week.total7': 'Total belanja 7 hari terakhir',
    'week.copied': 'Ringkasan hari ini disalin',
    'week.copyFail': 'Gagal menyalin ringkasan',

    // Total Aset
    'aset.title': 'Total Aset',
    'aset.walletsPrefix': 'Dari {count} kantong (rekening, e-wallet, tunai)',
    'aset.empty': 'Belum ada saldo nih. Tambah dompetmu di tab Tabungan biar kepantau!',
    'aset.hide': 'Sembunyikan total aset',
    'aset.show': 'Tampilkan total aset',

    // Auth
    'auth.welcome': 'Selamat Datang',
    'auth.tagline': 'Bikin akun dulu yuk, biar catatan keuanganmu tersimpan rapi dan aman.',
    'auth.loginTab': 'Masuk',
    'auth.registerTab': 'Daftar',
    'auth.usernameLabel': 'NAMA PENGGUNA',
    'auth.passwordLabel': 'KATA SANDI',
    'auth.loginBtn': 'Masuk Sekarang',
    'auth.registerBtn': 'Daftar Sekarang',
    'auth.usernameEmpty': 'Nama pengguna belum diisi.',
    'auth.usernameMax': 'Nama pengguna maksimal 24 karakter.',
    'auth.passwordMin': 'Kata sandi minimal 4 karakter.',
  },
  en: {
    // Navigasi
    'nav.beranda': 'Home',
    'nav.catat': 'Record',
    'nav.kewajiban': 'Bills',
    'nav.analisis': 'Analytics',
    'nav.tabungan': 'Savings',
    'nav.laporan': 'Reports',
    'nav.data': 'Data',
    'nav.admin': 'Admin',

    // Topbar & Header
    'topbar.expense': '+ Expense',
    'topbar.income': '+ Income',
    'topbar.periodPrefix': 'Period: ',
    'topbar.periodWeek': '1 Week',
    'topbar.periodMonth': '1 Month',
    'topbar.saved': 'Saved safely',
    'topbar.saving': 'Saving…',
    'topbar.logout': 'Sign Out',
    'topbar.adminBadge': 'Admin',
    'topbar.themeDark': 'Dark mode',
    'topbar.themeLight': 'Light mode',
    'topbar.cloudSynced': 'Cloud',
    'topbar.cloudSyncing': 'Syncing…',
    'topbar.cloudOffline': 'Offline',

    // Beranda Hero
    'hero.title': 'Daily Pocket Summary',
    'hero.desc': 'Track your daily budget, safe-to-spend limit, and wallet balance easily!',
    'hero.weekBadge': 'Weekly Period',
    'hero.monthBadge': 'Monthly Period',

    // WeekCard / Jatah Hari Ini
    'week.title': 'Last 7 Days',
    'week.copy': 'Copy daily summary',
    'week.meterTitle': "Today's Daily Budget",
    'week.dailyBudget': 'Daily Budget',
    'week.spent': 'Spent',
    'week.remaining': 'Remaining',
    'week.statusSafe': 'Safe',
    'week.statusWarning': 'Almost Out',
    'week.statusOver': 'Over by',
    'week.noBudget': 'No budget set yet',
    'week.total7': 'Total spent in last 7 days',
    'week.copied': 'Daily summary copied to clipboard',
    'week.copyFail': 'Failed to copy summary',

    // Total Aset
    'aset.title': 'Total Assets',
    'aset.walletsPrefix': 'From {count} wallets (bank, e-wallet, cash)',
    'aset.empty': 'No balance yet. Add your wallet in the Savings tab to start tracking!',
    'aset.hide': 'Hide total balance',
    'aset.show': 'Show total balance',

    // Auth
    'auth.welcome': 'Welcome',
    'auth.tagline': 'Create an account to keep your finances organized, safe, and private.',
    'auth.loginTab': 'Sign In',
    'auth.registerTab': 'Sign Up',
    'auth.usernameLabel': 'USERNAME',
    'auth.passwordLabel': 'PASSWORD',
    'auth.loginBtn': 'Sign In Now',
    'auth.registerBtn': 'Create Account',
    'auth.usernameEmpty': 'Username cannot be empty.',
    'auth.usernameMax': 'Username maximum 24 characters.',
    'auth.passwordMin': 'Password must be at least 4 characters.',
  },
}

export function getDeviceLanguage(): Language {
  try {
    const saved = localStorage.getItem(DEVICE_LANGUAGE_KEY)
    if (saved === 'id' || saved === 'en') {
      return saved
    }
  } catch {
    // abaikan kesalahan storage
  }
  return DEFAULT_LANGUAGE
}

export function setDeviceLanguage(lang: Language): void {
  try {
    localStorage.setItem(DEVICE_LANGUAGE_KEY, lang)
  } catch {
    // abaikan kesalahan storage
  }
}

export function translate(key: string, lang: Language = DEFAULT_LANGUAGE, params?: Record<string, string | number>): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANGUAGE]
  let text = dict[key] || TRANSLATIONS[DEFAULT_LANGUAGE][key] || key

  if (params) {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal))
    })
  }

  return text
}
