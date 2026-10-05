# Logika Latihan

Dokumen ini menjelaskan **semua aturan** yang dipakai generator dan sistem saran, beserta dasar ilmiahnya. Setiap aturan WAJIB dijaga oleh validator dan unit test. Aturan-aturan ini tidak hanya ditulis di dokumentasi.

- [1. Aturan dasar (profil atlet)](#1-aturan-dasar-profil-atlet)
- [2. Generator lari](#2-generator-lari)
- [3. Generator strength training](#3-generator-strength-training)
- [4. Periodisasi & variasi](#4-periodisasi--variasi)
- [5. Saran hari ini](#5-saran-hari-ini)
- [6. Progresi beban](#6-progresi-beban)
- [7. Program target (5K / 10K / HM / FM)](#7-program-target-5k--10k--hm--fm)
- [8. Referensi](#8-referensi)

---

## 1. Aturan dasar (profil atlet)

Semua angka berasal dari [`config/athlete-profile.json`](../config/athlete-profile.json).

| Kondisi atlet | Konsekuensi di generator |
| --- | --- |
| Anterior pelvic tilt / hiperlordosis | **Spine-Friendly Protocol**: pola axial loading berat tanpa tumpuan (conventional deadlift, back squat, front squat, good morning, dll.) diblokir. Cue "rib cage turun, core aktif" di setiap sesi. |
| Riwayat shin splints | **Tibialis Wall Raise + Eccentric Calf Raise wajib** di setiap sesi Lower & Full Body. Peringatan bila km mingguan naik > 30%. |
| Overpronation / crossover gait | Minimal satu gerakan **stabilitas panggul** (Lateral Band Walk / Clamshell) di Lower & Full Body. Pengingat cadence 175–180 SPM dan cue "rel kereta" di setiap workout lari. |
| Home gym terbatas | Hanya gerakan dari **movement library**. Beban tidak pernah melebihi batas atas library. |
| Jeda sebelum MCU | Catatan jeda 24–48 jam dari latihan beban berat sebelum tes darah. |

**Zona HR:** zona di profil (Easy maks 160, Tempo 160–180) ditampilkan apa adanya. Generator memakai acuan yang lebih konservatif: **Easy < 140**, **Tempo 160–170**.

## 2. Generator lari

Kode: [`lib/generator/run.ts`](../lib/generator/run.ts). Durasi total selalu **tepat** sama dengan pilihan (30/45/60 menit).

| Level | Pola (dipilih acak dengan seed) | Target |
| --- | --- | --- |
| **Easy** | Continuous Z2 · Run-walk 4'/1' · Z2 + cadence drill (1' fokus cadence / 2' normal) | Pace easy, **HR < 140**, RPE 3–4 |
| **Moderate** | Tempo continuous · Tempo terputus (2–3 blok) · Cruise interval (jeda 1') · Progression run (Z2 → tempo tanpa jeda) | Pace 6:15–6:30/km, **HR 160–170**, RPE 6–7 |
| **High 30'** | Mini interval 1'/1', 2'/2', 3'/2', atau 30"/30". Jumlah repetisi dihitung supaya muat | Pace 5:15–5:35/km, RPE 7–8 |
| **High 45'/60'** | Norwegian 4×4 (4' kerja / 3' jog) · 15/15 (set 20 × 15" cepat / 15" jog, 3' jog antar set) | 4×4 @ 5:50/km · 15/15 @ pace mini interval |

**Target cadence personal:** generator membaca rata-rata cadence lari 14 hari terakhir dari intervals.icu. Jika di bawah 175 SPM, target sesi = rata-rata + 5% (maksimal 180). Jika sudah ≥ 175, pesannya "pertahankan". Cadence dari API yang tercatat per kaki (< 120) otomatis dikali 2.

**Format keluaran:**
- Teks list ringkas (tanpa tabel) untuk deskripsi Strava/catatan HP.
- Format "Set" ala Huawei Health, contohnya `Set 1: Run [4:00, Pace 5:50] & Rest [3:00] × 4`.

## 3. Generator strength training

Kode: [`lib/generator/strength.ts`](../lib/generator/strength.ts). Validator: [`lib/generator/validate.ts`](../lib/generator/validate.ts).

| Aturan | Detail |
| --- | --- |
| Intensitas | Easy RPE 5 · Moderate RPE 6 · High RPE 7. **RPE tidak pernah > 7.** |
| Beban | Easy = sepertiga bawah rentang library, Moderate = tengah, High = sepertiga atas. Tidak pernah melebihi batas atas. |
| Lower & Full Body | Wajib Tibialis Wall Raise + Eccentric Calf Raise + stabilitas panggul. |
| Upper Pull | Selalu diawali progresi pull-up (Dead Hang, lalu Negative Pull-Up jika sudah diaktifkan) selagi grip masih segar. |
| Durasi | Jumlah gerakan dan set diatur supaya estimasi waktu ±2 menit dari target. Waktu yang tersisa diisi gerakan stabilitas/prehab. |
| Urutan | Pemanasan (mobilitas) → aktivasi panggul → gerakan utama → aksesori → prehab → pendinginan. |

**Pembuat pola dan validator dipisah.** Setelah pola dibuat, sanitizer membuang gerakan yang tidak terdaftar atau terlarang, lalu meng-clamp RPE dan beban. Validator kemudian memeriksa semua aturan di atas. Bila ada pelanggaran, generator melempar error, dan test akan gagal.

## 4. Periodisasi & variasi

Kode: [`lib/generator/block.ts`](../lib/generator/block.ts).

**Blok 4 minggu** dihitung dari `training.blockStart`: minggu 1–3 normal, lalu minggu 4 deload.

| | Minggu normal | Minggu deload |
| --- | --- | --- |
| RPE ST | Sesuai level | Turun 1 (minimal 5) |
| Beban | Sesuai level | Turun satu tingkat |
| Set gerakan utama | Sesuai level | Dikurangi 1 (Moderate/High) |
| Progresi beban | Aktif | Ditunda |
| Lari | Normal | Catatan untuk menurunkan intensitas |

**Variasi sistematis, bukan acak:**
- **Gerakan utama ★** (multi-joint) **dikunci selama satu blok** supaya progres terukur, dan berganti otomatis saat blok baru dimulai.
- **Aksesori** berputar setiap kali **Variasi lain** ditekan.
- **Skema rep** berputar antar sesi (undulating): Volume 12–15, Standar 10–12, Tegangan 8–10. Easy tidak memakai Tegangan, dan High tidak memakai Volume.
- Tombol **Variasi lain** selalu menghasilkan workout yang berbeda dari yang sedang tampil.

## 5. Saran hari ini

Kode: [`lib/coach.ts`](../lib/coach.ts) dan [`lib/readiness.ts`](../lib/readiness.ts). Semua saran **non-blokir**. Tombol aksinya hanya pernah menurunkan pilihan, tidak pernah menaikkan.

| Aturan | Pemicu | Saran |
| --- | --- | --- |
| **Readiness** | HRV < 85% rata-rata 7 hari · resting HR ≥ rata-rata + 5 bpm · long run (≥ 12 km / ≥ 75') atau sesi berat kemarin | Turun satu level, sekali saja (tidak berantai) |
| **80/20** | ≥ 2 lari berat dalam 7 hari. Lari dianggap berat bila HR ≥ 155, namanya berisi tempo/interval/4×4, atau pace ≤ 6:30/km tanpa HR | Lari: Easy |
| **Progresi jarak** | km lari 7 hari naik > 30% dibanding 7 hari sebelumnya (basis ≥ 5 km) | Lari: 30' + sisa km aman |
| **Setelah ST kaki** | Sesi ST bernama Lower/Full/Leg/Squat/… kemarin atau hari ini | Lari: maksimal Moderate |
| **Setelah lari berat** | Lari berat atau long run kemarin atau hari ini | ST: Upper Pull/Push |

Kartu "7 hari terakhir" di halaman Profil juga menampilkan bar distribusi easy/berat (dengan garis acuan 80%) dan persentase perubahan km.

## 6. Progresi beban

Kode: [`lib/progression.ts`](../lib/progression.ts). Penyimpanan: [`lib/training-log.ts`](../lib/training-log.ts).

Setelah sesi ST, atlet mencatat **beban, rep set terakhir (atau detik), dan RPE** untuk setiap gerakan ★. Rekomendasi sesi berikutnya:

| Kondisi sesi terakhir | Rekomendasi |
| --- | --- |
| 2 sesi berturut-turut mencapai batas atas rep dengan RPE ≤ target | **Naik** satu langkah (1 kg untuk rentang ≥ 10 kg, 0,5 kg untuk ≥ 3 kg, 0,25 kg untuk rentang di bawahnya) |
| Baru 1 sesi tuntas | Tahan ("1/2 sesi tuntas") |
| RPE di atas target | Tahan |
| RPE > target + 1 | **Turun** satu langkah |
| Sudah di batas atas library | Tahan. Progresi dilanjutkan lewat tempo lebih lambat. |
| Gerakan tahan (Dead Hang, Farmer's Hold) | +5 detik, maksimal 60 |
| Gerakan band | Naik ke band berikutnya (Light → Medium) |
| Minggu deload | Progresi ditunda. Sesi deload tidak dipakai sebagai basis. |

Rekomendasi diterapkan ke workout lalu **tetap di-clamp ke rentang library**, sehingga aturan beban maksimal tidak pernah bisa dilanggar. Data log disimpan di localStorage perangkat dan bisa diekspor/diimpor sebagai JSON.

## 7. Program target (5K / 10K / HM / FM)

Kode: [`lib/program.ts`](../lib/program.ts). Halaman **Program**.

| Target | Lama | Taper | Long run puncak | Quality fase Peak |
| --- | --- | --- | --- | --- |
| PB 5K | 8 minggu | 1 minggu | 10 km | Interval 5×800 m @ pace mini interval |
| PB 10K | 10 minggu | 1 minggu | 14 km | Interval 4×1 km @ pace mini interval |
| Half Marathon | 12 minggu | 2 minggu | 18 km | Race pace 3×2 km |
| Full Marathon | 16 minggu | 3 minggu | 30 km | Norwegian 4×4 + long run dengan 3 km terakhir di race pace |

- **Fase:** Base (fartlek ringan) → Build (tempo) → Peak (spesifik lomba) → Taper (strides, volume turun). Minggu terakhir adalah minggu lomba dengan sesi sharpener.
- **Long run:** naik ≤ 10% **dan** ≤ 2 km per minggu. Setiap minggu ke-4 ada cutback ±75% tanpa sesi berat. Long run awal diambil dari long run terjauh 30 hari terakhir di intervals.icu (maksimal 75% puncak).
- **Pace:** zona easy/tempo/interval dari profil, sedangkan race pace = target waktu ÷ jarak. Target default diambil dari `targets.raceTargets` di profil (Sub-30m 5K, Sub-1h 10K, Sub-3h HM).
- **Jadwal:** Selasa quality, Kamis easy, (Jumat recovery bila 4×/minggu), Minggu long run. ST di Senin (Lower/Full) & Rabu (Upper), tidak sehari sebelum quality atau long run.
- **Peringatan (non-blokir):**
  - FM dengan long run terjauh < 12 km.
  - Target pace jauh lebih cepat dari zona tempo.
  - Long run puncak > 55% volume mingguan pada 3 lari/minggu (sarankan 4×).

**Mode bebas:** program blok mingguan (bagian 4) bisa dimatikan lewat toggle. Saat mati, tidak ada minggu deload, dan gerakan utama ★ dipilih per sesi (tetap multi-joint dan tetap dicatat untuk progresi beban).

## 8. Referensi

Buku:
- Bompa, T. O. & Buzzichelli, C. A. — *Periodization: Theory and Methodology of Training* (ed. 6). Human Kinetics. Dasar struktur blok dan deload.
- NSCA — *Essentials of Strength Training and Conditioning* (ed. 5). Human Kinetics. Gerakan multi-joint sebagai fondasi, urutan latihan, dan progresi beban "2-for-2".
- Zatsiorsky, V. M., Kraemer, W. J. & Fry, A. C. — *Science and Practice of Strength Training* (ed. 3). Human Kinetics. Prinsip bahwa tidak ada satu program untuk semua orang.
- Daniels, J. — *Daniels' Running Formula* (ed. 4). Human Kinetics. Kategori pace (Easy, Threshold, Interval) sebagai kerangka perpustakaan pola lari.

Studi:
- Helgerud dkk. (2007). Aerobic high-intensity intervals improve VO₂max more than moderate training. *Med Sci Sports Exerc*, 39(4), 665–671. Dasar Norwegian 4×4 & 15/15.
- Seiler, S. Distribusi intensitas polarisasi pada atlet endurance ([Frontiers in Physiology](https://www.frontiersin.org/articles/10.3389/fphys.2015.00295/full)). Dasar aturan 80/20.
- Nielsen dkk. (2014). Excessive progression in weekly running distance and risk of running-related injuries. *JOSPT* ([tautan](https://www.jospt.org/doi/10.2519/jospt.2014.5164)). Kenaikan > 30% dikaitkan dengan shin splints dan cedera gluteus medius.
- Heiderscheit dkk. (2011). Effects of step rate manipulation on joint mechanics during running. *Med Sci Sports Exerc* ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3387288)). Cadence +5–10% mengurangi beban lutut/pinggul.
- Wilson dkk. (2012). Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. *JSCR*. Lari mengganggu adaptasi kekuatan, sehingga sesi berat perlu diberi jarak.
- Kassiano dkk. (2022). Does varying resistance exercises promote superior muscle hypertrophy and strength gains? *JSCR*. Variasi sistematis lebih baik daripada acak.
- Moesgaard dkk. (2022). Effects of periodization on strength and muscle hypertrophy in volume-equated resistance training programs. *Sports Medicine* ([PubMed](https://pubmed.ncbi.nlm.nih.gov/35044672/)). Dasar rotasi skema rep (undulating).
- Zourdos dkk. (2016). Novel resistance training–specific RPE scale measuring repetitions in reserve. *JSCR* ([PubMed](https://pubmed.ncbi.nlm.nih.gov/26049792/)). RPE 7 = sisakan 3 repetisi.
- Lauersen dkk. (2014). The effectiveness of exercise interventions to prevent sports injuries. *Br J Sports Med* ([PubMed](https://pubmed.ncbi.nlm.nih.gov/24100287/)). Latihan kekuatan menurunkan risiko cedera, sehingga prehab dijadikan wajib.
