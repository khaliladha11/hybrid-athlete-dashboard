# PRD — Hybrid Athlete Dashboard

> Dokumen hidup: status produk, fitur yang sudah & belum ada, keterbatasan, dan roadmap.
> Perbarui setiap rilis (lihat [§9 Cara memperbarui dokumen ini](#9-cara-memperbarui-dokumen-ini)).

| | |
| --- | --- |
| **Versi saat ini** | 0.13.3 (2026-10-26) |
| **Status** | Dipakai harian oleh pemilik (single user), live di Vercel |
| **Deploy** | Vercel milik pemilik, dilindungi Deployment Protection (alamat sengaja tidak dicantumkan karena berisi data kesehatan) |
| **Repo** | https://github.com/khaliladha11/hybrid-athlete-dashboard |
| **Kualitas** | 33 file test, 458 unit test lolos · build produksi lolos · CI GitHub Actions di setiap push & PR |
| **Dokumen terkait** | [README](../README.md) · [CHANGELOG](../CHANGELOG.md) · [TRAINING-LOGIC](TRAINING-LOGIC.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DESIGN-SYSTEM](DESIGN-SYSTEM.md) · [Logo](brand/LOGO.md) · [ONBOARDING](ONBOARDING.md) · [SYNC](SYNC.md) · [Spesifikasi 0.13: PROGRAM-HIDUP](PROGRAM-HIDUP.md) · [STRENGTH-HIDUP](STRENGTH-HIDUP.md) · [Audit media gerakan](movement-media-audit.md) · [Usulan gerakan 0.9](movement-library-proposal.md) · [NOTICE](../NOTICE.md) |

**Legenda status:** ✅ Selesai · 🟡 Sebagian / ada keterbatasan · ⬜ Belum dibuat · 💡 Ide

---

## Daftar isi

1. [Ringkasan produk](#1-ringkasan-produk)
2. [Latar belakang & masalah](#2-latar-belakang--masalah)
3. [Aturan yang tidak boleh dilanggar](#3-aturan-yang-tidak-boleh-dilanggar)
4. [Status fitur per modul](#4-status-fitur-per-modul)
5. [Persyaratan non-fungsional](#5-persyaratan-non-fungsional)
6. [Keterbatasan & utang teknis](#6-keterbatasan--utang-teknis)
7. [Roadmap & saran pengembangan](#7-roadmap--saran-pengembangan)
8. [Riwayat rilis singkat](#8-riwayat-rilis-singkat)
9. [Cara memperbarui dokumen ini](#9-cara-memperbarui-dokumen-ini)

---

## 1. Ringkasan produk

**Hybrid Athlete Dashboard** adalah pelatih pribadi berbentuk PWA untuk atlet yang menggabungkan **lari 10K–21K** dan **strength training di rumah**. Aplikasi membaca data latihan & wellness dari intervals.icu, lalu:

- menyusun **workout lari dan ST hari ini** yang aman untuk kondisi cedera atlet,
- memberi **saran harian** berdasarkan kesiapan tubuh dan beban 7 hari terakhir,
- menyusun **program menuju lomba** (5K, 10K, HM, FM),
- mencatat sesi ST dan **menaikkan beban secara otomatis**,
- menampilkan **detail tiap aktivitas**: split per km, interval, HR & cadence, tanpa duplikat dari sumber kedua,
- menampilkan **teknik setiap gerakan**: gambar posisi awal & akhir, cue, otot yang dilatih, dan catatan sesuai kondisi atlet.

**Model pemakaian:** satu deploy per orang. Setiap pengguna fork repo, deploy ke Vercel miliknya sendiri dengan API key intervals.icu miliknya, lalu menyiapkan profil lewat **onboarding** di dalam aplikasi (rencana 0.11, [ONBOARDING.md](ONBOARDING.md)). Tanpa akun, login, atau database; pemilik repo tidak menerima data siapa pun.

**Visi jangka panjang:** satu aplikasi yang menjawab "hari ini latihan apa, seberapa berat, dan apakah aku di jalur yang benar menuju target?" tanpa harus membuka banyak aplikasi.

## 2. Latar belakang & masalah

### Background

Saya lari 10K–21K dan latihan strength di rumah. Datanya udah rapi di jam dan intervals.icu, tapi tiap mau latihan pertanyaannya selalu sama: **hari ini ngapain?** Lari atau ST? Easy atau interval? Kemarin udah berat belum? Biasanya saya buka beberapa aplikasi, cek program dari internet, lalu nebak. Hasilnya nggak konsisten. Kadang kebanyakan sesi berat, kadang skip karena kelamaan mikir.

Dari sisi developer, ini bukan masalah kurang data. Ini masalah keputusan. Datanya ada, aturannya sebenarnya juga udah jelas (80/20, kenaikan km yang aman, prehab buat shin splints, beban sesuai alat), cuma kesebar di kepala dan di catatan. Jadi aturan-aturan itu saya pindahin ke kode yang bisa dites, biar tiap pagi tinggal buka aplikasi.

### Problem statement

> Setiap hari saya butuh jawaban cepat untuk **"hari ini latihan apa, dan seberapa berat?"** yang ngitung kondisi badan hari itu, beban 7 hari terakhir, riwayat cedera, dan alat yang ada. Tanpa itu, keputusan latihan jadi tebakan: gampang kebanyakan sesi berat, gampang skip, dan gampang bikin cedera lama kambuh.

Dianggap berhasil kalau:

- Buka aplikasi, dapat satu workout yang siap dikerjakan dalam beberapa ketukan, tanpa buka aplikasi lain.
- Workout selalu lolos aturan wajib di §3, jadi tetap aman walaupun lagi males mikir.
- Saran nggak maksa. Kalau saya mau pilih yang lain, ya bebas.

### Pengguna & masalah turunan

**Pengguna utama:** saya sendiri (pemilik), 23 tahun, pekerja kantoran, hybrid athlete dengan target Sub-30 5K, Sub-1h 10K, Sub-3h HM. Orang lain bisa memasang dengan profil dan datanya sendiri: deploy lewat tutorial README, lalu profil disiapkan lewat onboarding di dalam aplikasi (rencana 0.11), bukan dengan mengedit JSON.

| Masalah | Jawaban di aplikasi |
| --- | --- |
| Bingung hari ini mau latihan apa dan seberapa berat | Generator lari & ST plus saran hari ini dari readiness dan beban 7 hari terakhir; satu tap untuk menerapkan saran |
| Program generik tidak memperhitungkan anterior pelvic tilt, shin splints, dan overpronation | Aturan cedera dikodekan sebagai modul TypeScript yang diuji (Spine-Friendly, prehab wajib, stabilitas panggul, target cadence) |
| Alat terbatas (dumbbell modular, band, pull-up bar) | Generator hanya memakai gerakan yang bisa dilakukan dengan alat yang ada, dan beban yang bisa dirakit dari plat |
| Kondisi tubuh berubah (cedera baru, sembuh) | Kondisi diaktifkan/nonaktifkan di Setting dari katalog berbasis riset |
| Bingung menyeimbangkan lari dan ST | Aturan concurrent training dan saran harian |
| Mudah terlalu semangat (km naik drastis, terlalu banyak sesi berat) | Peringatan 80/20 dan kenaikan km > 30% |
| Latihan monoton | Periodisasi blok 4 minggu, rotasi pola, tombol "Variasi lain", 45 gerakan di library |
| Ragu tekniknya benar saat latihan sendiri di rumah | Thumbnail + detail gerakan: gambar awal/akhir, cue teknik, otot, catatan kondisi aktif |
| Data tersebar (jam, intervals.icu, catatan) | Ringkasan, kalender, dan wellness dalam satu layar |
| Jam tersambung ke Strava & intervals.icu sekaligus, aktivitas tercatat dobel | Rekaman ganda dibuang otomatis; yang disimpan yang datanya paling lengkap |

## 3. Aturan yang tidak boleh dilanggar

Aturan ini berlaku untuk setiap fitur baru. Semuanya sudah diuji otomatis.

**Keamanan & privasi**
- API key intervals.icu **hanya dibaca di server** (`server-only`), tidak pernah sampai ke browser. `.env*` ada di `.gitignore`.
- Error ditampilkan sebagai pesan singkat, **tanpa stack trace atau API key**.
- Aplikasi tetap jalan penuh tanpa API key (**Demo Mode**).

**Latihan — aturan umum (selalu berlaku, tidak bisa dimatikan)**
- ST hanya memakai gerakan dari movement library yang dipilih di Setting.
- **RPE ≤ 7** untuk semua set.
- Beban tidak melebihi batas library, dan (bila alat sudah diisi) selalu bisa dirakit dari plat yang dimiliki.
- Upper Pull diawali progresi pull-up (Dead Hang → Negative) selama gerakannya tersedia.
- Long run program naik ≤ 10% dan ≤ 2 km per minggu; peringatan kenaikan km > 30%; distribusi 80/20.
- Saran **tidak memblokir**: atlet tetap bebas memilih.

**Latihan — aturan kondisi (ikut toggle di Setting)** · keputusan 2026-10-11
- Spine-Friendly Protocol, prehab shin, stabilitas panggul, cue cadence/rel kereta, dan larangan gerakan tertentu **hanya berlaku bila kondisi terkait aktif**.
- Kondisi hanya dari **katalog** dengan sumber kredibel (guideline, consensus, studi). Kondisi baru di katalog wajib menyertakan sumber dan test.
- Kondisi teks bebas hanya menjadi catatan; tidak pernah mengubah generator.
- Kondisi tidak pernah menambah gerakan di luar library; hanya mewajibkan, melarang, atau memberi catatan.

**Onboarding & deploy pribadi** · keputusan 2026-10-22
- Satu deploy per orang; tanpa akun atau login. Database hanya opsional dan milik pengguna sendiri (lihat aturan 0.12 di bawah).
- Profil di repo selalu netral; data pribadi siapa pun tidak di-commit.
- Disclaimer kesehatan wajib disetujui sebelum aplikasi dipakai; versi naik → tampil ulang.
- Pemilihan kondisi wajib eksplisit ("Tidak ada" adalah pilihan, bukan default).
- Status koneksi intervals.icu dicek di server; browser hanya menerima status.
- Pengguna lama tidak dipaksa mengulang onboarding dan tidak kehilangan data.

**Sandi aplikasi & sinkron** · keputusan 2026-10-23, berlaku sejak 0.12 ([SYNC.md](SYNC.md)); diuji di `auth*.test.ts` dan `sync-*.test.ts`
- Sandi aplikasi lewat env var `APP_PASSCODE` (≥ 8 karakter) dan `SESSION_SECRET` (≥ 32 byte). Tanpa `APP_PASSCODE`, aplikasi berperilaku seperti 0.11.
- Sandi dibandingkan waktu-konstan, tidak pernah disimpan di `localStorage` dan tidak pernah dikirim balik ke browser. Sesi berupa cookie `httpOnly`, `Secure`, `SameSite=Lax`, ditandatangani HMAC; mengganti sandi membatalkan semua sesi. Percobaan gagal dibatasi (5 per 15 menit per IP).
- **Database hanya diakses server** (`server-only`), sama seperti API key intervals.icu. Browser hanya menerima data miliknya dan status berupa boolean, tidak pernah URL atau token database.
- **Sinkron opsional.** Tanpa env var database, aplikasi berjalan lokal saja. Sinkron mewajibkan sandi aplikasi.
- **Tanpa database bersama.** Setiap orang memasang database di akun Vercel-nya sendiri; pemilik repo tidak menerima data siapa pun.
- Gagal kirim tidak pernah membuang data lokal; perubahan ditandai "belum terkirim" dan dicoba lagi.

**Movement library & media** · keputusan 2026-10-12
- Gambar gerakan **hanya dari sumber berlisensi bebas** (saat ini [free-exercise-db](https://github.com/yuhonas/free-exercise-db), Unlicense), disimpan lokal di `public/movements/` (tanpa hotlink). Tidak memakai gambar buatan AI atau sumber yang lisensinya tidak mengizinkan (mis. openGym, Gym Visual).
- Gambar yang berbeda dari versi kita (🟡) hanya dipakai bila disetujui pemilik, dan selalu diberi catatan perbedaan. Tanpa padanan → "Gambar belum tersedia".
- Gerakan baru wajib punya: META (rep/tahan, cue), pemetaan alat, rentang beban yang bisa dirakit, entri media (gambar atau `null` eksplisit), dan lolos `scripts/audit-movement-media.mjs` serta seluruh test generator.
- Menambah gerakan multi-joint **tidak boleh mengubah ★ blok yang sedang berjalan**; ★ baru berlaku mulai blok berikutnya.

## 4. Status fitur per modul

### 4.1 Profil & data intervals.icu

| Fitur | Status | Catatan |
| --- | --- | --- |
| Header profil (nama, usia, gaya hidup, fokus) | ✅ | Dari profil di perangkat sejak 0.11.0 (dulu dari JSON). Tanpa avatar inisial sejak 0.10.1 |
| Target lomba | ✅ | Kondisi, zona, alat & movement library pindah ke Setting (0.8) |
| Wellness hari ini (HRV, resting HR, tidur, CTL/ATL/Form) | ✅ | Status ✓ data hari ini / ✕ data lama |
| Ringkasan 7 hari (km, pace, HR, long run, load, sesi) | ✅ | Plus distribusi 80/20 & tren km |
| Kalender aktivitas bulanan + detail per tanggal | ✅ | Tanpa program: bulan ini & bulan lalu. Dengan program tersimpan (0.13.0, [PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #5–#6): dari awal program sampai bulan lomba, aktivitas selesai oranye, rencana bercincin warna intensitas, terlewat & dilewati ditandai |
| Detail aktivitas: split per km + interval / lap | ✅ | `/activity/[id]`. Split dari stream intervals.icu: jarak jam, atau GPS bila jarak hanya dibagi rata / tidak konsisten. Data bertangga diratakan, lonjakan & reset dibuang, hasil divalidasi terhadap ringkasan (0.10.2). Interval hanya tampil bila > 1 |
| Split cocok dengan Strava | 🟡 | Contoh lari 4,4 km: total moving time sama (44:00), HR per km ±1 bpm, pace per km −9 sampai +7 detik (Strava menghitung ulang jarak 4,42 km, jam 4,44 km) |
| Aktivitas ganda dari dua sumber (Huawei + Strava) dihitung sekali | ✅ | 0.10.1 · `lib/intervals/dedupe.ts`. Berlaku di kalender, ringkasan 7 hari, saran, dan Program |
| Edit profil dari dalam aplikasi | ✅ | 0.11.0: nama, usia, gaya hidup, fokus, target lomba, tujuan, blok mingguan/mode bebas di Setting › Profil; kondisi, zona, alat, gerakan sejak 0.8 |
| Grafik tren (CTL/ATL/Form, km mingguan, pace, cadence) | ⬜ | 0.15 Insight |

### 4.2 Saran hari ini (coach)

| Fitur | Status | Catatan |
| --- | --- | --- |
| Readiness: HRV turun > 15%, resting HR naik ≥ 5 bpm, sesi berat/long run kemarin | ✅ | |
| Aturan 80/20 (≥ 2 lari berat dalam 7 hari → Easy) | ✅ | Lari berat = HR ≥ 155, nama sesi, atau pace cepat |
| Peringatan kenaikan km > 30% + sisa km aman | ✅ | |
| Concurrent training (setelah ST kaki / lari berat) | ✅ | |
| Tampilan ringkas + dropdown rekomendasi | ✅ | 0.7 |
| Tombol terapkan saran satu tap (di generator) | ✅ | Anti turun berantai |
| Saran ringkas satu baris di atas Generator Lari + link ke detail di Profil | ✅ | 0.8.1. Generator Strength masih kartu lengkap |
| Saran terhadap sesi rencana hari ini ("Rencana: Tempo 45'. Saran: Easy 30'.") | ✅ | 0.13.1 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) §4.5): basisnya rencana, jadi hanya menurunkan, tidak berantai, tidak memblokir. Terapkan membuka generator versi turun atau kartu long run yang dipendekkan. Tanpa program: perilaku lama |
| Check-in subjektif harian (nyeri shin, pegal, mood, tidur) | ⬜ | 0.15 Insight |
| Ambang personal (HR berat, HRV) dari data atlet | ⬜ | Sekarang konstanta tetap |

### 4.3 Generator lari

| Fitur | Status | Catatan |
| --- | --- | --- |
| 30/45/60 menit × Easy/Moderate/High | ✅ | Durasi selalu tepat |
| 13 pola (Z2, run-walk, cadence drill, tempo, cruise, progression, mini interval, Norwegian 4×4, 15/15, …) | ✅ | |
| Target pace dari zona di Setting, target cadence personal | ✅ | Cadence dari rata-rata 14 hari, maks 180 |
| Cue & catatan mengikuti kondisi aktif (cadence, rel kereta, Achilles tanpa 15/15, dll.) | ✅ | 0.8 |
| Variasi lain (seed berbeda), tombol **Copy Set** (format Huawei) | ✅ | Tampilan tab Set Huawei disembunyikan sementara (0.8) |
| Mengikuti blok mingguan / mode bebas | ✅ | |
| Mengirim workout ke kalender intervals.icu / jam | ⬜ | 1.0 |

### 4.4 Generator strength training

| Fitur | Status | Catatan |
| --- | --- | --- |
| Full Body / Upper Push / Upper Pull / Lower × durasi × kesulitan | ✅ | |
| Validator & sanitizer aturan wajib | ✅ | Diuji untuk semua kombinasi |
| Gerakan utama ★ per blok, skema rep berputar, deload | ✅ | |
| Mode bebas (tanpa blok) | ✅ | 0.6 |
| Gerakan wajib/terlarang mengikuti kondisi aktif | ✅ | 0.8 |
| Hanya gerakan yang dipilih & alatnya tersedia; beban dari kombinasi plat | ✅ | 0.8 |
| Gerakan baru di movement library | ✅ | 0.9: 13 gerakan dari free-exercise-db (stabilitas panggul, core, unilateral, soleus, bahu) |
| Thumbnail di setiap kartu gerakan + bottom sheet detail (crossfade awal/akhir, jeda, cue, otot, catatan kondisi) | ✅ | 0.9. Reduced motion: gambar berdampingan tanpa animasi |
| Gambar teknik untuk semua gerakan | 🟡 | 36/45 bergambar; 9 tanpa padanan (Dead Hang, Negative Pull-Up, Seated DB Scapular Retraction, Clamshell, Tibialis Wall Raise, Knee Push-Up, Wall Push-Up, Prone Y-T-W Raise, Prone Reverse Snow Angel). 12 gambar 🟡 yang disetujui sedikit berbeda dan diberi catatan. Belum ada video |
| Syarat stabilitas panggul diperluas (Side Plank, Standing Band Hip Abduction) | ✅ | 0.9 |
| Prehab berputar sesuai bagian tubuh (tungkai untuk Lower/Full, bahu untuk Upper) | ✅ | 0.9, sesi 45'/60' |
| ★ baru (Split Squat, Step-Up, Plié Squat) mulai blok berikutnya | ✅ | 0.9, mode bebas langsung |
| Strength tanpa alat: gerakan cadangan Upper Push/Pull | ✅ | 0.11.2: Push-Up, Knee Push-Up, Wall Push-Up, Prone Y-T-W Raise, Prone Reverse Snow Angel; aktif otomatis hanya bila kategorinya tidak punya gerakan lain. Diuji untuk semua kombinasi × 25 seed ([TRAINING-LOGIC §11](TRAINING-LOGIC.md#11-strength-tanpa-alat-0112)) |
| Pesan alat bila jenis sesi tidak bisa disusun + catatan sesi lebih pendek | ✅ | 0.11.2: alat minimal yang dibutuhkan dan gerakan yang bisa diaktifkan; logika generator tidak berubah |
| Saran ringkas satu baris (seperti Generator Lari) | ⬜ | Generator Strength masih memakai kartu saran lengkap |
| Mode latihan: layar penuh per gerakan, timer istirahat & hitung mundur tahan, centang per set langsung tercatat | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #4). Menggantikan baris "Timer istirahat antar set" |
| ST mengikuti fase program (Base volume, Build lebih berat, Peak maintenance, Taper ST kaki dikurangi) | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #1) |
| Aturan lari + ST di hari yang sama: sarankan jeda ≥ 3 jam | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #3). Hubungannya dengan aturan concurrent yang ada diputuskan saat spesifikasi |
| Skema "Kekuatan" 5–6 rep @ RPE 7 untuk ★ di fase Build | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #5). Tetap RPE ≤ 7; butuh persetujuan pemilik (perubahan logika) |
| Tangga progresi saat beban mentok (bilateral → split → RFESS → satu kaki, atau tempo/jeda) | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #6) |
| Plyometric ringan (opsional, hanya bila kondisi shin splints nonaktif) | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #8). Gerakan baru wajib lewat aturan §3; masuk 0.14 atau ditunda masih keputusan terbuka |

### 4.5 Periodisasi & program target

| Fitur | Status | Catatan |
| --- | --- | --- |
| Blok 4 minggu (3 normal + 1 deload) | ✅ | Tanggal mulai blok diatur di Setting › Profil sejak 0.11.0 |
| Toggle blok mingguan (mode bebas) | ✅ | |
| Program PB 5K (8 mg), PB 10K (10), HM (12), FM (16) | ✅ | Base → Build → Peak → Taper. Sejak 0.13.3 ini panjang standar; panjang sebenarnya mengikuti Hari H |
| Race pace dari target waktu, long run aman + cutback, peringatan | ✅ | |
| Salin rencana minggu ini | ✅ | |
| Program terhubung ke generator ("Kerjakan sesi hari ini") | ✅ | 0.13.1 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #1): tombol di Program › Minggu ini dan ringkasan Profil; isian generator dari rencana tetap bisa diubah, chip `DARI PROGRAM · MINGGU N` selama belum diubah, pola rencana (tempo, 4×4) lewat parameter opsional generator. Long run, lomba, Race pace & Sharpener tampil sebagai kartu sesi program dengan teks Copy Set (D4) |
| Kepatuhan program (rencana vs aktual dari intervals.icu) | ✅ | 0.13.0 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #2): selesai / sebagian / terlewat / digeser / dilewati, dihitung di client (D2, D3); sesi ber-id + override disinkron per sesi; ST dari log lokal atau aktivitas strength |
| Prediksi waktu lomba dari performa terbaru | ✅ | 0.13.2 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #3): kartu "Perkiraan waktu lomba" di Program. VDOT Daniels dari hasil lomba 90 hari (keyakinan tinggi) atau lari utuh ≥ 3 km (rendah), invers ke 5K/10K/HM/FM, selisih terhadap target, Riegel hanya pembanding (D1). FM maksimal rendah bila long run terjauh 30 hari < 12 km. Best effort intervals.icu belum dipakai (backlog) |
| Saran hari ini membaca sesi rencana hari ini | ✅ | 0.13.1 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #4): readiness rendah menurunkan quality satu level dan memendekkan long run ke ±75% (pace easy); 80/20 → quality jadi Easy; kenaikan km > 30% → maks 30' dan long run ditahan di jarak minggu lalu. Lihat [TRAINING-LOGIC §5](TRAINING-LOGIC.md#5-saran-hari-ini) |
| Sesi rencana yang akan datang di kalender (rencana = warna intensitas, selesai = oranye) | ✅ | 0.13.0 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #5) |
| Rentang kalender mengikuti panjang program (HM 12 mg, FM 16 mg) | ✅ | 0.13.0 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #6): data lama diambil sekali lewat `/api/activities` (maks 200 hari) |
| Ringkasan minggu program di Profil (minggu ke-, fase, sesi selesai, long run) | ✅ | 0.13.0 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #7): hanya untuk program aktif |
| Sesi ST dari program membuka Generator Strength | ✅ | 0.13.1 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #8): Senin Lower 45', Rabu Upper Pull (minggu ganjil) / Upper Push (genap), taper Easy. Logika ST tidak berubah (0.14) |
| Sesi terlewat: tawaran geser atau lewati, tetap mematuhi aturan jadwal | ✅ | 0.13.2 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #9): baris `Tempo Selasa terlewat · Geser ke Jumat · Lewati` di Program dan Profil, disimpan sebagai override (tersinkron per sesi). Geser hanya di minggu yang sama, jadi tidak pernah menambah volume minggu berikutnya (D5); long run Minggu praktis hanya bisa dilewati. Lewati dua ketukan |
| Saran update zona saat prediksi menunjukkan kebugaran naik konsisten | ✅ | 0.13.2 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #10): di Setting › Zona dan Profil bila dua hasil lomba berbeda (terpisah ≥ 14 hari) sama-sama ≥ VDOT zona + 1. Tidak pernah otomatis; Tolak diingat sampai VDOT naik ≥ 1 lagi |
| Hitung mundur & minggu lomba (sisa hari, catatan taper, checklist hari H) | ✅ | 0.13.2 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #11): `14 HARI LAGI · HALF MARATHON` di Program dan Profil, checklist umum H-1 dengan rencana pace dari perkiraan, dan tawaran mencatat hasil lomba H+1 sampai H+14 |
| Hari H dipilih atlet, panjang program = minggu di antara mulai dan Hari H | ✅ | 0.13.3 ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) §4.10): kalender bulan dengan warna band (rekomendasi umum + minimum dari data long run), alasan, tanggal paling awal, ringkasan fase, long run puncak, info VDOT. Merah butuh konfirmasi, abu-abu menambah pre-Base, di bawah taper + 2 tidak bisa disusun |
| Kesiapan HM/FM & jarak antar maraton | ✅ | 0.13.3: rata-rata km mingguan & long run terjauh, catatan maraton pertama, jarak dari FM sebelumnya. Peringatan lunak |
| Arsip program saat Hari H/mulai/jarak diganti | ✅ | 0.13.3: riwayat sesi & override tetap terbaca di Program › Program sebelumnya dan kalender, disinkron per id. Program lama tanpa Hari H dimigrasikan tanpa perubahan |

### 4.6 Log & progresi beban

| Fitur | Status | Catatan |
| --- | --- | --- |
| Catat beban/rep/detik/RPE untuk gerakan ★ | ✅ | |
| Progresi 2-for-2 (beban, detik tahan, band) | ✅ | Tidak melewati batas library |
| Riwayat & tren per gerakan (halaman Strength), hapus per entri | ✅ | Pindah dari halaman Log (0.8); thumbnail & detail gerakan di daftar tren (0.9) |
| Ekspor/impor JSON (log + Setting + program + preferensi) | ✅ | Setting › Data & cadangan (0.8) |
| Progresi ke beban berikutnya yang bisa dirakit | ✅ | 0.8 |
| Sinkron antar perangkat | ✅ | 0.12.1: opsional ke Upstash Redis milik pengguna (butuh sandi aplikasi). Tanpa database tetap `localStorage` saja. Lihat §4.10 |
| Session-RPE untuk ST (RPE sesi × durasi) masuk beban 7 hari, kepatuhan program, Week Ledger | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #2) |
| Tes kekuatan berkala di minggu deload (maks push-up, tahan side plank, single-leg calf raise) + milestone pull-up (band → negative → penuh) | ⬜ | 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) #7). Menggabungkan baris "Milestone pull-up" |
| Tren volume ST (set × rep × kg per pola gerakan) | ⬜ | 0.15 Insight |

### 4.7 Platform, UI & pengaturan

| Fitur | Status | Catatan |
| --- | --- | --- |
| PWA installable, full-screen, safe area | ✅ | |
| Design system "Tag" (dark-first, aksen `#FC4C02`, Archivo + Geist Mono, StatRow, Segment Skyline, Week Ledger) | ✅ | 0.10.0-ui · [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Rencana = warna intensitas, selesai = oranye |
| Logo "Forward H" (AppBar, ikon PWA, favicon) | ✅ | 0.10.1 · [brand/LOGO.md](brand/LOGO.md). Di UI lewat `LogoMark`, hanya di AppBar |
| Tema Sistem/Terang/Gelap tersimpan | ✅ | |
| Sistem warna intensitas (hijau/kuning/merah) & status (hijau/merah) | ✅ | |
| Navigasi 5 tab (Profil, Lari, Program, Strength, Setting) | ✅ | Log → Setting di 0.8; `/log` diarahkan ke Strength |
| Efek hover (bayangan tipis) di semua tombol | ✅ | Hanya perangkat dengan pointer |
| Mode offline (service worker) | ⬜ | Tanpa internet aplikasi tidak terbuka. Direncanakan 1.0 |
| Login / proteksi akses | ✅ | 0.12.0: sandi aplikasi opsional (`APP_PASSCODE` + `SESSION_SECRET`), lihat §4.10. Vercel Authentication tetap dianjurkan sebagai lapisan luar |
| Notifikasi / pengingat latihan | ⬜ | |

### 4.8 Setting

| Fitur | Status | Catatan |
| --- | --- | --- |
| Katalog 10 kondisi & batasan, toggle aktif/nonaktif, sumber per kondisi | ✅ | APT, shin splints, overpronation, MCU, punggung bawah, PFP, ITBS, Achilles, plantar fasciitis, bahu |
| Catatan kondisi teks bebas | ✅ | Tampil di workout, tidak mengubah generator |
| Zona pace Easy/Tempo/Interval/4×4: manual atau VDOT Daniels dari hasil lomba | ✅ | Default dari JSON, reset per zona. Sejak 0.10.1 diisi lewat pemilih jam/menit/detik (`TimePicker`), tanpa mengetik ":" di HP |
| Alat: dumbbell, barbell, plat, band, pull-up bar, kursi, alat lain | ✅ | Daftar beban yang bisa dirakit tampil langsung |
| Toggle titik tambat band | ✅ | 0.9 — untuk Band Reverse Fly, Band External Rotation, Standing Band Hip Abduction, Seated Band Hamstring Curl |
| Pilihan movement library + alasan bila tidak tersedia | ✅ | Gerakan wajib kondisi dikunci; 45 gerakan sejak 0.11.2 (5 cadangan tanpa alat diberi label "Cadangan") |
| Menambah gerakan sendiri (custom) | ⬜ | Gerakan hanya dari kurasi developer |
| Tema & blok mingguan, Data & cadangan | ✅ | |
| Nav bagian sticky: smooth scroll, highlight kartu tujuan, scroll spy | ✅ | 0.8.1, menghormati reduced motion |
| Zona HR & RPE bisa diubah | ⬜ | Sekarang hanya pace |
| Edit nama, target lomba, tanggal mulai blok | ✅ | 0.11.0, bagian Profil (paling atas). Target lomba lewat pemilih waktu |
| Hasil lomba / time trial tersimpan (jarak, waktu, tanggal) | ✅ | 0.13.2: dari kalkulator VDOT ("Terapkan ke semua zona" atau "Simpan hasil saja"), bisa dihapus, tersinkron per kunci. Sumber utama perkiraan waktu lomba dan saran update zona |

### 4.9 Onboarding

Selesai di 0.11 (0.11.0 sampai 0.11.2), spesifikasi lengkap di [ONBOARDING.md](ONBOARDING.md).

| Fitur | Status | Catatan |
| --- | --- | --- |
| Wizard `/onboarding` 10 langkah, lanjut dari langkah terakhir, tombol Kembali | ✅ | 0.11.0 (langkah 1, 2, 5–8, 10) + 0.11.1 (langkah 3, 4, 9). Langkah 9 selesai sendiri bila aplikasi sudah terpasang |
| Disclaimer kesehatan & lisensi wajib, tampil ulang bila versi naik | ✅ | 0.11.0. Repo belum punya file lisensi; poin lisensi menautkan NOTICE.md |
| Profil dasar (nama, usia, fokus, target lomba, blok/mode bebas) di onboarding & Setting | ✅ | 0.11.0 |
| Kondisi wajib eksplisit, opsi "Tidak ada kondisi" | ✅ | 0.11.0 |
| Zona lari: VDOT / manual / "belum tahu" (zona perkiraan) | ✅ | 0.11.0. Isian awal VDOT dari lari terbaik 90 hari dipindah ke backlog (P2) |
| Alat opsional (lewati = bodyweight) | ✅ | 0.11.0, plus catatan sesi ST yang jadi lebih pendek |
| `config/athlete-profile.json` netral + file migrasi profil pemilik | ✅ | 0.11.0: zona dari VDOT 30; `scripts/make-owner-settings.mjs` → `owner-settings.local.json` (diabaikan git) |
| Ekspor/impor format v3 (profil dasar + status onboarding), impor v2 tetap diterima | ✅ | 0.11.0. File `kind: "defaults"` hanya mengisi yang kosong; log selalu digabung |
| Gate di client: pengguna lama hanya melihat disclaimer, tanpa kehilangan data | ✅ | 0.11.0 |
| Cek koneksi intervals.icu di server (browser hanya menerima status) | ✅ | 0.11.1: `GET /api/connection` → `{ status, athleteName? }`, tanpa cache; key & athlete ID tidak pernah dikirim |
| Pengingat amankan deploy (Vercel Authentication › All Deployments) | ✅ | 0.11.1, konfirmasi tersimpan (`protectionConfirmedAt`). Aplikasi tidak bisa memeriksanya dari dalam |
| Pasang ke layar utama (install prompt Android, panduan iOS) | ✅ | 0.11.1, plus catatan masih butuh internet |
| Bagian "Belum selesai" di Setting untuk langkah yang dilewati | ✅ | 0.11.1: koneksi, proteksi (termasuk pengguna lama), zona perkiraan, pasang |
| Tur in-app 4 sampai 5 sorotan + "Ulangi tur" | ✅ | 0.11.2: 5 sorotan lintas tab (Profil, Lari, Strength, Program, Setting), spotlight sendiri, Escape & fokus terjebak, reduced motion hanya fade. Ulangi dari Setting › Tampilan |

### 4.10 Sinkron & keamanan

Selesai di 0.12 (0.12.0 sampai 0.12.2), spesifikasi lengkap di [SYNC.md](SYNC.md).

| Fitur | Status | Catatan |
| --- | --- | --- |
| CI GitHub Actions (typecheck, test, build tiap push & PR, Demo Mode) + badge README | ✅ | 0.12.0: `.github/workflows/ci.yml`, Node 22, tanpa env rahasia |
| Sandi aplikasi: middleware mengunci halaman & API, `/unlock`, pengecualian aset & PWA | ✅ | 0.12.0: `proxy.ts` (nama middleware di Next.js 16). Halaman → `/unlock?next`, API → 401; manifest, ikon, dan `_next/static` tetap terbuka. Data intervals.icu dicek ulang sebelum diambil. Tanpa `APP_PASSCODE` identik dengan 0.11; konfigurasi tidak lengkap → semua terkunci |
| Sesi cookie 90 hari bertanda tangan HMAC; ganti sandi membatalkan semua sesi | ✅ | 0.12.0: `httpOnly`, `Secure`, `SameSite=Lax`; sidik jari sandi di tanda tangan; perbandingan waktu-konstan |
| Pembatasan percobaan sandi (Redis bila ada, memori sebagai upaya terbaik) | ✅ | 0.12.0: 5 gagal per 15 menit per IP (di-hash); Upstash REST lewat `fetch`, tanpa dependensi baru |
| Tombol **Kunci perangkat ini** di Setting | ✅ | 0.12.0: kartu Keamanan di Setting › Data, hanya saat sandi aktif |
| Sinkron per bagian (profil, setting, program, preferensi, onboarding, log) ke Upstash Redis milik pengguna | ✅ | 0.12.1: `/api/sync` (sesi wajib), satu hash per bagian, baca 1 pipeline, tulis EVAL atomik; tiap bagian divalidasi dengan parser impor. Aktivasi pertama: server kosong → unggah; keduanya berisi → server menang, lokal mengisi yang kosong, log & onboarding digabung |
| Log per entri: `id` stabil, migrasi entri lama, hapus memakai tombstone | ✅ | 0.12.1: `updatedAt`; entri tanpa `id` diberi id deterministik; tombstone tidak tampil, tidak dihitung progresi, tidak diekspor; dipadatkan setelah 90 hari |
| Konkurensi dengan `rev` dari server (`baseRev`, merge lalu ulang, maks 3 kali, status konflik) | ✅ | 0.12.1: pemenang ditentukan oleh kunci yang diubah lokal sejak `rev` terakhir, bukan jam perangkat |
| Pemicu sinkron (buka, kembali terlihat, debounce 2 detik, Sinkron sekarang) + antrean "belum terkirim" | ✅ | 0.12.1: juga saat kembali online. Gagal kirim tidak membuang data lokal |
| Setting › **Sinkron & keamanan** (status, Sinkron sekarang) + titik status di AppBar hanya saat bermasalah | ✅ | 0.12.1: menggantikan kartu Keamanan 0.12.0; titik muncul saat konflik atau belum terkirim > 10 menit |
| Onboarding langkah 4: status sandi aplikasi & database (endpoint status hanya boolean) | ✅ | 0.12.1: `/api/status` → `{ passcode, database, sync }` |
| Cadangan otomatis harian (7 snapshot) + Riwayat cadangan & Pulihkan | ✅ | 0.12.2: snapshot saat sinkron pertama tiap hari WIB (SET NX); Pulihkan menyimpan keadaan sekarang dulu (bisa dibatalkan) dan menaikkan `epoch` sehingga semua perangkat mengganti datanya; kemajuan onboarding tidak ikut mundur |
| Onboarding langkah 1: **Sambungkan perangkat ini** | ✅ | 0.12.2: hanya saat sinkron aktif; sandi diminta proxy lebih dulu; wizard dilewati bila server sudah punya onboarding selesai, disclaimer tampil bila versinya belum disetujui |
| Disclaimer diperbarui untuk sinkron (`TERMS_VERSION` naik) + README panduan Upstash | ✅ | 0.12.2: `TERMS_VERSION` 2; README dengan batas paket gratis (dicek 2026-10-23) |

## 5. Persyaratan non-fungsional

| Area | Target | Status |
| --- | --- | --- |
| Keamanan API key | Tidak pernah ke browser | ✅ |
| Privasi data | Hanya pemilik deploy yang bisa melihat | 🟡 Deploy pemilik dilindungi Deployment Protection. Sejak 0.12.0 tersedia sandi aplikasi opsional, sehingga fork yang melewatkan Vercel Authentication tetap bisa dikunci; belum aktif bila pemilik deploy tidak mengisi `APP_PASSCODE` |
| Mobile-first | Nyaman di layar 375px, area sentuh ≥ 44px | ✅ |
| Aksesibilitas | Kontras teks AA di kedua tema, fokus keyboard, reduced motion | 🟡 Teks ✅ semua pasangan ≥ 4.5:1. Tombol oranye baru lolos sejak 0.10.0-ui (teks gelap 5.78:1; teks putih lama hanya 3.40:1, jadi klaim AA sebelumnya keliru). Non-teks belum: border kontrol `line-strong` 1.7:1 / 1.6:1 dan isi kuning `warning` di mode terang 1.9:1 (butuh ≥ 3:1) |
| Keandalan logika | Semua aturan latihan diuji unit test | ✅ |
| Akurasi data aktivitas | Split per km konsisten dengan ringkasan aktivitas dan dekat dengan Strava | 🟡 Jumlah jarak & waktu split = total; hasil yang meleset > 5% jarak / 10% waktu tidak ditampilkan. Per km masih bisa beda beberapa detik dari Strava (lihat §6) |
| Lisensi aset | Hanya aset berlisensi bebas, atribusi di `NOTICE.md` | ✅ free-exercise-db (Unlicense) |
| Ukuran aset & performa | Gambar lokal WebP ≤ 600 px, lazy loading, tanpa hotlink | ✅ 72 gambar, ±1,3 MB total |
| Ketersediaan | Tetap jalan tanpa API key / saat intervals.icu error | ✅ |
| Offline | Bisa dibuka tanpa sinyal | ⬜ |
| Pengujian UI | Test komponen / end-to-end | ⬜ Hanya unit test logika (termasuk logika murni Segment Skyline). Screenshot dokumentasi diperbarui tiap rilis UI (terakhir 0.11.2: onboarding & tur) |
| CI | Test & build otomatis tiap push/PR | ✅ 0.12.0: GitHub Actions (typecheck, test, build) tanpa env rahasia |

## 6. Keterbatasan & utang teknis

Diurutkan dari yang paling berdampak.

1. **Movement library hanya dari kurasi developer.** 0.9 menambah 13 gerakan (total 40), tetapi pengguna belum bisa menambah gerakan sendiri; alat lain (mis. kettlebell) baru dicatat. 5 gerakan belum punya gambar — termasuk 2 prehab wajib (Clamshell, Tibialis Wall Raise) — dan celah anti-rotasi (Pallof, bird dog, suitcase carry) belum ada di sumber gambar. Kondisi di luar katalog hanya catatan.
2. **Ambang tetap.** HR lari berat (155), penurunan HRV (15%), dan kenaikan resting HR (5 bpm) belum dipersonalisasi.
3. **Data per detik dari jam tidak selalu bisa dipercaya.** Untuk data Huawei, intervals.icu kadang hanya punya total jarak yang dibagi rata, atau jarak bertangga (datar lalu melompat). Split lalu dihitung dari GPS dan diskalakan ke jarak jam, sehingga per km bisa beda beberapa detik dari Strava yang menghitung ulang jarak sendiri. Kalibrasi lebih lanjut butuh data mentah (lihat backlog).
4. **Isi aktivitas Strava tidak bisa dibaca.** Kebijakan Strava melarang intervals.icu meneruskan data Strava lewat API. Salinan Strava dibuang bila ada rekaman lain; aktivitas yang hanya ada di Strava tampil sebagai "Aktivitas Strava" tanpa data.
5. **Kalender tanpa program terbatas 2 bulan.** Sejak 0.13.0 rentang mengikuti program tersimpan (awal program sampai bulan lomba, maks 200 hari ke belakang); tanpa program hanya bulan ini dan bulan lalu. Program hanya ada di perangkat (atau disinkron), jadi data lama diambil di client setelah halaman terbuka.
6. **Belum offline.** Belum ada service worker. Direncanakan 1.0.
7. **Pengujian UI manual.** Belum ada test komponen/e2e (CI GitHub Actions menjalankan unit test & build sejak 0.12.0). Animasi bottom sheet & crossfade 0.9 baru diverifikasi secara logika (state, posisi, reduced motion), belum di perangkat nyata.
8. **Script media & ikon memakai `sharp` dari Next.js** (dependensi tidak langsung). Bila Next.js berhenti membawanya, `sharp` perlu ditambahkan sebagai devDependency.
9. **Batas percobaan sandi tanpa Redis hanya upaya terbaik.** Tanpa Upstash, hitungan gagal disimpan di memori per instance serverless, jadi bisa ter-reset saat instance baru dibuat. IP diambil dari `x-forwarded-for` yang di Vercel diisi oleh platform; di hosting lain header ini bisa dipalsukan.
10. **Sinkron bergantung pada paket gratis Upstash** (500K perintah/bulan, data 256 MB, dicek 2026-10-23; lihat README). Desainnya hemat: satu baca + satu tulis per sinkron, ditambah satu snapshot harian. Tema ikut tersinkron, jadi mengganti tema di satu perangkat mengubah semua perangkat.
11. **Pulihkan bersifat otoritatif.** Pulihkan mengganti data di semua perangkat (lewat `epoch`). Perubahan yang belum terkirim dari perangkat lain saat itu ikut tergantikan; snapshot "Sebelum pulihkan" hanya menyimpan keadaan server. Kemajuan onboarding dan persetujuan disclaimer tidak ikut mundur.
12. **Tanpa enkripsi sisi klien.** Data di database tersimpan apa adanya (Upstash mengenkripsi saat disimpan, database ada di akun pengguna, dibatasi sandi aplikasi). Enkripsi dengan passphrase ada di backlog P2.
13. **ST belum masuk hitungan beban dan belum mengikuti fase program.** Coach hanya membaca aktivitas intervals.icu, jadi sesi ST berat yang tidak tercatat di jam tidak ikut beban 7 hari, dan ST kaki tetap sama saat Peak/Taper. Direncanakan 0.14 ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md)).

## 7. Roadmap & saran pengembangan

Prioritas: **P0** = segera (risiko/fondasi) · **P1** = nilai besar berikutnya · **P2** = peningkatan · **P3** = nanti.
Ukuran: **S** ≈ < 1 hari · **M** ≈ 1–3 hari · **L** ≈ > 3 hari.

### Rilis berikutnya yang disarankan

| Usulan versi | Isi | Alasan |
| --- | --- | --- |
| **0.14 Strength hidup** ([STRENGTH-HIDUP.md](STRENGTH-HIDUP.md)) | ST mengikuti fase program, session-RPE masuk beban, aturan hari yang sama, mode latihan + timer, skema Kekuatan, tangga progresi, tes kekuatan, plyometric opsional | ST jadi separuh rencana yang setara: ikut dihitung sebagai beban dan punya progres yang terlihat |
| **0.15 Insight** | Grafik tren CTL/ATL/Form, km mingguan, pace & cadence, tren volume ST; check-in subjektif harian | Melihat progres jangka panjang dan mencegah cedera |
| **1.0 Siap pakai penuh** | Offline, kirim workout ke intervals.icu/jam, test e2e | Stabil dan mandiri tanpa edit kode |

> 2026-10-26 (3): **0.13.3 Hari H** ditambahkan setelah 0.13 selesai: atlet memilih Hari H dengan saran lama program (rekomendasi umum + data long run), pre-Base untuk Hari H yang jauh, dan arsip program. Rilis berikutnya tetap **0.14 Strength hidup**.
>
> 2026-10-26 (2): **0.13 Program hidup selesai** (0.13.0 kepatuhan & kalender, 0.13.1 program → generator & saran tahu rencana, 0.13.2 prediksi, saran zona, geser/lewati, hitung mundur) dan pindah ke §8. Rilis berikutnya **0.14 Strength hidup**. Sumber 2 prediksi (best effort intervals.icu) tidak dipakai: endpoint `GET /api/v1/athlete/{id}/pace-curves` ada di dokumentasi resmi, tetapi satuan `values` tidak dijelaskan dan data per detik jam tidak selalu bisa dipercaya (§6), jadi masuk backlog P2. Saran update zona memakai dua hasil lomba berbeda yang terpisah ≥ 14 hari.
>
> 2026-10-26: **spesifikasi 0.13 Program hidup selesai** ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md), menggantikan dokumen cakupan). Dirilis bertahap: 0.13.0 kepatuhan & kalender, 0.13.1 program → generator & saran tahu rencana, 0.13.2 prediksi, zona, geser/lewati, hitung mundur. Keputusan: **D1** prediksi memakai VDOT Daniels yang sama dengan zona, Riegel hanya pembanding. **D2** sesi selesai bila ada lari di tanggal rencana ±1 hari (WIB) dengan jenis cocok dan durasi atau jarak ≥ 80%, di bawahnya sebagian. **D3** kepatuhan dihitung di client lewat modul murni, aktivitas tetap diambil di server. **D4** long run dan sesi spesifik lomba tidak dibuat ulang lewat generator 30/45/60 menit, tetapi tampil sebagai kartu sesi program. **D5** geser/lewati tidak pernah otomatis dan tidak pernah menambah volume minggu berikutnya.
>
> 2026-10-23 (3): roadmap disetujui: **0.13 Program hidup**, **0.14 Strength hidup**, **0.15 Insight**, 1.0. ST dipisah menjadi rilis sendiri karena ST belum tereksplorasi untuk aplikasi hybrid athlete (masih prehab & pelengkap lari, belum dihitung sebagai beban dan belum mengikuti fase program). Insight bergeser dari 0.14 ke 0.15 dan kini mencakup tren volume ST. CI tidak lagi tercantum di 1.0 karena sudah ada sejak 0.12.0. Cakupan: [PROGRAM-HIDUP.md](PROGRAM-HIDUP.md), [STRENGTH-HIDUP.md](STRENGTH-HIDUP.md).
>
> 2026-10-23 (2): **0.12 Aman & tersinkron selesai** (0.12.0 CI + sandi aplikasi, 0.12.1 sinkron, 0.12.2 cadangan otomatis & perangkat kedua) dan pindah ke §8. Rilis berikutnya **0.13 Program hidup**. Enkripsi sisi klien tetap di backlog P2.
>
> 2026-10-23: spesifikasi **Aman & tersinkron** ditulis ([SYNC.md](SYNC.md)) dan menjadi rencana **0.12** (0.12.0 CI + sandi aplikasi, 0.12.1 sinkron, 0.12.2 cadangan otomatis & perangkat kedua). Tiga item backlog P0 (proteksi akses, sinkron data, CI) masuk 0.12. Enkripsi sisi klien tidak masuk 0.12 dan dicatat sebagai backlog opsional.
>
> 2026-10-22 (2): **0.11 Onboarding & deploy pribadi selesai** (0.11.0, 0.11.1, 0.11.2) dan pindah ke §8. Rilis berikutnya **0.12 Aman & tersinkron**. Isian awal VDOT dari lari terbaik masuk backlog P2.
>
> 2026-10-22: spesifikasi **Onboarding & deploy pribadi** disetujui ([ONBOARDING.md](ONBOARDING.md)) dan masuk sebagai **0.11** (0.11.0, 0.11.1, 0.11.2). Isi roadmap lama bergeser satu nomor: Aman & tersinkron → 0.12, Program hidup → 0.13, Insight → 0.14. Edit target & tanggal blok pindah dari 1.0 ke 0.11.
>
> 2026-10-21: 0.10.1 (logo, dedupe Huawei + Strava, split per km, pemilih waktu) dan 0.10.2 (akurasi split) adalah rilis perbaikan dari pemakaian harian. Urutan roadmap tidak berubah: berikutnya tetap **0.11 Aman & tersinkron**.
>
> Catatan urutan (2026-10-11): "Edit profil di aplikasi" dimajukan ke 0.8 atas permintaan pemilik, disimpan di perangkat dulu. Proteksi akses & sinkron database bergeser ke 0.10.
>
> 2026-10-12 (2): redesign visual dirilis sebagai **0.10.0-ui**, sehingga isi roadmap bergeser satu nomor (Aman & tersinkron → 0.11).
>
> 2026-10-12: 0.9 "Library & alat" selesai sebagai **Visual gerakan + perluasan library**. Rekomendasi berikutnya tetap 0.10 — log, Setting, dan pilihan gerakan kini makin berharga untuk disinkron & dilindungi.

### Backlog lengkap

| Prioritas | Fitur | Ukuran | Nilai untuk atlet |
| --- | --- | --- | --- |
| P0 | **Proteksi akses** (passcode di middleware atau Vercel Authentication) | S | Data kesehatan tidak terbuka untuk umum. → Masuk **0.12.0** (sandi aplikasi, [SYNC.md](SYNC.md) §3) |
| P0 | **Sinkron data** (Upstash Redis / Supabase) untuk log, program, preferensi | M | Data aman dan sama di semua perangkat. → Masuk **0.12.1–0.12.2** (Upstash Redis milik pengguna, [SYNC.md](SYNC.md) §4) |
| P0 | **CI GitHub Actions** (typecheck, test, build tiap push) | S | Mencegah rilis rusak. → Masuk **0.12.0** ([SYNC.md](SYNC.md) §6) |
| P1 | **Gambar untuk 5 gerakan sisa** & gerakan anti-rotasi (sumber berlisensi bebas lain, atau foto sendiri) | M | Detail teknik lengkap untuk prehab wajib |
| P1 | **Program → generator**: tombol "Kerjakan sesi hari ini" yang mengisi generator lari | S | Satu tap dari rencana ke workout. → Selesai di **0.13.1** |
| P1 | **Kepatuhan program**: tandai sesi rencana ✓/✕ dari aktivitas intervals.icu, tampil di kalender | M | Tahu apakah masih di jalur. → Selesai di **0.13.0** |
| P1 | **Prediksi waktu lomba** dari lari terbaik terbaru (usulan VDOT Daniels, Riegel sebagai pembanding) untuk mengecek target | S | Target realistis. → Selesai di **0.13.2** (tanpa best effort intervals.icu, lihat P2) |
| P1 | **Check-in harian**: nyeri shin (0–10), pegal, kualitas tidur, mood → ikut ke saran | S | Sinyal dini shin splints yang tidak terlihat di HRV. → **0.15** |
| P1 | **Grafik tren** CTL/ATL/Form & km mingguan | M | Melihat kebugaran dan kelelahan jangka panjang. → **0.15** |
| P1 | **ST mengikuti fase program** (Base, Build, Peak, Taper) | M | ST kaki tidak berat menjelang lomba. → **0.14** |
| P1 | **Session-RPE untuk ST** masuk beban 7 hari, kepatuhan, Week Ledger | S | Saran lari ikut memperhitungkan sesi ST yang tidak tercatat di jam. → **0.14** |
| P2 | **Kirim workout ke kalender intervals.icu** (lalu ke jam yang terhubung) | M | Workout langsung muncul di jam. → **1.0** |
| P2 | **Edit sisa profil di aplikasi** (target lomba, tanggal mulai blok, zona HR/RPE) | S | Tanpa edit JSON sama sekali. → Terserap ke **0.11** ([ONBOARDING.md](ONBOARDING.md) §4.5), kecuali zona HR/RPE yang tetap di backlog |
| P2 | **Enkripsi sisi klien (opsional)**: passphrase + WebCrypto sebelum data dikirim ke database | M | Database pun tidak bisa membaca data kesehatan. Tidak di 0.12 ([SYNC.md](SYNC.md) §4, §11) |
| P2 | **Best effort intervals.icu sebagai sumber kedua prediksi** (`GET /api/v1/athlete/{id}/pace-curves`, `type=Run`, `curves=90d`) | S | Perkiraan lebih yakin tanpa harus lomba. Butuh kepastian satuan `values` (tidak dijelaskan di skema API) dan penyaring untuk data per detik jam yang rusak, karena best effort juga bisa memicu saran update zona |
| P2 | **Isian awal VDOT dari lari terbaik 90 hari** di onboarding & Setting (butuh data intervals.icu di client) | S | Zona lari tepat tanpa harus ingat hasil lomba |
| P2 | **Ambang personal** (HR berat dari zona/LTHR, baseline HRV 30 hari) | S | Saran lebih akurat |
| P2 | **Mode offline** (service worker, cache workout terakhir) | M | Tetap bisa dibuka di gym tanpa sinyal. Relevan untuk rasa native setelah onboarding mengajak pasang ke layar utama (0.11). → **1.0** |
| P2 | **Mode latihan ST**: layar penuh per gerakan, timer istirahat & hitung mundur tahan, centang per set langsung tercatat (menggantikan "Timer sesi ST") | M | Tidak perlu aplikasi timer lain dan tidak mencatat belakangan. → **0.14** |
| P2 | **Tes kekuatan berkala** di minggu deload + **milestone pull-up** & gerakan baru otomatis aktif saat siap (mis. negative pull-up) | S–M | Progres ST terlihat seperti pace/VDOT di lari. → **0.14** |
| P2 | **Aturan lari + ST di hari yang sama** (jeda ≥ 3 jam) | S | Mengurangi interferensi pada kekuatan eksplosif. → **0.14** |
| P2 | **Skema "Kekuatan" 5–6 rep @ RPE 7** untuk ★ di fase Build (butuh persetujuan pemilik) | S | Manfaat beban relatif tinggi untuk running economy. → **0.14** |
| P2 | **Tangga progresi saat beban mentok** (bilateral → split → RFESS → satu kaki, atau tempo/jeda) | M | Progres tetap jalan walau alat terbatas. → **0.14** |
| P2 | **Grafik cadence & pace easy run** | S | Memantau perbaikan crossover gait. → **0.15** |
| P2 | **Tren volume ST** (set × rep × kg per pola gerakan) | S | Progres ST jangka panjang. → **0.15** |
| P3 | **Kalibrasi split vs Strava** (penghalusan GPS & skala jarak) dengan data mentah beberapa lari, target ±2 detik/km | S | Split sama persis dengan yang dilihat di Strava |
| P2 | **Gerakan custom** (tambah gerakan sendiri + alat + rentang beban, tetap lewat validator) | M | Library mengikuti alat baru tanpa menunggu developer |
| P1 | **Kontras non-teks**: `line-strong` → `#636366` (gelap) / `#959490` (terang), `warning` terang → `#B98D06` (semua ≥ 3:1) | S | Border input & bar Moderate terlihat jelas |
| P2 | **Bagikan kartu story** dari `/activity/[id]`: RunTag → PNG transparan 1920×1280 lewat `<canvas>` (DESIGN-SYSTEM §9) | M | Berbagi sesi ke Instagram/WA dengan gaya app |
| P3 | Bersihkan em dash di string `lib/` (56 string di 12 file: coach, generator, program, progression, media) | S | Copy konsisten dengan aturan desain |
| P3 | Pengingat/notifikasi (web push) | L | Konsisten latihan |
| P3 | Tampilkan kembali tab **Set Huawei** (pratinjau format set) | S | Disembunyikan sementara di 0.8 |
| P3 | Saran ringkas satu baris di **Generator Strength** | S | Konsisten dengan Generator Lari |
| P3 | Video singkat per gerakan | M | Eksekusi lebih aman (gambar awal/akhir sudah ada sejak 0.9) |
| P3 | Multi-atlet / berbagi ke pelatih | L | Hanya bila dibutuhkan |
| P3 | Lari trail/treadmill & cuaca (panas → turunkan target pace) | M | Target realistis di cuaca tropis |
| P3 | **Plyometric ringan (opsional)**, hanya bila kondisi shin splints nonaktif, progresi bertahap | M | Running economy membaik. → **0.14** atau ditunda (keputusan terbuka) |

### Ide yang sengaja **tidak** dikerjakan (untuk sekarang)

- **AI chat bebas sebagai generator.** Aturan cedera harus deterministik dan teruji; AI boleh dipakai untuk penjelasan, bukan untuk meresepkan beban.
- **Akun & multi-user.** Belum perlu untuk satu atlet, dan menambah risiko privasi.
- **Program adaptif penuh (volume berubah otomatis dari kepatuhan).** Saran tidak boleh memaksa; versi aman adalah tawaran geser atau lewati sesi yang terlewat (0.13, [PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) #9), dengan keputusan tetap di tangan atlet.

## 8. Riwayat rilis singkat

| Versi | Tanggal | Tema |
| --- | --- | --- |
| 0.1 | 2026-09-28 | Fondasi: profil, intervals.icu, generator lari & ST, Demo Mode, PWA |
| 0.2 | 2026-09-29 | Periodisasi blok, pola lari baru, polesan mobile |
| 0.3 | 2026-09-29 | Saran mingguan (80/20, km, concurrent) |
| 0.4 | 2026-09-29 | Log sesi & progresi beban |
| 0.5 | 2026-10-05 | Redesign design system |
| 0.6 | 2026-10-05 | Tema terang/gelap, sistem warna, mode bebas, Program target |
| 0.7 | 2026-10-09 | Kalender aktivitas, saran ringkas, kondisi dropdown |
| 0.8 | 2026-10-11 | Halaman Setting: kondisi berbasis riset, zona VDOT, alat & beban, movement library; Log → Strength & Setting |
| 0.8.1 | 2026-10-11 | Saran ringkas di Generator Lari; navigasi Setting (smooth scroll, highlight, scroll spy) |
| 0.9 | 2026-10-12 | Gambar & detail teknik gerakan (free-exercise-db), 13 gerakan baru, titik tambat band |
| 0.10.0-ui | 2026-10-12 | Redesign "Tag": token dark-first, Archivo + Geist Mono, StatRow, Segment Skyline, Week Ledger, kontras tombol diperbaiki |
| 0.10.1 | 2026-10-16 | Logo "Forward H" (AppBar, ikon PWA, favicon); split per km dari stream (GPS bila jarak dibagi rata); aktivitas ganda Huawei + Strava dihitung sekali; pemilih waktu & pace di Setting |
| 0.10.2 | 2026-10-21 | Split per km akurat: data jarak bertangga, lonjakan, reset; ambang bergerak seperti Strava; validasi terhadap ringkasan aktivitas |
| 0.11.0 | 2026-10-22 | Onboarding (langkah 1, 2, 5–8, 10) + gate, profil dasar di Setting, JSON profil netral + migrasi pemilik, cadangan v3 |
| 0.11.1 | 2026-10-22 | Onboarding langkah 3 (cek koneksi intervals.icu di server), 4 (amankan deploy), 9 (pasang ke HP); pengingat "Belum selesai" di Setting |
| 0.11.2 | 2026-10-22 | Tur in-app 5 sorotan + Ulangi tur; strength tanpa alat (5 gerakan cadangan, pesan alat, test semua kombinasi); screenshot onboarding |
| 0.11.3 | 2026-10-23 | Pembaruan keamanan dependensi (Next.js 16.4.2, Vitest 5.0.5, Vite); popover tur lebih ringkas |
| 0.12.0 | 2026-10-23 | CI GitHub Actions; sandi aplikasi opsional (proxy, `/unlock`, sesi HMAC 90 hari, batas percobaan, Kunci perangkat ini) |
| 0.12.1 | 2026-10-23 | Sinkron opsional ke Upstash Redis milik pengguna: merge per bagian, log ber-id + tombstone, `rev`/`baseRev`, antrean belum terkirim, Setting › Sinkron & keamanan, status di AppBar & onboarding langkah 4 |
| 0.12.2 | 2026-10-23 | Cadangan otomatis harian (7 snapshot) + Riwayat cadangan & Pulihkan yang bisa dibatalkan; Sambungkan perangkat ini; disclaimer v2; README panduan Upstash |
| 0.13.0 | 2026-10-26 | Program hidup tahap 1: sesi rencana ber-id + override (disinkron per sesi), kepatuhan otomatis, rencana di kalender sepanjang program, ringkasan minggu di Profil |
| 0.13.1 | 2026-10-26 | Program hidup tahap 2: "Kerjakan sesi hari ini" (isian generator lari & ST dari rencana, kartu sesi program untuk long run & sesi spesifik lomba), saran hari ini terhadap rencana |
| 0.13.2 | 2026-10-26 | Program hidup selesai: perkiraan waktu lomba (VDOT, Riegel pembanding), hasil lomba tersimpan, saran update zona, geser/lewati sesi terlewat, hitung mundur & checklist minggu lomba |
| 0.13.3 | 2026-10-26 | Hari H dipilih atlet: kalender dengan saran lama program, kesiapan HM/FM, jarak antar maraton, panjang program variabel & pre-Base, arsip program |

Detail tiap versi ada di [CHANGELOG.md](../CHANGELOG.md).

## 9. Cara memperbarui dokumen ini

Setiap kali ada rilis:

1. Naikkan versi di `package.json` dan tambahkan entri di `CHANGELOG.md`.
2. Di dokumen ini:
   - ubah tabel di bagian atas (versi, tanggal, jumlah test),
   - ubah status fitur di §4 (⬜ → 🟡 → ✅),
   - hapus keterbatasan yang sudah teratasi di §6,
   - pindahkan item roadmap yang selesai di §7 ke §8.
3. Perbarui tabel progres di `README.md` dan screenshot bila tampilan berubah.
4. Bila movement library berubah: putuskan media di `scripts/audit-movement-media.mjs`, isi `lib/movements/media.ts`, lalu jalankan `node scripts/audit-movement-media.mjs` dan `node scripts/fetch-movement-media.mjs`.

Saat mengusulkan fitur baru, tambahkan barisnya di backlog §7 dengan prioritas, ukuran, dan nilai untuk atlet, lalu pastikan tidak melanggar aturan di §3.
