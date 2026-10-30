<div align="center">
  <img src="public/logo.png" alt="Logo Kalkulator Uang Jajan" width="120" />
  <h1>Kalkulator Uang Jajan</h1>
  <p>Aplikasi web manajemen uang saku dan pencatatan keuangan pribadi harian, mingguan, serta bulanan.</p>
  <p>
    <a href="https://kalkulator-duit.shukohdev.web.id/"><strong>Website Resmi: kalkulator-duit.shukohdev.web.id</strong></a>
  </p>
</div>

Aplikasi kalkulator keuangan pribadi yang dirancang cepat, simpel, dan bekerja secara offline (PWA). Membantu membagi anggaran uang saku, memantau pengeluaran, mencatat tagihan rutin, serta memonitor target tabungan.

- **Link Website**: [https://kalkulator-duit.shukohdev.web.id/](https://kalkulator-duit.shukohdev.web.id/)

## Fitur Utama

- **Alokasi Uang Saku**: Pembagian anggaran per kategori sesuai profil (Tinggal di Rumah / Kos) dengan persentase fleksibel.
- **Pencatatan Cepat**: Catat pemasukan dan pengeluaran harian dengan dukungan lampiran bukti foto.
- **Kewajiban & Tagihan**: Pengingat tagihan rutin dan cicilan utang bulanan lengkap dengan kalender mini.
- **Target Tabungan**: Kelola target simpanan berbunga majemuk, wishlist impian, serta dana musiman.
- **Analisis & Laporan**: Grafik arus kas visual, evaluasi kesehatan keuangan, dan ekspor laporan ke format PDF atau Excel (.xlsx).
- **Multi-Akun Lokal**: Pisahkan data tiap pengguna di perangkat yang sama dengan kata sandi terenkripsi.
- **Sinkronisasi Cloud & Backend Mandiri**: Mendukung sinkronisasi ke backend Python (FastAPI) dengan basis data MySQL/SQLite lokal, serta sinkronisasi cloud Supabase opsional.
- **PWA & Akses Offline**: Dapat diinstal di Android, iOS, maupun desktop dan tetap berfungsi tanpa koneksi internet.

## Teknologi

- **Frontend**: HTML5, Vanilla CSS3, JavaScript, TypeScript, React 19, Chart.js, Vite
- **Backend**: Python 3 (FastAPI, Uvicorn, SQLAlchemy ORM)
- **Basis Data**: MySQL & SQLite (didukung penuh)
- **Penyimpanan Klien**: LocalStorage, IndexedDB, & PWA Cache API

## Menjalankan Proyek

### 1. Menjalankan Frontend (Web)

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

### 2. Menjalankan Backend Python & MySQL

```bash
# Buka direktori server Python
cd server_python

# Pasang dependensi Python
pip install -r requirements.txt

# Jalankan server FastAPI (port 8000)
# Pada Windows, Anda juga bisa langsung klik ganda: jalankan_server.bat
python -m uvicorn main:app --reload
```

Dokumentasi interaktif API dapat langsung diakses di browser melalui alamat `http://localhost:8000/docs`. Panduan lengkap pemula tersedia di file `server_python/PANDUAN_PEMULA.md`.

## Privasi Data

Data transaksi dan anggaran tersimpan aman di browser Anda melalui `localStorage` dan `IndexedDB`. Jika Anda mengaktifkan sinkronisasi cloud atau server Python pribadi, data akun Anda disinkronkan ke basis data terproteksi.
