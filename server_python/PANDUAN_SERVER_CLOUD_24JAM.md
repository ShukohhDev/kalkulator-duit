# Panduan Menjalankan Server Python 24 Jam Nonstop di Cloud (100% Gratis Tanpa Kartu Kredit)

Dokumen ini memandu Anda langkah demi langkah agar server Python backend berjalan otomatis 24 jam di internet, sehingga laptop Anda bebas dimatikan kapan saja.

---

## Pilihan Utama: Koyeb (Rekomendasi Terbaik & 100% Gratis)

Koyeb adalah penyedia server cloud modern yang menyediakan paket **Free Eco** selamanya tanpa meminta kartu kredit saat mendaftar. Server akan berjalan 24 jam penuh dan terhubung otomatis dengan GitHub Anda.

### Langkah-langkah Menghubungkan ke Koyeb:

1. **Daftar Akun Gratis di Koyeb**:
   - Buka situs: `https://app.koyeb.com/auth/signup`
   - Pilih tombol **Continue with GitHub** (masuk menggunakan akun GitHub Anda).
   - Tidak ada permintaan nomor kartu kredit.

2. **Buat Layanan Web Baru (Create App)**:
   - Di dashboard Koyeb, klik tombol **Create Service** atau **Create App**.
   - Pilih sumber deploy: **GitHub**.
   - Berikan izin Koyeb untuk mengakses repositori Anda: `kalkulator-duit`.

3. **Pengaturan Konfigurasi (Sangat Mudah)**:
   - **Branch**: Pilih `master`.
   - **Work Directory**: Ubah menjadi `server_python` (karena kode server Python kita berada di dalam folder `server_python`).
   - **Build Type**: Pilih **Dockerfile** atau **Buildpack** (berkas `Dockerfile` sudah kami siapkan otomatis).
   - **Port**: Isi dengan `8000`.
   - **Instance Type**: Pilih **Free Eco (Nano)** yang berlabel `Free`.

4. **Klik Deploy**:
   - Klik tombol **Deploy** di pojok kanan bawah.
   - Tunggu 1 hingga 2 menit hingga status berubah menjadi **Healthy** berwarna hijau.
   - Koyeb akan memberikan tautan publik HTTPS gratis, contoh: `https://kalkulator-duit-shukoh.koyeb.app`.

5. **Server Otomatis Berjalan 24 Jam**:
   - Server Anda sekarang sudah aktif 24 jam nonstop di internet.
   - Anda bisa mematikan laptop Anda, dan server tetap melayani pengunjung website.
   - Setiap kali Anda melakukan perubahan kode dan push ke GitHub, Koyeb akan otomatis memperbarui server tanpa perlu tindakan apa pun dari Anda.

---

## Menghubungkan Tautan Server Cloud ke Website Anda

Setelah Anda mendapatkan tautan dari Koyeb (misal: `https://kalkulator-duit-shukoh.koyeb.app`):
1. Buka website kalkulator uang jajan Anda di: `https://kalkulator-duit.shukohdev.web.id/`.
2. Masuk ke menu Pengaturan / Database.
3. Tempelkan (*paste*) URL server cloud Anda ke kolom URL Server Python.
4. Selesai! Seluruh sinkronisasi data akan langsung terhubung ke server cloud 24 jam Anda.

