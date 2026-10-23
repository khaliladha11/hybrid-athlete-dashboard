# Cakupan 0.14 Strength hidup

> Status: **cakupan disetujui 2026-10-23**, spesifikasi detail menyusul setelah 0.13. Simpan di `docs/STRENGTH-HIDUP.md`.
> Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Perubahan logika latihan wajib memperbarui TRAINING-LOGIC dan test.

## Latar belakang

Sampai 0.12, ST di aplikasi berfungsi terutama sebagai prehab dan pelengkap lari. Untuk aplikasi hybrid athlete, ST perlu menjadi separuh rencana yang setara: ikut dihitung sebagai beban, mengikuti fase program, punya progres yang terlihat, dan nyaman dikerjakan di rumah.

### Dasar riset
- **ST memperbaiki performa lari.** Running economy membaik 2–8% di sebagian besar studi; 2–3 sesi ST per minggu dengan beragam modalitas dianjurkan (Blagrove dkk. 2018, *Sports Med* 48(5)).
- **Jenis ST menentukan.** Beban tinggi, plyometric, dan kombinasinya memperbaiki running economy; beban submaksimal dan isometrik kurang efektif (Llanos-Lagos dkk. 2024, *Sports Med*, meta-analisis, doi 10.1007/s40279-023-01978-y).
- **Interferensi kecil untuk kekuatan maksimal dan hipertrofi**; yang terganggu kekuatan eksplosif, terutama bila lari dan ST di sesi yang sama dengan jeda < 3 jam (Schumann dkk. 2022, *Sports Med* 52:601–612).
- **Session-RPE (RPE × durasi) valid untuk latihan beban** dan bisa disatukan dengan beban lari (Foster dkk. 2001; tinjauan Haddad dkk. 2017, *Front Neurosci*).

## Celah sekarang
| Celah | Dampak |
| --- | --- |
| ST tidak masuk beban 7 hari (coach hanya membaca nama aktivitas intervals.icu) | Saran lari bisa keliru setelah sesi ST berat yang tidak tercatat di jam |
| ST tidak mengikuti fase program lari | ST kaki tetap sama saat Peak/Taper |
| Skema rep hanya 8–15 | Manfaat beban relatif tinggi tidak didapat |
| Hanya gerakan ★ yang dicatat | Tidak tahu sesi mana yang benar-benar dikerjakan |
| Tidak ada mode saat latihan | Perlu timer lain, mencatat belakangan |
| Tidak ada tolok ukur kekuatan | Progres ST tidak terlihat seperti pace/VDOT di lari |

## Cakupan

| # | Fitur | Ukuran | Ringkas |
| --- | --- | --- | --- |
| 1 | ST mengikuti fase program | M | Base volume, Build lebih berat, Peak maintenance, Taper ST kaki dikurangi. Detail taper dari literatur saat spesifikasi |
| 2 | Session-RPE untuk ST | S | RPE sesi + durasi setelah sesi; masuk beban 7 hari, kepatuhan program, Week Ledger |
| 3 | Aturan hari yang sama | S | Lari + ST di hari yang sama: sarankan jeda ≥ 3 jam |
| 4 | Mode latihan | M | Layar fullscreen: gerakan per gerakan, timer istirahat & hitung mundur tahan, centang per set langsung tercatat |
| 5 | Skema "Kekuatan" 5–6 rep @ RPE 7 | S | Untuk ★ di fase Build. Tetap RPE ≤ 7. **Butuh persetujuan pemilik** (perubahan logika) |
| 6 | Tangga progresi saat beban mentok | M | Bilateral → split → RFESS → satu kaki, atau tempo/jeda, saat beban di batas library |
| 7 | Tes kekuatan berkala | S–M | Di minggu deload: maks push-up, tahan side plank, single-leg calf raise, milestone pull-up |
| 8 | Plyometric ringan (opsional) | M | Hanya bila kondisi shin splints nonaktif, progresi bertahap. Gerakan baru wajib lewat aturan PRD §3 (sumber, test, keputusan pemilik) |

Tren volume ST (set × rep × kg per pola) masuk **0.15 Insight**.

## Keputusan terbuka
1. Tujuan ST pemilik: mendukung lari, atau seimbang. Menentukan bobot #5 dan #7.
2. Apakah #8 masuk 0.14 atau ditunda.
3. Aturan concurrent yang ada (setelah ST kaki → lari maks Moderate) dipertahankan, dipersempit, atau diganti #3. Wajib disertai test.
