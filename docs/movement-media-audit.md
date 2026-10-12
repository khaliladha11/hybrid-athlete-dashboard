# Audit media gerakan (free-exercise-db)

> Fase 1 fitur 0.9. Dibuat oleh `node scripts/audit-movement-media.mjs` — jangan edit manual; ubah keputusan di `AUDIT` dalam script lalu jalankan ulang.

- **Sumber:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (876 gerakan), lisensi **Unlicense** (public domain).
- **Data:** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
- **Diperiksa:** 2026-10-12 · 40 gerakan (35 gerakan inti + 5 pemanasan/pendinginan).
- **Cara menilai:** instruksi setiap kandidat dibaca, dan gambar dicek untuk kasus yang meragukan. Cocok persis = posisi tubuh, alat, dan pola gerak sama.

## Ringkasan

- ✅ Cocok persis: **23**
- 🟡 Mirip tapi berbeda: **14** — default **tidak dipakai** sampai disetujui
- ⬜ Tidak ada: **3** — akan tampil "Gambar belum tersedia"

## Upper Push

- ✅ **Floor Press** (10–20 kg/tangan)
  - ID: `Dumbbell_Floor_Press`
  - Data: alat `dumbbell`, level `intermediate`, otot utama triceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Floor_Press/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Floor_Press/1.jpg)
  - Catatan: Dumbbell floor press berbaring di lantai, sama persis.
- ✅ **Seated Overhead Press** (5 kg/tangan)
  - ID: `Seated_Dumbbell_Press`
  - Data: alat `dumbbell`, level `beginner`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Press/1.jpg)
  - Catatan: Duduk di bangku bersandaran, dua dumbbell — sama dengan versi kita.
- ✅ **Seated Lateral Raise** (1.25–3 kg/tangan)
  - ID: `Seated_Side_Lateral_Raise`
  - Data: alat `dumbbell`, level `beginner`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Side_Lateral_Raise/1.jpg)
  - Catatan: Duduk di ujung bangku, dua dumbbell ke samping.
- 🟡 **Overhead Triceps Extension** (5 kg)
  - ID: `Seated_Triceps_Press`, `Standing_Dumbbell_Triceps_Extension`
  - Data: alat `dumbbell`, level `beginner`, otot utama triceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Triceps_Press/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Triceps_Press/1.jpg)
  - Catatan: Library kita tidak menyebut posisi. Seated_Triceps_Press = duduk bersandaran (lebih Spine-Friendly); Standing_Dumbbell_Triceps_Extension = berdiri. Pilih yang sesuai caramu.
  - Hasil pencarian nama lain (tidak dipilih): `Sled_Overhead_Triceps_Extension`, `Triceps_Overhead_Extension_with_Rope`, `Cable_Rope_Overhead_Triceps_Extension`, `Kettlebell_Overhead_Triceps_Extension`
- 🟡 **High-Incline Push-Up** (Bodyweight)
  - ID: `Incline_Push-Up`
  - Data: alat `body only`, level `beginner`, otot utama chest
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Push-Up/1.jpg)
  - Catatan: Pola sama, tetapi tumpuan di gambar setinggi bangku; versi kita high-incline (kursi/meja/dinding, lebih tinggi & lebih ringan).
  - Hasil pencarian nama lain (tidak dipilih): `Incline_Push-Up_Wide`, `Cable_Incline_Pushdown`, `Incline_Push-Up_Medium`

## Upper Pull

- ⬜ **Dead Hang** (Bodyweight)
  - Catatan: Tidak ada dead hang dua tangan menggantung penuh. Terdekat ditolak: One_Handed_Hang (satu tangan, kaki tetap di lantai), Scapular_Pull-Up (gerakan aktif scapula, bukan menggantung diam).
  - Hasil pencarian nama lain (tidak dipilih): `Dead_Bug`, `Hang_Clean`, `Hang_Snatch`, `Car_Deadlift`
- 🟡 **Negative Pull-Up** (Bodyweight) · _belum aktif_
  - ID: `Pullups`
  - Data: alat `body only`, level `beginner`, otot utama lats
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/1.jpg)
  - Catatan: Gambar pull-up penuh (naik dari bawah). Negative kita: mulai di atas, turun 3–5 detik — posisi sama tetapi urutan awal/akhir terbalik.
  - Hasil pencarian nama lain (tidak dipilih): `Rocky_Pull-Ups_Pulldowns`, `Face_Pull`, `Clean_Pull`
- 🟡 **DB Farmer's Hold** (10–16 kg/tangan)
  - ID: `Farmers_Walk`
  - Data: alat `other`, level `intermediate`, otot utama forearms
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/1.jpg)
  - Catatan: Versi berjalan dengan handle strongman; kita berdiri diam memegang dumbbell.
