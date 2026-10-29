# Rencana 0.16, 0.17, dan 1.0

> Status: **rencana, 2026-10-29**. Simpan di `docs/RELEASE-1.0.md`.
> Bergantung pada 0.12 (sinkron & antrean "belum terkirim"), 0.13 (program), 0.15 (Insight). Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Desain mengikuti [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Fakta tentang perangkat dan intervals.icu di §3 berasal dari catatan pemilik dan **diverifikasi ke dokumentasi resmi sebelum implementasi 0.17**.

## 1. Tujuan

Sampai 0.15 aplikasi sudah menjawab "latihan apa hari ini" dan "apakah aku berkembang". 1.0 menjawab hal yang tersisa: aplikasi harus **stabil, teruji, bisa dipakai tanpa sinyal, dan mudah dipasang serta diperbarui orang lain**.

**Dianggap berhasil kalau:**
- Aplikasi terbuka di gym tanpa sinyal, dan log ST yang dicatat di sana terkirim sendiri saat sinyal kembali.
- Alur inti diuji end-to-end di CI, dan hasil audit aksesibilitas, performa, serta keamanan tercatat dengan angka.
- Pemulihan data (HP hilang, data browser terhapus, perangkat baru, cadangan lama) pernah dilatih dan punya checklist.
- Workout lari bisa dikirim ke kalender intervals.icu dan sampai ke jam, dengan Copy Set tetap sebagai cadangan.
- Orang lain bisa memasang sendiri dalam satu sesi, termasuk dengan bantuan AI, tanpa pernah menyerahkan rahasia ke AI.
- Fork atau clone bisa menerima pembaruan lewat pull request, dengan migrasi data yang aman dan langkah manual yang ditandai.

## 2. Keputusan desain (2026-10-29)

Diturunkan dari cakupan pemilik. Yang masih butuh keputusan ada di §11.

| # | Keputusan | Alasan |
| --- | --- | --- |
| R1 | **Playwright hanya devDependency**, dijalankan di CI. Tidak ada dependensi runtime baru untuk 0.16 | Aturan "tanpa dependensi baru" untuk bundel aplikasi tetap; alat uji tidak ikut dikirim ke pengguna |
| R2 | **Offline memakai antrean sinkron 0.12**, bukan mekanisme baru. Yang disimpan offline hanya data perangkat (log, sesi ST, check-in, program), tidak ada penulisan ke intervals.icu saat offline | Semua penyimpanan sudah per entri dengan tombstone dan gabungan yang komutatif, jadi mengirim belakangan aman |
| R3 | **Hanya workout LARI yang dikirim** ke kalender intervals.icu. ST tetap di aplikasi (opsional satu catatan di kalender). Copy Set tetap ada sebagai cadangan | Jam tidak punya padanan ST yang berguna; lari sudah punya format terstruktur di intervals.icu |
| R4 | **Mengirim ke intervals.icu selalu atas ketukan pengguna**, tidak otomatis, dan bisa ditarik kembali (perbarui atau hapus) tanpa dobel | Ini penulisan ke akun pengguna dengan API key; harus terlihat dan bisa dibatalkan |
| R5 | **Panduan AI tidak pernah menerima rahasia.** INSTALL-WITH-AI.md menyuruh AI memandu langkah, sedangkan API key, sandi, dan token Redis diketik pengguna sendiri | Rahasia tidak boleh lewat percakapan, riwayat, atau log alat AI |
| R6 | **Pembaruan lewat pull request**, tidak pernah merge otomatis. Migrasi data harus aman diulang dan mundur-kompatibel | Pemilik fork memutuskan kapan menerima perubahan |
| R7 | **Feature freeze di 1.0**: sesudahnya hanya perbaikan bug, keamanan, dan dokumentasi | 1.0 berarti stabil, bukan fitur terakhir |
| R8 | **Aturan saran tidak berubah** di 0.16 dan 0.17, kecuali disetujui pemilik dengan sumber (seperti 0.15.2) | Rilis ini tentang keandalan dan keterhubungan, bukan logika latihan |

## 3. Konsep & data

### Yang ada sekarang
| Area | Kondisi |
| --- | --- |
| PWA | Installable, tetapi **tanpa service worker**: tanpa internet aplikasi tidak terbuka |
| Sinkron | Per bagian ke Upstash, antrean "belum terkirim", sinkron saat kembali online (0.12.1) |
| Pengujian | Unit test logika murni; CI menjalankan typecheck, test, dan build. Tanpa test komponen atau end-to-end |
| Keamanan | Sandi aplikasi (`proxy.ts`), sesi HMAC, batas percobaan. Hanya `poweredByHeader: false`; belum ada header keamanan atau CSP, dan belum ada audit dependensi |
| Kirim ke jam | Hanya Copy Set (format Huawei) |
| Zona | Zona pace dan VDOT; zona HR dan RPE belum bisa diubah |
| Pemasangan | Panduan README (fork, Vercel, Upstash); belum ada tombol Deploy, INSTALL-WITH-AI.md, atau AGENTS.md |
| Pembaruan | Pengguna fork menarik perubahan sendiri |

### Perangkat yang menerima workout dari intervals.icu (catatan pemilik)
| Perangkat | Yang diteruskan |
| --- | --- |
| Garmin | Workout terencana satu minggu ke depan |
| Coros | Mengikuti intervals.icu |
| Huawei | Hanya lari, jalan, dan hiking; lari terencana berikutnya dalam satu minggu, tampil sebagai **running course** |
| Lainnya | Sesuai intervals.icu |

### Batasan yang harus ditulis jujur
- Huawei **tidak membuka HRV harian lewat API-nya**. Jalan keluar: aplikasi Health Sync mengirim HRV ke intervals.icu. Aturan sinyal tidak tersedia 0.14.3 tetap berlaku bila HRV tidak ada.
- Aktivitas Strava tidak bisa dibaca (sudah tercatat di PRD §6).

## 4. Fitur

### 0.16 · Siap offline & teruji

**#1 Mode offline**
- Aplikasi terbuka tanpa sinyal: cangkang aplikasi, workout dan program terakhir, log, dan data intervals.icu terakhir yang dimuat disimpan di perangkat. Tampilan memberi tahu data terakhir diperbarui kapan.
- **Mode latihan dan log ST berjalan offline.** Sesi, set, log ★, PR, dan check-in ditulis ke penyimpanan perangkat seperti sekarang, lalu terkirim lewat antrean sinkron 0.12 saat online.
- Banner **"Sedang offline"** yang singkat dan tidak menutupi tombol; hilang sendiri saat kembali online. Fitur yang butuh jaringan (generate dengan data baru, Insight dengan data baru, kirim ke intervals.icu) menjelaskan alasannya dalam satu kalimat, tidak menampilkan error mentah.
- Service worker menyimpan **versi aplikasi**; saat ada versi baru, pengguna diberi tahu dan memuat ulang di saat yang aman (tidak di tengah sesi latihan).
- Data kesehatan di cache hanya data yang sudah tampil di perangkat itu, dan ikut terhapus saat pengguna menghapus data situs. API key tidak pernah masuk cache.

**#2 Tes end-to-end dan komponen**
- Playwright sebagai devDependency, dijalankan di CI (Demo Mode, tanpa rahasia) pada viewport 375px.
- Alur inti: onboarding sampai selesai; generate lari dan ST; mode latihan dari awal sampai simpan (termasuk offline lalu online); log dan PR; check-in dan saran turun; program dan Sesi minggu ini; Setting (alat, kondisi, zona); cadangan ekspor lalu impor; sandi aplikasi (kunci dan buka).
- Test komponen untuk bagian yang logikanya ada di tampilan: `Segmented`, kartu check-in, `ChartCard` (Lihat tabel), `MuscleMap` mode heatmap.
- Kegagalan menyimpan jejak dan tangkapan layar sebagai artefak CI.

**#3 Audit aksesibilitas dan performa**
- Kontras non-teks (garis fokus, batas input, penanda grafik) minimal 3:1 di kedua tema; navigasi keyboard penuh; urutan fokus dan label yang masuk akal; uji dengan pembaca layar (TalkBack dan VoiceOver) untuk alur inti.
- Anggaran performa Lighthouse **mobile** untuk halaman utama, dengan angka dan batas yang ditulis di dokumen, dijaga sebagai pemeriksaan di CI (gagal bila turun di bawah batas).
- Hasil audit dicatat di PRD §5 dengan tanggal dan angka; temuan yang tidak diperbaiki masuk §6.

**#4 Pengerasan keamanan**
- Header keamanan: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` atau `frame-ancestors`. CSP diuji agar tidak merusak PWA, gambar gerakan, dan font.
- `npm audit` di CI dengan ambang yang jelas, dan kebijakan memperbarui dependensi.
- Tinjau sandi aplikasi dan sinkron: batas percobaan, kedaluwarsa sesi, validasi payload, ukuran body, dan alur pulihkan; temuan dicatat dan diperbaiki dengan test.
- Tinjau pencatatan: tidak ada API key, token, atau data kesehatan di log server.

**#5 Latihan pemulihan data**
- Skenario: HP hilang, data browser terhapus, perangkat baru, cadangan lama (v2 sampai v6), snapshot harian, pulihkan lalu batalkan.
- Setiap skenario punya **test otomatis** (di tingkat lib, dan alur di e2e bila memungkinkan) dan **checklist manual** di dokumen, dengan hasil yang diharapkan.
- Temuan yang membuat data hilang diperbaiki sebelum rilis.

### 0.17 · Terhubung & mudah dipasang

**#6 Kirim workout lari ke kalender intervals.icu**
- Dari generator lari dan dari sesi program: tombol **"Kirim ke intervals.icu"**, atas ketukan pengguna (R4).
- Workout lari dikirim sebagai **workout terstruktur** (segmen, durasi, target pace/HR dari zona), supaya intervals.icu meneruskannya ke perangkat yang terhubung (§3).
- Tanggal: tanggal yang dipilih pengguna, bawaannya hari ini atau hari disarankan program. Satu workout satu entri; mengirim ulang **memperbarui**, tidak menggandakan; ada "Tarik dari kalender".
- Jelaskan batas tiap perangkat dalam satu kalimat saat mengirim (mis. Huawei: lari terencana berikutnya dalam satu minggu, tampil sebagai running course).
- **ST tetap di aplikasi.** Opsional satu catatan teks di kalender intervals.icu ("ST Lower 45 menit"); tanpa catatan itu, tidak ada yang dikirim untuk ST.
- **Copy Set tetap** sebagai cadangan bila pengguna tidak memakai intervals.icu untuk jam.
- Perlu izin tulis API key; bila key hanya-baca, tombol menjelaskan cara memperbaikinya.

**#7 Zona HR dan RPE bisa diubah di Setting**
- Zona HR (dari LTHR atau diisi manual) dan skala RPE, dengan nilai bawaan yang diturunkan dari LTHR intervals.icu bila ada.
- Dipakai untuk target pada workout yang dikirim (#6) dan tampilan. **Tidak mengubah ambang saran** (HR lari berat tetap 90% LTHR, 0.15.2) kecuali pemilik menyetujui (§11 #1).

**#8 Rapikan copy**
- Hapus em dash di string `lib/` (backlog P3: 56 string di 12 file), dijaga test yang sudah ada (`copy-dashes`) diperluas ke `lib/`.
- Istilah konsisten, termasuk nama coach **"Gita"** (satu tulisan, satu arti) di UI dan dokumen.

**#9 Pemasangan yang mudah**
- Tombol **"Deploy to Vercel"** di README dengan variabel lingkungan yang dibutuhkan dan deskripsinya (nama, wajib atau opsional, dari mana didapat).
- **INSTALL-WITH-AI.md**: panduan agar asisten AI memandu pemasangan langkah demi langkah. Aturan keras: AI tidak pernah meminta atau menampung rahasia; pengguna mengetik semua rahasia sendiri di Vercel dan `.env.local` (R5).
- **AGENTS.md** untuk alat pemrograman AI: struktur repo, aturan privasi (data asli tidak di-commit), perintah uji dan build, aturan desain ringkas.
- Jalur **Vercel CLI** sebagai alternatif tombol.
- Catatan jelas di panduan: Huawei tidak membuka HRV harian lewat API-nya; Health Sync adalah jalan keluarnya (§3).

### 1.0 · Rilis

**#10 Jalur pembaruan untuk clone dan fork**
- GitHub Action terjadwal yang membuka **pull request** berisi pembaruan dari upstream; tidak pernah merge otomatis (R6).
- Migrasi data selalu aman diulang dan tidak merusak data lama; versi cadangan lama tetap bisa diimpor.
- Catatan rilis menandai **langkah manual** (mis. variabel lingkungan baru, versi disclaimer yang naik) dengan penanda yang mudah dicari.

**#11 Panduan pengguna dan pembekuan fitur**
- Panduan pengguna lengkap di README, ditambah **bantuan singkat di dalam aplikasi** (apa itu check-in, kenapa saran menurun, cara mengirim ke jam, cara memulihkan data).
- **Feature freeze** (R7), semua dokumen diselaraskan (PRD, README, ARCHITECTURE, TRAINING-LOGIC, SYNC, DESIGN-SYSTEM), dan **tag versi** 1.0.0.

## 5. Tampilan

- **Ikuti DESIGN-SYSTEM:** satu Display per layar, label mono, copy tanpa em dash/en dash di teks UI dan tanpa tanda seru, tombol menyebut hasilnya, area sentuh ≥ 44px, input ≥ 16px.
- **Banner offline:** satu baris di bawah AppBar, warna netral (bukan merah; offline bukan kesalahan), `role="status"`, tidak bergerak.
- **Tombol kirim:** "Kirim ke intervals.icu" sebagai tombol sekunder di kartu workout; status setelah kirim ("Terkirim untuk Rabu 4 Nov") dan "Tarik dari kalender". Gagal = satu kalimat dengan penyebab dan tindakan, tanpa stack trace atau key.
- **Bantuan dalam aplikasi:** teks pendek di tempatnya (tautan "Apa ini?" membuka lembar kecil), bukan halaman panjang.
- **Kondisi kosong dan gagal:** kalimat yang menyebut apa yang kurang, tidak pernah layar kosong.

## 6. Arsitektur

| Modul | Tanggung jawab | Berjalan di |
| --- | --- | --- |
| `public/sw.js` (atau `app/sw.ts`) dan `lib/offline.ts` | Service worker (cache cangkang & halaman, versi), status online/offline, pemberitahuan versi baru (0.16) | Browser / client |
| `components/ui/OfflineBanner.tsx` | Banner "Sedang offline" (0.16) | Client |
| `e2e/*`, `playwright.config.ts`, `.github/workflows/ci.yml` | Tes end-to-end dan pemeriksaan Lighthouse di CI (0.16) | Dev / CI |
| `next.config.ts` (header), `proxy.ts` | Header keamanan dan CSP (0.16) | Server |
| `lib/intervals/workout.ts` (murni) | Workout lari → format workout terstruktur intervals.icu, id luar untuk perbarui/hapus (0.17) | Server & client (murni) |
| `app/api/intervals/workout/route.ts`, `lib/intervals/client.ts` | Kirim, perbarui, dan tarik workout di kalender; key tetap di server (0.17) | Server |
| `lib/hr-zones.ts` dan Setting › Zona | Zona HR dan skala RPE yang bisa diubah (0.17) | Server & client (murni) |
| `AGENTS.md`, `docs/INSTALL-WITH-AI.md`, README (tombol Deploy) | Pemasangan dan pedoman alat AI (0.17) | Dokumen |
| `.github/workflows/upstream-update.yml` | PR pembaruan terjadwal untuk fork (1.0) | CI |

- Semua modul baru yang berisi logika murni: tanpa I/O, tanggal dari parameter, WIB lewat `lib/date.ts`.
- API key tetap di server; tidak masuk cache service worker dan tidak masuk log.

## 7. Test

**0.16**
- **Offline (`offline.test.ts`):** status online/offline, versi cache, data yang boleh dan tidak boleh disimpan, antrean sinkron setelah offline panjang (gabungan komutatif, tidak ada data hilang).
- **E2E:** semua alur di #2, termasuk mode latihan offline lalu online dan impor cadangan v2 sampai v6.
- **Aksesibilitas:** pemeriksaan otomatis (kontras non-teks, label, urutan fokus) di e2e; pembaca layar dicek manual dan dicatat.
- **Keamanan:** header ada di semua rute dan CSP tidak memblokir aset yang sah; audit dependensi; kasus sandi dan sinkron yang sudah ada tetap lulus.
- **Pemulihan data:** satu test per skenario di #5.

**0.17**
- **`workout.test.ts`:** setiap pola lari menjadi workout terstruktur yang valid (durasi total sama dengan rencana, target dari zona), id luar stabil, kirim ulang = perbarui, tanpa em dash.
- **Rute kirim:** key tidak bocor di respons, key hanya-baca → pesan yang jelas, intervals.icu error → pesan singkat.
- **Zona HR/RPE:** nilai bawaan dari LTHR, validasi, tidak mengubah ambang saran.
- **`copy-dashes.test.ts`:** diperluas ke string `lib/`.

**1.0**
- **Migrasi:** setiap versi cadangan dan setiap bentuk data lama dimigrasi tanpa kehilangan isi, dan aman dijalankan dua kali.
- **Workflow pembaruan:** dijalankan di repo uji; PR terbuka, tidak ada merge otomatis.

## 8. Rencana rilis

| Versi | Isi |
| --- | --- |
| **0.16** | Mode offline (#1), tes e2e dan komponen di CI (#2), audit aksesibilitas dan performa (#3), pengerasan keamanan (#4), latihan pemulihan data (#5) |
| **0.17** | Kirim workout lari ke kalender intervals.icu (#6), zona HR dan RPE di Setting (#7), rapikan copy (#8), pemasangan mudah: Deploy to Vercel, INSTALL-WITH-AI.md, AGENTS.md, Vercel CLI (#9) |
| **1.0** | Jalur pembaruan untuk fork (#10), panduan pengguna lengkap dan bantuan di aplikasi, feature freeze, dokumen diselaraskan, tag versi (#11) |

## 9. Di luar cakupan

- Mengirim sesi ST ke jam (R3); ST hanya boleh berupa catatan di kalender.
- Notifikasi dan pengingat latihan, menambah gerakan sendiri, kartu story dari `/activity/[id]`: tetap backlog, tidak dijadwalkan di sini.
- Membaca isi aktivitas Strava (dilarang kebijakan Strava).
- Aplikasi native; PWA tetap bentuknya.
- Perubahan aturan saran di 0.16 dan 0.17 (R8).

## 10. Perubahan dokumen

- **PRD:** [RELEASE-1.0](RELEASE-1.0.md) di "Dokumen terkait"; baris ⬜ bertanda 0.16 / 0.17 / 1.0 di §4 (baris offline, zona HR/RPE, dan kirim workout dipindah ke versi barunya); catatan di §7 bertanggal 2026-10-29 dan baris roadmap 0.16 / 0.17 / 1.0 menggantikan satu baris 1.0; header, jumlah test, dan §8 berubah per rilis.
- **ARCHITECTURE:** service worker, header keamanan, `lib/intervals/workout.ts` dan rute kirim, workflow pembaruan.
- **SYNC.md:** perilaku offline dan antrean, serta langkah pemulihan data (#5).
- **README:** tombol Deploy, panduan pengguna, jalur pembaruan; **INSTALL-WITH-AI.md** dan **AGENTS.md** baru.
- **DESIGN-SYSTEM §6:** banner offline, tombol kirim, lembar bantuan.
- **TRAINING-LOGIC:** zona HR dan RPE (0.17).
- **CHANGELOG** per rilis.

## 11. Keputusan terbuka

1. **Zona HR dari Setting dan ambang lari berat.** Apakah zona HR yang diubah di Setting boleh menggantikan 90% LTHR sebagai ambang lari berat? Usulan: **tidak** di 0.17 (hanya untuk target workout dan tampilan). Mengubahnya mengubah saran, jadi butuh sumber dan persetujuan.
2. **Service worker sendiri atau library.** Usulan: ditulis sendiri tanpa library, mengikuti aturan tanpa dependensi baru; dikonfirmasi di prompt 0.16.
3. **Batas anggaran Lighthouse.** Angka awal ditetapkan dari pengukuran 0.16 lalu dikunci di CI.
4. **Catatan ST di kalender intervals.icu.** Usulan: mati secara bawaan, diaktifkan pengguna.
5. **Frekuensi workflow pembaruan.** Usulan: mingguan.
6. **Fakta perangkat (§3).** Diverifikasi ke dokumentasi intervals.icu sebelum 0.17; tabel diperbarui bila berbeda.
