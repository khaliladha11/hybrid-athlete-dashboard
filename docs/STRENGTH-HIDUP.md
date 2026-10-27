# Cakupan 0.14 Strength hidup

> Status: **cakupan diperbarui 2026-10-26** (usulan pemilik digabung dengan cakupan 2026-10-23; peta otot ditambahkan). Spesifikasi detail dan prompt menyusul setelah 0.13. Simpan di `docs/STRENGTH-HIDUP.md`.
> Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Perubahan logika latihan wajib memperbarui TRAINING-LOGIC dan test.

## 1. Latar belakang

Sampai 0.12, ST di aplikasi terutama berfungsi sebagai prehab dan pelengkap lari. Masalah nyata dari pemakaian harian: banyak gerakan sudah mentok di batas alat rumahan, sementara rentang beban per gerakan di library justru menahan progres di bawah kemampuan atlet. Contohnya PR 17 kg di Barbell Squat (rentang library 10–16 kg) dan 7 kg di Seated Overhead Press (rentang 5 kg).

### Dasar riset
- **ST memperbaiki performa lari.** Running economy membaik 2–8% di sebagian besar studi; 2–3 sesi ST per minggu dengan beragam modalitas dianjurkan (Blagrove dkk. 2018, *Sports Med* 48(5)).
- **Jenis ST menentukan.** Beban tinggi, plyometric, dan kombinasinya memperbaiki running economy; beban submaksimal dan isometrik kurang efektif (Llanos-Lagos dkk. 2024, *Sports Med*, doi 10.1007/s40279-023-01978-y).
- **Interferensi kecil untuk kekuatan maksimal dan hipertrofi**; yang terganggu kekuatan eksplosif, terutama bila lari dan ST di sesi yang sama dengan jeda < 3 jam (Schumann dkk. 2022, *Sports Med* 52:601–612).
- **Session-RPE (RPE × durasi) valid untuk latihan beban** (Foster dkk. 2001; tinjauan Haddad dkk. 2017, *Front Neurosci*).

## 2. Keputusan pemilik

### 2026-10-26 · Rentang library menjadi titik awal
Rentang beban per gerakan di library **tidak lagi menjadi plafon**, dengan syarat pengguna tahu perubahan ini.

**Model batas beban:**
- **Batas alat:** beban terberat yang bisa dirakit dari alat di Setting (per tangan untuk dumbbell, total untuk barbell).
- **Batas keamanan:** hanya untuk gerakan sensitif, dan aktif mengikuti kondisi di Setting. Contohnya Barbell Squat saat Spine-Friendly aktif, atau gerakan overhead saat nyeri bahu aktif (yang sudah dilarang tetap dilarang). Daftar final ditetapkan saat spesifikasi, dengan sumber.
- **Beban resep** = min(batas alat, batas keamanan bila ada).
- **Rentang library** = titik awal untuk gerakan yang belum punya log atau PR, dan acuan level Easy/Moderate/High.
- Kenaikan tetap satu langkah ke beban berikutnya yang bisa dirakit. Saat aturan baru aktif, beban awal diambil dari log atau PR terakhir, tidak melompat.

**Syarat transparansi (wajib, diuji):**
1. **Persetujuan sekali.** Setelah update, layar "Perubahan batas beban" menjelaskan perubahan dengan bahasa sederhana. Sampai pengguna menekan **Saya mengerti, aktifkan**, generator memakai perilaku lama (rentang library sebagai plafon).
2. **Bisa kembali.** Toggle di Setting › Alat: **Batasi ke rentang awal library**. Bila nyala, perilaku lama berlaku.
3. **Penanda di kartu gerakan.** Bila beban resep di atas rentang awal, kartu menampilkan label kecil, misalnya `DI ATAS RENTANG AWAL`, dan detail gerakan menjelaskan alasannya (PR / log dan batas alat).
4. **Terdokumentasi.** TRAINING-LOGIC dan halaman detail aturan di Setting menjelaskan model batas ini.

### Keputusan sebelumnya yang tetap
- RPE ≤ 7, hanya gerakan dari library, kondisi mengikuti toggle Setting, saran tidak memblokir.
- ★ dikunci per blok.
- Gambar hanya dari free-exercise-db (Unlicense). Tanpa padanan → "Gambar belum tersedia".