- 🟡 **Seated DB Scapular Retraction** (2.5–5 kg/tangan)
  - ID: `Middle_Back_Shrug`
  - Data: alat `dumbbell`, level `intermediate`, otot utama middle back
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Middle_Back_Shrug/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Middle_Back_Shrug/1.jpg)
  - Catatan: Retraksi scapula yang sama, tetapi telungkup di incline bench; kita duduk membungkuk.
  - Hasil pencarian nama lain (tidak dipilih): `Scapular_Pull-Up`
- 🟡 **Supported Single-Arm Row** (5–7.5 kg/tangan)
  - ID: `One-Arm_Dumbbell_Row`
  - Data: alat `dumbbell`, level `beginner`, otot utama middle back
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/1.jpg)
  - Catatan: Pola row sama; gambar memakai lutut + tangan di bangku, kita satu tangan bertumpu di kursi.
  - Hasil pencarian nama lain (tidak dipilih): `Sled_Row`, `Shotgun_Row`, `Inverted_Row`, `Suspended_Row`
- 🟡 **DB Floor Pullover** (5–7.5 kg)
  - ID: `Straight-Arm_Dumbbell_Pullover`, `Bent-Arm_Dumbbell_Pullover`
  - Data: alat `dumbbell`, level `intermediate`, otot utama chest
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Dumbbell_Pullover/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Dumbbell_Pullover/1.jpg)
  - Catatan: Gambar melintang di bangku (pinggul menggantung, ROM lebih besar); kita di lantai — ROM dibatasi lantai, lebih aman untuk bahu & punggung.
  - Hasil pencarian nama lain (tidak dipilih): `Floor_Press`, `One_Arm_Floor_Press`, `Dumbbell_Floor_Press`, `Leg-Over_Floor_Press`
- 🟡 **Seated Bent-Over DB Face Pull** (1.25–1.5 kg)
  - ID: `Seated_Bent-Over_Rear_Delt_Raise`
  - Data: alat `dumbbell`, level `intermediate`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Bent-Over_Rear_Delt_Raise/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Bent-Over_Rear_Delt_Raise/1.jpg)
  - Catatan: Rear delt raise lengan hampir lurus ke samping; face pull kita menekuk siku menarik ke arah wajah dengan rotasi eksternal.
  - Hasil pencarian nama lain (tidak dipilih): `Bent_Over_Low-Pulley_Side_Lateral`, `Face_Pull`, `Bent_Over_Barbell_Row`, `Rocky_Pull-Ups_Pulldowns`
- ✅ **Reverse Wrist Curl** (1.25–1.5 kg)
  - ID: `Seated_Dumbbell_Palms-Down_Wrist_Curl`
  - Data: alat `dumbbell`, level `beginner`, otot utama forearms
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Palms-Down_Wrist_Curl/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Dumbbell_Palms-Down_Wrist_Curl/1.jpg)
  - Catatan: Duduk, lengan bawah di paha, telapak menghadap bawah — sama.
- ✅ **Band Reverse Fly** (Light/Medium Band)
  - ID: `Back_Flyes_-_With_Bands`
  - Data: alat `bands`, level `beginner`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Back_Flyes_-_With_Bands/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Back_Flyes_-_With_Bands/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).

## Lower

- 🟡 **Barbell Sumo Deadlift / Hip Thrust** (14–20 kg)
  - ID: `Barbell_Hip_Thrust`, `Sumo_Deadlift`, `Barbell_Glute_Bridge`
  - Data: alat `barbell`, level `intermediate`, otot utama glutes
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/1.jpg)
  - Catatan: Satu entri kita berisi dua gerakan; gambar hanya bisa satu. Cue kita mengutamakan Hip Thrust (Barbell_Hip_Thrust). Sumo_Deadlift di gambar memakai beban berat.
  - Hasil pencarian nama lain (tidak dipilih): `Sumo_Deadlift_with_Bands`, `Sumo_Deadlift_with_Chains`
- 🟡 **Barbell Squat** (10–16 kg)
  - ID: `Barbell_Squat`
  - Data: alat `barbell`, level `beginner`, otot utama quadriceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/1.jpg)
  - Catatan: Pola back squat sama, tetapi gambar memakai rack & plat besar (beban berat). Kita 10–16 kg tanpa rack — visual bisa memberi kesan beban berat yang berlawanan dengan Spine-Friendly.
  - Hasil pencarian nama lain (tidak dipilih): `Box_Squat`, `Hack_Squat`, `Sit_Squats`, `Squat_Jerk`
