# Kalkulator Uang Jajan

Kalkulator uang jajan mingguan/bulanan dengan alokasi **50/20/10/20**, pencatatan pengeluaran & pemasukan, grafik, target tabungan berbunga **8% per tahun**, laporan bulanan yang bisa dicetak ke PDF, dan mode offline (PWA).

Semua data disimpan di `localStorage` browser — tidak ada server, tidak ada data yang dikirim ke mana pun.

## Fitur

- **Periode** 1 minggu atau 1 bulan, dengan uang jajan yang **dibagi rata per hari** untuk grafik dan sisa uang.
- **Alokasi 50/20/10/20**: makan 50%, transport 20%, nongkrong 10%, tabungan 20% — bisa ditambah kategori sendiri.
- **Kalkulator sederhana** di sidebar, hasilnya bisa langsung dipakai sebagai nominal uang jajan.
- **Pengeluaran**: filter kategori/bulan, pencarian, urut tanggal/nominal, edit & hapus catatan.
- **Preset kategori**: tiga preset bawaan (Anak Kos, Mahasiswa, Karyawan) dan simpan kategori sendiri jadi preset.
- **Pemasukan lain**: ditambah, diubah, dan dihapus — uang jajan harian otomatis tercatat sebagai pemasukan.
- **Grafik kas**: harian, mingguan, bulanan, tahunan; donut alokasi vs realisasi; perbandingan bulan ini vs bulan lalu; kalender heatmap.
- **Target tabungan**: bunga majemuk 8%/tahun (≈0,64%/bulan), beberapa target bisa **aktif diparalel**, rekomendasi setoran dihitung per target.
- **Auto-sync tabungan**: pengeluaran kategori "Ditabung / Investasi" bisa ditujukan ke target tertentu, dan saldonya ikut terhitung di progres target.
- **Laporan bulanan**: ringkasan pemasukan/pengeluaran, rincian per kategori, progres target, dan 5 pengeluaran terbesar — tombol **Cetak / Simpan PDF** memakai dialog cetak browser.
- **Kebiasaan (streak) & badge**: 6 badge untuk konsistensi mencatat.
- **Insight otomatis**: kategori yang melebihi alokasi, proyeksi uang habis, kekurangan setoran target.
- **Data**: ekspor/impor JSON, reset data, tema terang/gelap.
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

1. Pilih periode (1 Minggu / 1 Bulan), isi nominal uang jajan.
2. Catat pengeluaran tiap hari; pakai preset kategori kalau mau kategori lebih spesifik.
3. Buat target tabungan (nama, target, umur target), tandai **Aktif** untuk target yang sedang dikejar.
4. Kalau menabung lewat kategori "Ditabung / Investasi", pilih targetnya di select **Masukkan ke target**.
5. Buka **Laporan Bulanan**, pilih bulan, lalu **Cetak / Simpan PDF**.

## Struktur

```
src/
  components/     kartu UI (AllowanceCard, ExpensesPanel, SavingsPanel, ReportCard, …)
  hooks/          useAppState — state + sinkronisasi localStorage
  lib/            logika murni (alokasi, derive, savings, report, presets, …)
  __tests__/      smoke test aplikasi (jsdom)
public/
  sw.js           service worker (cache-first aset, network-first navigasi)
  manifest.webmanifest
```

Logika perhitungan sengaja dipisah di `src/lib/*` supaya bisa diuji tanpa DOM; komponen hanya membaca `Derived` hasil `derive(state)`.

## Data & privasi

- Disimpan di `localStorage` dengan kunci `kalkulator-duitmu:v1`.
- **Ekspor JSON** menyalin seluruh state (termasuk preset) ke file; **Impor JSON** memvalidasi ulang tiap field sebelum dipakai.
- Reset data menghapus kunci tersebut.

## Catatan teknis

- React 19 + TypeScript (strict) + Vite, Chart.js untuk grafik, CSS polos dengan variabel tema.
- Bunga dihitung majemuk 8% per tahun; rekomendasi setoran disesuaikan toleransi pembulatan supaya tidak meleset satu bulan.
- Service worker hanya didaftarkan pada build produksi (`import.meta.env.PROD`), jadi mode development tidak pernah ke-cache. Ganti konstanta `CACHE` di `public/sw.js` bila strategi cache berubah.
