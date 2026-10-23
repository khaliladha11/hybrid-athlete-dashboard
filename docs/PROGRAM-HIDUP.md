# Cakupan 0.13 Program hidup

> Status: **cakupan disetujui 2026-10-23**, spesifikasi detail menyusul sebelum implementasi. Simpan di `docs/PROGRAM-HIDUP.md`.
> Bergantung pada 0.11 (onboarding, profil di perangkat) dan 0.12 (sinkron). Kalau ada yang bertentangan dengan PRD §3, PRD yang menang.

## Tujuan

Program target dipakai **setiap hari**, bukan halaman terpisah. Satu pertanyaan terjawab di satu tempat: "hari ini sesi apa menurut rencana, apakah aku di jalur, dan seberapa realistis targetku?"

## Cakupan

### Inti
| # | Fitur | Ukuran | Ringkas |
| --- | --- | --- | --- |
| 1 | Program → generator | S | "Kerjakan sesi hari ini" membuka Generator Lari dengan durasi, level, dan pola sesuai rencana. Saran readiness tetap boleh menurunkan, tidak memblokir |
| 2 | Kepatuhan program | M | Sesi rencana ditandai selesai / sebagian / terlewat dari aktivitas intervals.icu (yang sudah di-dedupe), tampil di Program dan kalender |
| 3 | Prediksi waktu lomba | S | Perkiraan 5K/10K/HM/FM dari lari terbaik terbaru, dibanding target |

### Perluasan
| # | Fitur | Ukuran | Ringkas |
| --- | --- | --- | --- |
| 4 | Saran hari ini tahu rencana | S | Coach membaca sesi rencana hari ini dan menyarankan penyesuaian terhadap rencana itu |
| 5 | Rencana di kalender | S–M | Sesi yang akan datang tampil di kalender. Rencana = warna intensitas, selesai = oranye |
| 6 | Rentang kalender mengikuti program | S | Riwayat sepanjang program (HM 12 mg, FM 16 mg), bukan hanya 2 bulan |
| 7 | Ringkasan minggu program | S | Satu baris di Profil: minggu ke-, fase, sesi selesai, long run |
| 8 | Sesi ST dari program | S | Tombol yang sama untuk membuka Generator Strength sesuai jadwal ST program. Logika ST tidak berubah (itu cakupan 0.14) |
| 9 | Sesi terlewat: geser atau lewati | M | Tawaran pindah atau lewati sesi yang terlewat, tetap mematuhi aturan jadwal (tidak sehari sebelum quality/long run). Keputusan di tangan atlet |
| 10 | Saran update zona | S | Bila prediksi menunjukkan kebugaran naik konsisten, tawarkan pembaruan zona di Setting. Tidak pernah otomatis |
| 11 | Hitung mundur & minggu lomba | S | Sisa hari, catatan taper, checklist hari H |

### Di luar cakupan 0.13
- Semua perubahan logika ST (fase ST, session-RPE, skema baru, mode latihan): **0.14 Strength hidup**.
- Kirim workout ke kalender intervals.icu / jam: rilis tersendiri menjelang 1.0.
- Program adaptif penuh (volume berubah otomatis dari kepatuhan): sengaja tidak dikerjakan; #9 adalah versi aman.

## Keputusan yang dibuat saat spesifikasi
1. **Rumus prediksi.** Usulan: VDOT Daniels (sudah ada di `lib/run-zones.ts`, konsisten dengan zona), Riegel hanya pembanding.
2. **Definisi selesai.** Usulan: lari di hari yang sama atau ±1 hari (WIB), jenis cocok, durasi atau jarak ≥ 80% rencana; di bawahnya "sebagian".
3. **Tempat menghitung kepatuhan.** Program di perangkat (disinkron 0.12), aktivitas di server: dihitung di client dengan aktivitas sebagai props, atau di server membaca data sinkron.
4. **Batas rentang data** dari intervals.icu untuk program panjang (performa dan jumlah request).

## Aturan yang tetap berlaku
Saran tidak memblokir. Long run ≤ 10% dan ≤ 2 km per minggu. 80/20. Semua aturan kondisi. Logika baru berupa modul murni yang diuji.
