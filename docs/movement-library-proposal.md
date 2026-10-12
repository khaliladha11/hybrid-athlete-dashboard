# Usulan gerakan baru untuk movement library (Fase 2, fitur 0.9)

> Status: **disetujui 2026-10-12 — semua 13 gerakan masuk** (rilis 0.9.0), termasuk toggle titik tambat band, perluasan syarat stabilitas panggul, dan ★ baru mulai blok berikutnya.

- **Sumber:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). Gambar setiap usulan sudah dicek (posisi awal & akhir).
- **Disusun:** 2026-10-12, mengikuti aturan PRD §3 dan katalog kondisi di `lib/conditions.ts`.

## Cara seleksi

1. **876** gerakan di database.
2. Filter alat (`dumbbell`, `barbell`, `bands`, `body only`) + level (`beginner`/`intermediate`) + kategori `strength` → **269**.
3. Buang yang butuh mesin, cable, kettlebell, bola, rack, incline/decline bench, atau EZ/trap bar, serta semua lompatan/plyometric (shin splints), good morning, hyperextension/superman (APT), dan press di belakang leher.
4. Seleksi manual berdasarkan celah di library sekarang: **stabilitas panggul/gluteus medius**, **core**, **punggung atas & bahu**, **lower unilateral (spesifik lari)**, dan **betis/soleus**.

Rentang beban di bawah konservatif dan bisa dirakit dari plat yang ada (4×1,25 · 4×1,5 · 4×2 kg). Contoh: dengan handle 2 kg, sepasang dumbbell bisa 4,5 / 5 / 6 / 7,5 kg per tangan. Semua tetap RPE ≤ 7.

## Ringkasan

| # | Nama usulan | ID free-exercise-db | Kategori | Mengisi celah |
| --- | --- | --- | --- | --- |
| 1 | Side Plank | `Side_Bridge` | Core | Gluteus medius + core lateral |
| 2 | Standing Band Hip Abduction | `Band_Hip_Adductions` | Stabilitas | Gluteus medius |
| 3 | Single-Leg Glute Bridge | `Single_Leg_Glute_Bridge` | Lower | Kontrol panggul satu kaki |
| 4 | Rear-Foot-Elevated Split Squat | `Split_Squat_with_Dumbbells` | Lower | Kekuatan unilateral |
| 5 | DB Step-Up | `Dumbbell_Step_Ups` | Lower | Kekuatan unilateral |
| 6 | DB Plié Squat | `Plie_Dumbbell_Squat` | Lower | Squat tanpa beban di punggung |
| 7 | Seated Single-Leg Calf Raise | `Dumbbell_Seated_One-Leg_Calf_Raise` | Prehab | Soleus |
| 8 | Plank | `Plank` | Core | Anti-ekstensi |
| 9 | Band Reverse Fly | `Back_Flyes_-_With_Bands` | Upper Pull | Punggung atas tanpa palang |
| 10 | DB Scaption | `Dumbbell_Scaption` | Prehab (bahu) | Stabilisator scapula |
| 11 | Band External Rotation | `External_Rotation_with_Band` | Prehab (bahu) | Rotator cuff |
| 12 | Seated Band Hamstring Curl | `Seated_Band_Hamstring_Curl` | Lower | Hamstring |
| 13 | Quadruped Hip Circles | `Hip_Circles_prone` | Pemanasan | Mobilitas pinggul |

## Detail usulan

### 1. Side Plank — `Side_Bridge`
- **Otot utama:** perut (oblique), gluteus medius · sekunder: bahu
- **Alat:** tanpa alat (`body only`) · **Kategori:** Core (tahan detik)
- **Beban:** Bodyweight. Tahan 20–40 detik per sisi; versi lutut di lantai untuk awal.
- **Kondisi:** ⚠ nyeri bahu → batasi (bertumpu di siku). Direkomendasikan untuk nyeri punggung bawah (bagian dari "big 3" McGill).
- **Kenapa:** side bridge termasuk latihan dengan aktivasi gluteus medius tertinggi (Ekstrom 2007), dan sekaligus melatih core lateral untuk menahan panggul turun saat fase satu kaki di lari.
- **Catatan data:** entri ini tidak punya teks instruksi di database; cue akan ditulis sendiri.

### 2. Standing Band Hip Abduction — `Band_Hip_Adductions`
- **Otot utama:** gluteus medius & minimus (abduktor)
- **Alat:** band + titik tambat (kaki meja/pintu) · **Kategori:** Stabilitas & core
- **Beban:** Light/Medium Band, 12–15 rep per sisi.
- **Kondisi:** tidak ada larangan. Direkomendasikan untuk overpronation/crossover gait, PFP, dan ITBS.
- **Kenapa:** penguatan abduktor pinggul adalah inti rehabilitasi PFP/ITBS (Fredericson 2000; Willy 2019). Berdiri satu kaki juga melatih kaki tumpu.
- **Catatan data:** walau ID-nya "Adductions", instruksi & gambarnya menunjukkan **abduksi** (kaki diangkat ke samping melawan band).

