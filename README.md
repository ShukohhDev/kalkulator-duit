# Kalkulator Uang Jajan

Kalkulator uang jajan mingguan/bulanan dengan alokasi default **50/10/5/10/5/20** (makan, transport, pulsa, nongkrong, kebutuhan rumah, tabungan), pencatatan pengeluaran & pemasukan, grafik, target tabungan berbunga **8% per tahun**, laporan bulanan yang bisa dicetak ke PDF, dan mode offline (PWA).

Semua data disimpan di `localStorage` browser; tidak ada server, tidak ada data yang dikirim ke mana pun.

## Fitur

- **Total Aset di halaman depan**: jumlah saldo semua dompet, dengan tombol mata untuk menyembunyikan sementara (`Rp ••••••`, pilihan diingat di browser) kalau ada orang yang melihat layar.
- **Navigasi panel**: chip sticky di atas (Beranda, Catat, Kewajiban, Analisis, Tabungan, Laporan, Data); tiap chip **membuka jendela panel** di atas halaman depan (tutup lewat tombol X, Esc, atau klik latar), chip lain bisa langsung diganti, dan di layar kecil chip bisa digeser.
- **Periode** 1 minggu atau 1 bulan, dengan uang jajan yang **dibagi rata per hari** untuk grafik dan sisa uang.
- **Alokasi per kategori lewat input nominal rupiah**: persen ikut terhitung otomatis, jumlah seluruh alokasi wajib tepat sama dengan uang jajan (ada pesan kurang/lebih), dan kategori bisa ditambah sendiri.
- **2 profil alokasi**: Tinggal di Rumah dan Tinggal di Kos; saat pertama kali ada **wizard onboarding** yang menanyakan profil (Langkah 1) sebelum periode (Langkah 2), lalu profil bisa diganti lewat chip di pemilih periode (ada konfirmasi), rasio nominal tetap bebas diubah dan kategori tetap bisa ditambah; data transaksi tidak ikut berubah. Data lama dengan profil lain otomatis dimigrasi.
- **Kalkulator** lewat **tombol melayang** di pojok kanan bawah: tekan untuk buka, tekan lagi/Esc untuk menutup, dan "Pakai angka" otomatis memakai hasilnya sebagai uang jajan lalu menutup panel. **Tema terang/gelap** juga lewat tombol melayang kedua di atasnya.
- **Pengeluaran**: filter kategori/bulan, pencarian, urut tanggal/nominal, edit & hapus catatan.
- **Urungkan hapus**: menghapus catatan, pemasukan, tagihan, atau utang menampilkan toast **Urungkan** selama beberapa detik.
- **Preset kategori**: dua preset bawaan (Tinggal di Rumah, Tinggal di Kos) dan simpan kategori sendiri jadi preset.
- **Pemasukan lain**: ditambah, diubah, dan dihapus dengan sumber pilihan **Uang Lembaran / Transfer**; uang jajan harian otomatis tercatat sebagai pemasukan.
- **Grafik kas**: harian, mingguan, bulanan, tahunan dengan **jenis grafik pilihan: batang, garis, donut rekap (pemasukan vs pengeluaran), atau donut per kategori**, pilihannya diingat di browser; donut alokasi vs realisasi; perbandingan bulan ini vs bulan lalu; kalender heatmap dengan **penanda kewajiban per tanggal** (titik amber = tagihan, ungu = utang; lingkaran putih = lunas bulan ini) plus legend dan rincian saat tanggal diklik.
- **Tren per kategori**: grafik garis pengeluaran satu kategori (pilih kategori + rentang harian/mingguan/bulanan/tahunan), preferensi rentang diingat di browser.
- **Bukti transaksi**: lampirkan foto struk saat mencatat (diubah dulu jadi JPEG maksimal 1024px, disimpan di IndexedDB browser), lihat lewat tombol **Bukti**, dan ikut terhapus saat catatan dihapus.
- **Kewajiban**: tagihan rutin (listrik, internet, sewa) dan utang berjalan dengan angsuran per bulan; tgl jatuh tempo dipilih lewat **kalender mini 1-28**; tombol bayar ikut **tercatat sebagai pengeluaran kategori "Tagihan" / "Cicilan"**, badge jatuh tempo (H-x, lunas bulan ini), insight pengingat jatuh tempo ≤7 hari, dan **notifikasi browser sekali sehari per tagihan** setelah izin diberikan. Dari detail tanggal di kalender heatmap juga bisa **Tandai lunas** (tagihan) atau **Bayar angsuran** (utang).
- **Dompet & e-wallet**: pencatatan aset (rekening, e-wallet, tunai) dengan saldo yang bisa diedit; **total aset bisa ditampilkan Rp atau USD** lewat toggle, kurs manual (1 USD = Rp ...) disimpan di prefs browser.
- **Target tabungan**: bunga majemuk 8%/tahun (≈0,64%/bulan), beberapa target bisa **aktif diparalel**, rekomendasi setoran dihitung per target.
- **Auto-sync tabungan**: pengeluaran kategori "Ditabung / Investasi" bisa ditujukan ke target tertentu, dan saldonya ikut terhitung di progres target.
- **Wishlist / Incaran Beli**: daftar barang yang ingin dibeli (harga + saldo awal), **tanpa bunga/tanpa umur target**: progres = saldo awal + setoran lewat tombol **Setor** (tercatat sebagai pengeluaran "Ditabung" berhari ini) atau lewat select **Masukkan ke** di form pengeluaran.
- **Laporan bulanan**: ringkasan pemasukan/pengeluaran, rincian per kategori, progres target, dan 5 pengeluaran terbesar; tombol **Cetak / Simpan PDF** memakai dialog cetak browser.
- **Hari Ini** (di jendela Beranda): status harian: tanggal, hari ke-n periode, realisasi vs rencana hari ini (progress bar), dan tombol catat cepat yang hilang otomatis setelah mencatat.
- **Insight otomatis**: kategori yang melebihi alokasi, kartu dompet yang hampir mencapai batas alokasi (badge + insight di 80%), proyeksi uang habis, kekurangan setoran target.
- **Data**: ekspor/impor JSON, **ekspor Excel `.xlsx`** (3 sheet: Transaksi, Ringkasan Kategori, Ringkasan Bulan; header tebal, lebar kolom, baris beku, format Rp), reset data.
- **PWA**: bisa dipasang di home screen dan dibuka **offline** setelah kunjungan pertama.

