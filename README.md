# Kalkulator Uang Jajan

Kalkulator uang jajan mingguan/bulanan dengan alokasi default **30/20/5/15/7/20/3** (makan, transport, pulsa, nongkrong, dana darurat, ditabung, langganan), pencatatan pengeluaran & pemasukan, grafik, target tabungan berbunga **8% per tahun**, laporan bulanan yang bisa dicetak ke PDF, dan mode offline (PWA).

Semua data disimpan di `localStorage` browser (terpisah per akun); tidak ada server, tidak ada data yang dikirim ke mana pun.

## Fitur

- **Akun & login wajib**: saat pertama buka ada layar **Daftar/Masuk** berdesain split — panel branding di kiri + kartu form di kanan (nama pengguna + kata sandi dengan tombol mata untuk menampilkan/menyembunyikan, disimpan ter-hash di browser) supaya data tiap pengguna di satu perangkat terpisah — bukan keamanan server. Data yang sudah ada di browser jadi milik **akun pertama**; sesi bertahan selama tab/browser terbuka, tombol **Keluar** di topbar mengembalikan ke layar masuk.
- **Catatan Aktivitas**: riwayat masuk/keluar akun serta pemasukan & pengeluaran baru (termasuk catatannya) di halaman **Data**, tersimpan maksimal 200 entri terbaru.
- **Beranda = halaman depan**: langsung terlihat saat dibuka, diawali **Total Aset** (jumlah saldo semua dompet, tombol mata untuk menyembunyikan sementara `Rp ••••••`, pilihan diingat di browser), lalu kartu Uang Jajan, 7 Hari Terakhir, dompet, dan insight.
- **Navigasi halaman biasa**: chip sticky di atas (Beranda, Catat, Kewajiban, Analisis, Tabungan, Laporan, Data); chip menukar konten di halaman berukuran sama seperti Beranda (tanpa latar gelap, tanpa jendela), tekan Esc atau klik chip Beranda untuk kembali, chip lain bisa langsung diganti, dan di layar kecil chip bisa digeser.
- **Catat cepat dari topbar**: tombol **+ Pengeluaran** dan **+ Pemasukan** membuka **popover form ringkas** yang menempel di bawah tombol (tanggal, kategori/sumber, nominal), bisa dibuka dari halaman mana pun dan tetap terbuka setelah disimpan supaya bisa mencatat beruntun; tekan Esc, klik di luar, atau tekan tombolnya lagi untuk menutup. **Shortcut keyboard `E`** membuka form pengeluaran dan **`P`** form pemasukan (diabaikan saat sedang mengetik di input).
- **Kartu 7 Hari Terakhir**: sparkline pengeluaran harian 7 hari terakhir plus totalnya, dan tombol **Salin ringkasan hari ini** yang menyalin tanggal, total, serta rincian per kategori ke clipboard.
- **Periode** 1 minggu atau 1 bulan, dengan uang jajan yang **dibagi rata per hari** untuk grafik dan sisa uang.
- **Pemasukan tidak tetap** (bonus/pekerja lepas): toggle di kartu Uang Jajan lalu isi **pemasukan tertinggi**; semua hitungan (alokasi, per hari, sisa) tetap memakai **dasar/minimum**, batas atas hanya untuk **skenario bonus** — selisihnya dibagi persentase yang bisa diubah (bawaan **50% tabungan / 30% dana darurat & target / 20% keinginan**) dengan total persen dicek otomatis.
- **Tabungan akhir periode**: saat periode berganti (atau minggu→bulan), sisa uang jajan tiap kategori otomatis disapu ke pot **Tabungan akhir periode** di halaman **Tabungan** (tanpa tombol manual); pot ini dihitung dari sisa alokasi yang belum terpakai dan bisa ditarik sebagai sumber setoran.
- **Uang tanggal tua**: kalau laju pengeluaran diproyeksikan melebihi uang jajan, kartu **Uang tanggal tua** menawarkan rencana alokasi sisa periode — potong **keinginan** dulu (dan tabungan hanya kalau kebutuhan harian saja belum kecakup, dengan nominal kekurangannya ditampilkan), semua persen disesuaikan ulang ke total 100%, lalu tombol **Terapkan rencana alokasi** (tidak otomatis; kartu hilang begitu rencana diterapkan).
- **Peringatan otomatis**: kartu **Peringatan** di Beranda menyala saat kategori mendekati (≥80%) atau melebihi alokasi periode berjalan, atau saat sisa uang tidak cukup menutup kebutuhan sisa hari — bisa ditutup per baris, dan kalau izin notifikasi browser diberikan tiap peringatan juga dikirim paling banyak **1x sehari**.
- **Gaya hidup** (Seimbang/Hemat/Santai) di kartu **Uang Jajan**, sejajar kanan tombol **Pemasukan tidak tetap**: mengalikan persen per jenis kategori (keinginan, tabungan) lalu menormalkan kembali ke 100%; pilihan gaya hidup **ditumpuk di profil alokasi** dan otomatis diterapkan ulang saat berganti profil Tinggal di Rumah/Tinggal di Kos.
- **Tips Hemat**: kartu di Beranda berisi saran yang dihitung dari pola belanjamu periode berjalan — kategori keinginan dominan (saran pangkas 20%), belum ada setoran Ditabung, pengeluaran menumpuk di akhir pekan, atau banyak transaksi kecil; maksimal 3 tips.
- **Hasil alokasi berbentuk kartu** seperti Kartu Saku (nominal + persen per kategori): **nominal tiap kartu bisa langsung diedit** — persen otomatis menyesuaikan terhadap uang jajan (kartu nonaktif saat uang jajan 0, nominal 0 menunggu konfirmasi saat fokus pindah), dan **total persen alokasi diberi peringatan bila ≠ 100%**; dan **editor Ubah alokasi berupa tabel persen ala spreadsheet**: dua kolom profil (aktif bisa diubah, profil lain hanya referensi), sel persen biru, baris **Total** dan **Cek 100%** dihitung otomatis, kolom **Opsional** untuk mematikan kategori (persentasenya dibagi proporsional ke kategori lain), plus tombol tambah kategori dan Kurangi (set ke 0, riwayat catatan aman).
- **2 profil alokasi**: Tinggal di Rumah dan Tinggal di Kos dengan rasio bawaan sesuai kebutuhan masing-masing (termasuk kategori sewa kos, belanja bulanan, laundry); saat pertama kali ada **wizard onboarding** yang menanyakan profil (Langkah 1) sebelum periode (Langkah 2), lalu profil bisa diganti lewat chip di pemilih periode (ada konfirmasi), persen tetap bebas diubah dan kategori tetap bisa ditambah; data transaksi tidak ikut berubah. Data lama dengan profil lain otomatis dimigrasi.
- **Kalkulator** lewat **tombol melayang** di pojok kanan bawah: tekan untuk buka, tekan lagi/Esc untuk menutup, dan "Pakai angka" otomatis memakai hasilnya sebagai uang jajan lalu menutup panel. Punya tab **Terbalik**: isi target, saldo yang sudah ada, dan tenggat dalam bulan → hasilkan sisa yang dibutuhkan serta setoran per bulan/minggu/hari (dibagi rata, tanpa bunga). **Tema terang/gelap** juga lewat tombol melayang kedua di atasnya.
- **Pengeluaran**: filter kategori/bulan, pencarian, urut tanggal/nominal, edit & hapus catatan.
- **Urungkan hapus**: menghapus catatan, pemasukan, tagihan, atau utang menampilkan toast **Urungkan** selama beberapa detik.
- **Pemasukan lain**: ditambah, diubah, dan dihapus dengan sumber pilihan **Uang Lembaran / Transfer**; uang jajan harian otomatis tercatat sebagai pemasukan. Setiap pemasukan punya **foto bukti (opsional)** dan tujuan **Masukkan ke** — uang jajan (menambah uang jajan periode), **Saku Tabungan** (pot Tabungan akhir periode), atau salah satu dompet — efeknya mengikuti saat diedit/dihapus, lengkap dengan toast **Urungkan**.
- **Grafik kas**: harian, mingguan, bulanan, tahunan dengan **jenis grafik pilihan: batang, garis, donut rekap (pemasukan vs pengeluaran), atau donut per kategori**, pilihannya diingat di browser; donut alokasi vs realisasi; perbandingan bulan ini vs bulan lalu; kalender heatmap dengan **penanda kewajiban per tanggal** (titik amber = tagihan, ungu = utang; lingkaran putih = lunas bulan ini) plus legend dan rincian saat tanggal diklik.
- **Tren per kategori**: grafik garis pengeluaran satu kategori (pilih kategori + rentang harian/mingguan/bulanan/tahunan), preferensi rentang diingat di browser.
- **Bukti transaksi**: lampirkan foto struk saat mencatat (diubah dulu jadi JPEG maksimal 1024px, disimpan di IndexedDB browser), lihat lewat tombol **Bukti**, dan ikut terhapus saat catatan dihapus — field yang sama juga tersedia di **form catat cepat** dari topbar.
- **Kewajiban**: tagihan rutin (listrik, internet, sewa) dan utang berjalan dengan angsuran per bulan; tgl jatuh tempo dipilih lewat **kalender mini 1-28**; tombol bayar ikut **tercatat sebagai pengeluaran kategori "Tagihan" / "Cicilan"**, badge jatuh tempo (H-x, lunas bulan ini), insight pengingat jatuh tempo ≤7 hari, dan **notifikasi browser sekali sehari per tagihan** setelah izin diberikan. Dari detail tanggal di kalender heatmap juga bisa **Tandai lunas** (tagihan) atau **Bayar angsuran** (utang). Tombol **Ekspor .ics** mengunduh semua tagihan & angsuran utang sebagai kalender iCalendar (bulanan pada jatuh tempo berikutnya; angsuran berhenti otomatis lewat `COUNT` sesuai sisa utang).
- **Dompet & e-wallet**: pencatatan aset (rekening, e-wallet, tunai) dengan saldo yang bisa diedit; **total aset bisa ditampilkan Rp atau USD** lewat toggle dengan **kurs otomatis** — diambil dari API kurs saat pertama dibuka / dipilih USD, di-cache 24 jam di browser (kurs terakhir dipakai saat offline).
- **Target tabungan**: bunga majemuk 8%/tahun (≈0,64%/bulan), beberapa target bisa **aktif diparalel**, rekomendasi setoran dihitung per target.
- **Auto-sync tabungan**: pengeluaran kategori "Ditabung" bisa ditujukan ke target tertentu, dan saldonya ikut terhitung di progres target.
- **Dana musiman** di halaman **Tabungan** (terpisah dari Target Tabungan): wadah tanpa bunga untuk lebaran/sekolah/liburan — nama, target, tanggal tujuan opsional (hitung mundur hari), progres = saldo awal + setoran lewat tombol **Setor** dari **sumber pilihan: Saku Tabungan atau salah satu dompet** (saldo dicek dulu — kalau kurang, muncul toast dan setoran dibatalkan; setoran tetap tercatat sebagai "Ditabung" dengan penanda dana musiman).
- **Wishlist / Incaran Beli**: daftar barang yang ingin dibeli (harga + saldo awal), **tanpa bunga/tanpa umur target**: progres = saldo awal + setoran lewat tombol **Setor** (tercatat sebagai pengeluaran "Ditabung" berhari ini) atau lewat select **Masukkan ke** di form pengeluaran.
- **Laporan bulanan**: ringkasan pemasukan/pengeluaran, rincian per kategori, progres target, dan 5 pengeluaran terbesar; tombol **Cetak / Simpan PDF** memakai dialog cetak browser.
- **Insight otomatis**: kategori yang melebihi alokasi, kartu dompet yang hampir mencapai batas alokasi (badge + insight di 80%), proyeksi uang habis, kekurangan setoran target.
- **Bagaimana Kalau** di halaman **Analisis**: simulasi tanpa menyimpan — ubah uang jajan (−30%…+30%) dan laju pengeluaran (turun/naik) lewat select persen; kartu menampilkan uang jajan skenario, proyeksi pengeluaran akhir periode, perkiraan sisa, dan boleh belanja per hari.
- **Skor Kesehatan Keuangan** di halaman **Analisis**: skor 0–100 + predikat dari 4 indikator (bobot 30/30/20/20): rasio tabungan vs pemasukan periode (target 20%), cadangan tabungan (total setoran Ditabung) vs 3× kewajiban, beban kewajiban per bulan (nyaman ≤30%), dan kepatuhan alokasi (berapa kategori melewati batasnya) — lengkap dengan rincian tiap indikator.
- **Tantangan Hemat** di Beranda: otomatis tiap periode, tanpa perlu disetel — belanja maksimal **80% uang jajan**; kartu menampilkan progres, sisa kuota, status (di jalur/lolos/kelebihan), **poin** dari periode lampau yang berhasil (maksimal 12 periode terakhir yang punya catatan), dan deret kemenangan beruntun.
- **Salin ringkasan laporan**: tombol di kartu Laporan Bulanan menyalin ringkasan bulan terpilih (uang jajan, pemasukan, pengeluaran, sisa, rincian per kategori, 5 pengeluaran terbesar) sebagai teks ke clipboard.
- **Data**: ekspor/impor JSON, **ekspor Excel `.xlsx`** (3 sheet: Transaksi, Ringkasan Kategori, Ringkasan Bulan; header tebal, lebar kolom, baris beku, format Rp), reset data.
- **Laporkan Masalah** di halaman **Data**: pilih jenis (Bug/Kritik/Saran), tulis ceritanya (halaman aktif terisi otomatis, bisa diganti), tombol **Salin laporan** menyalin template siap tempel ke GitHub Issues (`[Jenis] Kalkulator Uang Jajan`, browser, halaman, pesan).
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