### 3. Single-Leg Glute Bridge — `Single_Leg_Glute_Bridge`
- **Otot utama:** gluteus maximus · sekunder: hamstring
- **Alat:** tanpa alat · **Kategori:** Lower (aksesori)
- **Beban:** Bodyweight, 8–12 rep per sisi.
- **Kondisi:** APT → cue posterior pelvic tilt, punggung bawah tidak melengkung di puncak.
- **Kenapa:** progresi dari Glute Bridge; melatih ekstensi pinggul satu kaki sambil menahan panggul agar tidak turun ke satu sisi.

### 4. Rear-Foot-Elevated Split Squat — `Split_Squat_with_Dumbbells`
- **Otot utama:** quadriceps · sekunder: gluteus, hamstring
- **Alat:** sepasang dumbbell + kursi/bench (kaki belakang) · **Kategori:** Lower (bisa jadi gerakan utama ★)
- **Beban:** 4–8 kg/tangan.
- **Kondisi:** ⚠ PFP → batasi kedalaman, nyeri ≤ 3/10. Untuk APT: bonus peregangan hip flexor kaki belakang, cue rib cage turun.
- **Kenapa:** kekuatan satu kaki dengan beban punggung sangat rendah — lebih spesifik untuk lari dan lebih Spine-Friendly daripada squat berbeban di punggung.

### 5. DB Step-Up — `Dumbbell_Step_Ups`
- **Otot utama:** quadriceps · sekunder: gluteus, hamstring, betis
- **Alat:** sepasang dumbbell + step box/kursi kokoh · **Kategori:** Lower (bisa jadi gerakan utama ★)
- **Beban:** 4–8 kg/tangan.
- **Kondisi:** ⚠ PFP → pijakan rendah (≤ setinggi lutut). Tanpa lompatan, jadi aman untuk shin splints.
- **Kenapa:** pola dorong satu kaki yang paling mirip lari & naik tanjakan; melatih kontrol lutut agar tidak jatuh ke dalam.
- **Catatan data:** dipilih menggantikan `Step-up_with_Knee_Raise`, karena gambar entri itu tidak menunjukkan box dan posisi awalnya mirip lunge.

### 6. DB Plié Squat — `Plie_Dumbbell_Squat`
- **Otot utama:** quadriceps · sekunder: adduktor, gluteus, hamstring, core
- **Alat:** satu dumbbell dipegang di depan-bawah · **Kategori:** Lower (bisa jadi gerakan utama ★)
- **Beban:** 6–12 kg (satu dumbbell).
- **Kondisi:** ⚠ PFP → batasi kedalaman. Cocok sebagai pengganti Barbell Squat bila nyeri punggung bawah aktif (beban tidak di punggung).
- **Kenapa:** pola squat tanpa beban aksial di bahu, melatih adduktor & gluteus.

### 7. Seated Single-Leg Calf Raise — `Dumbbell_Seated_One-Leg_Calf_Raise`
- **Otot utama:** betis (soleus — lutut ditekuk)
- **Alat:** dumbbell di paha + kursi + pijakan (buku/step) · **Kategori:** Prehab
- **Beban:** 5–10 kg di paha, 12–15 rep per kaki.
- **Kondisi:** direkomendasikan untuk shin splints, Achilles, dan plantar fasciitis.
- **Kenapa:** soleus termasuk otot penghasil gaya terbesar saat lari (Dorn 2012), dan lebih terlatih dengan lutut ditekuk dibanding calf raise berdiri. Melengkapi Eccentric Calf Raise.

### 8. Plank — `Plank`
- **Otot utama:** perut (anti-ekstensi)
- **Alat:** tanpa alat · **Kategori:** Core (tahan detik)
- **Beban:** Bodyweight. Tahan 20–45 detik.
- **Kondisi:** ⚠ nyeri bahu → batasi. Untuk APT: cue posterior pelvic tilt, pinggul tidak turun.
- **Kenapa:** melatih core menahan ekstensi lumbal (relevan untuk hiperlordosis). Variasi dari Dead Bug di posisi berbeda (McGill 2016).

### 9. Band Reverse Fly — `Back_Flyes_-_With_Bands`
- **Otot utama:** deltoid belakang · sekunder: punggung tengah (rhomboid/trapezius tengah)
- **Alat:** band + titik tambat setinggi dada · **Kategori:** Upper Pull
- **Beban:** Light/Medium Band, 12–15 rep.
- **Kondisi:** ⚠ nyeri bahu → hentikan bila nyeri.
- **Kenapa:** variasi Upper Pull tanpa palang dan tanpa membungkuk (beban punggung bawah rendah), untuk postur bahu desk job.

### 10. DB Scaption — `Dumbbell_Scaption`
- **Otot utama:** deltoid · sekunder: trapezius (bawah/tengah)
- **Alat:** sepasang dumbbell ringan / plat dipegang · **Kategori:** Prehab (bahu)
- **Beban:** 1,25–2 kg/tangan.
- **Kondisi:** ⚠ nyeri bahu → angkat hanya sampai setinggi bahu (sudah begitu di gambar), hentikan bila nyeri.
- **Kenapa:** latihan stabilisator scapula di bidang scapula; aman untuk bahu dan melengkapi Band Pull-Apart.

