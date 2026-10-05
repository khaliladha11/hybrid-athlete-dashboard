# Changelog

Semua perubahan penting di project ini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

## [0.6.0] — 2026-10-05 · Fleksibilitas & program target

### Ditambahkan
- **Toggle tema Terang/Gelap** di bilah atas, plus pilihan Sistem/Terang/Gelap di kartu Pengaturan (Profil). Pilihan disimpan di `localStorage` dan dipasang sebelum render (tanpa kedipan).
- **Sistem warna intensitas & status:** Easy = hijau, Moderate = kuning, High = merah. Aktif/tercapai = hijau, nonaktif/belum = merah. Dipakai di pilihan kesulitan, bar intensitas, pill kesulitan, distribusi 80/20, tren km, kesegaran data wellness, titik aktivitas, status target di Log, dan switch.
- **Toggle Program blok mingguan** (generator lari, ST, dan Pengaturan). Saat mati, aplikasi masuk **mode bebas**: tanpa deload, dan gerakan ★ dipilih per sesi. Log & progresi tetap jalan.
- **Modul Program Target** (halaman & tab baru) untuk PB 5K, PB 10K, Half Marathon, dan Full Marathon: fase Base/Build/Peak/Taper, long run aman (≤ 10% & ≤ 2 km/minggu, cutback tiap minggu ke-4), race pace dari target waktu, jadwal ST, peringatan, dan salin rencana minggu ini.
- Komponen `Switch` dan modul warna `tones.ts`. Test baru untuk mode bebas & program target (96 test).

### Diubah
- Sudut lebih membulat: kartu 16px, tombol/input/pilihan 12px.
- Bilah atas (logo + tombol tema). Navigasi bawah jadi 5 tab (Profil, Lari, Program, Strength, Log).
- Zona Z2 di generator lari kini hijau (sebelumnya biru), selaras dengan warna intensitas.

### Diperbaiki
- Judul "Saran hari ini" tidak lagi terlipat saat ada dua tombol aksi.

## [0.5.0] — 2026-10-05 · Redesign UI

### Diubah
- **Design system baru** di seluruh aplikasi, bergaya aplikasi olahraga: latar putih bersih, oranye `#fc5200` sebagai warna utama (CTA, navigasi aktif, gerakan ★), biru `#0060d0` untuk informasi, border `#f2f2f0`, radius 4px, bayangan kartu, dan motion 150ms `ease`.
- Semua warna kini lewat **token semantik** (`bg`, `surface`, `ink`, `muted`, `brand`, `info`, …) di `app/globals.css`. Dark mode cukup mengganti nilai token.
- Tipografi memakai font sistem (Segoe UI / Helvetica Neue / system-ui): body 15px, heading 16px/600, angka statistik besar.
- Pilihan segmented, tab Daftar/Set Huawei, navigasi bawah (indikator oranye), badge blok (segmen per minggu), dan kartu "Saran hari ini" dirancang ulang.
- Tombol "Generate ulang" → **"Variasi lain"**, supaya muat satu baris di layar 375px.
- Ikon PWA dan warna tema manifest berganti ke oranye.

### Aksesibilitas
- Teks oranye di atas putih memakai `#c23f00` (kontras ±5.3:1), karena `#fc5200` hanya ±3.3:1. Oranye asli tetap dipakai untuk tombol dan indikator.
- Outline fokus keyboard oranye 2px. Mode `prefers-reduced-motion` mematikan animasi.
- Teks meta dinaikkan dari 11–12px ke 13px.

## [0.4.0] — 2026-09-29 · Progresi beban

### Ditambahkan
- **Log sesi** untuk gerakan utama ★ (beban, rep set terakhir atau detik, RPE), langsung dari hasil generator ST.
- **Progresi beban otomatis** dengan aturan "2-for-2" NSCA yang disesuaikan dengan batas RPE ≤ 7: naik setelah 2 sesi tuntas berturut-turut, tahan atau turun bila RPE terlalu tinggi. Beban tidak pernah melewati batas library.
- Progresi untuk gerakan tahan (+5 detik, maksimal 60) dan band (naik ke band berikutnya).
- Halaman **Log**: tren beban per gerakan, riwayat per tanggal, hapus dua langkah, ekspor/impor JSON.

### Diperbaiki
- Beban terakhir tidak lagi dibulatkan ke kelipatan langkah progresi.

## [0.3.0] — 2026-09-29 · Saran berbasis konteks mingguan

### Ditambahkan
- Kartu **Saran hari ini** yang menggabungkan readiness dengan konteks mingguan, lengkap dengan tombol aksi satu tap.
- Aturan **80/20**: ≥ 2 lari berat dalam 7 hari → sarankan Easy.
- **Peringatan kenaikan km > 30%** dibanding minggu sebelumnya, beserta sisa km aman.
- Aturan **concurrent training**: setelah ST kaki, lari maksimal Moderate. Setelah lari berat/long run, ST disarankan Upper.
- Ringkasan 7 hari di Profil kini menampilkan distribusi easy/berat dan tren km.

### Diubah
- `ReadinessBanner` digantikan `CoachCard`.

### Diperbaiki
- Saran "turun satu level" tidak lagi bisa diterapkan berantai (High → Moderate → Easy).

## [0.2.0] — 2026-09-29 · Variasi terstruktur & polesan mobile

### Ditambahkan
- **Periodisasi blok 4 minggu** (3 normal + 1 deload) dari `training.blockStart`.
- **Gerakan utama ★** (multi-joint) dikunci per blok. Aksesori dan **skema rep** (Volume/Standar/Tegangan) berputar.
- Minggu deload: RPE, beban, dan set gerakan utama diturunkan.
- **Perpustakaan pola lari**: cadence drill, cruise interval, progression run, 30"/30", dan 15/15 sebagai alternatif Norwegian 4×4.
- **Target cadence personal** dari rata-rata 14 hari (+5% bertahap, maksimal 180).
- Tombol **Generate ulang** kini selalu menghasilkan workout yang berbeda. Kombinasi yang hanya punya satu pola ditandai "Pola baku".
- Badge posisi blok di halaman generator.

### Diubah
- UI mobile-native: umpan balik tekan, area sentuh 44px, label kontrol tidak bisa terseleksi, crossfade saat hasil berganti, animasi akordeon, dan scroll otomatis ke hasil.
- Zoom dicubit diaktifkan kembali (aksesibilitas).

## [0.1.0] — 2026-09-28 · Fondasi

### Ditambahkan
- Halaman **Profil**: data atlet, target, kondisi, alat, zona lari, dan movement library dari `config/athlete-profile.json`.
- **Integrasi intervals.icu** (server-only): ringkasan 7 hari, 10 aktivitas terakhir, detail interval, dan wellness. Error 401/403/404/5xx ditampilkan terstruktur.
- **Demo Mode** otomatis tanpa API key.
- **Generator lari** (3 durasi × 3 kesulitan) dengan target pace/HR/RPE, format salin, dan format Set Huawei Health.
- **Generator ST** (4 tipe × 3 durasi × 3 kesulitan) dengan Spine-Friendly Protocol, RPE ≤ 7, prehab wajib, dan whitelist gerakan.
- Pemisahan pembuat pola dan validator/sanitizer, beserta unit test untuk seluruh kombinasi input.
- **Readiness advisory** dari HRV, resting HR, dan sesi kemarin.
- **PWA**: manifest, ikon, standalone, safe area. Panduan deploy Vercel & install di HP.

[0.6.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/9a668ef...main
[0.5.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/9a668ef
[0.4.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/51d79e4
[0.3.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/49d0aed
[0.2.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/286515d
[0.1.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/bd3dabe
