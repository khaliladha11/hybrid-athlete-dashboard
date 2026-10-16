# Changelog

Semua perubahan penting di project ini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

## [Unreleased]

### Diperbaiki
- **Input waktu & pace di Setting bisa diisi dari HP.** Keyboard angka di HP tidak punya tombol ":", jadi kolom teks "mm:ss" / "h:mm:ss" (waktu VDOT) dan "m:ss" (pace per zona) tidak bisa diisi. Sekarang memakai pemilih `TimePicker` (jam : menit : detik) berbasis `<select>` native: ketuk angka, pilih dari wheel/daftar bawaan OS, tanpa mengetik. Pace zona tersimpan begitu kombinasinya valid; kombinasi tidak valid ditandai merah dan belum disimpan.
- **Aktivitas tidak lagi terhitung dobel.** Jam Huawei yang juga tersambung ke Strava membuat intervals.icu menerima dua salinan tiap sesi; salinan Strava kosong karena intervals.icu tidak boleh meneruskan isinya lewat API. `dedupeActivities` membuang rekaman ganda (jam mulai selisih ≤ 5 menit, jenis sama atau salah satunya kosong) dan menyimpan yang datanya paling lengkap. Berlaku untuk kalender, ringkasan 7 hari, saran coach, dan Program. Salinan Strava tanpa pasangan tetap tampil sebagai "Aktivitas Strava" dengan penjelasan.
- Baris aktivitas tanpa data tidak lagi menampilkan "—".

### Ditambahkan
- **Split per km** di detail aktivitas lari & jalan, dihitung dari stream intervals.icu (`/activity/{id}/streams`): Segment Skyline per km, tabel pace/HR/cadence, km tercepat ditandai, sisa < 1 km jadi split parsial. Waktu split = moving time (berhenti tidak dihitung). Kartu "Interval / lap" kini hanya muncul bila ada lebih dari satu interval (sesi terstruktur atau lap), karena satu interval sama dengan ringkasan sesi.
- Demo Mode: stream sintetis per sesi, sehingga split dan struktur interval (Tempo, Mini Interval, Norwegian 4×4) ikut tampil.
- 15 test baru (`activity-data.test.ts`, `splitSegments`), total 165.

### Diubah
- Lingkaran inisial di header Profil dihapus (belum ada fitur foto profil).

## [0.10.0-ui] · 2026-10-12 · Redesign "Tag"

Redesign visual mengikuti [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md). Logika latihan di `lib/` tidak berubah.

### Diubah
- **Token warna dark-first**: permukaan charcoal (`#0B0B0C` / `#161616`), satu aksen oranye `#FC4C02`, hijau/kuning/merah hanya untuk data. Mode terang setara (latar `#F7F7F6`). Token baru `--track` dan `--surface-raised`.
- **Kontras tombol diperbaiki**: teks di atas oranye kini gelap (`--on-brand #0B0B0C`, 5.78:1). Teks putih sebelumnya hanya 3.40:1 dan gagal AA.
- **Tipografi**: Archivo (display italic condensed, body, ledger expanded) + Geist Mono untuk label, lewat `next/font`. Utility `.t-display`, `.t-stat`, `.t-ledger`, `.t-label` (`.eyebrow` jadi alias). Font "Boathouse" yang tidak pernah termuat dihapus.
- **Motion**: kurva `--ease-out` / `--ease-in-out` / `--ease-drawer`, tekan 140ms, hover hanya untuk pointer presisi (semua kelas `hover:`), sheet buka 320ms / tutup 220ms, `overscroll-behavior: none`.
- **Komponen**: kartu radius 20 / padding 20 tanpa bayangan di gelap; `Card tone="tag"` + `kicker`; `StatRow` dengan garis rambut; tombol `ghost`; pill & chip mono; AppBar titik oranye + wordmark; BottomNav label mono.
- **Coach**: garis aksen kiri dihapus; ikon + label mono `SARAN HARI INI` + kata severity berwarna; tombol "Terapkan <level>".
- **Profil**: StatRow di 7 hari terakhir & Wellness, plus **Week Ledger** (km per hari lari minggu ini, total mentah).
- **Generator Lari**: header kartu tag dengan judul Display dan StatRow; **Segment Skyline** (rencana = warna intensitas) menggantikan bar hijau/merah.
- **Detail aktivitas**: header kartu tag + StatRow, **Segment Skyline** (selesai = oranye) dengan struktur sesi & best rep.
- Pace tampil `5'50"`; nilai kosong `·`; teks UI tanpa em dash/en dash.
- Strip saran di Generator Lari: baris kedua cukup ringkasan + "Lihat detail", supaya kata severity tidak terpotong di layar 375px.
- 10 screenshot dokumentasi baru (`docs/screenshots/`), termasuk detail aktivitas, sheet gerakan, Setting, dan mode terang.