- 🟡 **DB RDL Wall-Tap Method** (8–10 kg)
  - ID: `Stiff-Legged_Dumbbell_Deadlift`
  - Data: alat `dumbbell`, level `beginner`, otot utama hamstrings
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Dumbbell_Deadlift/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Dumbbell_Deadlift/1.jpg)
  - Catatan: Stiff-legged: lutut hampir lurus, turun sampai kaki. Kita RDL hip hinge sampai pantat menyentuh dinding (lutut sedikit tekuk, ROM dibatasi).
  - Hasil pencarian nama lain (tidak dipilih): `One_Arm_Against_Wall`, `Linear_Acceleration_Wall_Drill`, `Calf_Stretch_Hands_Against_Wall`, `Calf_Stretch_Elbows_Against_Wall`
- ✅ **Reverse Lunge** (3–5 kg/tangan)
  - ID: `Dumbbell_Rear_Lunge`
  - Data: alat `dumbbell`, level `intermediate`, otot utama quadriceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Rear_Lunge/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Rear_Lunge/1.jpg)
  - Catatan: Langkah ke belakang dengan dua dumbbell — sama.
- ✅ **Glute Bridge** (Bodyweight)
  - ID: `Butt_Lift_Bridge`
  - Data: alat `body only`, level `beginner`, otot utama glutes
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butt_Lift_Bridge/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butt_Lift_Bridge/1.jpg)
  - Catatan: Glute bridge bodyweight berbaring di lantai — sama.
- ✅ **Single-Leg Glute Bridge** (Bodyweight)
  - ID: `Single_Leg_Glute_Bridge`
  - Data: alat `body only`, level `beginner`, otot utama glutes
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).
- ✅ **Rear-Foot-Elevated Split Squat** (4–8 kg/tangan)
  - ID: `Split_Squat_with_Dumbbells`
  - Data: alat `dumbbell`, level `beginner`, otot utama quadriceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/1.jpg)
  - Catatan: Ditambahkan dari database (0.9); kaki belakang di bangku.
- ✅ **DB Step-Up** (4–8 kg/tangan)
  - ID: `Dumbbell_Step_Ups`
  - Data: alat `dumbbell`, level `intermediate`, otot utama quadriceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Step_Ups/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Step_Ups/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).
- ✅ **DB Plié Squat** (6–12 kg)
  - ID: `Plie_Dumbbell_Squat`
  - Data: alat `dumbbell`, level `beginner`, otot utama quadriceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plie_Dumbbell_Squat/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plie_Dumbbell_Squat/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).
- ✅ **Seated Band Hamstring Curl** (Light/Medium Band)
  - ID: `Seated_Band_Hamstring_Curl`
  - Data: alat `other`, level `beginner`, otot utama hamstrings
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Band_Hamstring_Curl/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Band_Hamstring_Curl/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).

## Stabilitas & Core

- 🟡 **Lateral Band Walk** (Light/Medium Band)
  - ID: `Monster_Walk`
  - Data: alat `bands`, level `beginner`, otot utama abductors
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Monster_Walk/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Monster_Walk/1.jpg)
  - Catatan: Monster walk melangkah maju-mundur dengan band di pergelangan & lutut; kita melangkah ke samping.
  - Hasil pencarian nama lain (tidak dipilih): `Lateral_Raise_-_With_Bands`, `Yoke_Walk`, `Farmers_Walk`
- ✅ **Dead Bug** (Bodyweight)
  - ID: `Dead_Bug`
  - Data: alat `body only`, level `beginner`, otot utama abdominals
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/1.jpg)
  - Catatan: Sama, termasuk cue punggung bawah menempel lantai.
- ⬜ **Clamshell** (Light Band)
  - Catatan: Tidak ada clamshell di database.
- ✅ **Side Plank** (Bodyweight)
  - ID: `Side_Bridge`
  - Data: alat `body only`, level `beginner`, otot utama abdominals
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Bridge/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Bridge/1.jpg)
  - Catatan: Ditambahkan dari database (0.9); entri sumber tanpa teks instruksi.
- ✅ **Standing Band Hip Abduction** (Light/Medium Band)
  - ID: `Band_Hip_Adductions`
  - Data: alat `bands`, level `beginner`, otot utama adductors
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Hip_Adductions/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Hip_Adductions/1.jpg)
  - Catatan: Ditambahkan dari database (0.9); ID sumber bernama Adductions, gerakannya abduksi.
- ✅ **Plank** (Bodyweight)
  - ID: `Plank`
  - Data: alat `body only`, level `beginner`, otot utama abdominals
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).

## Prehab

- ⬜ **Tibialis Wall Raise** (Bodyweight)
  - Catatan: Tidak ada. Terdekat ditolak: Anterior_Tibialis-SMR (foam rolling, bukan penguatan).
  - Hasil pencarian nama lain (tidak dipilih): `Dumbbell_Raise`, `Shoulder_Raise`, `Glute_Ham_Raise`, `Rear_Leg_Raises`
