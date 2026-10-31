# Panduan Struktur Kodingan Kalkulator Uang Jajan

Dokumen ini disusun khusus sebagai modul pembelajaran komprehensif bagi Anda yang ingin mempelajari arsitektur dan struktur kodingan aplikasi **Kalkulator Uang Jajan**.

Aplikasi ini dibangun menggunakan 8 pilar teknologi inti yang saling terintegrasi secara harmonis:
1. **HTML** (Struktur elemen antarmuka web)
2. **Tailwind CSS** (Styling utilitas modern)
3. **CSS** (Variabel tema, efek glassmorphism, dan responsivitas)
4. **Python** (Bahasa server backend dan pemrosesan logika bisnis)
5. **REST API** (Jalur komunikasi standar antara frontend dan backend)
6. **MySQL** (Basis data relasional untuk penyimpanan permanen yang aman)
7. **JavaScript** (Logika pemrograman interaktif dan manipulasi data di browser)
8. **Node.js** (Lingkungan runtime pengembangan, build tool, dan manajemen paket)

---

## 1. Diagram Arsitektur Sistem

Hubungan kerja kedelapan teknologi dalam aplikasi ini digambarkan melalui alur berikut:

```
[ Pengguna di Browser ]
        |
        v
[ HTML + Tailwind CSS + CSS ] <--> [ JavaScript (React Engine) ]
        |                                       |
        | (Tampilan Visual Interaktif)          | (Panggilan REST API via fetch)
        +---------------------------------------+
                                |
                                v (HTTP JSON Request)
                    [ REST API Endpoint ]
                                |
                                v
                    [ Server Backend Python (FastAPI) ]
                                |
                                v (SQLAlchemy + PyMySQL)
                    [ Basis Data MySQL ]
```

Seluruh proses pengembangan, pengujian otomatis, dan kompilasi proyek diatur oleh **Node.js** bersama Vite dan npm.

---

## 2. Bedah 8 Pilar Teknologi dalam Proyek

### A. HTML (HyperText Markup Language)
HTML bertugas menyusun kerangka visual halaman web, mulai dari judul halaman, wadah konten, tombol, form masukan angka, hingga dialog popover.

