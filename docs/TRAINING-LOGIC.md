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
- [9. Setting: kondisi, zona, alat & gerakan](#9-setting-kondisi-zona-alat--gerakan)
- [10. Gerakan tambahan & media (0.9)](#10-gerakan-tambahan--media-09)

---

## 1. Aturan dasar & kondisi atlet

Default berasal dari [`config/athlete-profile.json`](../config/athlete-profile.json). Kondisi, zona lari, alat, dan pilihan gerakan bisa diubah di halaman **Setting** (disimpan di perangkat) — lihat [bagian 9](#9-setting-kondisi-zona-alat--gerakan).

**Aturan umum — selalu berlaku, apa pun kondisinya:**
- Hanya gerakan dari **movement library** yang dipilih di Setting.
- **RPE ≤ 7** di semua set.
- Beban tidak pernah melebihi batas library, dan (bila berat handle/batang sudah diisi) selalu bisa dirakit dari plat yang ada.
- Long run program naik ≤ 10% dan ≤ 2 km per minggu; peringatan bila km mingguan naik > 30%; distribusi 80/20.

**Aturan kondisi — aktif hanya bila kondisinya dinyalakan** (katalog lengkap & sumbernya di [bagian 9](#9-setting-kondisi-zona-alat--gerakan)):

| Kondisi default atlet | Konsekuensi di generator |
| --- | --- |
| Anterior pelvic tilt / hiperlordosis | **Spine-Friendly Protocol**: pola axial loading berat tanpa tumpuan (conventional deadlift, back squat, front squat, good morning, dll.) diblokir. **Dead Bug** (anti-ekstensi) wajib di Lower & Full Body. |
| Riwayat shin splints | **Tibialis Wall Raise + Eccentric Calf Raise wajib** di setiap sesi Lower & Full Body. Pengingat cadence & tanda bahaya nyeri tulang kering di lari. |
| Overpronation / crossover gait | Minimal satu gerakan **stabilitas panggul** (Lateral Band Walk / Clamshell) di Lower & Full Body. Pengingat cadence 175–180 SPM dan cue "rel kereta" di setiap workout lari. |
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
| Lower & Full Body | Gerakan wajib dari kondisi aktif (default: Tibialis Wall Raise + Eccentric Calf Raise + Dead Bug + stabilitas panggul). |
| Upper Pull | Selalu diawali progresi pull-up (Dead Hang, lalu Negative Pull-Up jika sudah diaktifkan) selagi grip masih segar. |
| Durasi | Jumlah gerakan dan set diatur supaya estimasi waktu ±2 menit dari target. Waktu yang tersisa diisi gerakan stabilitas/prehab. Bila gerakan wajib membuat sesi terlalu padat, aksesori boleh tinggal 1 set. Bila gerakan aktif di Setting terlalu sedikit untuk mengisi durasi, sesi ditandai **lebih pendek** (tidak diisi volume berlebih). |
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

### Saran terhadap sesi rencana (0.13.1)

Bila ada program aktif dan sesi lari hari ini, saran dihitung **terhadap rencana**, bukan terhadap pilihan di generator ([PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) §4.5). Karena basisnya tetap rencana, menerapkan saran tidak membuatnya turun lagi (tidak berantai). Hasilnya hanya berisi nilai yang lebih ringan dari rencana; tanpa rencana, aturan di atas berlaku persis seperti sebelumnya.

| Pemicu | Sesi rencana | Saran |
| --- | --- | --- |
| Readiness rendah | Quality | Turun satu level, durasi sama |
| Readiness rendah | Easy / recovery | Tidak ada (easy tidak diturunkan) |
| Readiness rendah | Long run | ±75% jarak rencana (dibulatkan 0,5 km), seluruhnya pace easy |
| 80/20 terlampaui | Quality | Easy |
| Kenaikan km > 30% | Lari 30/45/60' | Maksimal 30' |
| Kenaikan km > 30% | Long run | Ditahan di jarak long run minggu lalu bila lebih pendek |
| Setelah ST kaki | Quality High | Maksimal Moderate |
| Apa pun | Lomba | Tidak ada saran |

Beberapa pemicu sekaligus → yang paling ringan. Kartu saran di Profil menulis `Rencana: Tempo 45'. Saran: Easy 30'.` dengan alasan di dropdown; **Terapkan** membuka generator dengan versi yang diturunkan, atau kartu long run dengan jarak yang dipendekkan. Strip saran di Generator Lari (bila dibuka dari program) memakai aturan yang sama, dan tombol **Gunakan** hanya menurunkan isian saat ini.

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

### Kepatuhan program (0.13.0)

Kode: [`lib/program/compliance.ts`](../lib/program/compliance.ts), [`lib/program/sessions.ts`](../lib/program/sessions.ts). Spesifikasi: [PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) §3–§4.1.

| Aturan | Detail |
| --- | --- |
| Sesi rencana | Setiap sesi punya id `{programId}:{minggu}:{hari}:{jenis}`; `programId` = jarak lomba + Senin mulai. Sesi ST mengikuti jadwal di atas: Senin Lower/Full & Rabu Upper, minggu taper & lomba hanya Rabu Upper ringan |
| Jendela | Aktivitas di tanggal rencana ±1 hari (WIB). Satu aktivitas untuk satu sesi; pasangan diurutkan menurut selisih hari lalu kecocokan jenis. Lari lain di hari yang sama dengan aktivitas utama dijumlah |
| Selesai | Jenis cocok dan durasi **atau** jarak ≥ 80% rencana (D2). Long run & lomba memakai jarak. Aktivitas tanpa durasi & jarak (salinan Strava kosong) dianggap memenuhi karena tidak terukur |
| Sebagian | Ada aktivitas tapi < 80%, atau quality (selain strides/sharpener ringan) dikerjakan tanpa lari berat |
| Lebih berat | Easy/recovery yang aktivitasnya tergolong berat (`isHardRun`, ambang yang sama dengan saran): tetap selesai, diberi catatan, dan sudah ikut hitungan 80/20 |
| Terlewat | Tanpa aktivitas setelah tanggal + 1 hari. Kemarin tanpa aktivitas masih "bisa hari ini" |
| ST | Selesai bila ada log ST lokal atau aktivitas strength intervals.icu di tanggal ±1 hari. Berat ringan ST dinilai di 0.14 (session-RPE) |
| Override | `skip` → dilewati (tidak dicocokkan); `move` → dinilai di tanggal baru. Tidak pernah menambah volume minggu lain (D5) |
| Long run awal | Lari terjauh 30 hari **sebelum program mulai**, supaya target long run minggu yang sudah lewat tidak bergeser |

Referensi: Daniels J. (2014). *Daniels' Running Formula* (3rd ed.), Human Kinetics, untuk jenis sesi per fase yang dicocokkan.

### Sesi rencana → generator (0.13.1)

Kode: [`lib/program/to-generator.ts`](../lib/program/to-generator.ts). Spesifikasi: [PROGRAM-HIDUP.md](PROGRAM-HIDUP.md) §4.4, D4. Tombol **Kerjakan sesi hari ini** di Program › Minggu ini dan ringkasan Profil membuka sesi hari ini yang belum selesai atau dilewati (lari didahulukan).

| Sesi | Tujuan |
| --- | --- |
| Easy / recovery | Lari Easy, menit dibulatkan ke 30/45/60 terdekat (seri → yang lebih pendek) |
| Quality Base: Fartlek | Moderate |
| Quality Build: Tempo | Moderate, pola tempo |
| Quality cutback/taper: Easy + strides | Easy 30' |
| Quality Peak 5K/10K: Interval | High |
| Quality Peak FM: Norwegian 4×4 | High, pola 4×4, minimal 45' |
| Quality Peak HM: Race pace 3×2 km · minggu lomba: Sharpener | Kartu sesi program |
| Long run · lomba | Kartu sesi program |
| ST Senin | Strength Lower 45' |
| ST Rabu | Strength Upper Pull (minggu ganjil) / Upper Push (genap) 45'; taper & minggu lomba Easy |

- **Durasi quality** tanpa menit tertulis = km × 7,5 menit (termasuk pemanasan & pendinginan), lalu dibulatkan. Judul yang tidak dikenali menjadi kartu, tidak pernah dipaksa masuk generator.
- **Isian generator** lewat query (`/run?src=program&w=6&k=quality&d=45&lvl=moderate&p=tempo&t=Tempo`). Nilai yang tidak dikenal dibuang, jadi query yang diubah tidak bisa menyuntik isi. Isian tetap bisa diubah; chip `DARI PROGRAM · MINGGU N` tampil selama isian sama dengan rencana (atau dengan versi saran, ditambah `· DISESUAIKAN SARAN`).
- **Pola rencana** (`RunInput.pattern`, opsional) hanya dipakai selama isian sama dengan rencana. Generator tetap memanggil `rng.pick` yang sama, sehingga tanpa `pattern` keluarannya identik dengan sebelum 0.13.1 (dijaga test hash `run-baseline`). Pola yang tidak cocok dengan level diabaikan; 15/15 tetap dilarang bila Achilles aktif.
- **Kartu sesi program**: jarak, detail rencana, cue kondisi aktif (cadence, rel kereta, catatan kondisi), dan teks salin format Copy Set, misalnya `Run [14 km, Pace 7:20–8:43]`. Long run FM dengan 3 km race pace dipecah (km − 3 easy, lalu 3 km race pace). Long run yang dipendekkan saran menampilkan jarak baru dan jarak rencana.
- **Quality spesifik lomba yang diturunkan saran** dikerjakan sebagai lari biasa di generator dengan durasi rencana (Race pace 3×2 km = 60', Sharpener = 30').

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

## 9. Setting: kondisi, zona, alat & gerakan

Kode: [`lib/conditions.ts`](../lib/conditions.ts), [`lib/run-zones.ts`](../lib/run-zones.ts), [`lib/equipment.ts`](../lib/equipment.ts), [`lib/athlete-settings.ts`](../lib/athlete-settings.ts). Halaman **Setting**.

### Katalog kondisi & batasan

Kondisi dipilih dari katalog (bukan teks bebas), supaya setiap kondisi punya aturan yang jelas dan teruji. Catatan teks bebas tetap bisa ditambahkan, tapi hanya tampil di catatan workout.

| Kondisi | Aturan ST | Aturan lari | Sumber |
| --- | --- | --- | --- |
| Anterior pelvic tilt / hiperlordosis | Spine-Friendly; Dead Bug wajib (Lower/Full) | — | McGill, *Low Back Disorders* (2016); NSCA Essentials (2016) |
| Shin splints (MTSS) | Tibialis Wall Raise + Eccentric Calf Raise wajib | Cue cadence; stop bila nyeri tulang kering | Winters 2013 (Sports Med); Nielsen 2014 (JOSPT); Heiderscheit 2011 (MSSE) |
| Overpronation / crossover gait | Stabilitas panggul wajib | Cue cadence + "rel kereta" | Willy & Davis 2011 (JOSPT); Meardon 2012 (Sports Biomech) |
| Jeda sebelum MCU | Catatan jeda 24–48 jam | — | Pettersson 2008 (Br J Clin Pharmacol) |
| Nyeri punggung bawah | Spine-Friendly; tanpa Barbell Squat; Dead Bug wajib | — | NICE NG59 (2016); Hayden 2021 (Cochrane) |
| Nyeri lutut depan (PFP) | Stabilitas panggul wajib; pantau nyeri ≤ 3/10 | Cue cadence; kurangi turunan | Willy 2019 (JOSPT CPG); Crossley 2016 (BJSM) |
| IT Band Syndrome | Stabilitas panggul wajib | Cue cadence + anti-crossover; hindari turunan panjang | Fredericson 2000 (Clin J Sport Med); Meardon 2012 |
| Tendinopati Achilles | Eccentric Calf Raise wajib | High 45/60 selalu 4×4 (tanpa sprint 15/15); nyeri ≤ 5/10 | Alfredson 1998 (AJSM); Silbernagel 2007 (AJSM) |
| Plantar fasciitis | Eccentric Calf Raise wajib | Catatan nyeri pagi & peregangan betis | Martin 2014 (JOSPT CPG); Rathleff 2015 (Scand J Med Sci Sports) |
| Nyeri bahu (subacromial) | Tanpa Seated Overhead Press, Overhead Triceps Extension, DB Floor Pullover | — | Diercks 2014 (Acta Orthop); Littlewood 2012 (Physiotherapy) |

Gerakan yang diwajibkan kondisi aktif dikunci terpilih di Movement library. Bila gerakan wajib tidak tersedia (mis. tidak punya band), Setting menampilkan peringatan dan validator hanya menagih aturan yang bisa dipenuhi.

### Zona lari (VDOT Daniels)

Pace bisa diisi manual per zona, atau dihitung dari hasil lomba/time trial dengan rumus **Daniels & Gilbert**:

- VO2(v) = −4,60 + 0,182258·v + 0,000104·v² (v dalam m/menit)
- %VO2max(t) = 0,8 + 0,1894393·e^(−0,012778·t) + 0,2989558·e^(−0,1932605·t) (t dalam menit)
- VDOT = VO2(v) ÷ %VO2max(t)

| Zona | Intensitas | Dasar |
| --- | --- | --- |
| Easy / Z2 | 59–74% VDOT | Daniels: Easy |
| Tempo | 83–88% VDOT | Daniels: Threshold |
| Interval (mini, 15/15, 30/30) | 95–100% VDOT | Daniels: Interval |
| Norwegian 4×4 | 88–92% VDOT | Helgerud 2007: 90–95% HRmax, di antara Threshold & Interval |

Contoh: 5K 30:40 → VDOT ±30 → tempo ±6:24–6:42/km (sesuai tabel Daniels).

### Alat & beban

- Setiap gerakan punya kebutuhan alat (mis. Seated Overhead Press = dumbbell + kursi; Clamshell & Lateral Band Walk = band; Dead Hang = pull-up bar), mengikuti deskripsi teknik di NSCA *Exercise Technique Manual for Resistance Training* (2016). Dinding & lantai dianggap selalu ada. Clamshell tetap sah tanpa band (progresi bodyweight).
- Setelah berat handle dumbbell / batang barbell diisi, beban yang diresepkan **hanya dari kombinasi yang bisa dirakit**: plat dipasang berpasangan (kiri–kanan), sepasang dumbbell butuh dua kali jumlah plat, dan plat kecil boleh dipegang langsung. Kombinasi tetap dibatasi rentang movement library.
- Progresi beban naik/turun ke beban **berikutnya yang bisa dirakit**, bukan sekadar +1/0,5/0,25 kg.
- Gerakan yang rentang bebannya tidak bisa dirakit sama sekali otomatis tidak dipakai, dengan alasan yang tampil di Setting.

Referensi tambahan bagian ini:
- Daniels, J. & Gilbert, J. (1979). *Oxygen Power: Performance Tables for Distance Runners*. Rumus VDOT.
- Willy RW dkk. (2019). Patellofemoral Pain: Clinical Practice Guidelines. *JOSPT* 49(9) ([doi](https://doi.org/10.2519/jospt.2019.0302)).
- Crossley KM dkk. (2016). Patellofemoral pain consensus statement. *Br J Sports Med* 50(14) ([doi](https://doi.org/10.1136/bjsports-2016-096384)).
- Fredericson M dkk. (2000). Hip abductor weakness in distance runners with ITBS. *Clin J Sport Med* 10(3) ([doi](https://doi.org/10.1097/00042752-200007000-00004)).
- Meardon SA dkk. (2012). Step width alters iliotibial band strain during running. *Sports Biomech* 11(4) ([doi](https://doi.org/10.1080/14763141.2012.699547)).
- Willy RW & Davis IS (2011). Hip-strengthening program & running mechanics. *JOSPT* 41(9) ([doi](https://doi.org/10.2519/jospt.2011.3470)).
- Winters M dkk. (2013). Treatment of medial tibial stress syndrome. *Sports Med* 43(12) ([doi](https://doi.org/10.1007/s40279-013-0087-0)).
- Alfredson H dkk. (1998). Heavy-load eccentric calf training for Achilles tendinosis. *Am J Sports Med* 26(3) ([doi](https://doi.org/10.1177/03635465980260030301)).
- Silbernagel KG dkk. (2007). Pain-monitoring model in Achilles tendinopathy. *Am J Sports Med* 35(6) ([doi](https://doi.org/10.1177/0363546506298279)).
- Martin RL dkk. (2014). Heel pain—plantar fasciitis CPG. *JOSPT* 44(11) ([doi](https://doi.org/10.2519/jospt.2014.0303)).
- Rathleff MS dkk. (2015). High-load strength training for plantar fasciitis. *Scand J Med Sci Sports* 25(3) ([doi](https://doi.org/10.1111/sms.12313)).
- NICE NG59 (2016). Low back pain and sciatica in over 16s ([tautan](https://www.nice.org.uk/guidance/ng59)).
- Hayden JA dkk. (2021). Exercise therapy for chronic low back pain. *Cochrane* ([doi](https://doi.org/10.1002/14651858.CD009790.pub2)).
- Diercks R dkk. (2014). Guideline for subacromial pain syndrome. *Acta Orthop* 85(3) ([doi](https://doi.org/10.3109/17453674.2014.920991)).
- Littlewood C dkk. (2012). Exercise for rotator cuff tendinopathy. *Physiotherapy* 98(2) ([doi](https://doi.org/10.1016/j.physio.2011.08.002)).
- Pettersson J dkk. (2008). Muscular exercise can cause highly pathological liver function tests. *Br J Clin Pharmacol* 65(2) ([doi](https://doi.org/10.1111/j.1365-2125.2007.03001.x)).
- McGill S. (2016). *Low Back Disorders* (ed. 3). Human Kinetics.
- NSCA (2016). *Exercise Technique Manual for Resistance Training* (ed. 3). Human Kinetics.

## 10. Gerakan tambahan & media (0.9)

Kode: [`lib/movements/media.ts`](../lib/movements/media.ts), [`lib/generator/meta.ts`](../lib/generator/meta.ts). Usulan & alasan: [`movement-library-proposal.md`](movement-library-proposal.md). Audit gambar: [`movement-media-audit.md`](movement-media-audit.md).

| Aturan | Detail |
| --- | --- |
| Stabilitas panggul | Dipenuhi oleh Lateral Band Walk, Clamshell, **Side Plank**, atau **Standing Band Hip Abduction** (aktivasi gluteus medius tinggi — Ekstrom 2007; Distefano 2009). |
| Prehab tungkai berputar | Lower/Full 45'/60' mendapat satu prehab tungkai tambahan (Tibialis Wall Raise / Eccentric Calf Raise / **Seated Single-Leg Calf Raise** untuk soleus — Dorn 2012). |
| Prehab bahu berputar | Upper Push/Pull 45'/60' mendapat satu prehab bahu (**DB Scaption** / **Band External Rotation** — Reinold 2004). Pengisi sisa waktu juga mengutamakan prehab sesuai bagian tubuh sesi. |
| ★ baru | Rear-Foot-Elevated Split Squat, DB Step-Up, dan DB Plié Squat masuk daftar multi-joint, tetapi baru boleh jadi ★ di blok yang dimulai **setelah** tanggal ditambahkan (`ANCHOR_SINCE`), supaya ★ & progresi blok yang berjalan tidak berubah. Mode bebas: langsung boleh. |
| Titik tambat band | Band Reverse Fly, Band External Rotation, Standing Band Hip Abduction, dan Seated Band Hamstring Curl butuh band + titik tambat (toggle di Setting › Alat). |
| Tahan per sisi | Side Plank dihitung 2× durasi untuk estimasi waktu dan ditampilkan "/sisi". |
| Kondisi | Gerakan baru tidak dilarang kondisi mana pun; batasannya berupa catatan teknik di detail gerakan (mis. PFP → batasi kedalaman split squat/step-up/plié; nyeri bahu → batasi side plank/plank/scaption). |

Gambar hanya dari free-exercise-db (Unlicense) — tidak memakai gambar AI atau sumber lain. Gambar yang sedikit berbeda dari versi kita (🟡 yang disetujui) diberi catatan di detail gerakan.

Referensi tambahan:
- Ekstrom RA dkk. (2007). EMG of core trunk, hip, and thigh muscles during 9 rehabilitation exercises. *JOSPT* 37(12) ([doi](https://doi.org/10.2519/jospt.2007.2471)).
- Distefano LJ dkk. (2009). Gluteal muscle activation during common therapeutic exercises. *JOSPT* 39(7) ([doi](https://doi.org/10.2519/jospt.2009.2796)).
- Dorn TW dkk. (2012). Muscular strategy shift in human running. *J Exp Biol* 215(11) ([doi](https://doi.org/10.1242/jeb.075051)).
- Reinold MM dkk. (2004). EMG of the rotator cuff and deltoid during shoulder external rotation exercises. *JOSPT* 34(7) ([doi](https://doi.org/10.2519/jospt.2004.34.7.385)).

## 11. Strength tanpa alat (0.11.2)

Kode: [`lib/athlete-settings.ts`](../lib/athlete-settings.ts) (`resolveMovement`, `sessionCoverage`), [`components/generator/StrengthGenerator.tsx`](../components/generator/StrengthGenerator.tsx). Test: [`__tests__/neutral-profile.test.ts`](../__tests__/neutral-profile.test.ts), [`__tests__/settings.test.ts`](../__tests__/settings.test.ts).

Temuan (2026-10-22): dengan profil netral tanpa alat, generator tidak pernah error dan lolos aturan wajib, tetapi **Upper Push & Upper Pull tidak berisi gerakan dorong/tarik** (High-Incline Push-Up butuh kursi; semua gerakan tarik butuh pull-up bar, dumbbell, atau band + titik tambat), dan sesi 45'/60' jadi lebih pendek.

| Keputusan | Detail |
| --- | --- |
| Logika generator tidak diubah | Tidak ada aturan baru di `lib/generator`. Masalahnya kekurangan gerakan, bukan cara menyusun. |
| 5 gerakan cadangan tanpa alat | Upper Push: **Push-Up**, **Knee Push-Up**, **Wall Push-Up** (progresi Wall → Knee → Push-Up). Upper Pull: **Prone Y-T-W Raise**, **Prone Reverse Snow Angel**. Kebutuhan alat `[]`, `fallback: true`. |
| Hanya cadangan | Gerakan cadangan otomatis aktif **hanya bila** kategorinya tidak punya gerakan non-cadangan yang bisa dipakai. Profil yang punya alat tidak berubah (★ & rotasi tetap); pengguna boleh mencentangnya manual di Setting › Gerakan. |
| ★ | Push-Up multi-joint, `ANCHOR_SINCE` 2026-10-22: tidak menggeser ★ blok yang sedang berjalan. Empat lainnya bukan ★. |
| Tanpa Superman | Superman (ekstensi lumbal tengkurap) sengaja tidak dipakai: bertentangan dengan prinsip Spine-Friendly (APT/hiperlordosis). Y-T-W & snow angel dilakukan dengan dada rendah dan glute aktif; gerak dari tulang belikat. |
| Tidak ada gerakan tarik sejati tanpa alat | Dataset free-exercise-db tidak punya tarik vertikal/horizontal tanpa bar/meja. Y-T-W & snow angel melatih punggung atas & bahu belakang, bukan pengganti row/pull-up. Pesan di Strength menyarankan alat yang dibutuhkan. |
| Pesan alat | Bila jenis sesi tidak punya satu pun gerakan utama kategorinya (Upper Push → upperPush, Upper Pull → upperPull, Lower/Full → lower), misalnya karena cadangan dimatikan: "{Jenis} belum bisa disusun dengan gerakan aktif", kombinasi alat minimal yang dibutuhkan, dan gerakan yang bisa diaktifkan. |
| Sesi lebih pendek | Bila gerakan aktif tidak cukup untuk mengisi durasi: catatan "Sesi lebih pendek dari {durasi}' karena gerakan aktif terbatas." Sesi tidak diisi gerakan berulang. |
| Gambar | Push-Up dari free-exercise-db (`Pushups`); empat lainnya tanpa padanan → placeholder "Gambar belum tersedia". |

Jaminan test: semua jenis ST × 3 durasi × 3 kesulitan × 25 seed × (blok 1, deload, blok 2, bebas) dengan profil netral → tidak error, lolos `validateStrength`, durasi ≤ target + 2', dan Upper Push/Pull selalu berisi ≥ 1 gerakan kategorinya.