### Ditambahkan
- `components/charts/SegmentSkyline.tsx` + `skyline-scale.ts` (logika murni), `components/ui/format.ts`, `CLAUDE.md`.
- 14 test baru (`skyline-scale.test.ts`), total 150.

## [0.9.0] — 2026-10-12 · Visual gerakan & library diperluas

### Ditambahkan
- **Gambar teknik gerakan** dari [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense): 35 dari 40 gerakan punya gambar posisi awal & akhir (WebP ≤ 600 px, disimpan lokal di `public/movements/`, tanpa hotlink). Pemilihan lewat audit (`docs/movement-media-audit.md`); 5 gerakan tanpa padanan tampil "Gambar belum tersedia".
- **Thumbnail** di setiap kartu gerakan Generator Strength dan daftar tren di Riwayat latihan.
- **Bottom sheet detail gerakan** (tap kartu): gambar awal ↔ akhir berganti otomatis (crossfade, tombol jeda), cue teknik berbahasa Indonesia, tag otot utama/sekunder, catatan kondisi aktif yang relevan, dan catatan bila gambar sedikit berbeda dari versi kita. Reduced motion: kedua gambar berdampingan ("Awal"/"Akhir") tanpa animasi.
- **13 gerakan baru**: Side Plank, Standing Band Hip Abduction, Plank, Single-Leg Glute Bridge, Rear-Foot-Elevated Split Squat, DB Step-Up, DB Plié Squat, Seated Band Hamstring Curl, Seated Single-Leg Calf Raise, DB Scaption, Band External Rotation, Band Reverse Fly, Quadruped Hip Circles — lengkap dengan META, pemetaan alat, rentang beban yang bisa dirakit, dan catatan kondisi (`docs/movement-library-proposal.md`).
- Toggle **Titik tambat band** di Setting › Alat (untuk 4 gerakan band yang ditambatkan).
- `lib/movements/media.ts`, `scripts/audit-movement-media.mjs`, `scripts/fetch-movement-media.mjs`, `NOTICE.md`.
- 13 test baru (`media.test.ts`), total 136.

### Diubah
- Syarat **stabilitas panggul** kini juga dipenuhi Side Plank & Standing Band Hip Abduction.
- Split Squat, Step-Up, dan Plié Squat bisa jadi gerakan utama ★ — **mulai blok berikutnya** (★ blok yang sedang berjalan tidak berubah).
- Sesi Lower/Full 45'/60' mendapat satu prehab tungkai yang berputar; sesi Upper 45'/60' satu prehab bahu yang berputar. Pemanasan Lower/Full menambah Quadruped Hip Circles.
- Tahan per sisi (Side Plank) dihitung dua kali durasi dan ditampilkan "/sisi".

## [0.8.1] — 2026-10-11 · Polesan navigasi

### Diubah
- **Generator Lari:** "Saran hari ini" pindah ke paling atas dan jadi satu baris ringkas (mis. "Saran: Easy · 30'"), dengan tombol **Gunakan** yang mengisi durasi & kesulitan, dan link **Lihat detail** ke kartu saran lengkap di Profil. Bila pilihan sudah sesuai, tampil "✓ Sesuai saran".
- **Setting:** nav bagian jadi sticky; tap chip → smooth scroll ke kartu (judul tidak tertutup nav), lalu kartu tujuan menyala sekali (garis oranye + tint tipis, memudar ±1,2 detik). Chip aktif mengikuti bagian yang sedang terlihat saat scroll manual (scroll spy) dan otomatis tergeser agar terlihat.
- `prefers-reduced-motion`: lompat langsung tanpa animasi scroll, highlight statis singkat tanpa fade.

