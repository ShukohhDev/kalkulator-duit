<div align="center">
  <img src="public/logo.png" alt="Logo Kalkulator Uang Jajan" width="120" />
  <h1>Kalkulator Uang Jajan</h1>
  <p>Aplikasi web manajemen uang saku dan pencatatan keuangan pribadi harian, mingguan, serta bulanan.</p>
</div>

Aplikasi kalkulator keuangan pribadi yang dirancang cepat, simpel, dan bekerja secara offline (PWA). Membantu membagi anggaran uang saku, memantau pengeluaran, mencatat tagihan rutin, serta memonitor target tabungan.

## Fitur Utama

- **Alokasi Uang Saku**: Pembagian anggaran per kategori sesuai profil (Tinggal di Rumah / Kos) dengan persentase fleksibel.
- **Pencatatan Cepat**: Catat pemasukan dan pengeluaran harian dengan dukungan lampiran bukti foto.
- **Kewajiban & Tagihan**: Pengingat tagihan rutin dan cicilan utang bulanan lengkap dengan kalender mini.
- **Target Tabungan**: Kelola target simpanan berbunga majemuk, wishlist impian, serta dana musiman.
- **Analisis & Laporan**: Grafik arus kas visual, evaluasi kesehatan keuangan, dan ekspor laporan ke format PDF atau Excel (.xlsx).
- **Multi-Akun Lokal**: Pisahkan data tiap pengguna di perangkat yang sama dengan kata sandi terenkripsi.
- **Sinkronisasi Cloud (Opsional)**: Mendukung sinkronisasi akun Supabase bagi pengguna yang ingin menyinkronkan data antar perangkat.
- **PWA & Akses Offline**: Dapat diinstal di Android, iOS, maupun desktop dan tetap berfungsi tanpa koneksi internet.

## Teknologi

- React 19
- TypeScript
- Vite
- Chart.js
- Vanilla CSS (Desain bersih dan responsif)
- IndexedDB & LocalStorage
- Supabase (Autentikasi & sinkronisasi data opsional)

## Menjalankan Proyek

```bash
# Pasang dependensi
npm install

# Jalankan server pengembangan
npm run dev

# Jalankan pengujian
npm test

# Build untuk produksi
npm run build
```

## Privasi Data

Data transaksi dan anggaran tersimpan aman di browser Anda melalui `localStorage` dan `IndexedDB`. Jika Anda mengaktifkan sinkronisasi cloud, data akun Anda disinkronkan ke database Supabase pribadi.