## Perintah

```bash
npm install        # sekali saat awal
npm run dev        # server development (Vite)
npm test           # unit + smoke test (Vitest, jsdom)
npm run lint       # oxlint
npm run build      # typecheck (tsc -b) + bundle produksi ke dist/
npm run preview    # sajian lokal hasil build
```

## Cara pakai singkat

1. Pilih periode (1 Minggu / 1 Bulan), isi nominal uang jajan, lalu pilih profil (Tinggal di Rumah / Tinggal di Kos). Kalau nominal alokasinya belum pas, klik **Ubah alokasi** (total wajib tepat sama dengan uang jajan).
2. Catat pengeluaran tiap hari lewat chip **Catat**; pakai preset kategori kalau mau kategori lebih spesifik.
3. Buat target tabungan (nama, target, umur target), tandai **Aktif** untuk target yang sedang dikejar.
4. Kalau menabung lewat kategori "Ditabung / Investasi", pilih tujuannya di select **Masukkan ke** (target tabungan atau incaran wishlist). Untuk incaran, bisa juga pakai tombol **Setor** di kartu Wishlist.
5. Buka **Laporan Bulanan**, pilih bulan, lalu **Cetak / Simpan PDF**.

## Struktur

```
src/
  components/     kartu UI (AllowanceCard, ExpensesPanel, SavingsPanel, ReportCard, …)
  hooks/          useAppState: state + sinkronisasi localStorage
  lib/            logika murni (alokasi, derive, savings, report, presets, xlsx, prefs, …)
  __tests__/      smoke test aplikasi (jsdom)
public/
  sw.js           service worker (cache-first aset, network-first navigasi)
  manifest.webmanifest
```

Logika perhitungan sengaja dipisah di `src/lib/*` supaya bisa diuji tanpa DOM; komponen hanya membaca `Derived` hasil `derive(state)`.

## Data & privasi

- Disimpan di `localStorage` dengan kunci `kalkulator-duitmu:v1`; preferensi grafik (rentang + jenis) disimpan terpisah di `kalkulator-duitmu:prefs`.
- **Ekspor JSON** menyalin seluruh state (termasuk preset) ke file; **Impor JSON** memvalidasi ulang tiap field sebelum dipakai; data lama otomatis dimigrasi (profil lama jadi Tinggal di Rumah/Tinggal di Kos, "Transport & Pulsa" dipecah jadi transport + pulsa, kategori bawaan yang hilang ditambahkan).
- Reset data menghapus kunci tersebut.

## Catatan teknis

- React 19 + TypeScript (strict) + Vite, Chart.js untuk grafik, CSS polos dengan variabel tema.
- Bunga dihitung majemuk 8% per tahun; rekomendasi setoran disesuaikan toleransi pembulatan supaya tidak meleset satu bulan.
- Service worker hanya didaftarkan pada build produksi (`import.meta.env.PROD`), jadi mode development tidak pernah ke-cache. Ganti konstanta `CACHE` di `public/sw.js` bila strategi cache berubah.