1. Pilih periode (1 Minggu / 1 Bulan), isi nominal uang jajan, lalu pilih profil (Tinggal di Rumah / Tinggal di Kos). Kalau persen alokasinya belum pas, klik **Ubah alokasi** (tabel persen, total wajib 100%).
2. Catat pengeluaran tiap hari lewat tombol **+ Pengeluaran** di topbar (popover di bawah tombol, atau tekan `E`) atau chip **Catat**.
3. Buat target tabungan (nama, target, umur target), tandai **Aktif** untuk target yang sedang dikejar.
4. Kalau menabung lewat kategori "Ditabung", pilih tujuannya di select **Masukkan ke** (target tabungan atau incaran wishlist). Untuk incaran, bisa juga pakai tombol **Setor** di kartu Wishlist.
5. Buka **Laporan Bulanan**, pilih bulan, lalu **Cetak / Simpan PDF**.

## Struktur

```
src/
  components/     kartu UI (AllowanceCard, ExpensesPanel, SavingsPanel, ReportCard, …)
  hooks/          useAppState: state + sinkronisasi localStorage
  lib/            logika murni (alokasi, derive, savings, report, xlsx, prefs, …)
  __tests__/      smoke test aplikasi (jsdom)
public/
  sw.js           service worker (cache-first aset, network-first navigasi)
  manifest.webmanifest
```