### 11. Band External Rotation — `External_Rotation_with_Band`
- **Otot utama:** rotator cuff (infraspinatus, teres minor)
- **Alat:** band + titik tambat setinggi siku · **Kategori:** Prehab (bahu)
- **Beban:** Light Band, 12–15 rep per sisi.
- **Kondisi:** direkomendasikan untuk nyeri bahu.
- **Kenapa:** rotasi eksternal dengan siku di samping badan mengaktifkan rotator cuff dengan baik (Reinold 2004); penyeimbang gerakan press.

### 12. Seated Band Hamstring Curl — `Seated_Band_Hamstring_Curl`
- **Otot utama:** hamstring (fleksi lutut)
- **Alat:** band + titik tambat rendah + kursi · **Kategori:** Lower (aksesori)
- **Beban:** Light/Medium Band, 12–15 rep.
- **Kondisi:** tidak ada larangan.
- **Kenapa:** library kita hanya melatih hamstring lewat hip hinge (RDL/hip thrust); fleksi lutut melengkapi kekuatan hamstring untuk lari.

### 13. Quadruped Hip Circles — `Hip_Circles_prone`
- **Otot utama:** abduktor · sekunder: adduktor
- **Alat:** tanpa alat · **Kategori:** Pemanasan
- **Beban:** 6–8 putaran per arah per sisi.
- **Kondisi:** APT → punggung tetap netral, jangan melengkung.
- **Kenapa:** mobilitas pinggul aktif sebelum Lower/Full Body; menambah variasi pemanasan.

## Kandidat yang ditolak (contoh)

- **Pallof Press** — hanya versi cable di database. Gerakan anti-rotasi murni (Pallof dengan band, bird dog, suitcase carry) **tidak ada** di database; celah anti-rotasi belum bisa diisi dari sumber ini.
- **Russian Twist, Dumbbell Side Bend, crunch/sit-up** — fleksi/rotasi tulang belakang berbeban berulang; dihindari untuk APT & nyeri punggung bawah.
- **Standing Dumbbell/Military Press, Upright Row** — press berdiri membebani aksial tanpa tumpuan (APT); upright row berisiko impingement (nyeri bahu).
- **Bent-Over Two-Dumbbell Row** — hip hinge tanpa tumpuan; sudah ada Supported Single-Arm Row.
- **Reverse Flyes / Dumbbell Incline Row / Lying Rear Delt Raise** — butuh incline/flat bench khusus.
- **Chin-Up / Pullups** — belum mampu pull-up/negative.
- **Natural Glute-Ham Raise** — butuh mesin/pad penahan kaki dan level lanjut.
- **Step-Up with Knee Raise** — gambar tidak menunjukkan box (lihat usulan 5).
- **Side Leg Raises** — ternyata ayunan peregangan, bukan penguatan.
- **Semua jump/hop/bound** — plyometric, dihindari untuk shin splints.

## Keputusan yang dibutuhkan

1. **Gerakan mana yang masuk?** Centang nomor 1–13. Semuanya juga boleh.
2. **Titik tambat band.** Usulan 2, 9, 11, dan 12 butuh band ditambatkan (kaki meja, handle pintu, atau door anchor). Usulan saya: tambahkan toggle **"Titik tambat band"** di Setting › Alat. Bila mati, keempat gerakan itu tidak dipakai.
3. **Syarat stabilitas panggul.** Usulan saya: **Side Plank** dan **Standing Band Hip Abduction** ikut memenuhi syarat "stabilitas panggul" (selain Lateral Band Walk & Clamshell), karena aktivasi gluteus medius-nya tinggi (Distefano 2009; Ekstrom 2007). Efeknya: lebih banyak variasi, dan sesi tidak selalu memakai Clamshell yang tanpa gambar.
4. **Gerakan utama ★.** Usulan saya: Rear-Foot-Elevated Split Squat, DB Step-Up, dan DB Plié Squat masuk daftar gerakan multi-joint yang bisa jadi ★ (dikunci per blok & dicatat progresinya).

## Referensi

- Distefano LJ dkk. (2009). Gluteal muscle activation during common therapeutic exercises. *JOSPT* 39(7) ([doi](https://doi.org/10.2519/jospt.2009.2796)).
- Ekstrom RA dkk. (2007). Electromyographic analysis of core trunk, hip, and thigh muscles during 9 rehabilitation exercises. *JOSPT* 37(12) ([doi](https://doi.org/10.2519/jospt.2007.2471)).
- Dorn TW dkk. (2012). Muscular strategy shift in human running. *J Exp Biol* 215(11) ([doi](https://doi.org/10.1242/jeb.075051)).
- Reinold MM dkk. (2004). EMG analysis of the rotator cuff and deltoid during common shoulder external rotation exercises. *JOSPT* 34(7) ([doi](https://doi.org/10.2519/jospt.2004.34.7.385)).
- Fredericson M dkk. (2000); Willy RW dkk. (2019); McGill S. (2016) — lihat `docs/TRAINING-LOGIC.md` §9.
