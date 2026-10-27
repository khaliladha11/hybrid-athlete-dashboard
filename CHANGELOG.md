# Changelog

Semua perubahan penting di project ini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

## [Unreleased]

## [0.14.1] · 2026-10-27 · Sesi ST

Tahap kedua [STRENGTH-HIDUP.md](docs/STRENGTH-HIDUP.md) (§3 0.14.1, keputusan D5, D7, D8).

### Ditambahkan
- **Mode latihan** (`/strength/sesi`): layar penuh satu gerakan per layar, centang per set dengan beban, rep atau detik, RPE, dan tempo; timer istirahat (+15 detik, lewati) dan hitung mundur tahan berbasis jam, jadi sesi bisa ditinggal lalu dilanjutkan; layar tetap menyala lewat Wake Lock API (catatan jujur bila tidak didukung); getar opsional saat timer habis. Kartu "Sesi berjalan" di halaman Strength.
- **Session-RPE**: setelah sesi isi RPE 0–10 (CR-10) dan durasi dari timer; beban = RPE × menit (Foster). Masuk ST 7 hari di kartu 7 hari (terpisah dari beban lari), kepatuhan program (selesai ≥ 80% set, di bawahnya sebagian), dan Week Ledger (`SENIN · ST LOWER · 45'`). Sesi yang sama di intervals.icu tidak dihitung dua kali (tanggal sama, jam mulai ≤ 2 jam).
- **ST mengikuti fase program**: Build High, Peak maintenance (30', inti maks 2 set, beban ditahan), taper volume setengah dengan frekuensi tetap, ST kaki terakhir ≥ 8 hari sebelum Hari H, minggu lomba hanya Upper ringan ≥ 3 hari sebelumnya. Sumber di TRAINING-LOGIC §7.
- **Aturan hari yang sama**: lari + ST di hari yang sama → saran jeda ≥ 3 jam (Schumann 2022), non-blokir; aturan concurrent lama tetap dan kini juga dipicu sesi Lower/Full Body dari mode latihan.
- **Peta otot sesi**: `MuscleMap` depan/belakang dari path SVG MuscleMapJS (MIT, disalin, bukan dependensi), warna D7, daftar teks otot; di mode latihan dan setelah sesi.
- Cadangan **v5** (sesi ST; v1–v4 tetap bisa diimpor) dan bagian sinkron baru `sessions`.
- 60 test baru (`st-session`, `workout-state`, `week-ledger`, `st-phase`, `muscle-regions`, tambahan coach, kepatuhan, cadangan), total 567 di 43 file.

### Diubah
- Jadwal ST program: minggu taper sebelum minggu lomba kini 2× ringan (sebelumnya 1× Upper); level/durasi ST dari fase. Test baseline program kini hanya membandingkan sesi lari (identik).
- Catatan ST program menyebut aturan fase.

### Dokumentasi
- PRD (versi, §4.4/§4.6/§4.8, §5 lisensi aset, §8), TRAINING-LOGIC §5/§7/§8, DESIGN-SYSTEM §6, ARCHITECTURE, NOTICE (tiga lisensi MIT), README, screenshot.

## [0.14.0] · 2026-10-27 · Strength hidup: progresi dengan alat terbatas

Tahap pertama [STRENGTH-HIDUP.md](docs/STRENGTH-HIDUP.md) (§2, §3 0.14.0 a–e, keputusan D1–D4).

### Ditambahkan
- **Batas beban baru** (keputusan pemilik 2026-10-26): rentang library jadi titik awal; beban resep = min(batas alat, batas keamanan). Aktif setelah kartu "Perubahan batas beban" disetujui, bisa dikembalikan lewat Setting › Alat "Batasi ke rentang awal library". Batas keamanan: Barbell Squat 16 kg & Barbell Sumo Deadlift / Hip Thrust 20 kg saat APT/LBP, Seated Lateral Raise 3 kg & DB Scaption 2 kg saat nyeri bahu. Label `DI ATAS RENTANG AWAL` dan penjelasannya di detail gerakan.
- **Alat diperluas:** dumbbell fixed & kettlebell (tambah/ubah/hapus) di samping handle + plat; data lama dimigrasi otomatis; jalan pintas dari halaman Strength ke Setting › Alat.
- **PR kemampuan:** daftar per gerakan dengan riwayat, tambah/ubah/hapus, PR dari log terdeteksi otomatis, PR terbaru jadi titik awal gerakan tanpa log. Ikut cadangan **v4** (v1–v3 tetap bisa diimpor) dan bagian sinkron baru `prs`.
- **Double progression saat mentok:** rentang rep tetap (Easy 10–15, Moderate 8–12, High 6–10), lalu tempo/jeda, lalu varian satu sisi yang lebih sulit (★ mulai blok berikutnya, mode bebas langsung). Alat bertambah → progresi beban jalan lagi. Log mencatat tempo & varian.
- **Saran Gita:** syarat naik RPE ≤ target sesi − 1, setiap saran menyebut alasannya dengan angka, tampil di kartu dan detail gerakan. Kartu saran harian kini "Saran Gita · hari ini".
- **Pengingat beli plat** per area (lower, upper push, upper pull) bila ≥ 80% gerakan aktif mentok di batas alat selama 2 sesi; menyebut plat yang membuka progresi terbanyak, bisa ditutup.
- 49 test baru (`equipment`, `load-bounds`, `prs`, `double-progression`, `buy-reminder`, tambahan cadangan & sinkron), total 507 di 38 file.

### Diubah
- PRD §3: aturan beban mengikuti batas alat & keamanan (teks STRENGTH-HIDUP §7).

### Dokumentasi
- PRD (versi, §3, §4.4/§4.6/§4.8, §8), TRAINING-LOGIC §3/§6/§9, DESIGN-SYSTEM §7 (Gita), ARCHITECTURE, README.

## [0.13.3] · 2026-10-26 · Hari H & saran lama program

[PROGRAM-HIDUP.md](docs/PROGRAM-HIDUP.md) §4.10.

### Ditambahkan
- **Hari H** dipilih atlet: panjang program = minggu di antara tanggal mulai dan Hari H (berbasis Senin). Kalender bulan buatan sendiri di Program › Target, setiap tanggal diwarnai: merah (di bawah minimum), kuning (di bawah rekomendasi), hijau, abu-abu (ditambah pre-Base); tanggal paling awal yang bisa disusun diberi cincin, dan tanggal terpilih membawa alasannya.
- **Saran lama program**: tabel rekomendasi umum per jarak, minimum dari data (kenaikan long run dengan aturan program dari long run terjauh asli), kesiapan HM/FM (rata-rata km mingguan, long run terjauh, catatan maraton pertama), jarak dari maraton sebelumnya, ringkasan fase (`BASE 4 · BUILD 5 · PEAK 4 · TAPER 3 MINGGU`), long run puncak, dan VDOT target vs perkiraan. Tidak memblokir; tanggal merah butuh "Saya mengerti risikonya", di bawah taper + 2 minggu tidak bisa disusun.
- **Panjang program variabel**: lebih pendek memangkas Base lalu Build (Peak & taper utuh, puncak yang tidak tercapai diberi peringatan); lebih dari maksimum ditambah **pre-Base**. Hari H boleh hari apa saja.
- **Arsip program**: mengganti Hari H, mulai, atau jarak di tengah program mengarsipkan program lama beserta override-nya (Program › Program sebelumnya dan kalender), lalu program baru berjalan mulai minggu ini. Arsip disinkron per id.
- Target waktu memakai pemilih jam/menit/detik.
- 28 test baru (`program-baseline` dengan 112 hash dari kode sebelum perubahan, `timeline`, tambahan `program`, `program-sessions`, `sync-merge`), total 458 di 33 file.

### Diubah
- Program lama tanpa Hari H dimigrasikan ke mulai + panjang lamanya dengan id lama, jadi isi, status, dan override tidak berubah.

### Dokumentasi
- PROGRAM-HIDUP §4.10, TRAINING-LOGIC §7 (tabel rekomendasi umum + referensi), PRD, ARCHITECTURE, README, screenshot pemilih Hari H.

## [0.13.2] · 2026-10-26 · Program hidup: prediksi, zona, geser/lewati, hitung mundur

Tahap terakhir [PROGRAM-HIDUP.md](docs/PROGRAM-HIDUP.md) (§4.6–§4.9, D1, D5). 0.13 Program hidup selesai.

### Ditambahkan
- **Perkiraan waktu lomba** di Program: 5K/10K/HM/FM dari VDOT Daniels (invers rumus yang sama dengan zona), keyakinan tinggi (hasil lomba 90 hari) atau rendah (lari utuh ≥ 3 km), selisih terhadap target (`di jalur` atau `perlu N"/km lebih cepat`), dan detail sumber dengan pembanding Riegel. FM maksimal rendah bila long run terjauh 30 hari < 12 km.
- **Hasil lomba tersimpan** di Setting › Zona: kalkulator VDOT kini punya tanggal, "Terapkan ke semua zona" ikut menyimpan hasil, ada "Simpan hasil saja", daftar hasil bisa dihapus. Disinkron per kunci dan ikut cadangan.
- **Saran update zona** di Setting › Zona dan Profil bila dua hasil lomba berbeda (terpisah ≥ 14 hari) sama-sama ≥ VDOT zona + 1. Tidak pernah otomatis; Tolak diingat sampai VDOT naik ≥ 1 lagi.
- **Geser atau lewati sesi terlewat**: baris `Tempo Selasa terlewat · Geser ke Jumat · Lewati` di Program dan Profil (maks. 2). Geser hanya di minggu yang sama dan tidak pernah menambah volume minggu berikutnya; Lewati dua ketukan. Disimpan sebagai override program (sudah tersinkron sejak 0.13.0).
- **Hitung mundur** `48 HARI LAGI · HALF MARATHON` di Program dan Profil, **checklist H-1** di minggu lomba dengan rencana pace dari perkiraan, dan tawaran **Catat hasil lomba** H+1 sampai H+14 yang membuka kalkulator dengan jarak & tanggal terisi.
- 32 test baru (`prediction`, `reschedule`, tambahan `settings`, `program`, `sync-merge`, `backup`), total 430 di 31 file.

### Diubah
- Halaman Program mengambil 90 hari aktivitas di server (sebelumnya 30) untuk perkiraan waktu lomba.

### Tidak dipakai
- Best effort intervals.icu (`pace-curves`): ada di dokumentasi resmi, tetapi satuan `values` tidak dijelaskan dan data per detik jam tidak selalu bisa dipercaya. Masuk backlog P2.

### Dokumentasi
- PRD (§4.5 semua baris 0.13 ✅, §4.8, §7 0.13 selesai, backlog, §8), TRAINING-LOGIC §7 (perkiraan, saran zona, geser/lewati, hitung mundur) & §8 (Daniels & Gilbert 1979, Riegel 1981), ARCHITECTURE (modul & test 0.13.1–0.13.2), README, screenshot Program.

## [0.13.1] · 2026-10-26 · Program hidup: program → generator & saran tahu rencana

Tahap kedua [PROGRAM-HIDUP.md](docs/PROGRAM-HIDUP.md) (§4.4, §4.5, D4).

### Ditambahkan
- **Kerjakan sesi hari ini** di Program › Minggu ini dan ringkasan minggu di Profil. Sesi lari & ST membuka generator dengan isian dari rencana (tetap bisa diubah); long run, lomba, Race pace 3×2 km, dan Sharpener tampil sebagai **kartu sesi program** dengan jarak, cue kondisi aktif, dan teks **Copy Set**.
- Chip `DARI PROGRAM · MINGGU N` di Generator Lari & ST selama isian belum diubah (`· DISESUAIKAN SARAN` bila sama dengan versi saran).
- **Saran hari ini terhadap rencana**: kartu saran di Profil menulis `Rencana: Tempo 45'. Saran: Easy 30'.`, alasan tetap di dropdown, dan **Terapkan** membuka generator versi turun atau kartu long run yang dipendekkan (±75%, pace easy). Strip saran di Generator Lari yang dibuka dari program memakai aturan yang sama. Hanya menurunkan, tidak berantai, tidak memblokir; tanpa program perilakunya sama seperti sebelumnya.
- `RunInput.pattern` (opsional) di generator lari untuk pola rencana (tempo, cruise, progression, 4×4, 15/15, varian easy). Tanpa parameter ini keluaran identik dengan sebelumnya.
- 23 test baru (`run-baseline` dengan 108 hash keluaran generator dari kode sebelum perubahan, `run-pattern`, `to-generator`, tambahan `coach`), total 398 di 29 file.

### Dokumentasi
- PRD §4.2, §4.5, §6 (keterbatasan "Program & generator belum terhubung" dihapus), §8; TRAINING-LOGIC §5 (saran terhadap rencana) dan §7 (pemetaan sesi → generator); README.

## [0.13.0] · 2026-10-26 · Program hidup: kepatuhan & kalender

Tahap pertama [PROGRAM-HIDUP.md](docs/PROGRAM-HIDUP.md) (§3, §4.1–4.3).

### Ditambahkan
- **Sesi rencana ber-id** `{programId}:{minggu}:{hari}:{jenis}`, termasuk sesi ST (Senin Lower/Full, Rabu Upper; minggu taper & lomba 1×), dan model **override** geser/lewati (UI-nya di 0.13.2). Override disinkron **per sesi**, jadi keputusan di dua perangkat sama-sama bertahan.
- **Kepatuhan otomatis** dari aktivitas intervals.icu (sudah di-dedupe) dan log ST lokal: selesai (tanggal ±1 hari, jenis cocok, durasi atau jarak ≥ 80%), sebagian, terlewat, hari ini (kemarin masih bisa), digeser, dilewati; catatan "lebih berat" untuk easy yang dikerjakan berat (ambang yang sama dengan saran).
- **Program**: chip status per sesi di "Minggu ini" dan "Semua minggu", jumlah sesi selesai per minggu, sesi ST ikut tampil.
- **Kalender**: aktivitas selesai oranye, sesi rencana mendatang bercincin warna intensitas, terlewat ✕ lembut, dilewati dicoret tipis; navigasi dari awal program sampai bulan lomba; detail hari memuat sesi rencana & statusnya.
- **Profil**: ringkasan `MINGGU 6/12 · BUILD · 3/5 SESI · LONG RUN 14 KM ✓` di atas kartu saran, hanya untuk program aktif.
- `GET /api/activities?oldest=` (maks 200 hari, cache privat 5 menit) untuk data sebelum 2 bulan terakhir; key tetap di server.
- 30 test baru (`program-sessions`, `compliance`, `program-activities`, tambahan `program`, `sync-merge`), total 375 di 26 file.

### Diubah
- **Long run awal program** diambil dari lari terjauh 30 hari **sebelum program mulai** (sebelumnya 30 hari terakhir), sehingga target long run minggu yang sudah lewat tidak ikut bergeser.
- Sel kalender untuk aktivitas selesai kini oranye (sebelumnya hijau/merah menurut berat-ringan); label easy/berat tetap ada di daftar aktivitas.
- Mengganti jarak lomba atau tanggal mulai membuang override program lama.

### Dokumentasi
- Roadmap 0.13–0.15: 0.13 Program hidup ([PROGRAM-HIDUP.md](docs/PROGRAM-HIDUP.md)), 0.14 Strength hidup ([STRENGTH-HIDUP.md](docs/STRENGTH-HIDUP.md)), 0.15 Insight, lalu 1.0. PRD §4, §6, §7 dan README diselaraskan.

## [0.12.2] · 2026-10-23 · Cadangan otomatis & perangkat kedua

Menutup rencana [SYNC.md](docs/SYNC.md) (§4 cadangan otomatis & privasi, §5, §10).

### Ditambahkan
- **Snapshot harian** di database milik pengguna: dibuat saat sinkron pertama tiap hari (WIB), sebelum ada tulisan hari itu; satu per hari walau dua perangkat bersamaan; 7 terbaru disimpan. Ringkasan tanpa data mentah.
- **Setting › Data & cadangan › Riwayat cadangan**: tanggal & jam WIB, jenis (Harian / Sebelum pulihkan), ringkasan, **Pulihkan** (dua ketukan). Pulihkan menyimpan keadaan sekarang dulu lalu mengganti data di semua perangkat lewat `epoch`; **Batalkan pulihkan** mengembalikannya. Kemajuan onboarding & persetujuan disclaimer tidak ikut mundur.
- **Onboarding langkah 1 · Sambungkan perangkat ini** (saat sinkron aktif): ambil data server, lewati wizard; disclaimer tampil bila versinya belum disetujui. Sandi diminta lebih dulu oleh halaman sandi.
- `GET /api/sync/snapshots`, `POST /api/sync/restore` dengan gerbang yang sama seperti `/api/sync`.
- README: panduan memasang Upstash Redis dari Vercel, env var, redeploy, batas paket Free (dicek 2026-10-23), privasi & cara menghapus data.
- Screenshot `15-sync.jpg` (Demo Mode).
- 18 test baru (`sync-snapshots`, `connectDecision`, disclaimer v2), total 345 di 23 file. Uji ujung-ke-ujung dua browser dengan Upstash tiruan.

### Diubah
- **Disclaimer poin 3** menyebut salinan data di database milik pengguna bila sinkron aktif; `TERMS_VERSION` 2, jadi disclaimer tampil sekali lagi.
- `ConfirmButton` punya ukuran 44px dan status nonaktif.

### Diperbaiki
- Pulihkan snapshot yang dibuat sebelum disclaimer baru disetujui tidak lagi memunculkan disclaimer kembali (ditemukan saat uji dua browser).

## [0.12.1] · 2026-10-23 · Sinkron antar perangkat

Bagian kedua rencana [SYNC.md](docs/SYNC.md) (§4, §5 langkah 4, §7, §8).

### Ditambahkan
- **Sinkron opsional** ke Upstash Redis milik pengguna, aktif hanya bila sandi aplikasi (`APP_PASSCODE`) dan env Redis (`UPSTASH_REDIS_REST_*` atau `KV_REST_API_*`) ada. Enam bagian: profil, setting, program, preferensi (tema, blok), onboarding, log.
  - Merge tanpa jam perangkat: perangkat mencatat kunci yang ia ubah sejak `rev` terakhir. Profil & program utuh; setting & preferensi per kunci; onboarding digabung (langkah selesai, versi disclaimer tertinggi); log per entri.
  - Konkurensi `rev`/`baseRev` dengan tulis atomik (EVAL Lua); konflik → gabung lalu ulang, maksimal 3 kali.
  - Pemicu: aplikasi dibuka, kembali terlihat, kembali online, 2 detik setelah perubahan, tombol **Sinkron sekarang**. Gagal kirim ditandai **belum terkirim** tanpa membuang data lokal.
  - Aktivasi pertama: server kosong → data lokal diunggah; keduanya berisi → server menang, lokal mengisi yang kosong, log & onboarding digabung.
- `/api/sync` (sesi wajib, body ≤ 1 MB, tiap bagian divalidasi dengan parser impor) dan `/api/status` (boolean saja). Database hanya diakses server; tanpa dependensi baru (REST lewat `fetch`).
- **Setting › Data › Sinkron & keamanan**: status (`TERSINKRON · x menit lalu`, `BELUM TERKIRIM`, `KONFLIK`, `TIDAK AKTIF`), Sinkron sekarang, Kunci perangkat ini, dan langkah berikutnya bila belum aktif. Menggantikan kartu Keamanan 0.12.0.
- Titik status di AppBar hanya saat konflik atau belum terkirim lebih dari 10 menit.
- Onboarding langkah 4: status sandi aplikasi & database.
- 49 test baru (`sync-log`, `sync-merge`, `sync-store`, `sync-client`), total 327 di 22 file. Uji ujung-ke-ujung dua browser dengan Upstash tiruan lokal.

### Diubah
- **Log ST**: entri punya `updatedAt`; entri lama tanpa `id` diberi id deterministik sekali; hapus menjadi tombstone yang tidak tampil, tidak dihitung progresi, dan tidak diekspor. Impor v1/v2/v3 tetap jalan dan tidak menghidupkan entri yang sudah dihapus.
- `lib/redis.ts` dipakai bersama batas percobaan sandi dan sinkron; `UPSTASH_REDIS_REST_*` didahulukan seperti SDK resmi.
- Kartu Data & cadangan dan subjudul Setting menyesuaikan saat sinkron aktif.

## [0.12.0] · 2026-10-23 · CI & sandi aplikasi

Bagian pertama rencana [SYNC.md](docs/SYNC.md) (§3, §6).

### Ditambahkan
- **CI GitHub Actions** (`.github/workflows/ci.yml`): `npm ci`, typecheck, test, build di setiap push & PR, tanpa env rahasia (Demo Mode). Badge di README.
- **Sandi aplikasi opsional** lewat `APP_PASSCODE` (≥ 8 karakter) + `SESSION_SECRET` (≥ 32 byte):
  - `proxy.ts` (nama middleware di Next.js 16) mengunci halaman (→ `/unlock?next`) dan API (401). Manifest, ikon, dan aset build tetap terbuka supaya PWA bisa dipasang & dibuka.
  - Halaman `/unlock`: input sandi 16px (`autocomplete="current-password"`), sisa percobaan, pesan batas, pesan konfigurasi belum lengkap tanpa menyebut nilainya.
  - Sesi cookie `httpOnly`, `Secure`, `SameSite=Lax`, 90 hari, bertanda tangan HMAC-SHA256 yang menyertakan sidik jari sandi: mengganti sandi atau secret mengunci semua perangkat. Perbandingan waktu-konstan.
  - Batas 5 gagal per 15 menit per IP (di-hash), di Upstash Redis bila env `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` ada, selain itu di memori (upaya terbaik).
  - `intervalsGet` memeriksa sesi sebelum memanggil intervals.icu, jadi data tidak pernah diambil untuk request tanpa sesi.
  - **Setting › Data › Keamanan › Kunci perangkat ini** (hanya saat sandi aktif).
  - Konfigurasi tidak lengkap → gagal tertutup (semua terkunci).
- 35 test baru (`auth.test.ts`, `auth-routes.test.ts`), total 278 di 18 file.

### Tidak berubah
- Tanpa `APP_PASSCODE`, perilaku identik dengan 0.11. Tanpa dependensi baru (`node:crypto` dan `fetch`).

## [0.11.3] · 2026-10-23 · Keamanan dependensi & tur lebih ringkas

### Keamanan
- `npm audit fix`: Next.js 16.3.6 → 16.4.2 (advisory kritis & tinggi: RCE pada fungsi `use cache`, cache poisoning SSG/ISR, SSRF di Image Optimization, kebocoran info), Vitest 5.0.5 / `@vitest/mocker`, Vite, dan `source-map-js`. `npm audit`: 0 kerentanan. Aplikasi tidak memakai `use cache` atau ISR, dan `next/image` hanya untuk gambar lokal, tetapi tetap diperbarui. Batas minimum di `package.json` ikut dinaikkan.
- Rilis keamanan Node.js 21 Okt 2026 (mis. CVE-2026-111497 di dekoder Brotli) ada di runtime, bukan di repo. Pastikan Node lokal ≥ 22.23.4 dan versi Node project di Vercel 22.x/24.x (Vercel memperbarui patch otomatis). PHP tidak dipakai.

### Diubah
- Popover tur lebih ringkas (padding, ukuran teks, lebar 340 px) dan teks sorotan Profil dipersingkat supaya tidak menutupi data di bawah kartu saran.

## [0.11.2] · 2026-10-22 · Tur in-app & strength tanpa alat

Menutup rencana [ONBOARDING.md](docs/ONBOARDING.md).

### Ditambahkan
- **Tur in-app** setelah onboarding: 5 sorotan lintas tab (Saran hari ini, Generator lari + Copy Set, Strength + Catat sesi ★, Program target, Data & cadangan). Spotlight sendiri tanpa library: lapisan gelap dengan lubang di elemen `data-tour`, popover `surface-raised` (`role="dialog"`, `aria-modal`), tombol **Lewati tur**, **Kembali**, **Lanjut**/**Selesai**, Escape menutup, fokus terjebak di popover dan kembali ke pemicu. Popover masuk dari `scale(0.96)` + opacity 180ms ease-out; reduced motion hanya fade. Selesai atau dilewati dicatat (`tourCompletedAt`).
- Ringkasan onboarding: **Mulai tur** / **Lewati tur** (keduanya menyelesaikan onboarding). **Setting › Tampilan › Ulangi tur**.
- **5 gerakan tanpa alat** sebagai cadangan Upper Push/Pull: Push-Up (gambar free-exercise-db), Knee Push-Up, Wall Push-Up, Prone Y-T-W Raise, Prone Reverse Snow Angel (tanpa padanan, placeholder). Aktif otomatis hanya bila kategorinya tidak punya gerakan lain yang bisa dipakai; diberi label "Cadangan" di Setting › Gerakan. Superman sengaja tidak dipakai (Spine-Friendly).
- **Pesan alat di Strength**: bila jenis sesi tidak punya gerakan utama, tampil alat minimal yang dibutuhkan dan gerakan yang bisa diaktifkan. Catatan "Sesi lebih pendek dari {durasi}'" bila gerakan aktif terbatas.
- Test: ST bodyweight-only untuk semua jenis × durasi × kesulitan × 25 seed × blok/deload/bebas; `sessionCoverage`, gerakan cadangan, tur (`placePopover`, langkah, target `data-tour`). Total 243 di 16 file.
- Screenshot onboarding & tur (Demo Mode): `11-onboarding`, `12-onboarding-connection`, `13-onboarding-summary`, `14-tour`.

### Diubah
- Logika generator tidak berubah; keputusan strength tanpa alat dicatat di TRAINING-LOGIC §11.
- Movement library 45 gerakan, 36 bergambar (`docs/movement-media-audit.md`).
- `Card` dan `GeneratorActions` menerima `tour` untuk menandai sasaran tur.

## [0.11.1] · 2026-10-22 · Koneksi, proteksi deploy, pasang ke HP

### Ditambahkan
- **Onboarding langkah 3 · Koneksi intervals.icu.** `GET /api/connection` memakai `client.ts` yang ada dan hanya mengembalikan `{ status, athleteName? }` (`ok`, `missing`, `unauthorized`, `forbidden`, `not_found`, `network`), tanpa cache. Tampilan per status: nama atlet bila tersambung; panduan mengisi `INTERVALS_API_KEY` / `INTERVALS_ATHLETE_ID` di Vercel bila kosong; pesan untuk key ditolak, athlete ID tidak cocok, dan intervals.icu tidak bisa dihubungi. Semua status selain `ok` mengingatkan bahwa perubahan env var baru berlaku setelah redeploy, dengan tombol **Cek lagi** dan **Lanjut dengan Demo Mode**.
- **Langkah 4 · Amankan deploy**: Vercel Authentication dengan cakupan All Deployments, konfirmasi tersimpan.
- **Langkah 9 · Pasang ke layar utama**: dialog pasang bawaan di Android/Chrome (`beforeinstallprompt`), instruksi Bagikan › Tambah ke Layar Utama di iOS, catatan bahwa aplikasi masih butuh internet. Sudah terpasang → langkah selesai sendiri.
- **Setting › "Belum selesai"**: pengingat untuk koneksi yang dilewati, proteksi yang belum dikonfirmasi (termasuk pengguna lama), zona perkiraan yang belum diisi, dan aplikasi yang belum dipasang. Bukan pop-up; tiap baris memakai komponen langkah yang sama dan hilang setelah selesai.
- 18 test baru (`connection.test.ts` termasuk route end-to-end tanpa key di respons; pengingat & standalone di `onboarding.test.ts`), total 224 di 14 file.

### Diubah
- Ringkasan onboarding menampilkan status nyata koneksi, proteksi, dan pemasangan.
- README: tutorial deploy menyebut onboarding dan redeploy setelah mengisi atau mengubah env var.

## [0.11.0] · 2026-10-22 · Onboarding & profil di perangkat

Bagian pertama rencana [ONBOARDING.md](docs/ONBOARDING.md): fork baru memakai profil miliknya sendiri tanpa mengedit JSON dan tanpa mewarisi data pemilik repo.

### Ditambahkan
- **Onboarding `/onboarding`** (tanpa BottomNav): selamat datang (Mulai atau impor cadangan), disclaimer & lisensi wajib, profil dasar (nama wajib), kondisi wajib eksplisit dengan "Tidak ada kondisi", zona lari (VDOT, manual, atau "Belum tahu"), alat (boleh dilewati, dengan catatan sesi ST yang jadi lebih pendek), ringkasan dengan chip NANTI. Label `LANGKAH x/10`, tombol Kembali, fokus ke judul, pengumuman `aria-live`. Langkah 3, 4, 9 dilewati otomatis sampai 0.11.1.
- **Gate di client**: pengguna baru ke onboarding; pengguna lama (sudah punya data) dicatat `migrated` dan hanya menyetujui disclaimer sekali, tanpa kehilangan data; versi disclaimer naik → disclaimer saja. Kerangka tampil selama memeriksa.
- **Setting › Profil**: nama, usia, gaya hidup, fokus, target lomba (pemilih waktu, format yang dibaca Program), tujuan latihan, blok mingguan dengan tanggal mulai atau mode bebas.
- **Cadangan format v3** (`lib/backup.ts`): profil dasar + status onboarding; impor v1/v2 tetap jalan; file `kind: "defaults"` hanya mengisi yang kosong; log selalu digabung, file tanpa log tidak menyentuh log.
- `scripts/make-owner-settings.mjs`: salin profil JSON lama ke `owner-settings.local.json` (diabaikan git lewat `*.local.json`).
- 28 test baru (`onboarding`, `backup`, `neutral-profile`, profil di `settings`), total 206 di 13 file.

### Diubah
- **`config/athlete-profile.json` netral**: tanpa nama, target, kondisi, alat, atau tanggal blok; zona default dari VDOT 30 (dicatat di `runZonesSource`). Movement library tetap.
- Header Profil, kartu Target, dan posisi blok dibaca di client dari profil perangkat. Server tidak lagi menghitung blok dari JSON.
- Mode blok tanpa nilai tersimpan aktif hanya bila ada tanggal mulai blok (fork baru mulai di mode bebas).
- Test aturan memakai profil contoh anonim `__tests__/fixtures/example-athlete.json`; ekspektasinya tidak berubah.

### Untuk pengguna lama
- Lihat README › "Sudah memasang sebelum 0.11?": ekspor cadangan, deploy, setujui disclaimer, lalu impor `owner-settings.local.json`.

### Dokumentasi & privasi (sejak 0.10.2)
- **Privasi repo publik:** data latihan asli (ID aktivitas intervals.icu & Strava, tanggal, jam) di test dan dokumen diganti data fiktif; alamat deploy tidak lagi dicantumkan di PRD; `CLAUDE.md` mendapat aturan privasi agar data asli tidak masuk lagi.
- **Tutorial "Pasang di HP-mu sendiri"** di README: fork, isi profil, API key intervals.icu, deploy ke Vercel, kunci akses (Vercel Authentication › All Deployments, karena Standard Protection tidak melindungi alamat utama), pasang PWA, atur di aplikasi, cara update, dan tabel masalah umum. Bagian developer README dirapikan dan angka test diperbarui.

## [0.10.2] · 2026-10-21 · Split per km akurat

### Diperbaiki
- **Split per km tidak lagi menampilkan pace mustahil** (mis. `0'13"/km` pada sebuah lari 4,4 km). Penyebab: status bergerak dinilai per sampel, padahal jam Huawei kadang memperbarui jarak hanya sesekali (datar lalu melompat). Sampel datar dihitung berhenti, jadi 2,44 km jalan kaki hanya mendapat ~30 detik dan total waktu split ~17 menit dari ~44 menit. Sekarang (`lib/intervals/splits.ts`):
  - `buildTrack`: kecepatan dihitung antar titik di mana jarak benar-benar berubah; data bertangga diratakan, berhenti sungguhan tetap tidak dihitung.
  - Jarak hanya boleh naik: lonjakan (> 12 m/s sejak perubahan terakhir) dan penurunan/reset ditolak tanpa membuang sisa sesi.
  - Ambang bergerak lari = 30:00/mil seperti Strava; jalan kaki 0,5 m/s.
  - Jarak GPS dihitung antar titik berselang ≥ 5 detik supaya getaran GPS saat diam tidak menumpuk.
  - Sisa < 50 m digabung ke split sebelumnya, jadi jumlah jarak & waktu split = total.
  - Hasil dicek terhadap ringkasan aktivitas (jarak ±5%/100 m, waktu ±10%/2 menit); yang tidak cocok tidak ditampilkan dan diberi penjelasan.
- Grafik split kini satu bar per baris tabel (split < 10 detik tidak lagi hilang dari grafik).
- 7 test kasus tepi baru (data bertangga, berhenti, lonjakan, reset jarak, GPS hilang, validasi, ambang), total 178.

### Diverifikasi
- Lari contoh 4,4 km vs Strava: 10'53" · 9'24" · 9'10" · 9'10" · 12'13" (0.44) lawan 10:54 · 9:28 · 9:19 · 9:03 · 12:32 (0.4). Total moving time 44:00 sama, HR per km ±1 bpm. Selisih per km −9 sampai +7 detik berasal dari total jarak (Strava 4,42 km, jam 4,44 km) dan posisi batas km.

## [0.10.1] · 2026-10-16 · Logo "Forward H"

### Ditambahkan
- **Logo Forward H: ikon PWA, favicon, AppBar.** Tiang kiri = strength, palang oranye = hybrid, tiga lajur menikung = lintasan lari, condong 12° ke depan. Aset & aturan di [`docs/brand/`](docs/brand/LOGO.md).
  - AppBar: `LogoMark` 22px (`text-ink`, palang oranye) menggantikan titik oranye, wordmark tetap.
  - Ikon PWA (`icon-192/512`, `apple-touch-icon`) oranye full-bleed, tanda di dalam safe zone maskable. Favicon `favicon.svg` versi kecil + cadangan `favicon-32/16.png`.
  - `manifest.json`: `background_color` & `theme_color` jadi `#0b0b0c`. `npm run icons` kini juga me-render favicon 16 px.
  - README menampilkan lockup (versi gelap otomatis di GitHub mode gelap).

### Diperbaiki
- **Input waktu & pace di Setting bisa diisi dari HP.** Keyboard angka di HP tidak punya tombol ":", jadi kolom teks "mm:ss" / "h:mm:ss" (waktu VDOT) dan "m:ss" (pace per zona) tidak bisa diisi. Sekarang memakai pemilih `TimePicker` (jam : menit : detik) berbasis `<select>` native: ketuk angka, pilih dari wheel/daftar bawaan OS, tanpa mengetik. Pace zona tersimpan begitu kombinasinya valid; kombinasi tidak valid ditandai merah dan belum disimpan.
- **Aktivitas tidak lagi terhitung dobel.** Jam Huawei yang juga tersambung ke Strava membuat intervals.icu menerima dua salinan tiap sesi; salinan Strava kosong karena intervals.icu tidak boleh meneruskan isinya lewat API. `dedupeActivities` membuang rekaman ganda (jam mulai selisih ≤ 5 menit, jenis sama atau salah satunya kosong) dan menyimpan yang datanya paling lengkap. Berlaku untuk kalender, ringkasan 7 hari, saran coach, dan Program. Salinan Strava tanpa pasangan tetap tampil sebagai "Aktivitas Strava" dengan penjelasan.
- Baris aktivitas tanpa data tidak lagi menampilkan "—".

### Ditambahkan
- **Split per km** di detail aktivitas lari & jalan, dihitung dari stream intervals.icu (`/activity/{id}/streams`): Segment Skyline per km, tabel pace/HR/cadence, km tercepat ditandai, sisa < 1 km jadi split parsial. Waktu split = moving time (berhenti tidak dihitung). Data Huawei di intervals.icu sering hanya punya total jarak yang dibagi rata per detik (pace tiap km jadi sama); kasus ini dikenali dan split dihitung dari koordinat GPS (`latlng`) yang diskalakan ke total jarak. Tanpa GPS, tampil penjelasan, bukan split palsu. Kartu "Interval / lap" kini hanya muncul bila ada lebih dari satu interval (sesi terstruktur atau lap), karena satu interval sama dengan ringkasan sesi.
- Demo Mode: stream sintetis per sesi, sehingga split dan struktur interval (Tempo, Mini Interval, Norwegian 4×4) ikut tampil.
- 21 test baru (`activity-data.test.ts`, `splitSegments`), total 171.

### Diubah
- Lingkaran inisial di header Profil dihapus (belum ada fitur foto profil).
- Screenshot README `01-profile` dan `06-activity` diperbarui (header tanpa avatar, detail aktivitas dengan split per km).

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

[0.13.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/4af5f60...main
[0.12.2]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/ea49a56...4af5f60
[0.12.1]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/465da7d...ea49a56
[0.12.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/1c7334f...465da7d
[0.11.3]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/77815e4...49f5f14
[0.11.2]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/4d0042f...77815e4
[0.11.1]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/ffb3a10...4d0042f
[0.11.0]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/cda26c1...ffb3a10
[0.10.2]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/5266a8e...cda26c1
[0.10.1]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/a7d3f00...5266a8e
[0.10.0-ui]: https://github.com/khaliladha11/hybrid-athlete-dashboard/compare/9bcff80...a7d3f00
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