Logika perhitungan sengaja dipisah di `src/lib/*` supaya bisa diuji tanpa DOM; komponen hanya membaca `Derived` hasil `derive(state)`.

## Data & privasi

- Disimpan di `localStorage` dengan kunci per akun: `kalkulator-duitmu:v1:<akun>` dan preferensi grafik `kalkulator-duitmu:prefs:<akun>`; daftar akun (`kalkulator-duitmu:accounts`, berisi nama + salt + hash) juga di `localStorage`, sedangkan sesi aktif di `sessionStorage` (`kalkulator-duitmu:session`) sehingga layar masuk muncul lagi setelah browser ditutup. Id bukti transaksi di IndexedDB ikut berprefix nama akun.
- Sebelum ada akun, data lama memakai kunci `kalkulator-duitmu:v1` / `kalkulator-duitmu:prefs`; kunci lama otomatis dipindah ke milik akun pertama saat pendaftaran.
- **Ekspor JSON** menyalin seluruh state (termasuk catatan aktivitas) ke file; **Impor JSON** memvalidasi ulang tiap field sebelum dipakai; data lama otomatis dimigrasi (profil lama jadi Tinggal di Rumah/Tinggal di Kos, "Transport & Pulsa" dipecah jadi transport + pulsa, kategori bawaan yang hilang ditambahkan).
- Reset data menghapus kunci milik akun aktif.

## Catatan teknis

- React 19 + TypeScript (strict) + Vite, Chart.js untuk grafik, CSS polos dengan variabel tema.
- Bunga dihitung majemuk 8% per tahun; rekomendasi setoran disesuaikan toleransi pembulatan supaya tidak meleset satu bulan.
- Service worker hanya didaftarkan pada build produksi (`import.meta.env.PROD`), jadi mode development tidak pernah ke-cache. Ganti konstanta `CACHE` di `public/sw.js` bila strategi cache berubah.