## [0.8.0] — 2026-10-11 · Halaman Setting

### Ditambahkan
- **Halaman Setting** (menggantikan tab Log) — semua pengaturan profil atlet di satu tempat, tersimpan di perangkat:
  - **Kondisi & batasan** dari katalog 10 kondisi berbasis riset (APT, shin splints, overpronation, jeda MCU, nyeri punggung bawah, nyeri lutut depan/PFP, ITBS, Achilles, plantar fasciitis, nyeri bahu). Setiap kondisi punya aturan generator & daftar sumber (guideline/consensus/studi, DOI terverifikasi). Bisa diaktifkan/nonaktifkan; catatan teks bebas tampil di workout.
  - **Zona lari** per jenis (Easy, Tempo, Interval, Norwegian 4×4): ubah manual, atau hitung dari hasil lomba dengan **rumus VDOT Daniels & Gilbert**.
  - **Alat**: dumbbell (berat handle & jumlah), barbell mode, plat (berat × jumlah), band Light/Medium/Heavy, pull-up bar, kursi/bench, alat lain. Daftar beban yang bisa dirakit tampil langsung.
  - **Movement library**: centang gerakan yang boleh dipakai; alasan tampil bila gerakan tidak tersedia (butuh alat, beban tidak bisa dirakit, dihindari kondisi). Gerakan wajib kondisi dikunci.
  - **Tampilan & program** (tema, blok mingguan) dan **Data & cadangan** (ekspor/impor JSON v2: log + Setting + program + preferensi; file lama tetap bisa diimpor).
- Generator ST hanya meresepkan beban yang bisa dirakit dari plat; progresi beban naik/turun ke beban berikutnya yang bisa dirakit.
- Sesi ditandai "lebih pendek" (bukan error) bila gerakan aktif tidak cukup untuk durasi yang dipilih.
- 27 test baru (`settings.test.ts`), total 123.

### Diubah
- Aturan khusus kondisi (Spine-Friendly, prehab shin, stabilitas panggul, cue cadence/rel kereta) kini **mengikuti kondisi aktif**. Aturan umum (RPE ≤ 7, beban ≤ library & alat, long run ≤ 10%, 80/20) tetap selalu berlaku.
- Kondisi APT kini mewajibkan Dead Bug (anti-ekstensi) di Lower/Full Body.
- Riwayat log pindah ke halaman Strength (bagian **Riwayat latihan**); `/log` diarahkan ke sana.
- Kartu Kondisi, Zona lari, Alat & movement library, dan Pengaturan dipindah dari Profil ke Setting.
- Generator lari: tab "Set Huawei" disembunyikan; tombol salin menjadi **Copy Set**.
- Bayangan tipis saat hover di semua tombol (hanya perangkat dengan pointer).
- Format `conditions` & `equipment` di `athlete-profile.json` jadi terstruktur.

### Diperbaiki
- Teks "Moderate" di pilihan kesulitan halaman Strength tidak lagi keluar dari tombol.

## [0.7.0] — 2026-10-09 · Profil lebih ringkas

### Diubah
- **Kalender aktivitas bulanan** menggantikan daftar "10 aktivitas terakhir": ikon per jenis aktivitas (lari easy hijau, lari berat merah, lainnya netral), badge jumlah bila lebih dari satu aktivitas sehari, status per minggu (✓ hijau aktif / ✕ merah kosong), total aktivitas & km lari bulan itu, navigasi bulan lalu ↔ bulan ini. Ketuk tanggal untuk melihat daftar aktivitas hari itu.
- **Saran hari ini** jadi baris ringkas (judul + rekomendasi singkat); ketuk untuk dropdown penjelasan & rekomendasi lengkap.
- **Kondisi & batasan** jadi dropdown per poin.

### Dokumentasi
- **[docs/PRD.md](docs/PRD.md)**: status fitur, keterbatasan, dan roadmap pengembangan.

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

[0.10.0-ui]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/9bcff80...main
[0.9.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/ff25f40...9bcff80
[0.8.1]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/ff25f40
[0.8.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/872a9c1
[0.7.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/6e6762f
[0.6.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/afe6f63
[0.5.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/9a668ef
[0.4.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/51d79e4
[0.3.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/49d0aed
[0.2.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/286515d
[0.1.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/commit/bd3dabe
