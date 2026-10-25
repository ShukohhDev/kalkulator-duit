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
    'topbar.brand': 'Kalkulator Uang Jajan',
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

    // Hero Banner Setiap Tab
    'hero.catat.title': 'Catat Transaksi',
    'hero.catat.desc': 'Catat jajan harian atau duit masuk biar keuanganmu tetap aman dan gak boncos!',
    'hero.catat.badge': '{expenses} pengeluaran · {incomes} pemasukan',
    'catat.switchAll': 'Semua',
    'catat.switchExpenses': 'Pengeluaran',
    'catat.switchIncome': 'Pemasukan',

    'hero.kewajiban.title': 'Kewajiban & Tagihan',
    'hero.kewajiban.desc': 'Catat tagihan dan cicilanmu biar gak ada yang kelupaan atau nunggak!',
    'hero.kewajiban.badge': '{bills} tagihan · {debts} utang',

    'hero.analisis.title': 'Analisis Finansial',
    'hero.analisis.desc': 'Cek skor kesehatan dompet, tren jajan, dan simulasi pengeluaranmu!',
    'hero.analisis.badge': 'Evaluasi otomatis',

    'hero.tabungan.title': 'Tabungan & Aset',
    'hero.tabungan.desc': 'Kumpulin tabungan, pantau saldo dompet, dan wujudkan barang impianmu!',
    'hero.tabungan.badge': '{count} dompet terdaftar',

    'hero.laporan.title': 'Laporan Keuangan',
    'hero.laporan.desc': 'Intip rangkuman keluar-masuk duitmu secara rapi dan siap disalin atau dicetak!',
    'hero.laporan.weekBadge': 'Mode 1 Minggu',
    'hero.laporan.monthBadge': 'Mode 1 Bulan',

    'hero.data.title': 'Pengaturan & Akun',
    'hero.data.desc': 'Atur akunmu, cadangkan data, atau cek riwayat aktivitas kapan aja.',
    'hero.data.badge': 'Akun: {user}',

    'hero.admin.title': 'Panel Kontrol Admin',
    'hero.admin.desc': 'Kelola pengguna terdaftar, status sinkronisasi cloud, dan keamanan sistem.',
    'hero.admin.badge': 'Akses Penuh',

    // Tabungan Akhir Periode (EndSavingsCard)
    'endsavings.title': 'Tabungan Akhir Periode',
    'endsavings.specialBadge': 'Dompet Khusus',
    'endsavings.selectedBadge': 'Dompet Terpilih',
    'endsavings.targetLabel': 'Tujuan simpan saldo akhir periode:',
    'endsavings.defaultOption': 'Dompet Khusus: Tabungan Akhir Periode (Bawaan)',
    'endsavings.emptySpecial': 'Belum ada sisa. Sisa uang jajan tiap periode akan otomatis masuk ke dompet khusus ini dan tersimpan di data dompet.',
    'endsavings.filledSpecial': 'Sisa bersih uang jajan otomatis disapu ke dompet khusus ini saat periode berganti dan tersimpan di data dompet.',
    'endsavings.targetAllocated': 'Sisa bersih uang jajan tiap pergantian periode otomatis dialokasikan ke {wallet} dan menambah saldo dompet tersebut.',
    'endsavings.btnOpenTransfer': 'Pindahkan Saldo ke Dompet / E-wallet',
    'endsavings.transferTitle': 'Pindahkan Saldo ke Dompet',
    'endsavings.chooseDest': 'Pilih dompet tujuan:',
    'endsavings.amountLabel': 'Nominal yang dipindahkan:',
    'endsavings.allBtn': 'Semua',
    'endsavings.cancelBtn': 'Batal',
    'endsavings.confirmBtn': 'Konfirmasi Pindahkan',

    // Dompet & E-wallet (DompetPanel)
    'dompet.title': 'Dompet & E-wallet',
    'dompet.totalAsset': 'Total aset',
    'dompet.autoBadge': 'Otomatis',
    'dompet.specialBadge': 'Khusus',
    'dompet.savingsTargetBadge': 'Tujuan Tabungan',
    'dompet.deleteBtn': 'Hapus',
    'dompet.empty': 'Belum ada dompet nih. Yuk tambahin rekening, e-wallet, atau uang tunai kamu di bawah.',
    'dompet.addBtn': '+ Tambah dompet',
    'dompet.rateAuto': 'kurs otomatis, diperbarui {at}',
    'dompet.rateOffline': 'kurs terakhir, offline',

    // SavingsPanel (Target Tabungan)
    'savings.title': 'Target Tabungan',
    'savings.sub': 'estimasi bunga ~8% per tahun buat bantu wujudin impianmu',
    'savings.ageLabel': 'Umur kamu sekarang',
    'savings.ageUnit': 'tahun (minimal target umur 18 ya)',
    'savings.addBtn': '+ Tambah target baru',
    'savings.active': 'Aktif',
    'savings.inactive': 'Nonaktif',
    'savings.primary': 'Utama',
    'savings.setPrimary': 'Jadikan utama',
    'savings.deleteBtn': 'Hapus',
    'savings.targetAmount': 'Target (Rp)',
    'savings.otherSaved': 'Saldo lain (opsional)',

    // WishlistPanel (Incaran Beli)
    'wishlist.title': 'Wishlist / Incaran Beli',
    'wishlist.sub': 'nabung santai buat beli barang impian tanpa beban target waktu',
    'wishlist.addBtn': '+ Tambah incaran baru',
    'wishlist.empty': 'Belum ada incaran nih. Yuk tulis barang impianmu!',
    'wishlist.depositBtn': 'Setor',
    'wishlist.deleteBtn': 'Hapus',

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
    'topbar.brand': 'Pocket Money Calculator',
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

    // Hero Banner Setiap Tab
    'hero.catat.title': 'Record Transactions',
    'hero.catat.desc': 'Log daily expenses or incoming funds so your money stays organized and safe!',
    'hero.catat.badge': '{expenses} expenses · {incomes} income',
    'catat.switchAll': 'All',
    'catat.switchExpenses': 'Expenses',
    'catat.switchIncome': 'Income',

    'hero.kewajiban.title': 'Bills & Obligations',
    'hero.kewajiban.desc': 'Track all your bills, subscriptions, and debts so you never miss a due date!',
    'hero.kewajiban.badge': '{bills} bills · {debts} debts',

    'hero.analisis.title': 'Financial Analytics',
    'hero.analisis.desc': 'Review wallet health scores, spending patterns, and budget projections!',
    'hero.analisis.badge': 'Automatic assessment',

    'hero.tabungan.title': 'Savings & Assets',
    'hero.tabungan.desc': 'Build your savings, monitor wallet balances, and fund your dream wishlist!',
    'hero.tabungan.badge': '{count} wallets registered',

    'hero.laporan.title': 'Financial Reports',
    'hero.laporan.desc': 'Get a neat overview of all your cashflows, ready to copy or export!',
    'hero.laporan.weekBadge': '1-Week Mode',
    'hero.laporan.monthBadge': '1-Month Mode',

    'hero.data.title': 'Settings & Account',
    'hero.data.desc': 'Manage your preferences, backup your data, or check account activity logs.',
    'hero.data.badge': 'Account: {user}',

    'hero.admin.title': 'Admin Control Panel',
    'hero.admin.desc': 'Manage registered users, cloud sync status, and system security.',
    'hero.admin.badge': 'Full Access',

    // Tabungan Akhir Periode (EndSavingsCard)
    'endsavings.title': 'End-of-Period Savings',
    'endsavings.specialBadge': 'Special Wallet',
    'endsavings.selectedBadge': 'Selected Wallet',
    'endsavings.targetLabel': 'Savings destination for period leftover:',
    'endsavings.defaultOption': 'Special Wallet: End-of-Period Savings (Default)',
    'endsavings.emptySpecial': 'No leftover yet. Leftover pocket money from each period will automatically be saved here.',
    'endsavings.filledSpecial': 'Net leftover budget is automatically swept into this special wallet when the period changes.',
    'endsavings.targetAllocated': 'Net leftover budget is automatically swept into {wallet} and added to its balance.',
    'endsavings.btnOpenTransfer': 'Transfer Balance to Wallet / E-wallet',
    'endsavings.transferTitle': 'Transfer Balance to Wallet',
    'endsavings.chooseDest': 'Select destination wallet:',
    'endsavings.amountLabel': 'Amount to transfer:',
    'endsavings.allBtn': 'All',
    'endsavings.cancelBtn': 'Cancel',
    'endsavings.confirmBtn': 'Confirm Transfer',

    // Dompet & E-wallet (DompetPanel)
    'dompet.title': 'Wallets & E-wallets',
    'dompet.totalAsset': 'Total assets',
    'dompet.autoBadge': 'Auto',
    'dompet.specialBadge': 'Special',
    'dompet.savingsTargetBadge': 'Savings Target',
    'dompet.deleteBtn': 'Delete',
    'dompet.empty': 'No wallets yet. Add your bank accounts, e-wallets, or cash below.',
    'dompet.addBtn': '+ Add wallet',
    'dompet.rateAuto': 'auto rate, updated {at}',
    'dompet.rateOffline': 'last rate, offline',

    // SavingsPanel (Target Tabungan)
    'savings.title': 'Savings Targets',
    'savings.sub': 'estimated ~8% annual interest to help achieve your goals',
    'savings.ageLabel': 'Your current age',
    'savings.ageUnit': 'years old (minimum target age is 18)',
    'savings.addBtn': '+ Add savings target',
    'savings.active': 'Active',
    'savings.inactive': 'Inactive',
    'savings.primary': 'Primary',
    'savings.setPrimary': 'Set as primary',
    'savings.deleteBtn': 'Delete',
    'savings.targetAmount': 'Target (Rp)',
    'savings.otherSaved': 'Other balance (optional)',

    // WishlistPanel (Incaran Beli)
    'wishlist.title': 'Wishlist / Dream Items',
    'wishlist.sub': 'save casually for your dream items without strict deadlines',
    'wishlist.addBtn': '+ Add wishlist item',
    'wishlist.empty': 'No wishlist items yet. Add your dream items here!',
    'wishlist.depositBtn': 'Deposit',
    'wishlist.deleteBtn': 'Delete',

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
