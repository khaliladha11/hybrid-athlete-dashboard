# Spesifikasi 0.13 Program hidup

> Status: **spesifikasi, 2026-10-26** (menggantikan dokumen cakupan 2026-10-23). Simpan di `docs/PROGRAM-HIDUP.md`.
> Bergantung pada 0.11 (profil di perangkat) dan 0.12 (sinkron). Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Desain mengikuti [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## 1. Tujuan

Program target dipakai **setiap hari**. Satu pertanyaan terjawab di satu tempat: "hari ini sesi apa menurut rencana, apakah aku di jalur, dan seberapa realistis targetku?"

**Dianggap berhasil kalau:**
- Dari Profil, satu ketukan membawa atlet ke sesi hari ini yang siap dikerjakan.
- Setiap sesi rencana yang sudah lewat punya status yang benar (selesai, sebagian, terlewat, digeser, dilewati) tanpa input manual.
- Prediksi waktu lomba bisa dijelaskan: dari aktivitas mana dan seberapa yakin.
- Tidak ada saran yang menaikkan beban atau memblokir pilihan atlet.

## 2. Keputusan desain (2026-10-26)

| # | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Prediksi memakai **VDOT Daniels** (sudah ada di `lib/run-zones.ts`); Riegel hanya pembanding di detail | Zona dan prediksi berasal dari angka yang sama; Riegel cenderung terlalu optimis untuk jarak jauh pada volume rendah |
| D2 | Sesi **selesai** = lari di tanggal rencana atau ±1 hari (WIB), jenis cocok, durasi atau jarak ≥ 80% rencana. Di bawahnya **sebagian** | Toleran terhadap jadwal nyata tanpa menghitung sesi yang jauh berbeda |
| D3 | Kepatuhan dihitung di **client** lewat modul murni; aktivitas dikirim dari server sebagai props | Program ada di perangkat (disinkron 0.12); API key tetap di server |
| D4 | Long run dan sesi spesifik lomba **tidak dibuat ulang lewat generator** (generator berbasis 30/45/60 menit). Sesi itu tampil sebagai kartu sesi program dengan teks salin | Menghindari sesi program "dipotong" menjadi 60 menit |
| D5 | Geser/lewati sesi tidak pernah otomatis dan tidak pernah menambah volume minggu berikutnya | Saran tidak memaksa; tanpa "membayar utang" latihan |

## 3. Konsep & data

### Sesi rencana
Setiap sesi di program mendapat **id stabil**: `{programId}:{minggu}:{hari}:{jenis}`. Jenis: `quality`, `easy`, `recovery`, `long`, `race`, `st-lower`, `st-upper`.

### Override (geser/lewati)
```ts
type ProgramOverride = {
  sessionId: string;
  action: "move" | "skip";
  toDate?: string;      // YYYY-MM-DD WIB, untuk move
  decidedAt: string;    // ISO
};
```
- Disimpan di bagian `program`.
- **Sinkron 0.12:** override digabung **per entri** berdasarkan `sessionId` (bukan seluruh bagian), sama seperti log. `lib/sync/merge.ts` diperbarui beserta test.

### Status sesi
| Status | Arti |
| --- | --- |
| `mendatang` | Tanggal belum lewat |
| `hari-ini` | Tanggal hari ini, belum ada aktivitas cocok |
| `selesai` | Sesuai D2 |
| `sebagian` | Ada aktivitas, tapi < 80% atau lebih ringan dari rencana |
| `terlewat` | Lewat tanggal + 1 hari tanpa aktivitas cocok |
| `digeser` / `dilewati` | Ada override |

Catatan tambahan per sesi: `lebih-berat` bila rencana easy tapi aktivitas tergolong berat (memakai klasifikasi lari berat yang sudah ada di coach). Catatan ini masuk perhitungan 80/20, bukan status gagal.

## 4. Fitur

### 4.1 Kepatuhan program (#2)
- Modul murni `lib/program/compliance.ts`:
  - Input: sesi rencana (setelah override), aktivitas lari yang sudah di-dedupe, log ST lokal, tanggal hari ini (WIB).
  - Pencocokan: urutkan berdasarkan kedekatan tanggal lalu kecocokan jenis; satu aktivitas hanya untuk satu sesi; satu sesi hanya satu aktivitas (aktivitas tambahan di hari yang sama dijumlah bila jenisnya sama).
  - Jenis cocok: quality ↔ aktivitas berat; easy/recovery ↔ aktivitas apa pun (berat → catatan `lebih-berat`); long ↔ jarak ≥ 80% rencana.
- **ST di 0.13:** sesi ST rencana dianggap selesai bila ada log ST lokal atau aktivitas WeightTraining di intervals.icu pada tanggal itu ±1 hari. Penilaian berat ringan ST adalah cakupan 0.14 (session-RPE).
- Tampil di halaman Program (per minggu) dan kalender.

### 4.2 Rencana di kalender (#5) & rentang mengikuti program (#6)
- Kalender menampilkan sesi rencana yang akan datang memakai **warna intensitas** (Easy hijau, quality kuning/merah sesuai intensitas, long run sesuai tier) dan aktivitas selesai **oranye**.
- Status di sel tanggal: titik oranye (selesai), cincin (mendatang), tanda `✕` lembut (terlewat), garis tipis (dilewati).
- Rentang data aktivitas: dari **min(awal program, 2 bulan lalu)** sampai hari ini. Server mengambil rentang ini satu kali per render; periksa batas dan performa API intervals.icu, dan cache sewajarnya.
- Navigasi bulan sepanjang rentang program.

### 4.3 Ringkasan minggu program (#7)
- Satu baris di Profil, di atas atau di dalam kartu saran: `MINGGU 5/12 · BUILD · 3/4 SESI · LONG RUN 14 KM ✓`.
- Ketuk → halaman Program pada minggu itu.
- Tanpa program aktif: baris tidak tampil (tanpa ajakan berulang).

### 4.4 Program → generator (#1) & sesi ST dari program (#8)
- Tombol **Kerjakan sesi hari ini** di Program dan di ringkasan Profil.
- Pemetaan murni `lib/program/to-generator.ts`:
  | Jenis rencana | Tujuan |
  | --- | --- |
  | `easy`, `recovery` | Generator Lari: level Easy, durasi dibulatkan ke 30/45/60 terdekat |
  | `quality` | Generator Lari: level Moderate atau High sesuai fase; bila pola rencana ada di 13 pola generator, pola itu dipilih |
  | `long`, `race`, sesi spesifik lomba yang tak bisa dipetakan | **Kartu sesi program**: jarak, target pace/HR, cue kondisi aktif, teks salin (format yang sama dengan Copy Set) |
  | `st-lower`, `st-upper` | Generator Strength: Lower/Full atau Upper Pull/Push sesuai jadwal, durasi default |
- Generator menerima isian awal sebagai **prefill** yang tetap bisa diubah. Bila perlu menambah parameter opsional "pola yang diminta" ke generator lari, parameter itu murni, opsional, dan diuji; tanpa parameter perilaku tidak berubah.
- Generator menampilkan chip `DARI PROGRAM · MINGGU 5` selama isian belum diubah.

### 4.5 Saran hari ini tahu rencana (#4)
- `suggestFor()` menerima sesi rencana hari ini.
- Aturan (semua hanya menurunkan, tidak berantai, tidak memblokir):
  - Readiness rendah + rencana quality → turunkan satu level, durasi sama.
  - Readiness rendah + rencana long run → pendekkan ke ±75% jarak, pace easy.
  - 80/20 terlampaui + rencana quality → Easy.
  - Kenaikan km > 30% + rencana long run → tahan jarak minggu lalu.
- Teks: `Rencana: Tempo 45'. Saran: Easy 45'.` lalu alasan di dropdown, seperti sekarang.
- Tombol **Terapkan** mengisi generator dengan versi yang diturunkan.

### 4.6 Prediksi waktu lomba (#3)
- Modul murni `lib/program/prediction.ts`.
- **Sumber VDOT, urutan prioritas:**
  1. Hasil lomba/time trial yang diisi di Setting dalam 90 hari terakhir.
  2. Best effort dari intervals.icu bila API menyediakan (periksa endpoint; jangan menebak).
  3. VDOT dari aktivitas lari utuh 90 hari terakhir (jarak ≥ 3 km), ambil tertinggi.
- Waktu prediksi per jarak: invers rumus VDOT (cari waktu yang menghasilkan VDOT sama) untuk 5K, 10K, HM, FM.
- **Keyakinan:** `tinggi` (sumber 1), `sedang` (sumber 2), `rendah` (sumber 3). FM selalu disertai catatan bahwa prediksi butuh volume long run memadai; bila long run terjauh 30 hari < 12 km, keyakinan FM maksimal `rendah`.
- Tampilan: tabel jarak × prediksi, baris target dengan selisih (`perlu 12"/km lebih cepat` atau `di jalur`). Detail: sumber aktivitas + tanggal, dan pembanding Riegel.
- Copy tanpa janji: "perkiraan", bukan "akan".

### 4.7 Saran update zona (#10)
- Bila VDOT dari sumber 1 atau 2 ≥ VDOT zona saat ini + 1, pada dua evaluasi yang terpisah ≥ 14 hari, tampilkan tawaran di Setting › Zona dan ringkasan Profil: "Kebugaranmu naik. Perbarui zona dari hasil {tanggal}?"
- Tidak pernah otomatis. Tolak → tidak ditawarkan lagi sampai VDOT naik lagi.
- Sumber 3 (aktivitas utuh) tidak memicu saran.

### 4.8 Sesi terlewat: geser atau lewati (#9)
- Modul murni `lib/program/reschedule.ts` menghasilkan opsi untuk sesi `terlewat`:
  - `quality`: hari pengganti di minggu yang sama yang **tidak** sehari sebelum quality/long run, **tidak** di hari yang sudah ada lari, dan ≥ 48 jam dari quality sebelumnya. Tanpa kandidat → hanya "lewati".
  - `long`: geser 1–2 hari bila tidak menabrak quality minggu berikutnya; selain itu "lewati".
  - `easy`/`recovery`: tidak ditawarkan geser; cukup ditandai.
  - `st-*`: geser ke hari kosong berikutnya di minggu yang sama, tidak sehari sebelum quality/long run.
- Tidak pernah menambah volume minggu berikutnya (D5).
- Tampil sebagai baris di Program dan ringkasan Profil: `Tempo Selasa terlewat · Geser ke Kamis · Lewati`.

### 4.9 Hitung mundur & minggu lomba (#11)
- Ringkasan Profil dan Program: `14 HARI LAGI · HALF MARATHON`.
- Minggu lomba: catatan taper dari program, sesi sharpener, dan checklist umum H-1 (tidur cukup, sepatu yang sudah dipakai latihan, makan yang sudah biasa, rencana pace dari prediksi). Bukan saran medis.
- Setelah tanggal lomba: tawaran mencatat hasil lomba di Setting › Zona (memperkuat sumber 1 prediksi).

### 4.10 Hari H & saran lama program (0.13.3)

Atlet memilih **tanggal mulai** dan **Hari H**; panjang program = jumlah minggu di antaranya (berbasis Senin, dari minggu mulai sampai minggu yang berisi Hari H, inklusif). Hari H boleh hari apa saja: sesi lomba di hari itu, dan sesi lain di minggu lomba hanya yang jatuh sebelum Hari H. Saran tidak pernah memblokir (PRD §3); hanya batas teknis yang membuat program tidak bisa disusun.

**A. Tabel rekomendasi umum** (bukan bukti klinis):

| Jarak | Batas teknis | Minimum | Rekomendasi | Maksimum (lebih = pre-Base) | Taper |
| --- | --- | --- | --- | --- | --- |
| 5K | taper + 2 (3) | 6 | 8–10 | 12 | 1 |
| 10K | taper + 2 (3) | 8 | 10–12 | 14 | 1 |
| HM | taper + 2 (4) | 10 | 12–16 | 20 | 2 |
| FM | taper + 2 (5) | 16, atau 12 bila sudah pernah menyelesaikan FM | 16–20 | 24 | 3 |

"Pernah menyelesaikan jarak ini" terisi dari data (hasil lomba jarak itu, atau lari ≥ 90% jarak dalam data yang diambil) dan bisa diubah atlet lewat toggle.

**B. Minimum dari data.** Kenaikan long run disimulasikan dengan aturan program yang sama (≤ 10% dan ≤ 2 km per minggu, cutback tiap minggu ke-4) dari long run terjauh 30 hari terakhir **yang sebenarnya** sampai **long run puncak program standar** (5K 8,5 · 10K 10 · HM 18 · FM 25 km; puncak nominal 10/14/30 km tidak tercapai di panjang standar), ditambah taper. Di bawah 5 km dihitung dari 5 km (kenaikan 10% di bawahnya belum sampai 0,5 km). Tanpa data dihitung dari long run awal default program. Minimum efektif = max(minimum tabel, minimum data).

**C. Band tanggal:**

| Band | Syarat | Akibat |
| --- | --- | --- |
| Tidak bisa disusun | < taper + 2 minggu | Program tidak dibuat; tanggal paling awal ditandai |
| Merah | < minimum efektif | Boleh setelah centang "Saya mengerti risikonya" (disimpan bersama program) |
| Kuning | minimum efektif sampai < rekomendasi bawah | Base dipersingkat |
| Hijau | rekomendasi bawah (atau minimum efektif bila lebih besar) sampai maksimum | Program biasa |
| Abu-abu | > maksimum | Minggu pre-Base sebelum program maksimum, tanpa konfirmasi |

Setiap band membawa alasan, mis. "Long run terjauhmu 8 km. Untuk mencapai long run puncak 25 km dengan kenaikan aman ditambah taper 3 minggu, butuh minimal 24 minggu."

**D. Kesiapan** (peringatan lunak di bawah pemilih): HM rata-rata ≥ 25 km/minggu (4 minggu terakhir) dan long run terjauh 30 hari ≥ 10 km; FM ≥ 24 km/minggu (ideal 32–48 km) dan ≥ 10 km, plus catatan satu tahun lari rutin bila belum pernah HM/FM; 5K/10K tanpa syarat. Bila tidak terpenuhi: saran Hari H lebih jauh atau pre-Base.

**E. Jarak antar lomba** (hanya aturan FM yang punya sumber jelas): FM sebelumnya < 2 minggu sebelum program mulai → 1–2 minggu pemulihan dulu; FM lagi < 12 minggu setelah FM sebelumnya → umumnya 8–12 minggu untuk target waktu, ≥ 12 minggu bagi yang belum berpengalaman.

**F. Panjang tidak standar.** Lebih pendek: Base dipangkas dulu, lalu Build; Peak tetap sepanjang standar (2 minggu, FM 3) kecuali pra-taper lebih pendek; taper tidak pernah dipangkas; aturan kenaikan long run tidak berubah, dan puncak yang tidak tercapai diberi peringatan dengan angka yang tercapai. Di antara panjang standar dan maksimum: rumus proporsional yang sama. Lebih dari maksimum: minggu pre-Base (easy + strides, long run naik pelan dari terjauh asli sampai titik awal program inti), lalu program sepanjang maksimum dengan cutback dihitung dari minggu pertama program inti. Panjang standar dengan Hari H Minggu menghasilkan program yang identik dengan sebelum 0.13.3.

**G. Target waktu:** VDOT yang dibutuhkan target vs VDOT perkiraan sekarang (0.13.2) dan minggu tersedia. Informasi saja, tanpa label realistis/tidak.

**I. Ganti Hari H, mulai, atau jarak di tengah program:** program lama diarsipkan (pengaturan beku termasuk long run awal, override, tanggal berakhir) dan tetap terbaca di Program › Program sebelumnya dan kalender; program baru dimulai minggu ini dengan sesi mulai hari ini dan id `{jarak}-{Senin mulai}-{Hari H}`. Arsip disinkron dan digabung per id tanpa kehilangan override.

**J. Migrasi:** program tanpa Hari H mendapat Hari H = mulai + panjang lama − 1 hari dengan id lama, jadi status & override tidak berubah.

## 5. Tampilan

- Ikuti DESIGN-SYSTEM: satu Display per layar, StatRow untuk angka, label mono, copy tanpa em dash/en dash dan tanpa tanda seru.
- Halaman Program: header fase + minggu, daftar minggu dengan status per sesi (Week Ledger gaya), kartu prediksi, hitung mundur.
- Rencana = warna intensitas, selesai = oranye. Konsisten di Program, kalender, dan generator.
- Area sentuh ≥ 44px; tombol aksi baris (Geser, Lewati) minimal 32px dengan area sentuh diperluas, seperti tombol saran sekarang.

## 6. Arsitektur

| Modul | Tanggung jawab | Berjalan di |
| --- | --- | --- |
| `lib/program/sessions.ts` | Turunkan sesi rencana ber-id dari program + override | Server & client |
| `lib/program/compliance.ts` | Pencocokan & status | Server & client |
| `lib/program/to-generator.ts` | Pemetaan sesi → isian generator / kartu sesi | Client |
| `lib/program/prediction.ts` | VDOT dari sumber, invers, keyakinan, Riegel | Server & client |
| `lib/program/reschedule.ts` | Opsi geser/lewati | Server & client |
| `lib/program/timeline.ts` | Saran lama program dari Hari H (0.13.3): tabel, minimum data, band, kesiapan, jarak antar lomba | Server & client |
| `lib/coach.ts` | `suggestFor()` menerima sesi rencana | Server & client |
| Data source intervals | Rentang aktivitas mengikuti program | Server |

Semua modul baru murni (tanpa I/O, tanggal dari parameter, WIB lewat `lib/date.ts`).

## 7. Test

- `program-sessions.test.ts`: id stabil antar render, override move/skip diterapkan, program berganti → id baru.
- `compliance.test.ts`: tepat hari, ±1 hari, dua sesi berebut satu aktivitas, aktivitas ganda sehari, < 80% → sebagian, easy dikerjakan berat → catatan, terlewat setelah tenggat, ST dari log lokal dan dari intervals.icu, data kosong/null aman.
- `prediction.test.ts`: invers VDOT cocok dengan tabel Daniels (contoh TRAINING-LOGIC: 5K 30:40 → VDOT ±30), prioritas sumber, keyakinan FM turun bila long run pendek, Riegel pembanding.
- `reschedule.test.ts`: semua aturan §4.8, tidak pernah menambah volume minggu berikutnya, tanpa kandidat → hanya lewati.
- `timeline.test.ts` (0.13.3): batas band per jarak, toggle FM 16 → 12, minimum data (0 / 8 km / dekat puncak), batas teknis & tanggal paling awal, kesiapan, jarak antar lomba, data kosong.
- `program-baseline.test.ts` (0.13.3): program panjang tetap identik dengan sebelum 0.13.3 (hash).
- `coach.test.ts` (tambahan): saran terhadap rencana hanya menurunkan, tidak berantai, long run dipendekkan, tanpa rencana perilaku lama tetap.
- `program.test.ts` (tambahan): pemetaan to-generator untuk setiap jenis sesi dan fase.
- `sync.test.ts` (tambahan): override digabung per entri.

## 8. Rencana rilis

| Versi | Isi |
| --- | --- |
| **0.13.0** | Sesi ber-id + override (model data & sinkron), kepatuhan, rencana di kalender, rentang mengikuti program, ringkasan minggu |
| **0.13.1** | Program → generator (lari & ST) + kartu sesi program, saran hari ini tahu rencana |
| **0.13.2** | Prediksi, saran update zona, sesi terlewat (geser/lewati), hitung mundur & minggu lomba |
| **0.13.3** | Hari H dipilih atlet dengan saran lama program, pre-Base, arsip program saat Hari H diganti (§4.10) |

## 9. Di luar cakupan
- Semua logika ST baru (fase ST, session-RPE, mode latihan, progresi alat terbatas): **0.14**.
- Kirim workout ke kalender intervals.icu / jam: menjelang **1.0**.
- Program adaptif penuh: sengaja tidak dikerjakan.

## 10. Perubahan dokumen
- **PRD:** §4.5 baris 0.13 berubah status per rilis; §6 #5 dihapus saat 0.13.1, #9 (kalender 2 bulan) diperbarui saat 0.13.0; §7 tandai 0.13 selesai; header & §8 per rilis.
- **TRAINING-LOGIC:** §5 aturan saran terhadap rencana; §7 kepatuhan, prediksi, geser/lewati, dengan referensi Daniels.
- **ARCHITECTURE:** modul `lib/program/*`, override di bagian sinkron `program`.
- **README & CHANGELOG** per rilis.
