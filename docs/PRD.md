# PRD — Hybrid Athlete Dashboard

> Dokumen hidup: status produk, fitur yang sudah & belum ada, keterbatasan, dan roadmap.
> Perbarui setiap rilis (lihat [§9 Cara memperbarui dokumen ini](#9-cara-memperbarui-dokumen-ini)).

| | |
| --- | --- |
| **Versi saat ini** | 0.9.0 (2026-10-12) |
| **Status** | Dipakai harian oleh pemilik (single user), live di Vercel |
| **Live** | https://hybrid-athlete-dashboard.vercel.app |
| **Repo** | https://github.com/khaliladha11/hybrid-athlete-dashboard |
| **Kualitas** | 8 file test, 136 unit test lolos · build produksi lolos |
| **Dokumen terkait** | [README](../README.md) · [CHANGELOG](../CHANGELOG.md) · [TRAINING-LOGIC](TRAINING-LOGIC.md) · [ARCHITECTURE](ARCHITECTURE.md) |

**Legenda status:** ✅ Selesai · 🟡 Sebagian / ada keterbatasan · ⬜ Belum dibuat · 💡 Ide

---

## Daftar isi

1. [Ringkasan produk](#1-ringkasan-produk)
2. [Pengguna & masalah](#2-pengguna--masalah)
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
- mencatat sesi ST dan **menaikkan beban secara otomatis**.

**Visi jangka panjang:** satu aplikasi yang menjawab "hari ini latihan apa, seberapa berat, dan apakah aku di jalur yang benar menuju target?" tanpa harus membuka banyak aplikasi.

## 2. Pengguna & masalah

**Pengguna utama:** satu atlet (pemilik), 23 tahun, pekerja kantoran, hybrid athlete dengan target Sub-30 5K, Sub-1h 10K, Sub-3h HM.

| Masalah | Jawaban di aplikasi |
| --- | --- |
| Program generik tidak memperhitungkan anterior pelvic tilt, shin splints, dan overpronation | Aturan cedera dikodekan sebagai modul TypeScript yang diuji (Spine-Friendly, prehab wajib, stabilitas panggul, target cadence) |
| Alat terbatas (dumbbell modular, band, pull-up bar) | Generator hanya memakai gerakan yang bisa dilakukan dengan alat yang ada, dan beban yang bisa dirakit dari plat |
| Kondisi tubuh berubah (cedera baru, sembuh) | Kondisi diaktifkan/nonaktifkan di Setting dari katalog berbasis riset |
| Bingung menyeimbangkan lari dan ST | Aturan concurrent training dan saran harian |
| Mudah terlalu semangat (km naik drastis, terlalu banyak sesi berat) | Peringatan 80/20 dan kenaikan km > 30% |
| Latihan monoton | Periodisasi blok 4 minggu, rotasi pola, tombol "Variasi lain" |
| Data tersebar (jam, intervals.icu, catatan) | Ringkasan, kalender, dan wellness dalam satu layar |

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

## 4. Status fitur per modul

### 4.1 Profil & data intervals.icu

| Fitur | Status | Catatan |
| --- | --- | --- |
| Header profil (nama, usia, gaya hidup, fokus) | ✅ | Dari `config/athlete-profile.json` |
| Target lomba | ✅ | Kondisi, zona, alat & movement library pindah ke Setting (0.8) |
| Wellness hari ini (HRV, resting HR, tidur, CTL/ATL/Form) | ✅ | Status ✓ data hari ini / ✕ data lama |
| Ringkasan 7 hari (km, pace, HR, long run, load, sesi) | ✅ | Plus distribusi 80/20 & tren km |
| Kalender aktivitas bulanan + detail per tanggal | 🟡 | Hanya bulan ini & bulan lalu (data yang diambil 2 bulan) |
| Detail aktivitas per interval / per km | ✅ | `/activity/[id]` |
| Edit profil dari dalam aplikasi | 🟡 | Kondisi, zona, alat, gerakan ✅ di Setting. Nama, target, dan tanggal blok masih di JSON |
| Grafik tren (CTL/ATL/Form, km mingguan, pace, cadence) | ⬜ | Lihat roadmap |

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
| Check-in subjektif harian (nyeri shin, pegal, mood, tidur) | ⬜ | Lihat roadmap |
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
| Mengirim workout ke kalender intervals.icu / jam | ⬜ | Lihat roadmap |

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
| Gambar teknik gerakan (awal/akhir) + detail cue & otot | 🟡 | 0.9: 35/40 gerakan bergambar; 5 tanpa padanan (Dead Hang, Negative Pull-Up, Scapular Retraction, Clamshell, Tibialis Wall Raise). Belum ada video |
| Toggle titik tambat band | ✅ | 0.9 |
| Timer istirahat antar set | ⬜ | |

### 4.5 Periodisasi & program target

| Fitur | Status | Catatan |
| --- | --- | --- |
| Blok 4 minggu (3 normal + 1 deload) | 🟡 | Tanggal mulai blok diatur manual di JSON |
| Toggle blok mingguan (mode bebas) | ✅ | |
| Program PB 5K (8 mg), PB 10K (10), HM (12), FM (16) | ✅ | Base → Build → Peak → Taper |
| Race pace dari target waktu, long run aman + cutback, peringatan | ✅ | |
| Salin rencana minggu ini | ✅ | |
| Program terhubung ke generator ("kerjakan sesi hari ini") | ⬜ | Program & generator masih terpisah |
| Kepatuhan program (rencana vs aktual dari intervals.icu) | ⬜ | |
| Prediksi waktu lomba dari performa terbaru | ⬜ | |

### 4.6 Log & progresi beban

| Fitur | Status | Catatan |
| --- | --- | --- |
| Catat beban/rep/detik/RPE untuk gerakan ★ | ✅ | |
| Progresi 2-for-2 (beban, detik tahan, band) | ✅ | Tidak melewati batas library |
| Riwayat & tren per gerakan (halaman Strength), hapus per entri | ✅ | Pindah dari halaman Log (0.8) |
| Ekspor/impor JSON (log + Setting + program + preferensi) | ✅ | Setting › Data & cadangan (0.8) |
| Progresi ke beban berikutnya yang bisa dirakit | ✅ | 0.8 |
| Sinkron antar perangkat | ⬜ | Masih `localStorage` |
| Milestone pull-up (band → negative → penuh) | ⬜ | |

### 4.7 Platform, UI & pengaturan

| Fitur | Status | Catatan |
| --- | --- | --- |
| PWA installable, full-screen, safe area | ✅ | |
| Design system (token semantik, oranye utama, sudut membulat) | ✅ | |
| Tema Sistem/Terang/Gelap tersimpan | ✅ | |
| Sistem warna intensitas (hijau/kuning/merah) & status (hijau/merah) | ✅ | |
| Navigasi 5 tab (Profil, Lari, Program, Strength, Setting) | ✅ | Log → Setting di 0.8; `/log` diarahkan ke Strength |
| Efek hover (bayangan tipis) di semua tombol | ✅ | Hanya perangkat dengan pointer |
| Mode offline (service worker) | ⬜ | Tanpa internet aplikasi tidak terbuka |
| Login / proteksi akses | ⬜ | **Prioritas**, lihat §6 |
| Notifikasi / pengingat latihan | ⬜ | |

### 4.8 Setting (0.8)

| Fitur | Status | Catatan |
| --- | --- | --- |
| Katalog 10 kondisi & batasan, toggle aktif/nonaktif, sumber per kondisi | ✅ | APT, shin splints, overpronation, MCU, punggung bawah, PFP, ITBS, Achilles, plantar fasciitis, bahu |
| Catatan kondisi teks bebas | ✅ | Tampil di workout, tidak mengubah generator |
| Zona pace Easy/Tempo/Interval/4×4: manual atau VDOT Daniels dari hasil lomba | ✅ | Default dari JSON, reset per zona |
| Alat: dumbbell, barbell, plat, band, pull-up bar, kursi, alat lain | ✅ | Daftar beban yang bisa dirakit tampil langsung |
| Pilihan movement library + alasan bila tidak tersedia | ✅ | Gerakan wajib kondisi dikunci |
| Tema & blok mingguan, Data & cadangan | ✅ | |
| Nav bagian sticky: smooth scroll, highlight kartu tujuan, scroll spy | ✅ | 0.8.1, menghormati reduced motion |
| Zona HR & RPE bisa diubah | ⬜ | Sekarang hanya pace |
| Edit nama, target lomba, tanggal mulai blok | ⬜ | |

## 5. Persyaratan non-fungsional

| Area | Target | Status |
| --- | --- | --- |
| Keamanan API key | Tidak pernah ke browser | ✅ |
| Privasi data | Hanya pemilik yang bisa melihat | 🟡 URL publik tanpa login |
| Mobile-first | Nyaman di layar 375px, area sentuh ≥ 44px | ✅ |
| Aksesibilitas | Kontras teks AA di kedua tema, fokus keyboard, reduced motion | ✅ |
| Keandalan logika | Semua aturan latihan diuji unit test | ✅ |
| Ketersediaan | Tetap jalan tanpa API key / saat intervals.icu error | ✅ |
| Offline | Bisa dibuka tanpa sinyal | ⬜ |
| Pengujian UI | Test komponen / end-to-end | ⬜ Hanya unit test logika |
| CI | Test & build otomatis tiap push/PR | ⬜ Hanya build Vercel |

## 6. Keterbatasan & utang teknis

Diurutkan dari yang paling berdampak.

1. **Belum ada login.** Siapa pun yang tahu URL Vercel bisa melihat data intervals.icu pemilik. Mitigasi cepat: aktifkan *Vercel → Settings → Deployment Protection*.
2. **Data di perangkat saja.** Setting, log ST, program, tema, dan toggle blok ada di `localStorage`. Hilang bila data browser dihapus, dan tidak sinkron antara HP dan laptop. Cadangan: ekspor JSON manual (kini mencakup semuanya). Makin penting sejak 0.8 karena Setting menyimpan lebih banyak data.
3. **Profil sebagian statis.** Nama, target lomba, dan tanggal mulai blok masih di JSON. Bagian yang dirender server (mis. header Profil) memakai nilai default, bukan Setting perangkat.
4. **Movement library hanya dari kurasi developer.** 0.9 menambah 13 gerakan, tetapi pengguna belum bisa menambah gerakan sendiri; alat lain (mis. kettlebell) baru dicatat. 5 gerakan belum punya gambar, dan celah anti-rotasi (Pallof, bird dog, suitcase carry) belum ada di sumber gambar. Kondisi di luar katalog hanya catatan.
5. **Program & generator belum terhubung.** Sesi di Program tidak bisa langsung dibuka di generator, dan aktivitas aktual belum dicocokkan dengan rencana.
6. **Ambang tetap.** HR lari berat (155), penurunan HRV (15%), dan kenaikan resting HR (5 bpm) belum dipersonalisasi.
7. **Kalender terbatas 2 bulan.** Hanya bulan ini dan bulan lalu yang diambil dari intervals.icu.
8. **Belum offline.** Belum ada service worker.
9. **Pengujian UI manual.** Belum ada test komponen/e2e maupun CI GitHub Actions.
10. **Screenshot dokumentasi** perlu diperbarui untuk Profil 0.7, Setting 0.8, dan detail gerakan 0.9.

## 7. Roadmap & saran pengembangan

Prioritas: **P0** = segera (risiko/fondasi) · **P1** = nilai besar berikutnya · **P2** = peningkatan · **P3** = nanti.
Ukuran: **S** ≈ < 1 hari · **M** ≈ 1–3 hari · **L** ≈ > 3 hari.

### Rilis berikutnya yang disarankan

| Usulan versi | Isi | Alasan |
| --- | --- | --- |
| **0.10 Aman & tersinkron** | Proteksi akses (PIN/passcode) + sinkron data ke database | Setting & log kini berharga; jangan hilang atau terbuka |
| **0.11 Program hidup** | Program ↔ generator, kepatuhan rencana vs aktual di kalender, prediksi waktu lomba | Program target jadi benar-benar dipakai harian |
| **0.12 Insight** | Grafik tren CTL/ATL/Form, km mingguan, pace & cadence; check-in subjektif harian | Melihat progres jangka panjang dan mencegah cedera |
| **1.0 Siap pakai penuh** | Offline, edit target & tanggal blok di aplikasi, kirim workout ke intervals.icu, CI + test e2e | Stabil dan mandiri tanpa edit kode |

> Catatan urutan (2026-10-11): "Edit profil di aplikasi" dimajukan ke 0.8 atas permintaan pemilik, disimpan di perangkat dulu. Proteksi akses & sinkron database bergeser ke 0.10.

### Backlog lengkap

| Prioritas | Fitur | Ukuran | Nilai untuk atlet |
| --- | --- | --- | --- |
| P0 | **Proteksi akses** (passcode di middleware atau Vercel Authentication) | S | Data kesehatan tidak terbuka untuk umum |
| P0 | **Sinkron data** (Upstash Redis / Supabase) untuk log, program, preferensi | M | Data aman dan sama di semua perangkat |
| P0 | **CI GitHub Actions** (typecheck, test, build tiap push) | S | Mencegah rilis rusak |
| P1 | **Gambar untuk 5 gerakan sisa** & gerakan anti-rotasi (sumber berlisensi bebas lain, atau foto sendiri) | M | Detail teknik lengkap untuk prehab wajib |
| P1 | **Program → generator**: tombol "Kerjakan sesi hari ini" yang mengisi generator lari | S | Satu tap dari rencana ke workout |
| P1 | **Kepatuhan program**: tandai sesi rencana ✓/✕ dari aktivitas intervals.icu, tampil di kalender | M | Tahu apakah masih di jalur |
| P1 | **Prediksi waktu lomba** (rumus Riegel dari lari terbaik terbaru) untuk mengecek target | S | Target realistis |
| P1 | **Check-in harian**: nyeri shin (0–10), pegal, kualitas tidur, mood → ikut ke saran | S | Sinyal dini shin splints yang tidak terlihat di HRV |
| P1 | **Grafik tren** CTL/ATL/Form & km mingguan | M | Melihat kebugaran dan kelelahan jangka panjang |
| P2 | **Kirim workout ke kalender intervals.icu** (lalu ke jam yang terhubung) | M | Workout langsung muncul di jam |
| P2 | **Edit sisa profil di aplikasi** (target lomba, tanggal mulai blok, zona HR/RPE) | S | Tanpa edit JSON sama sekali |
| P3 | Tampilkan kembali tab **Set Huawei** (pratinjau format set) | S | Disembunyikan sementara di 0.8 |
| P2 | **Ambang personal** (HR berat dari zona/LTHR, baseline HRV 30 hari) | S | Saran lebih akurat |
| P2 | **Mode offline** (service worker, cache workout terakhir) | M | Tetap bisa dibuka di gym tanpa sinyal |
| P2 | **Timer sesi ST** (istirahat antar set, hitung mundur tahan) | M | Tidak perlu aplikasi timer lain |
| P2 | **Milestone pull-up** & gerakan baru otomatis aktif saat siap (mis. negative pull-up) | S | Progres terlihat dan memotivasi |
| P2 | **Grafik cadence & pace easy run** | S | Memantau perbaikan crossover gait |
| P3 | Pengingat/notifikasi (web push) | L | Konsisten latihan |
| P3 | Video singkat per gerakan | M | Eksekusi lebih aman (gambar awal/akhir sudah ada sejak 0.9) |
| P3 | Multi-atlet / berbagi ke pelatih | L | Hanya bila dibutuhkan |
| P3 | Lari trail/treadmill & cuaca (panas → turunkan target pace) | M | Target realistis di cuaca tropis |

### Ide yang sengaja **tidak** dikerjakan (untuk sekarang)

- **AI chat bebas sebagai generator.** Aturan cedera harus deterministik dan teruji; AI boleh dipakai untuk penjelasan, bukan untuk meresepkan beban.
- **Akun & multi-user.** Belum perlu untuk satu atlet, dan menambah risiko privasi.

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

Saat mengusulkan fitur baru, tambahkan barisnya di backlog §7 dengan prioritas, ukuran, dan nilai untuk atlet, lalu pastikan tidak melanggar aturan di §3.