## 3. Cakupan

### 0.14.0 · Progresi dengan alat terbatas

**a. Pengaturan alat (diperluas, satu sumber data)**
- Tetap satu data dan satu komponen dengan Setting › Alat; tab Strength mendapat jalan pintas ke sana, bukan pengaturan kedua.
- Baru: daftar alat yang bisa ditambah, diubah, dan dihapus; item berbobot tetap (DB fixed, kettlebell) di samping model handle + plat yang sudah ada.
- Kettlebell hanya tercatat sampai library punya gerakan kettlebell.
- Data alat lama dimigrasi otomatis ke struktur baru.

**b. PR kemampuan**
- Entri: gerakan (hanya dari library), beban, set, rep, tanggal, `sumber: manual | log`.
- PR manual = baseline yang diinput; PR dari log terdeteksi otomatis saat sesi mengalahkan PR sebelumnya.
- Riwayat PR per gerakan; edit dan hapus untuk entri yang salah.
- PR menjadi acuan target dan progresi, bukan hanya catatan.
- Ikut ekspor/impor (format v4) dan sinkron 0.12 (bagian baru).

**c. Double progression saat mentok**
- Gerakan yang sudah di batas beban (alat atau keamanan) keluar dari rotasi skema rep dan memakai **rentang rep tetap**.
- Urutan progresi:
  1. Naikkan rep sampai ujung atas rentang (mis. 8 → 10 → 12).
  2. Tambah tempo atau jeda 1–2 detik.
  3. Varian satu sisi (satu kaki / satu tangan).
- Varian lewat relasi "varian lebih sulit" di META gerakan, hanya ke gerakan yang ada di library dan lolos filter kondisi.
- Tempo/jeda boleh di tengah blok. Ganti ke varian satu sisi untuk gerakan ★ berlaku **mulai blok berikutnya** (mode bebas: langsung).
- Log mendapat field baru: tempo/jeda dan level varian.
- Bila alat bertambah, gerakan yang mentok otomatis bisa naik beban lagi.

**d. Saran Gita (coach) yang menjelaskan alasannya**
- Syarat naik memakai RPE relatif: **RPE ≤ target sesi − 1**.
- Jenis saran: naik rep/set; naik beban bila alat lebih berat tersedia; naik tempo atau varian bila rep di ujung atas dan beban tidak bisa naik.
- Setiap saran menyebut alasannya, misalnya "2 sesi terakhir RPE 5 di 12 rep, beban sudah di batas alat."
- Tidak pernah memblokir.

**e. Pengingat beli beban**
- Dihitung per area tubuh (lower, upper push, upper pull), bukan dinyatakan di spesifikasi.
- Syarat: ≥ X% gerakan aktif di area itu berada di batas alat selama 2 sesi berturut-turut, dengan RPE ≤ target − 1 dan rep di ujung atas rentang. Usulan X = 80%.
- Isi saran: **plat yang membuka progresi paling banyak**, misalnya "Sepasang plat 2,5 kg membuka progresi untuk 4 gerakan lower." Tanpa tautan toko.
- Menghormati sikap pemilik: beli hanya bila hampir semua gerakan sudah mentok.

### 0.14.1 · Sesi ST
| Fitur | Ringkas |
| --- | --- |
| Mode latihan + timer istirahat | Layar fullscreen: gerakan per gerakan, timer istirahat dan hitung mundur tahan, centang per set langsung tercatat (termasuk tempo/varian) |
| Session-RPE | RPE sesi + durasi; masuk beban 7 hari, kepatuhan program, Week Ledger |
| ST mengikuti fase program | Base volume, Build lebih berat (sejauh alat memungkinkan), Peak maintenance, Taper ST kaki dikurangi. Detail taper dari literatur |
| Aturan hari yang sama | Lari + ST di hari yang sama: sarankan jeda ≥ 3 jam. Aturan concurrent lama ditinjau ulang bersama test |
| Peta otot ringkasan sesi | Di mode latihan dan setelah sesi: gabungan otot utama/sekunder dari semua gerakan sesi itu ("Hari ini melatih ..."), memakai komponen `MuscleMap` dari 0.14.2. Bila 0.14.1 dikerjakan lebih dulu, komponen dasarnya dibuat di 0.14.1 |

