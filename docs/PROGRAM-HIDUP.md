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
| `lib/coach.ts` | `suggestFor()` menerima sesi rencana | Server & client |
| Data source intervals | Rentang aktivitas mengikuti program | Server |

Semua modul baru murni (tanpa I/O, tanggal dari parameter, WIB lewat `lib/date.ts`).

## 7. Test

- `program-sessions.test.ts`: id stabil antar render, override move/skip diterapkan, program berganti → id baru.
- `compliance.test.ts`: tepat hari, ±1 hari, dua sesi berebut satu aktivitas, aktivitas ganda sehari, < 80% → sebagian, easy dikerjakan berat → catatan, terlewat setelah tenggat, ST dari log lokal dan dari intervals.icu, data kosong/null aman.
- `prediction.test.ts`: invers VDOT cocok dengan tabel Daniels (contoh TRAINING-LOGIC: 5K 30:40 → VDOT ±30), prioritas sumber, keyakinan FM turun bila long run pendek, Riegel pembanding.
- `reschedule.test.ts`: semua aturan §4.8, tidak pernah menambah volume minggu berikutnya, tanpa kandidat → hanya lewati.
- `coach.test.ts` (tambahan): saran terhadap rencana hanya menurunkan, tidak berantai, long run dipendekkan, tanpa rencana perilaku lama tetap.
- `program.test.ts` (tambahan): pemetaan to-generator untuk setiap jenis sesi dan fase.
- `sync.test.ts` (tambahan): override digabung per entri.

## 8. Rencana rilis

| Versi | Isi |
| --- | --- |
| **0.13.0** | Sesi ber-id + override (model data & sinkron), kepatuhan, rencana di kalender, rentang mengikuti program, ringkasan minggu |
| **0.13.1** | Program → generator (lari & ST) + kartu sesi program, saran hari ini tahu rencana |
| **0.13.2** | Prediksi, saran update zona, sesi terlewat (geser/lewati), hitung mundur & minggu lomba |

## 9. Di luar cakupan
- Semua logika ST baru (fase ST, session-RPE, mode latihan, progresi alat terbatas): **0.14**.
- Kirim workout ke kalender intervals.icu / jam: menjelang **1.0**.
- Program adaptif penuh: sengaja tidak dikerjakan.

## 10. Perubahan dokumen
- **PRD:** §4.5 baris 0.13 berubah status per rilis; §6 #5 dihapus saat 0.13.1, #9 (kalender 2 bulan) diperbarui saat 0.13.0; §7 tandai 0.13 selesai; header & §8 per rilis.
- **TRAINING-LOGIC:** §5 aturan saran terhadap rencana; §7 kepatuhan, prediksi, geser/lewati, dengan referensi Daniels.
- **ARCHITECTURE:** modul `lib/program/*`, override di bagian sinkron `program`.
- **README & CHANGELOG** per rilis.
