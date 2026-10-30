# Panduan Pemula: Backend Python & Basis Data MySQL

Dokumen ini ditulis secara ringkas dan praktis untuk membantu Anda memahami serta menjalankan server backend Python dan basis data MySQL pada aplikasi Kalkulator Uang Jajan.

---

## 1. Mengenal Susunan File

Seluruh kode backend terletak di dalam folder `server_python/`:

* **`main.py`**: Pintu masuk utama server FastAPI. Mengatur izin koneksi (CORS) antara frontend dan backend, serta mendaftarkan rute API.
* **`database.py`**: Mengatur koneksi ke MySQL. Sudah dilengkapi fitur cadangan otomatis ke SQLite lokal (`kalkulator_duit.db`) jika MySQL belum diaktifkan.
* **`models.py`**: Mendefinisikan tabel-tabel data (`users`, `user_data`, dan `activity_logs`) menggunakan SQLAlchemy ORM.
* **`auth_helper.py`**: Fungsi bantuan untuk mengenkripsi kata sandi (bcrypt) dan membuat token sesi login (JWT).
* **`routes/auth_routes.py`**: Jalur API pendaftaran akun baru (`/api/auth/register`) dan proses masuk (`/api/auth/login`).
* **`routes/sync_routes.py`**: Jalur API untuk menyimpan data (`/api/sync/push`) dan mengambil data (`/api/sync/pull`).
* **`schema.sql`**: Skrip SQL murni jika Anda ingin membuat tabel MySQL secara manual melalui phpMyAdmin.
* **`jalankan_server.bat`**: File peluncur cepat untuk menyalakan server di Windows hanya dengan 1 kali klik ganda.

---

## 2. Cara Cepat Menjalankan Server (Mode SQLite Bawaan)

Anda bisa langsung menyalakan server tanpa perlu menginstal atau menyalakan MySQL terlebih dahulu:

1. Buka folder `server_python/`.
2. Klik ganda file **`jalankan_server.bat`** (atau buka terminal dan ketik `python -m uvicorn main:app --reload`).
3. Server akan langsung aktif di alamat: `http://localhost:8000`.
4. Buka peramban (browser) dan akses alamat:
   **`http://localhost:8000/docs`**
   Anda akan melihat halaman Swagger UI yang memungkinkan Anda mencoba setiap fitur API (daftar, login, simpan data) secara interaktif langsung dari browser.

---

## 3. Cara Menghubungkan ke Basis Data MySQL

Jika Anda ingin menyimpan data ke server MySQL (misalnya lewat XAMPP, Laragon, atau hosting VPS):

### Langkah 1: Buat Database di MySQL
1. Buka **phpMyAdmin** atau program pengelola database Anda.
2. Buat database baru dengan nama `kalkulator_duit`.
3. (Opsional) Anda dapat mengimpor file `server_python/schema.sql`, atau biarkan Python membuat tabelnya secara otomatis.

### Langkah 2: Buat File `.env`
1. Salin file `.env.example` lalu ubah namanya menjadi `.env` di dalam folder `server_python/`.
2. Buka file `.env` dan masukkan baris berikut:

```env
PORT=8000
JWT_SECRET=rahasia_kalkulator_uang_jajan_shukohdev_2026
DATABASE_URL=mysql+pymysql://root:@localhost:3306/kalkulator_duit
```

> **Catatan format URL MySQL:**
> `mysql+pymysql://[username]:[password]@[host]:[port]/[nama_database]`
> Contoh pengguna default XAMPP tanpa kata sandi: `mysql+pymysql://root:@localhost:3306/kalkulator_duit`

### Langkah 3: Nyalakan Ulang Server
Jalankan kembali file `jalankan_server.bat`. Server sekarang sudah resmi tersambung ke basis data MySQL Anda.

---

## 4. Alur Komunikasi Frontend dan Backend

1. **Frontend (HTML, CSS, JavaScript, TypeScript)**:
   * Saat pengguna mencatat pengeluaran atau mengubah anggaran, data langsung diperbarui di antarmuka dan disimpan ke `localStorage` browser agar website tetap bekerja saat offline.
   * Modul `src/lib/cloudSync.ts` dan `src/lib/pythonApi.ts` secara otomatis mengirim data ke endpoint Python `POST http://localhost:8000/api/sync/push`.
2. **Backend (Python FastAPI)**:
   * Menerima kiriman data dari browser.
   * Memvalidasi identitas pengguna.
3. **Database (MySQL)**:
   * Menyimpan akun pengguna pada tabel `users`.
   * Menyimpan seluruh riwayat dan transaksi pada tabel `user_data`.