- **Lokasi Berkas**:
  - [index.html](file:///c:/projek%20vscode/kalkulator%20duitmu/index.html): Berkas kerangka induk web. Di dalamnya terdapat tag `<head>` untuk informasi SEO, tautan font, konfigurasi viewport mobile, serta elemen `<div id="root"></div>` tempat seluruh komponen dirender ke layar.
  - Komponen antarmuka di dalam folder [src/components](file:///c:/projek%20vscode/kalkulator%20duitmu/src/components): Menggunakan sintaks JSX (JavaScript XML) yang merender tag HTML standar seperti `<header>`, `<main>`, `<section>`, `<button>`, `<input>`, `<form>`, `<select>`, `<dialog>`, dan `<span>`.

- **Contoh Kodingan HTML**:
  ```html
  <!-- index.html -->
  <div id="root"></div>
  ```
  ```jsx
  <!-- src/components/QuickEntry.jsx -->
  <button type="submit" className="btn-primary">
    Simpan Catatan
  </button>
  ```

---

### B. Tailwind CSS
Tailwind CSS adalah framework utilitas yang memungkinkan penataan tata letak, warna, ukuran, dan animasi secara cepat langsung pada kelas elemen HTML tanpa perlu menulis aturan CSS manual yang panjang.

- **Lokasi Berkas**:
  - [vite.config.ts](file:///c:/projek%20vscode/kalkulator%20duitmu/vite.config.ts): Mengaktifkan plugin `@tailwindcss/vite` (Tailwind versi 4).
  - [src/index.css](file:///c:/projek%20vscode/kalkulator%20duitmu/src/index.css): Memuat utilitas Tailwind melalui `@import "tailwindcss" utilities;`.
  - [package.json](file:///c:/projek%20vscode/kalkulator%20duitmu/package.json): Memuat dependensi `tailwindcss` dan `@tailwindcss/vite`.

- **Cara Kerja**:
  Ketika proyek dijalankan atau dibuild, Tailwind membaca seluruh kelas utilitas (seperti `flex`, `grid`, `rounded-xl`, `transition-all`, `w-full`) dan mengompilasinya secara instan ke berkas CSS akhir yang sangat ringan dan cepat.

---

### C. CSS (Cascading Style Sheets)
CSS kustom digunakan untuk mendefinisikan variabel warna tema (mode gelap dan terang), efek kaca modern (glassmorphism), aturan responsif untuk layar handphone dan komputer, serta kunci scroll latar belakang saat jendela popover terbuka.

- **Lokasi Berkas**:
  - [src/index.css](file:///c:/projek%20vscode/kalkulator%20duitmu/src/index.css): Berkas lembar gaya pusat proyek.

- **Konsep Kunci yang Diterapkan**:
  1. **CSS Custom Properties (Variables)**:
     ```css
     :root {
       --bg: #0b1411;
       --card: rgba(18, 32, 27, 0.85);
       --accent-green: #22c55e;
       --text-main: #f0fdf4;
       --border-subtle: rgba(34, 197, 94, 0.2);
     }
     ```
  2. **Glassmorphism**:
     Menggunakan `backdrop-filter: blur(12px)` untuk menghasilkan efek latar belakang transparan menyerupai kaca buram.
  3. **Body Scroll Lock**:
     Mencegah halaman utama bergulir ketika jendela dialog/pilihan terbuka dengan menambahkan kelas `modal-open` pada elemen `body`.
  4. **Responsivitas**:
     Mengatur tombol keluar (logout) dan navigasi agar tetap rapi pada desktop maupun perangkat layar sentuh.

---

### D. Python
Python digunakan sebagai bahasa utama di sisi server (backend). Python mengeksekusi logika pemrosesan data, autentikasi pengguna, pembuatan token keamanan JWT, serta berkomunikasi langsung dengan database.

- **Lokasi Berkas**:
  - [server_python/main.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/main.py): Gerbang utama server Python lokal menggunakan framework FastAPI.
  - [api/index.py](file:///c:/projek%20vscode/kalkulator%20duitmu/api/index.py): Server Python tanpa server (serverless) yang dioptimalkan untuk hosting cloud Vercel.
  - [server_python/auth_helper.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/auth_helper.py): Modul enkripsi kata sandi menggunakan pustaka `bcrypt` dan pembuatan token akses `PyJWT`.
  - [server_python/requirements.txt](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/requirements.txt): Daftar pustaka Python yang digunakan (`fastapi`, `uvicorn`, `sqlalchemy`, `pymysql`, `cryptography`, `bcrypt`, `pyjwt`).

- **Contoh Kodingan Python**:
  ```python
  # server_python/main.py
  from fastapi import FastAPI
  
  app = FastAPI(title="API Kalkulator Uang Jajan")
  
  @app.get("/api/health")
  def health_check():
      return {"status": "ok", "database": "connected"}
  ```

---

### E. REST API (Representational State Transfer API)
REST API adalah protokol standar komunikasi berbasis HTTP yang menghubungkan antarmuka frontend (browser) dengan server backend Python. Semua pertukaran data menggunakan format JSON (JavaScript Object Notation).

- **Daftar Endpoint API Utama**:
  1. `POST /api/auth/register`: Mendaftarkan pengguna baru dengan kata sandi terenkripsi.
  2. `POST /api/auth/login`: Memverifikasi kredensial akun dan menghasilkan token akses JWT.
  3. `GET /api/sync/pull?username=...`: Mengambil seluruh data catatan keuangan pengguna dari server.
  4. `POST /api/sync/push`: Menyimpan dan memperbarui data keuangan pengguna ke basis data server.
  5. `POST /api/upload`: Menerima unggahan foto struk atau bukti transaksi.
  6. `GET /api/health`: Memeriksa kondisi kesiapan server dan status koneksi database.

- **Lokasi Berkas**:
  - Sisi Server: [server_python/routes/auth_routes.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/routes/auth_routes.py) dan [server_python/routes/sync_routes.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/routes/sync_routes.py).
  - Sisi Klien Browser: [src/lib/pythonApi.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/pythonApi.js).

---

### F. MySQL
MySQL bertugas sebagai basis data relasional utama untuk menyimpan informasi pengguna, transaksi pengeluaran, pemasukan, alokasi anggaran, dan catatan aktivitas secara permanen dan terstruktur.

- **Lokasi Berkas**:
  - [server_python/schema.sql](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/schema.sql): Skrip SQL untuk membuat seluruh tabel database MySQL.
  - [server_python/database.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/database.py): Modul koneksi SQLAlchemy yang mendukung driver `pymysql`.
  - [server_python/models.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/models.py): Definisi tabel sebagai kelas Python (Object-Relational Mapping / ORM).

- **Struktur Tabel Relasional**:
  - `users`: Menyimpan id pengguna, nama akun, hash kata sandi, dan role (admin/user).
  - `user_profiles`: Menyimpan pengaturan profil, gaya hidup, nominal uang jajan dasar, dan preferensi tema.
  - `transactions`: Menyimpan setiap transaksi pengeluaran dan pemasukan beserta tanggal, kategori, dompet sumber, dan tautan bukti foto.
  - `allocations`: Menyimpan persentase dan nominal pembagian pos alokasi (misal Makan, Transport, Tabungan).
  - `obligations`: Menyimpan daftar tagihan rutin dan utang piutang.
  - `savings_wallets`: Menyimpan data dompet e-wallet, rekening bank, dan saku tabungan.
  - `activity_logs`: Menyimpan riwayat perubahan data untuk audit.

- **Cara Mengaktifkan MySQL**:
  Atur variabel lingkungan di file `.env`:
  ```env
  DATABASE_URL=mysql+pymysql://root:password_anda@localhost:3306/kalkulator_duit
  ```

---

### G. JavaScript
JavaScript adalah bahasa pemrograman yang berjalan di sisi pengguna (klien). Di proyek ini, JavaScript bertugas menjalankan seluruh logika kalkulasi uang jajan, validasi input, state management reaktif, penanganan klik tombol, dan pembaruan tampilan tanpa perlu refresh halaman.

- **Lokasi Berkas**:
  - [src/lib/derive.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/derive.js): Algoritma inti perhitungan alokasi uang jajan per periode.
  - [src/lib/money.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/money.js): Fungsi format angka mata uang Rupiah dan pembersihan input angka.
  - [src/lib/rates.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/rates.js): Logika konversi kurs mata uang asing.
  - [src/lib/scrollLock.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/scrollLock.js): Logika penguncian scroll layar saat jendela dialog muncul.
  - [src/lib/tips.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/tips.js): Logika rekomendasi penghematan cerdas berdasarkan pola belanja.

---

### H. Node.js
Node.js berfungsi sebagai lingkungan eksekusi (runtime) pada komputer pengembang. Node.js menggerakkan ekosistem alat pengembangan, mengelola pustaka pihak ketiga melalui npm, menjalankan server pengembangan lokal (Vite Dev Server), serta mengeksekusi rangkaian pengujian otomatis.

- **Lokasi Berkas**:
  - [package.json](file:///c:/projek%20vscode/kalkulator%20duitmu/package.json): Berkas manifes proyek yang mendefinisikan skrip perintah (`dev`, `build`, `test`, `preview`) dan daftar paket dependensi.
  - [vite.config.ts](file:///c:/projek%20vscode/kalkulator%20duitmu/vite.config.ts): Konfigurasi alat bundler modern berbasis Node.js yang mengompilasi kode sumber menjadi paket produksi yang optimal.

- **Perintah Penting Berbasis Node.js**:
  - `npm run dev`: Menjalankan server lokal pengembangan dengan fitur pembaruan instan (Hot Module Replacement).
  - `npm test -- --run`: Menjalankan 259 pengujian unit otomatis untuk memverifikasi tidak ada bug atau regresi.
  - `npm run build`: Mengompilasi dan memaketkan seluruh kode sumber ke folder `dist/` untuk siap dideploy ke server produksi.

---

## 3. Alur Eksekusi Data (Langkah demi Langkah)

Mari kita ambil contoh alur saat pengguna mencatat transaksi pengeluaran baru:

1. **Interaksi Pengguna (HTML + Tailwind)**:
   Pengguna mengklik tombol `+ Pengeluaran` di layar. Jendela form popover muncul dengan styling dari Tailwind CSS dan CSS custom.
2. **Pengisian Form & Validasi (JavaScript)**:
   Pengguna mengetik nominal uang dan memilih kategori. Logika JavaScript memvalidasi bahwa nominal lebih besar dari 0 dan kategori yang tersedia hanya berasal dari alokasi yang aktif.
3. **Penguncian Latar Belakang (CSS + JavaScript)**:
   Fungsi di `scrollLock.js` menambahkan kelas `modal-open` pada elemen `body` agar latar belakang tidak bergeser saat pengguna menggulir pilihan kategori.
4. **Pembaruan State Lokal (JavaScript)**:
   Data pengeluaran ditambahkan ke state aplikasi. Kalkulasi sisa uang jajan langsung terupdate secara real-time di layar tanpa refresh.
5. **Pengiriman Data ke Server (REST API via fetch)**:
   Modul `pythonApi.js` mengirim HTTP POST Request berformat JSON ke endpoint `/api/sync/push`.
6. **Pemrosesan di Sisi Server (Python FastAPI)**:
   Server Python menerima request, memeriksa token keamanan pengguna, dan menyusun data transaksi.
7. **Penyimpanan Permanen (MySQL)**:
   Melalui SQLAlchemy ORM dan driver PyMySQL, transaksi dicatat ke dalam tabel `transactions` di basis data MySQL.
8. **Umpan Balik ke Layar (HTML + CSS)**:
   Server membalas dengan status 200 OK. Frontend menampilkan notifikasi toast hijau bahwa data berhasil disimpan dengan aman.

---

## 4. Panduan Menjalankan Proyek Secara Mandiri

### Langkah 1: Menjalankan Frontend (Node.js)
1. Buka terminal di folder proyek:
   ```powershell
   cd "c:\projek vscode\kalkulator duitmu"
   ```
2. Pastikan dependensi sudah terpasang:
   ```powershell
   npm install
   ```
3. Jalankan server pengembangan lokal:
   ```powershell
   npm run dev
   ```
4. Buka alamat `http://localhost:5173` di browser Anda.

---

### Langkah 2: Menjalankan Backend Python (Opsional untuk Server Lokal)
1. Buka terminal baru dan masuk ke folder `server_python`:
   ```powershell
   cd "c:\projek vscode\kalkulator duitmu\server_python"
   ```
2. Pastikan pustaka Python terpasang:
   ```powershell
   pip install -r requirements.txt
   ```
3. Jalankan server Python:
   ```powershell
   python main.py
   ```
4. Server API akan aktif di `http://localhost:8000`. Dokumentasi interaktif Swagger API dapat diakses di `http://localhost:8000/docs`.

---

### Langkah 3: Menghubungkan ke Basis Data MySQL
1. Pastikan layanan MySQL Anda (misalnya melalui XAMPP atau MySQL Server resmi) sudah aktif di port `3306`.
2. Buat database baru bernama `kalkulator_duit`:
   ```sql
   CREATE DATABASE kalkulator_duit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Impor tabel dari berkas [server_python/schema.sql](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/schema.sql).
4. Atur file `.env` di folder `server_python/`:
   ```env
   DATABASE_URL=mysql+pymysql://root:@localhost:3306/kalkulator_duit
   ```
5. Server Python akan otomatis terhubung ke MySQL Anda. Jika MySQL dimatikan, server otomatis beralih menggunakan SQLite lokal tanpa memutus aplikasi.

---

### Langkah 4: Memverifikasi Kesehatan Kode (Pengujian Otomatis)
Jalankan pengujian unit untuk memastikan seluruh fitur bekerja dengan benar:
```powershell
npm test -- --run
```
Hasil pengujian akan menampilkan 259 pengujian lulus dari 33 berkas uji.

---

## 5. Ringkasan Peta Berkas Proyek

| Kategori | Jalur Berkas Kunci | Peran Utama |
| :--- | :--- | :--- |
| **HTML** | [index.html](file:///c:/projek%20vscode/kalkulator%20duitmu/index.html) | Struktur DOM induk dan wadah aplikasi |
| **Tailwind CSS** | [vite.config.ts](file:///c:/projek%20vscode/kalkulator%20duitmu/vite.config.ts) | Kompiler utilitas Tailwind v4 |
| **CSS** | [src/index.css](file:///c:/projek%20vscode/kalkulator%20duitmu/src/index.css) | Variabel tema, glassmorphism, responsive styles |
| **Python** | [server_python/main.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/main.py) | Server backend FastAPI lokal |
| **Python Cloud** | [api/index.py](file:///c:/projek%20vscode/kalkulator%20duitmu/api/index.py) | Serverless Python backend untuk Vercel |
| **REST API Server** | [server_python/routes/sync_routes.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/routes/sync_routes.py) | Endpoint REST API sinkronisasi data |
| **REST API Klien** | [src/lib/pythonApi.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/pythonApi.js) | Pemanggil HTTP REST API dari browser |
| **MySQL Model** | [server_python/models.py](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/models.py) | Definisi tabel relasional SQLAlchemy ORM |
| **MySQL Skema** | [server_python/schema.sql](file:///c:/projek%20vscode/kalkulator%20duitmu/server_python/schema.sql) | DDL SQL murni untuk instalasi database |
| **JavaScript Logika** | [src/lib/derive.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/derive.js) | Algoritma alokasi uang jajan |
| **JavaScript Format** | [src/lib/money.js](file:///c:/projek%20vscode/kalkulator%20duitmu/src/lib/money.js) | Pemformatan mata uang dan parsing angka |
| **Node.js Manifes** | [package.json](file:///c:/projek%20vscode/kalkulator%20duitmu/package.json) | Konfigurasi paket dependensi dan npm scripts |

---
*Dokumen ini diperbarui secara otomatis dan selaras dengan standar produksi Kalkulator Uang Jajan.*
