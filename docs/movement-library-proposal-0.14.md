# Usulan gerakan baru untuk movement library (0.14.2)

> Status: **disetujui 2026-10-27, semua 11 gerakan masuk** (rilis 0.14.2), termasuk keempat gambar 🟡, syarat band Heavy untuk Band-Assisted Pull-Up, ★ satu sisi mulai blok berikutnya, dan seluruh relasi varian. PR Seated DB Curl dimasukkan manual lewat Strength › PR.

- **Sumber:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), 876 gerakan, diunduh 2026-10-27. Gambar setiap usulan dicek (posisi awal & akhir).
- **Sumber kedua yang dicek:** [wger](https://wger.de) (gambar per entri berlisensi CC BY-SA) dan Wikimedia Commons. Hasilnya di "Gambar untuk 5 gerakan tanpa gambar".
- **Disusun:** 2026-10-27, mengikuti PRD §3, katalog kondisi di `lib/conditions.ts`, dan proses [movement-library-proposal.md](movement-library-proposal.md) (0.9). Cakupan: [STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) §3 "0.14.2".

## Cara seleksi

1. **876** gerakan di database.
2. Filter alat (`dumbbell`, `barbell`, `bands`, `body only`) + level (`beginner`/`intermediate`) + kategori `strength` → **301**.
3. Buang yang butuh mesin, cable, kettlebell, bola, rack, incline/decline bench, EZ/trap bar, smith, sled, lever, board, atau rantai, serta semua lompatan/plyometric (shin splints), good morning, hyperextension/superman (APT & nyeri punggung bawah), dan press di belakang leher → **255**.
4. Seleksi manual untuk celah 0.14.2: **bisep** (Seated DB Curl wajib), **trisep**, **lats** (pull-up bar sudah ada), **betis**, **tibialis**, dan **varian satu sisi yang lebih sulit** untuk gerakan yang sering mentok di batas alat (relasi `harderVariant` 0.14.0).

**Rentang beban** konservatif dan bisa dirakit dari alat yang tercatat (handle 2 kg ×2, plat 4×1,25 · 4×1,5 · 4×2 kg):
- sepasang dumbbell: **2 / 4,5 / 5 / 6 / 7,5 / 8,5 / 9 / 11,5 kg per tangan**;
- satu dumbbell: semua kelipatan dari 2 kg sampai 21 kg (mis. 6, 7, 8, 10, 12, 14 kg).

Sejak 0.14.0 rentang ini hanya titik awal: beban resep naik sampai batas alat atau batas keamanan, dan PR menjadi titik awal bila ada. Semua tetap RPE ≤ 7.

## Ringkasan

| # | Nama usulan | ID free-exercise-db | Kategori | Mengisi celah | Gambar |
| --- | --- | --- | --- | --- | --- |
| 1 | **Seated DB Curl** | `Seated_Dumbbell_Curl` | Upper Pull | Bisep (wajib, sudah dikerjakan pemilik) | ✅ |
| 2 | Hammer Curl | `Hammer_Curls` | Upper Pull | Bisep + lengan bawah | ✅ |
| 3 | Lying DB Triceps Extension | `Lying_Dumbbell_Tricep_Extension` | Upper Push | Trisep tanpa beban di atas kepala | ✅ |
| 4 | Close-Grip Push-Up | `Push-Ups_-_Close_Triceps_Position` | Upper Push | Trisep tanpa alat | ✅ |
| 5 | Scapular Pull-Up | `Scapular_Pull-Up` | Upper Pull | Lats & depresi scapula, jembatan Dead Hang → Negative | ✅ |
| 6 | Band-Assisted Pull-Up | `Band_Assisted_Pull-Up` | Upper Pull | Lats, pull-up penuh dengan bantuan | ✅ (butuh band tebal) |
| 7 | Standing DB Calf Raise | `Standing_Dumbbell_Calf_Raise` | Prehab | Betis (gastrocnemius) berbeban | ✅ |
| 8 | Seated Band Tibialis Raise | tidak ada | Prehab | Tibialis anterior berbeban | ⬜ |
| 9 | Single-Leg DB RDL | `Kettlebell_One-Legged_Deadlift` | Lower | Varian lebih sulit DB RDL Wall-Tap | 🟡 |
| 10 | Single-Leg Hip Thrust | tidak ada | Lower | Varian lebih sulit Barbell Sumo Deadlift / Hip Thrust | ⬜ |
| 11 | Single-Arm DB Floor Press | `Dumbbell_Floor_Press` | Upper Push | Varian lebih sulit Floor Press | 🟡 |

✅ cocok persis · 🟡 mirip, perlu persetujuan · ⬜ tanpa gambar ("Gambar belum tersedia").

## Detail usulan

### 1. Seated DB Curl: `Seated_Dumbbell_Curl` (wajib)
- **Otot utama:** bisep · sekunder: lengan bawah (grip)
- **Alat:** sepasang dumbbell + bench (duduk bersandaran) · **Kategori:** Upper Pull (aksesori)
- **Beban awal:** 4,5–6 kg/tangan, 10–12 rep.
- **Kondisi:** APT/nyeri punggung bawah → duduk bersandaran, punggung menempel, tanpa mengayun. Tidak ada larangan lain.
- **Kenapa:** sudah dikerjakan pemilik dan punya PR yang sempat dilewati saat impor karena gerakannya belum ada di library. Bisep juga belum punya gerakan sendiri; sekarang hanya sekunder di row dan pullover.
- **Catatan data:** gambar duduk di bench bersandaran dengan dua dumbbell, sama dengan versi kita. Instruksi sumber memutar telapak dari netral ke menghadap depan; cue kita: "boleh mulai netral lalu putar, siku tetap di samping badan."

### 2. Hammer Curl: `Hammer_Curls`
- **Otot utama:** bisep · sekunder: lengan bawah (brachioradialis)
- **Alat:** sepasang dumbbell · **Kategori:** Upper Pull (aksesori)
- **Beban awal:** 4,5–6 kg/tangan, 10–12 rep.
- **Kondisi:** APT → berdiri tegak, rib cage turun, tanpa mengayun (atau duduk bersandaran). Tidak ada larangan.
- **Kenapa:** variasi curl dengan genggaman netral, ramah pergelangan & siku; menambah variasi supaya Seated DB Curl tidak selalu muncul.
- **Catatan data:** gambar berdiri. Bila pemilik lebih suka duduk, cue menyebut boleh duduk.

### 3. Lying DB Triceps Extension: `Lying_Dumbbell_Tricep_Extension`
- **Otot utama:** trisep · sekunder: dada, bahu
- **Alat:** sepasang dumbbell + bench datar · **Kategori:** Upper Push (aksesori)
- **Beban awal:** 2–5 kg/tangan, 10–12 rep.
- **Kondisi:** ⚠ nyeri bahu → batasi rentang; hentikan bila nyeri. APT: punggung bawah menempel bench (kaki di bench bila perlu).
- **Kenapa:** satu-satunya gerakan trisep sekarang adalah Overhead Triceps Extension (lengan di atas kepala). Versi berbaring melatih trisep tanpa posisi overhead, cocok untuk variasi dan saat bahu sensitif.

### 4. Close-Grip Push-Up: `Push-Ups_-_Close_Triceps_Position`
- **Otot utama:** trisep · sekunder: dada, bahu, core
- **Alat:** tanpa alat · **Kategori:** Upper Push (aksesori)
- **Beban:** Bodyweight, 6–10 rep; versi lutut atau tangan di bench untuk awal.
- **Kondisi:** ⚠ nyeri bahu → tidak dipakai (beban bahu depan tinggi). APT: plank netral, panggul tidak turun.
- **Kenapa:** pengisi trisep untuk sesi tanpa alat (0.11.2) dan saat dumbbell dipakai gerakan lain.
- **Catatan data:** level `intermediate` di sumber; disarankan setelah Push-Up biasa lancar.

### 5. Scapular Pull-Up: `Scapular_Pull-Up`
- **Otot utama:** trapezius bawah, latissimus · sekunder: punggung tengah, lengan bawah (grip)
- **Alat:** pull-up bar · **Kategori:** Upper Pull
- **Beban:** Bodyweight, 6–10 rep, tahan 2 detik di atas.
- **Kondisi:** ⚠ nyeri bahu → hentikan bila nyeri. Tidak ada larangan lain.
- **Kenapa:** jembatan antara Dead Hang (menggantung) dan Negative Pull-Up. Melatih depresi scapula yang menjadi awal setiap pull-up dan menjaga bahu stabil.
- **Catatan data:** gambar menggantung → bahu ditarik turun, sama persis.

### 6. Band-Assisted Pull-Up: `Band_Assisted_Pull-Up`
- **Otot utama:** latissimus · sekunder: bisep, punggung tengah, core
- **Alat:** pull-up bar + **band loop tebal** · **Kategori:** Upper Pull
- **Beban:** band, 4–8 rep.
- **Kondisi:** ⚠ nyeri bahu → hentikan bila nyeri.
- **Kenapa:** pull-up penuh dengan bantuan; progresi setelah Negative Pull-Up.
- **Catatan data:** butuh band loop yang cukup kuat untuk menopang berat badan. Band yang tercatat sekarang **Light & Medium**, umumnya terlalu ringan. Usulan: masuk library tetapi **hanya aktif bila ada band "Heavy" atau lebih** di Setting › Alat (lihat keputusan 3).

### 7. Standing DB Calf Raise: `Standing_Dumbbell_Calf_Raise`
- **Otot utama:** betis (gastrocnemius) · sekunder: soleus
- **Alat:** sepasang dumbbell + pijakan (anak tangga/papan 5–8 cm) · **Kategori:** Prehab (bersama Eccentric Calf Raise & Seated Single-Leg Calf Raise)
- **Beban awal:** 6–9 kg/tangan, 12–15 rep, turun 2–3 detik.
- **Kondisi:** direkomendasikan untuk riwayat shin splints dan overpronation (kekuatan betis). Tanpa lompatan.
- **Kenapa:** library sekarang punya calf raise bodyweight (gastrocnemius) dan duduk berbeban (soleus). Versi berdiri berbeban melengkapi gastrocnemius saat bodyweight sudah terlalu ringan.

### 8. Seated Band Tibialis Raise: tanpa sumber
- **Otot utama:** tibialis anterior
- **Alat:** band + titik tambat rendah · **Kategori:** Prehab
- **Beban:** Light/Medium Band, 15–20 rep, turun 2 detik.
- **Kondisi:** direkomendasikan untuk riwayat shin splints.
- **Kenapa:** progresi berbeban dari Tibialis Wall Raise (bodyweight). Duduk dengan kaki lurus, band melingkar di punggung kaki dan ditambatkan di depan, tarik ujung kaki ke arah tulang kering.
- **Catatan data:** free-exercise-db tidak punya gerakan penguatan tibialis (hanya foam rolling & stretching). wger punya "Tibialis raises" tanpa gambar. Cue ditulis sendiri, **tanpa gambar**.

### 9. Single-Leg DB RDL: `Kettlebell_One-Legged_Deadlift` (🟡)
- **Otot utama:** hamstring, gluteus · sekunder: gluteus medius, punggung bawah (stabilisasi)
- **Alat:** satu dumbbell (tangan berlawanan), tangan lain bertumpu di dinding/kursi · **Kategori:** Lower (bisa jadi ★)
- **Beban awal:** satu dumbbell 6–10 kg, 8–10 rep per kaki.
- **Kondisi:** APT/nyeri punggung bawah → **tumpuan tangan wajib**, punggung netral, hinge dari pinggul, berhenti saat hamstring meregang (tanpa membungkuk). Tidak ada lompatan.
- **Kenapa:** `harderVariant` untuk **DB RDL Wall-Tap Method**. Hinge satu kaki melatih stabilitas panggul spesifik lari dan menggandakan beban relatif tanpa alat baru.
- **Catatan data:** gambar memakai kettlebell dan tanpa tumpuan tangan; pola hinge satu kaki sama. Usulan: ✓ dengan `imageNote`.

### 10. Single-Leg Hip Thrust: tanpa gambar
- **Otot utama:** gluteus · sekunder: hamstring, gluteus medius
- **Alat:** bench (punggung atas bertumpu), opsional satu dumbbell di pinggul · **Kategori:** Lower (bisa jadi ★)
- **Beban awal:** Bodyweight lalu satu dumbbell 4–8 kg di pinggul, 8–12 rep per kaki.
- **Kondisi:** APT → posterior pelvic tilt di puncak, rib cage turun, jangan melengkungkan punggung.
- **Kenapa:** `harderVariant` untuk **Barbell Sumo Deadlift / Hip Thrust**. Barbell sering mentok di batas alat atau di batas keamanan APT/LBP (20 kg); versi satu kaki menaikkan beban relatif tanpa beban barbell.
- **Catatan data:** sumber hanya punya `Barbell_Hip_Thrust` (dua kaki, barbell) dan `Single_Leg_Glute_Bridge` (punggung di lantai, sudah di library). wger punya "Dumbbell Single-leg Hip Thrust" tanpa gambar. Usulan: **tanpa gambar**, bukan memakai gambar dua kaki.

### 11. Single-Arm DB Floor Press: `Dumbbell_Floor_Press` (🟡)
- **Otot utama:** dada, trisep · sekunder: bahu depan, core (anti-rotasi)
- **Alat:** satu dumbbell · **Kategori:** Upper Push (bisa jadi ★)
- **Beban awal:** satu dumbbell 10–14 kg, 8–10 rep per sisi.
- **Kondisi:** ⚠ nyeri bahu → siku ±45°, hentikan bila nyeri. APT: punggung bawah menempel lantai.
- **Kenapa:** `harderVariant` untuk **Floor Press**. Sepasang dumbbell dari plat yang ada mentok di 11,5 kg per tangan, sedangkan satu dumbbell bisa sampai 21 kg, sehingga progresi beban bisa berlanjut tanpa membeli alat, ditambah tuntutan anti-rotasi.
- **Catatan data:** gambar memakai dua dumbbell; posisi berbaring dan pola dorong sama. Usulan: ✓ dengan `imageNote`.

## Relasi varian lebih sulit (0.14.0)

| Gerakan mentok | Varian yang diusulkan | Sumber |
| --- | --- | --- |
| Barbell Squat | Rear-Foot-Elevated Split Squat | sudah ada |
| Reverse Lunge | Rear-Foot-Elevated Split Squat | sudah ada |
| DB Plié Squat | Rear-Foot-Elevated Split Squat | **baru**, gerakan sudah ada |
| Barbell Sumo Deadlift / Hip Thrust | Single-Leg Hip Thrust | usulan 10 |
| DB RDL Wall-Tap Method | Single-Leg DB RDL | usulan 9 |
| Floor Press | Single-Arm DB Floor Press | usulan 11 |
| Seated DB Curl | Hammer Curl? | tidak diusulkan: bukan lebih sulit, hanya variasi |

Varian berlaku mulai blok berikutnya dan hanya bila gerakannya tersedia (alat) dan lolos kondisi aktif, seperti 0.14.0.

## Gambar untuk 5 gerakan tanpa gambar

| Gerakan | Hasil | Usulan |
| --- | --- | --- |
| **Dead Hang** | free-exercise-db `Scapular_Pull-Up`: gambar 1 menggantung pasif, gambar 2 menggantung dengan bahu ditarik turun, persis cue kita ("bahu aktif") | 🟡 pakai dengan `imageNote` "gambar pertama = sebelum bahu diaktifkan; tahan di posisi gambar kedua". Di 0.9 ditolak karena dianggap gerakan aktif; dengan cue bahu aktif, gambar keduanya justru posisi tahan yang benar |
| **Negative Pull-Up** | `Pullups` (ditolak 2026-10-12 karena urutan naik) | 🟡 pakai dengan **urutan dibalik** (atas → bawah), sesuai fase turun negative |
| **Seated DB Scapular Retraction** | `Middle_Back_Shrug` (telungkup di incline bench, ditolak 2026-10-12); tidak ada sumber lain | tetap tanpa gambar |
| **Clamshell** | tidak ada di free-exercise-db; wger "Clamshell" & "Banded Clamshell" tanpa gambar | tetap tanpa gambar |
| **Tibialis Wall Raise** | tidak ada (hanya `Anterior_Tibialis-SMR`, foam rolling); wger "Tibialis raises" tanpa gambar | tetap tanpa gambar |

Sumber lain yang dicek dan ditolak:
- Wikimedia Commons: "Negative Pull Up.jpg" ternyata push-up di atas bola (CC BY-SA); "Pull-ups exercise from back.jpg" hanya satu foto (CC BY 2.0, wajib tautan ke situs komersial). Tidak ada pasangan awal/akhir.
- wger "Single-Leg Deadlift with Dumbbell": satu foto dengan gaya berbeda dari free-exercise-db.
- Tidak ada gambar buatan AI atau dari sumber yang lisensinya tidak mengizinkan.

## Kandidat yang ditolak (contoh)

- **Chin-Up / Pullups / V-Bar / Wide-Grip pull-up**: belum mampu pull-up penuh; masuk nanti lewat milestone pull-up (backlog).
- **Concentration Curl, Preacher Curl (semua versi), Barbell/Drag/Zottman Curl**: butuh preacher bench, membungkuk tanpa tumpuan, atau level lanjut; sudah ada dua curl.
- **Bench Dips / Dips**: beban besar di bahu depan; tidak cocok dengan riwayat nyeri bahu.
- **Tricep Dumbbell Kickback, Standing Bent-Over Triceps Extension**: hip hinge tanpa tumpuan (APT/nyeri punggung bawah), alasan yang sama dengan Bent-Over Row di 0.9.
- **Standing Overhead Barbell Triceps Extension, Lying Close-Grip Barbell Extension Behind The Head**: barbell di atas kepala / di belakang kepala.
- **Barbell & Rocking Standing Calf Raise, Barbell Seated Calf Raise**: barbell di bahu atau di paha; versi dumbbell lebih aman dan cukup.
- **Calf Raise On A Dumbbell**: berdiri di atas handle dumbbell yang menggelinding; berisiko untuk pergelangan kaki.
- **Stiff-Legged Dumbbell Deadlift**: dua kaki tanpa tumpuan, sudah terwakili DB RDL Wall-Tap.
- **Barbell Side Split Squat, One Leg Barbell Squat**: barbell di punggung, level lanjut.
- **Band Skull Crusher, Speed Band Overhead Triceps**: butuh titik tambat tinggi atau gerakan cepat; trisep sudah terisi.

## Keputusan yang dibutuhkan

1. **Gerakan mana yang masuk?** Seated DB Curl (#1) wajib; centang #2–#11, semuanya juga boleh.
2. **Gambar 🟡:**
   - Single-Leg DB RDL dengan gambar kettlebell (#9);
   - Single-Arm DB Floor Press dengan gambar dua dumbbell (#11);
   - Dead Hang dengan gambar `Scapular_Pull-Up`;
   - Negative Pull-Up dengan `Pullups` urutan dibalik.

   Masing-masing ✓ atau ✕ (✕ = tanpa gambar).
3. **Band-Assisted Pull-Up (#6):** masuk dengan syarat ada band "Heavy" atau lebih di Setting › Alat, atau ditunda? Usulan saya: masuk dengan syarat itu.
4. **Gerakan utama ★:** Single-Leg DB RDL, Single-Leg Hip Thrust, dan Single-Arm DB Floor Press masuk daftar multi-joint yang bisa jadi ★, dengan `ANCHOR_SINCE` = tanggal persetujuan (baru berlaku di blok berikutnya). Usulan saya: ya.
5. **Relasi varian:** setuju tabel "Relasi varian lebih sulit" di atas, termasuk DB Plié Squat → Rear-Foot-Elevated Split Squat?
6. **PR Seated DB Curl:** `owner-prs.local.json` saat ini tidak berisi entri curl, jadi entri yang dilewati perlu ditambahkan lagi ke file itu atau dimasukkan lewat halaman Strength › PR setelah rilis. Mana yang kamu mau?

## Referensi

- Schoenfeld BJ dkk. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci* 35(11). Volume langsung untuk otot kecil (bisep, trisep) sebagai pelengkap gerakan multi-joint.
- Blagrove RC dkk. (2018). Effects of strength training on the physiological determinants of middle- and long-distance running performance. *Sports Med* 48(5). Kekuatan unilateral & betis untuk pelari.
- Moen MH dkk. (2009). Medial tibial stress syndrome: a critical review. *Sports Med* 39(7). Kelemahan otot betis & kontrol kaki sebagai faktor risiko MTSS.
- Distefano LJ dkk. (2009). Gluteal muscle activation during common therapeutic exercises. *JOSPT* 39(7). Aktivasi gluteus medius tinggi pada single-leg deadlift.
- Lihat juga `docs/TRAINING-LOGIC.md` §9–§10 dan [movement-library-proposal.md](movement-library-proposal.md).