- 🟡 **Eccentric Calf Raise** (Bodyweight)
  - ID: `Standing_Dumbbell_Calf_Raise`
  - Data: alat `dumbbell`, level `intermediate`, otot utama calves
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Calf_Raise/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Calf_Raise/1.jpg)
  - Catatan: Calf raise bilateral dengan dumbbell di papan; versi kita naik dua kaki, turun satu kaki perlahan, tanpa beban.
  - Hasil pencarian nama lain (tidak dipilih): `Seated_Calf_Raise`, `Donkey_Calf_Raises`, `Standing_Calf_Raises`, `Calf_Raise_On_A_Dumbbell`
- ✅ **Seated Single-Leg Calf Raise** (5–10 kg)
  - ID: `Dumbbell_Seated_One-Leg_Calf_Raise`
  - Data: alat `dumbbell`, level `beginner`, otot utama calves
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Seated_One-Leg_Calf_Raise/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Seated_One-Leg_Calf_Raise/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).
- ✅ **DB Scaption** (1.25–2 kg/tangan)
  - ID: `Dumbbell_Scaption`
  - Data: alat `dumbbell`, level `beginner`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Scaption/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Scaption/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).
- ✅ **Band External Rotation** (Light Band)
  - ID: `External_Rotation_with_Band`
  - Data: alat `bands`, level `beginner`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/External_Rotation_with_Band/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/External_Rotation_with_Band/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).

## Pemanasan & Pendinginan

- ✅ **Kneeling Hip Flexor Stretch**
  - ID: `Kneeling_Hip_Flexor`
  - Data: alat `—`, level `beginner`, otot utama quadriceps
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Hip_Flexor/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kneeling_Hip_Flexor/1.jpg)
  - Catatan: Sama.
- 🟡 **Cat-Cow**
  - ID: `Cat_Stretch`
  - Data: alat `—`, level `beginner`, otot utama lower back
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/1.jpg)
  - Catatan: Hanya fase cat (punggung membulat), tanpa fase cow.
  - Hasil pencarian nama lain (tidak dipilih): `Catch_and_Overhead_Throw`
- ✅ **Band Pull-Apart**
  - ID: `Band_Pull_Apart`
  - Data: alat `bands`, level `beginner`, otot utama shoulders
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Pull_Apart/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Band_Pull_Apart/1.jpg)
  - Catatan: Sama.
- ✅ **Calf Stretch**
  - ID: `Calf_Stretch_Hands_Against_Wall`
  - Data: alat `—`, level `beginner`, otot utama calves
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Stretch_Hands_Against_Wall/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Stretch_Hands_Against_Wall/1.jpg)
  - Catatan: Peregangan betis bertumpu di dinding — sama.
- ✅ **Quadruped Hip Circles**
  - ID: `Hip_Circles_prone`
  - Data: alat `body only`, level `beginner`, otot utama abductors
  - Gambar: [awal](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hip_Circles_prone/0.jpg) · [akhir](https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hip_Circles_prone/1.jpg)
  - Catatan: Ditambahkan dari database (0.9).

## Keputusan pemilik (gerakan 🟡)

Diputuskan 2026-10-12. ✓ = gambar kandidat dipakai; ✕ = ditolak, tampil "Gambar belum tersedia".

- ✓ **Overhead Triceps Extension** → `Seated_Triceps_Press`
- ✓ **High-Incline Push-Up** → `Incline_Push-Up`
- ✕ **Negative Pull-Up** → tanpa gambar
- ✓ **DB Farmer's Hold** → `Farmers_Walk`
- ✕ **Seated DB Scapular Retraction** → tanpa gambar
- ✓ **Supported Single-Arm Row** → `One-Arm_Dumbbell_Row`
- ✓ **DB Floor Pullover** → `Bent-Arm_Dumbbell_Pullover`
- ✓ **Seated Bent-Over DB Face Pull** → `Seated_Bent-Over_Rear_Delt_Raise`
- ✓ **Barbell Sumo Deadlift / Hip Thrust** → `Barbell_Hip_Thrust`
- ✓ **Barbell Squat** → `Barbell_Squat`
- ✓ **DB RDL Wall-Tap Method** → `Stiff-Legged_Dumbbell_Deadlift`
- ✓ **Lateral Band Walk** → `Monster_Walk`
- ✓ **Eccentric Calf Raise** → `Standing_Dumbbell_Calf_Raise`
- ✓ **Cat-Cow** → `Cat_Stretch`

## Hasil akhir untuk Fase 3

- Dengan gambar: **35** gerakan
- Tanpa gambar ("Gambar belum tersedia"): **5** — Dead Hang, Negative Pull-Up, Seated DB Scapular Retraction, Clamshell, Tibialis Wall Raise