### 0.14.2 · Library & visual
- **Seated DB Curl** (biceps) masuk library. Seated Single-Leg Calf Raise sudah ada sejak 0.9.
- Gerakan pengisi celah: **biceps, triceps, lats, betis, tibialis**, sesuai kondisi aktif dan alat. Ingat: pull-up bar sudah ada di daftar alat (Dead Hang, Negative Pull-Up untuk lats).
- Varian satu sisi untuk gerakan yang mentok (mis. single-leg hip thrust bila tersedia di sumber dan lolos filter kondisi).
- Alur 0.9 tidak berubah: audit pencocokan free-exercise-db → usulan (tunggu persetujuan) → implementasi. Setiap gerakan baru wajib lolos syarat PRD §3 (META, alat, rentang awal, media, audit, test generator).
- Gambar untuk 5 gerakan tanpa gambar tetap dicari (backlog P1).

**Peta otot per gerakan (`MuscleMap`)**
- Diagram tubuh depan dan belakang di bottom sheet detail gerakan, menyorot otot utama (terang) dan sekunder (redup).
- **Sumber SVG:** poligon dari [react-body-highlighter](https://github.com/giavinh79/react-body-highlighter) (MIT, poligon asal [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter), MIT) atau turunannya [body-highlighter](https://github.com/lahaxearnaud/body-highlighter). Alternatif lebih detail: [MuscleMapJS](https://github.com/abdofallah/MuscleMapJS) (MIT). Pilihan final setelah dicek kelengkapan region dan ukuran.
- **Tidak dipasang sebagai dependensi.** Data poligon disalin ke `components/charts/MuscleMap.tsx` (SVG sendiri, warna dari token tema, ikut mode gelap/terang), sesuai DESIGN-SYSTEM §8. Lisensi MIT dan atribusi dicatat di `NOTICE.md`.
- **Data otot dari kurasi kita** (`lib/movements/media.ts`), bukan mentah dari free-exercise-db, karena beberapa gambar 🟡 berbeda dari versi kita. Tambahkan pemetaan nama otot kita → ID region SVG, diuji: setiap gerakan di library punya minimal satu otot utama yang terpetakan.
- **Celah region:** tibialis anterior dan soleus wajib dicek. Bila tidak ada di SVG sumber, region ditambah sendiri (dicatat sebagai karya turunan) atau gerakan itu menampilkan daftar teks saja dengan keterangan.
- **Aksesibilitas:** `<svg role="img" aria-label="Otot utama: …; sekunder: …">`, daftar teks otot tetap tampil di bawah gambar. Tanpa animasi, atau fade opacity saja (reduced motion dihormati).
- Konsep tampilan boleh terinspirasi aplikasi lain, tetapi artwork aplikasi lain tidak ditiru; gambar anatomi hanya dari sumber berlisensi bebas (PRD §3).

## 4. Turun prioritas / dipindah
| Item | Keputusan |
| --- | --- |
| Skema "Kekuatan" 5–6 rep | Turun prioritas: dengan alat mentok, rep rendah tidak bisa dibuat lebih berat. Ditinjau lagi bila alat bertambah |
| Tes kekuatan berkala | Sebagian besar tergantikan PR. Milestone pull-up tetap |
| Plyometric ringan | Ditunda ke backlog P3 (D6): butuh shin splints nonaktif dan sumber, lewat aturan PRD §3 |
| Tren volume ST, heatmap aktivitas | 0.15 Insight |
| Heatmap otot mingguan/bulanan | 0.15 Insight: agregasi log ST per otot (frekuensi atau volume) memakai `MuscleMap` yang sama; menyorot otot yang jarang dilatih (mis. biceps, triceps, lats, betis, tibialis) |
| Sinkron per-field | Bahan pertimbangan desain 0.12 |
| Banner offline | 1.0 |

## 5. Referensi konsep openGym
Hanya konsep (AGPL-3.0): jangan salin kode, teks, atau aset UI. Konsep yang dipakai di 0.14: double progression dengan rentang rep terlihat, timer istirahat, target yang menjelaskan alasannya. Progresi "tambah waktu" untuk gerakan tahan sudah ada (+5 detik, maks 60).

## 6. Keputusan terbuka

Semua butir di bawah **diputuskan pemilik pada 2026-10-26** (D1–D8). Daftarnya tetap disimpan sebagai riwayat.

1. **Gita:** nama coach di UI. Bila disetujui, dicatat di DESIGN-SYSTEM §7 dan dipakai konsisten.
   - **Diputuskan (D1):** nama coach **Gita**.
2. Ambang pengingat beli (usulan 80%) dan rentang rep tetap per level (usulan Easy 10–15, Moderate 8–12, High 6–10, tetap RPE ≤ 7).
   - **Diputuskan (D2):** ambang pengingat beli **80% per area** (lower, upper push, upper pull).
   - **Diputuskan (D3):** rentang rep tetap saat mentok **Easy 10–15, Moderate 8–12, High 6–10**, tetap RPE ≤ 7.
3. Daftar gerakan dengan batas keamanan, beserta sumbernya.
   - **Diputuskan (D4):** daftar dan angka batas keamanan **diusulkan Claude Code beserta sumbernya**, lalu disetujui pemilik di Prompt 1A sebelum diterapkan.
4. Aturan concurrent lama (setelah ST kaki → lari maks Moderate): dipertahankan, dipersempit, atau diganti aturan hari yang sama.
   - **Diputuskan (D5):** aturan concurrent lama **dipertahankan**, ditambah aturan hari yang sama (lari + ST: sarankan jeda **≥ 3 jam**).
5. Plyometric masuk 0.14 atau ditunda.
   - **Diputuskan (D6):** **ditunda ke backlog** (P3), butuh kondisi shin splints nonaktif dan sumber.
6. Warna peta otot. Usulan: otot utama `--brand`, sekunder `--brand-soft`, otot lain `--subtle-strong`. Perlu dicatat di DESIGN-SYSTEM karena oranye selama ini berarti "selesai"; peta otot bukan rencana maupun status selesai.
   - **Diputuskan (D7):** otot utama `--brand`, sekunder `--brand-soft`, otot lain `--subtle-strong`. Dicatat di DESIGN-SYSTEM saat komponen dibuat.
7. Sumber SVG final (react-body-highlighter / body-highlighter / MuscleMapJS) setelah cek region tibialis & soleus.
   - **Diputuskan (D8):** sumber SVG **dipilih di Prompt 2** setelah perbandingan (kelengkapan region, ukuran, lisensi).

## 7. Perkiraan dampak (dipastikan saat memeriksa kode)
- **Logika:** `lib/equipment.ts`, `lib/progression.ts`, `lib/training-log.ts`, `lib/generator/meta.ts`, `lib/generator/strength.ts`, `lib/generator/validate.ts`, `lib/athlete-settings.ts`, `lib/sync/merge.ts`, `lib/coach.ts`.
- **Media:** `lib/movements/media.ts`, `scripts/audit-movement-media.mjs`, `scripts/fetch-movement-media.mjs`.
- **UI:** halaman Strength, Setting › Alat, kartu & detail gerakan, layar persetujuan perubahan batas, `components/charts/MuscleMap.tsx` (baru), `NOTICE.md` (atribusi SVG).
- **Test:** `progression`, `settings`, `generator`, `media`, `sync`, plus test baru untuk PR, pengingat beli, dan syarat transparansi (perilaku lama sebelum persetujuan, toggle kembali).
- **Data:** key PR baru, struktur alat diperluas + migrasi, field log tempo/varian, ekspor v4, bagian sinkron baru, status persetujuan perubahan batas.
- **Test:** tambahan `media.test.ts`: setiap gerakan punya pemetaan otot ke region SVG; logika murni agregasi otot sesi diuji terpisah dari komponen.
- **Dokumen:** PRD §3 (aturan batas beban), §4.4, §4.6, §4.8, §5 (lisensi aset: tambah SVG anatomi MIT); TRAINING-LOGIC §3 & §6; DESIGN-SYSTEM §6 (komponen MuscleMap) & §7 (nama Gita); NOTICE.md.

### Usulan teks baru PRD §3
> Beban tidak melebihi **batas alat** (beban terberat yang bisa dirakit dari alat di Setting) dan **batas keamanan** gerakan bila kondisi terkait aktif. Rentang beban di library adalah titik awal. Perilaku ini aktif setelah pengguna menyetujui pemberitahuan perubahan, dan bisa dikembalikan ke rentang library di Setting. · keputusan 2026-10-26
