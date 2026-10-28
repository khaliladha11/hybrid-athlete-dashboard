# Spesifikasi 0.15 Insight

> Status: **spesifikasi, 2026-10-28**. 0.15.0 (tren lari) dan 0.15.1 (tren kekuatan) dirilis 2026-10-28; 0.15.2 belum.
> Bergantung pada 0.13 (program & kepatuhan), 0.14 (session-RPE, PR, `MuscleMap`, model mingguan 0.14.3, aturan sinyal yang tidak tersedia). Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Desain mengikuti [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## 1. Tujuan

Sampai 0.14 aplikasi memutuskan **hari ini**: sesi apa, seberat apa, dan apakah perlu diturunkan. 0.15 menambah tampilan **mingguan dan bulanan** untuk menjawab tiga pertanyaan jangka panjang:

- **Apakah aku makin bugar?** (tren lari, VDOT)
- **Apakah aku makin kuat?** (volume ST, PR, otot yang dilatih)
- **Apakah aku tetap bebas cedera?** (kenaikan km, distribusi intensitas, check-in nyeri)

**Dianggap berhasil kalau:**
- Dari Profil, satu ketukan ("Lihat tren") membuka `/insight` dengan jawaban yang bisa dibaca dalam satu layar per topik.
- Setiap grafik bisa dibaca tanpa melihat grafiknya (ringkasan `aria-label` dan tabel teks).
- Tidak ada grafik yang mengubah saran di 0.15.0 dan 0.15.1. Perubahan saran hanya di 0.15.2, dengan sumber dan persetujuan pemilik.
- Data yang tidak ada (HR, cadence, HRV, log ST lama) tampil jujur sebagai "tidak ada data", bukan angka nol.

## 2. Keputusan desain (2026-10-28)

| # | Keputusan | Alasan |
| --- | --- | --- |
| I1 | Grafik adalah **komponen SVG sendiri** (tanpa library chart, DESIGN-SYSTEM §8). Logika skala & tata letak murni dan diuji terpisah, seperti Segment Skyline (`skyline-scale.ts`) | Bundel tetap kecil, gaya konsisten dengan token tema, dan logika bisa diuji tanpa DOM |
| I2 | **Tanpa tab baru.** Struktur 5 tab tetap. Insight ada di rute `/insight`, dibuka dari Profil ("Lihat tren") dan dari kartu terkait (mis. kartu 7 hari, Wellness, PR) | Navigasi bawah sudah penuh; tren dibuka sesekali, bukan setiap hari |
| I3 | Grafik **hanya menampilkan data** di 0.15.0 dan 0.15.1. Perubahan logika saran hanya di 0.15.2, dengan sumber dan persetujuan pemilik | Tampilan baru tidak boleh diam-diam mengubah keputusan latihan |
| I4 | **Tanpa ACWR** sebagai alarm cedera. Tren beban memakai ukuran yang sudah ada: load intervals.icu untuk lari, session-RPE untuk ST | Validitas ACWR banyak dikritik (rasio dari dua rata-rata yang saling bergantung, ambang "zona aman" tidak konsisten antar studi) |
| I5 | **Baseline HRV personal hanya bila data HRV tersedia** (aturan sinyal yang tidak tersedia 0.14.3). **Check-in harian** menjadi sinyal kesiapan subjektif utama | Jam pemilik tidak mengirim HRV; check-in tetap bisa dipakai siapa pun |
| I6 | Setiap grafik: `role="img"` + `aria-label` berisi ringkasan, dan toggle **"Lihat tabel"** yang menampilkan datanya sebagai teks. Berfungsi di 375px, mode gelap/terang, dan menghormati reduced motion | Aksesibilitas dan keterbacaan di HP sama penting dengan grafiknya |

## 3. Konsep & data

### Rentang & sumber
| Data | Sumber | Rentang |
| --- | --- | --- |
| CTL/ATL/Form | Wellness intervals.icu (`ctl`, `atl`) | 6 atau 12 minggu |
| Lari (km, pace, HR, cadence, load) | Aktivitas intervals.icu yang sudah di-dedupe | sampai 26 minggu (`/api/activities`, maks 200 hari sejak 0.13.0) |
| VDOT | Sumber 0.13.2 (hasil lomba, lari terbaik) dihitung ulang per minggu dengan data sampai minggu itu | sejak awal data |
| ST | Sesi mode latihan (0.14.1), log ★, aktivitas strength intervals.icu (dedupe 0.14.1) | sejak awal data |
| PR | PR kemampuan (0.14.0) + log ★ (tempo & varian 0.14.0) | sejak awal data |
| Kepatuhan | Model mingguan 0.14.3, program aktif & arsip | sepanjang program |
| Check-in | Baru (0.15.2), disimpan di perangkat & disinkron | sejak diisi |

### Minggu
Minggu = Senin sampai Minggu (WIB), sama dengan Week Ledger dan program. Minggu berjalan ditandai "minggu ini, belum selesai" dan tidak dibandingkan seolah sudah lengkap.

### Data yang belum tercatat
- **Volume ST per set.** Log ★ hanya menyimpan set terakhir gerakan utama, dan sesi mode latihan 0.14.1 menyimpan jumlah set, bukan isi tiap set. 0.15.1 menambah rincian set ke sesi mode latihan (gerakan, beban, rep/detik, band) beserta sinkron dan cadangan. Data lama ditampilkan apa adanya: minggu sebelum rincian tersedia diberi tanda "volume perkiraan (hanya gerakan ★)".
- **HR, cadence, HRV** yang tidak dikirim jam mengikuti aturan 0.14.3: tidak digambar, dan tabelnya menulis "tidak ada data".

## 4. Fitur

Nomor mengikuti cakupan pemilik (#1 sampai #12).

### 0.15.0 · Tren lari

**#1 Tren kebugaran CTL/ATL/Form**
- Dua garis (CTL, ATL) dan area Form (CTL − ATL) per hari, rentang **6 / 12 minggu** lewat Segmented.
- Form diberi pita netral (mis. −10 sampai +5) sebagai konteks, tanpa label "bahaya". Bila CTL/ATL tidak tersedia (aturan 14 hari 0.14.3), grafik diganti kalimat yang menjelaskannya.

**#2 Km mingguan dengan pembagian 80/20**
- Batang per minggu, ditumpuk easy (hijau) dan berat (merah) memakai klasifikasi `isHardRun` yang sama dengan coach.
- Minggu cutback program dan minggu deload blok ditandai.
- Kenaikan km > 30% dari minggu sebelumnya ditandai (aturan Nielsen 2014 yang sudah dipakai coach), hanya sebagai penanda, bukan saran baru.

**#3 Easy run: pace, HR, cadence**
- Per minggu: **median pace** dan **median HR** easy run, dan **cadence** dibanding target personal (aturan cadence 0.8).
- Minggu tanpa HR atau cadence tidak digambar untuk seri itu; tabelnya menulis "tidak ada data". Median dihitung hanya dari lari yang punya nilainya.

**#9 VDOT dari waktu ke waktu**
- VDOT per minggu dari sumber 0.13.2 (hasil lomba lebih diutamakan, lalu lari terbaik), dengan tingkat keyakinan (tinggi/sedang/rendah) sebagai gaya titik.
- Garis target dari target waktu program aktif, plus selisihnya dalam detik per km ("selisih 0:12/km ke target").

**Rute & navigasi**
- `/insight` dengan bagian Lari (0.15.0), lalu Kekuatan (0.15.1) dan Tubuh (0.15.2).
- Tautan "Lihat tren" di Profil, kartu 7 hari, dan kartu program.

### 0.15.1 · Tren kekuatan

**#4 Volume ST per pola gerakan**
- Per minggu, per pola (push, pull, lower, core/stabilitas, prehab):
  - beban × set × rep (kg);
  - gerakan tahan dalam detik;
  - band dihitung jumlah set & rep (tanpa kg).
- Ditambah beban ST mingguan dari session-RPE (AU) sebagai garis terpisah. Tidak dijumlahkan dengan load lari (I4).

**#5 Heatmap otot**
- `MuscleMap` 0.14 dengan intensitas warna per otot, rentang **7 dan 30 hari**, mode **frekuensi** (berapa sesi) atau **volume**.
- Otot di library yang **tidak punya kerja utama dalam 14 hari** terakhir ditandai dan didaftar sebagai teks.
- Tetap memakai warna D7. Intensitas ditampilkan lewat tingkat opasitas `--brand`, ditambah legenda angka.

**#8 Tren PR per gerakan**
- Garis PR terbaik per gerakan dari waktu ke waktu.
- Saat beban mentok (0.14.0), tahap progresi lain ditampilkan sebagai penanda di garis yang sama: rep naik, tempo/jeda, pindah varian.

**#10 Tren kepatuhan mingguan**
- Per minggu program: sesi terpenuhi / total, **lari dan ST terpisah**, memakai model mingguan 0.14.3.
- Tanpa merah dan tanpa streak. Minggu "sebagian" netral.

**#11 Kalender heatmap aktivitas**
- Grid hari 12 sampai 26 minggu: lari, ST, lari + ST, istirahat. Aktivitas di tanggal aslinya (0.14.3).

### 0.15.2 · Tubuh & saran

**#6 Check-in harian**
- Isian opsional, **di bawah 10 detik**:
  - nyeri shin 0–10;
  - pegal 0–10;
  - kualitas tidur 1–5;
  - mood 1–5.
- Bisa dilewati tanpa pengingat berulang. Data disimpan di perangkat, disinkron, dan ikut cadangan.
- Masuk ke saran hari ini **hanya untuk menurunkan**. Aturannya (ambang dan sumbernya, mis. nyeri shin untuk MTSS) diusulkan di Prompt 0.15.2 dan menunggu persetujuan pemilik (I3).
- Tren check-in tampil di Insight bagian Tubuh.

**#7 Ambang personal**
- **HR lari berat** dari zona/LTHR atlet (Setting › Zona), bukan konstanta 155.
- **Baseline HRV 30 hari** hanya bila HRV tersedia (I5).
- Konstanta tetap dipakai sampai datanya cukup. Syarat "cukup" diusulkan bersama sumbernya, mis. jumlah lari easy dengan HR minimum.
- Setiap perubahan ambang ditulis di saran ("ambang lari berat kini 152 bpm dari zonamu").

**#12 Kartu ringkasan bulanan**
- Di Profil pada awal bulan untuk bulan yang baru selesai: km, sesi ST, PR baru, perubahan VDOT, dan otot yang terlewat.
- Bisa ditutup, sekali per bulan. Tautan ke `/insight`.

## 5. Tampilan

- **Ikuti DESIGN-SYSTEM:**
  - satu Display per layar;
  - StatRow untuk angka;
  - label mono;
  - copy tanpa em dash/en dash di teks UI dan tanpa tanda seru;
  - area sentuh ≥ 44px.
- **Warna:**
  - rencana tetap warna intensitas;
  - easy/berat memakai tone intensitas;
  - aktivitas & PR memakai oranye;
  - heatmap otot memakai D7.
- **Setiap grafik:**
  - judul pendek;
  - satu kalimat ringkasan di atas grafik (mis. "CTL naik 4,2 dalam 6 minggu");
  - grafik;
  - toggle "Lihat tabel".
- **375px:**
  - sumbu-x maksimal ±6 label;
  - grafik tidak menggulir horizontal;
  - nilai detail lewat tabel, bukan tooltip hover (hover hanya untuk pointer presisi).
- **Reduced motion:** tanpa animasi masuk.
- **Kondisi kosong:** "Belum ada data cukup untuk tren ini (butuh 2 minggu)", bukan grafik kosong.

## 6. Arsitektur

| Modul | Tanggung jawab | Berjalan di |
| --- | --- | --- |
| `lib/insight/run-trends.ts` | Agregasi mingguan lari: km easy/berat, kenaikan > 30%, median pace/HR easy, cadence vs target, minggu cutback/deload | Server & client (murni) |
| `lib/insight/fitness.ts` | Seri CTL/ATL/Form per hari dari wellness, rentang 6/12 minggu, sinyal tidak tersedia | Server & client (murni) |
| `lib/insight/vdot-trend.ts` | VDOT per minggu dari `lib/program/prediction.ts`, keyakinan, selisih ke target | Server & client (murni) |
| `lib/insight/strength-trends.ts` | Volume per pola & minggu, beban session-RPE mingguan, heatmap otot (frekuensi/volume, 7/30 hari, terlewat 14 hari), tren PR & tahap progresi | Client (murni) |
| `lib/insight/compliance-trend.ts` | Ringkasan kepatuhan per minggu, lari & ST terpisah | Client (murni) |
| `lib/insight/activity-heatmap.ts` | Grid hari 12–26 minggu dari `calendarItems` | Client (murni) |
| `lib/checkin.ts`, `lib/checkin-store.ts` (0.15.2) | Validasi, gabungan per hari dengan tombstone, penyimpanan; bagian sinkron baru & cadangan | Murni / client |
| `lib/thresholds.ts` (0.15.2) | Ambang personal & syarat data cukup | Server & client (murni) |
| `components/charts/*` | Komponen SVG: garis, batang bertumpuk, grid heatmap, dengan skala murni di file `*-scale.ts` | Client |
| `app/insight/page.tsx` | Rute Insight; data intervals.icu diambil di server, data perangkat di client | Server + client |

- Semua modul baru murni: tanpa I/O, tanggal dari parameter, WIB lewat `lib/date.ts`.
- API key tetap di server.

## 7. Test

- **`fitness.test.ts`:** seri 6/12 minggu, Form = CTL − ATL, CTL/ATL tidak tersedia, hari tanpa data.
- **`run-trends.test.ts`:**
  - km per minggu dan pembagian easy/berat sama dengan `isHardRun`;
  - penanda > 30% sama dengan coach;
  - median pace/HR hanya dari lari easy yang punya nilai;
  - cadence vs target;
  - minggu cutback/deload.
- **`vdot-trend.test.ts`:** VDOT per minggu memakai data sampai minggu itu saja, keyakinan, selisih ke target, tanpa program.
- **`strength-trends.test.ts`:**
  - volume set × rep × kg;
  - tahan dalam detik dan band tanpa kg;
  - minggu tanpa rincian set ditandai perkiraan;
  - beban session-RPE mingguan tidak dijumlah dengan lari;
  - heatmap frekuensi/volume 7/30 hari;
  - otot tanpa kerja utama 14 hari;
  - tahap PR (rep, tempo, varian).
- **`compliance-trend.test.ts`:** lari & ST terpisah, minggu sebagian, program arsip.
- **`activity-heatmap.test.ts`:** tanggal asli, lari + ST di hari sama, rentang 12/26 minggu.
- **Skala grafik (`*-scale.test.ts`):** domain, tick ≤ 6 label di 375px, nilai kosong, satu titik data.
- **`checkin.test.ts` (0.15.2):** validasi rentang, gabungan & sinkron, saran hanya menurunkan, tanpa check-in perilaku lama.
- **`thresholds.test.ts` (0.15.2):** HR berat dari zona/LTHR, baseline HRV hanya bila tersedia, konstanta sampai data cukup.
- **Aksesibilitas:** setiap grafik punya `aria-label` ringkasan dan tabel yang isinya sama dengan data grafik.

## 8. Rencana rilis

| Versi | Isi |
| --- | --- |
| **0.15.0** | Rute `/insight` & tautan "Lihat tren"; tren lari: CTL/ATL/Form (#1), km mingguan 80/20 (#2), easy run pace/HR/cadence (#3), VDOT (#9) |
| **0.15.1** | Tren kekuatan: rincian set di mode latihan, volume per pola & beban session-RPE (#4), heatmap otot (#5), tren PR (#8), tren kepatuhan (#10), kalender heatmap (#11) |
| **0.15.2** | Tubuh & saran: check-in harian (#6), ambang personal (#7), kartu ringkasan bulanan (#12). Aturan saran baru diusulkan dengan sumber dan disetujui pemilik sebelum diterapkan |

## 9. Di luar cakupan

- Mode offline dan banner offline: **1.0**.
- Kirim workout ke kalender intervals.icu / jam: **1.0**.
- Bagikan kartu story dari `/activity/[id]`: tetap backlog P2.
- ACWR atau "zona aman" beban sebagai alarm cedera (I4).
- Perubahan saran dari grafik di 0.15.0 dan 0.15.1 (I3).

## 10. Perubahan dokumen

- **PRD:** baris ⬜ 0.15 di §4 berubah status per rilis; §6 diperbarui bila ambang personal menggantikan konstanta (§6 #2); §7 tandai 0.15 selesai; header & §8 per rilis.
- **TRAINING-LOGIC:** cara hitung tren (minggu, median, volume, VDOT per minggu); 0.15.2 aturan check-in & ambang personal dengan sumber.
- **DESIGN-SYSTEM §6:** komponen grafik baru, aturan "Lihat tabel", heatmap otot.
- **ARCHITECTURE:** modul `lib/insight/*`, rute `/insight`, bagian sinkron check-in.
- **README & CHANGELOG** per rilis.
