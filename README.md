# Hybrid Athlete Dashboard (V1)

Dashboard profil atlet yang tersambung ke [intervals.icu](https://intervals.icu), plus generator latihan **lari** dan **strength training (ST)** berdasarkan profil atlet. Tampilan mobile-first dengan dukungan dark mode (mengikuti pengaturan sistem).

- **Profil**: data diri, target, kondisi cedera, alat, zona lari, ringkasan 7 hari, 10 aktivitas terakhir, dan kartu wellness (HRV, resting HR, CTL/ATL).
- **Generator Lari**: 30/45/60 menit × Easy/Moderate/High, lengkap dengan pace, HR, RPE, format "Set" ala Huawei Health.
- **Generator ST**: Full Body/Upper Push/Upper Pull/Lower dengan Spine-Friendly Protocol, RPE maks 7, prehab wajib.
- **Saran hari ini**: gabungan readiness (HRV, resting HR, sesi kemarin) dan konteks mingguan (80/20, kenaikan km, jarak ST kaki ↔ lari berat), dengan tombol untuk langsung menerapkan saran.
- **Demo Mode** otomatis jika `INTERVALS_API_KEY` kosong.
- **Log & progresi beban**: catat gerakan utama ★ setelah sesi ST. Beban sesi berikutnya disesuaikan otomatis (tersimpan di perangkat, dengan ekspor/impor JSON).
- **PWA**: bisa di-install ke layar utama HP dan berjalan full-screen (lihat [Install di HP](#install-di-hp-add-to-home-screen)).

## Menjalankan

Butuh Node.js 20.9 atau lebih baru.

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Tanpa `.env.local`, aplikasi berjalan di **Demo Mode** memakai data dummy dari `lib/mock-data.ts`.

## Konfigurasi `.env.local`

Salin `.env.example` menjadi `.env.local` lalu isi:

```env
INTERVALS_API_KEY=isi_api_key_kamu
INTERVALS_ATHLETE_ID=0
```

| Variabel | Keterangan |
| --- | --- |
| `INTERVALS_API_KEY` | API key intervals.icu. Kosongkan untuk Demo Mode. |
| `INTERVALS_ATHLETE_ID` | ID atlet (mis. `i123456`). `0` = atlet pemilik API key. |

Restart `npm run dev` setelah mengubah `.env.local`. Semua file `.env*` (kecuali `.env.example`) sudah masuk `.gitignore`.

> **Keamanan:** API key hanya dibaca di server (`lib/intervals/client.ts` memakai `import "server-only"`). Key tidak pernah dikirim ke browser. Error dari intervals.icu (401/403/404/5xx/timeout) ditampilkan sebagai pesan singkat tanpa stack trace.

## Cara mendapatkan API key intervals.icu

1. Login ke https://intervals.icu.
2. Buka **Settings** (ikon gerigi, kiri bawah).
3. Gulir ke bagian **Developer Settings**.
4. Klik **Generate API Key** (atau salin key yang sudah ada).
5. ID atlet kamu (format `i123456`) tertera di bagian yang sama. Kamu juga bisa memakai `0`.

Pastikan jam Huawei (via Huawei Health → Strava/intervals.icu) dan data wellness (HRV, resting HR, tidur) sudah tersinkron ke intervals.icu. Field yang kosong akan tampil sebagai "—".

## Mengedit profil atlet

Semua data profil ada di [`config/athlete-profile.json`](config/athlete-profile.json). Tidak ada database di V1.

- **Movement library** adalah whitelist: generator ST hanya memakai gerakan yang terdaftar di sini.
- Gerakan dengan `"available": false` tercatat di library tapi **tidak** diresepkan. Contohnya `Negative Pull-Up`: ubah jadi `true` kalau sudah mampu, dan gerakan itu otomatis masuk di awal sesi Upper Pull setelah Dead Hang.
- Batas beban ditulis sebagai teks (`"10–20 kg/tangan"`, `"5 kg"`, `"Bodyweight"`, `"Light/Medium Band"`) dan di-parse otomatis. Beban yang diresepkan tidak pernah melebihi batas atas.
- Zona lari di profil ditampilkan apa adanya di halaman Profil. Generator memakai acuan yang lebih konservatif untuk HR: Easy **< 140**, Tempo **160–170**.
- `training.blockStart` (tanggal Senin, `YYYY-MM-DD`) dan `training.blockWeeks` (default 4) mengatur blok periodisasi. Ubah `blockStart` untuk memulai blok baru, misalnya setelah libur atau cedera.

## Aturan generator

**Lari** (`lib/generator/run.ts`). Total durasi selalu tepat sesuai pilihan.

| Level | Isi |
| --- | --- |
| Easy | Continuous Z2, run-walk 4'/1', atau Z2 + cadence drill. Semua HR < 140 |
| Moderate | Tempo 6:15–6:30/km, HR 160–170, RPE 6–7: continuous, tempo terputus, cruise interval (jeda 1'), atau progression run (Z2 → tempo) |
| High 30' | Mini interval 5:15–5:35/km, RPE 7–8: 1'/1', 2'/2', 3'/2', atau 30"/30", repetisi disesuaikan agar muat |
| High 45'/60' | Norwegian 4×4 @ 5:50/km (recovery jog 3') atau 15/15 (set 20×15"/15", jog 3' antar set) |

Setiap workout lari menyertakan pengingat cadence 175–180 SPM dan cue "rel kereta". Jika ada data cadence 14 hari terakhir di bawah 175 SPM, generator memberi target personal +5% (maksimal 180).

**ST** (`lib/generator/strength.ts`):
- RPE Easy 5 / Moderate 6 / High 7, dan tidak pernah lebih dari 7.
- Lower & Full Body selalu berisi Tibialis Wall Raise, Eccentric Calf Raise, dan minimal satu gerakan stabilitas panggul (Lateral Band Walk/Clamshell).
- Upper Pull selalu diawali progresi pull-up (Dead Hang).
- Durasi menentukan jumlah gerakan dan set. Estimasi waktu dijaga ±2 menit dari target.
- Pola axial loading berat tanpa tumpuan (conventional deadlift, back squat, dll.) diblokir oleh validator.

**Periodisasi & variasi** (`lib/generator/block.ts`):
- **Blok 4 minggu:** 3 minggu normal lalu 1 minggu deload, dihitung dari `training.blockStart`.
- **Gerakan utama (★)** adalah gerakan multi-joint yang dikunci selama satu blok, supaya progres bisa diukur. Gerakan ini berganti otomatis saat blok baru dimulai.
- **Aksesori dan skema rep** (Volume 12–15, Standar 10–12, Tegangan 8–10) berputar setiap kali **Generate ulang** ditekan. Skema dibatasi per level: Easy tanpa Tegangan, High tanpa Volume.
- **Minggu deload:** RPE turun satu tingkat (minimal 5), beban turun satu tingkat, dan set gerakan utama dikurangi untuk Moderate/High. Lari mendapat catatan untuk menurunkan intensitas.

**Progresi beban** (`lib/progression.ts`, halaman **Log**):
- Setelah sesi ST, tekan **Catat sesi** untuk mengisi beban, rep set terakhir (atau detik untuk Dead Hang/Farmer's Hold), dan RPE gerakan ★.
- **Naik satu langkah** bila 2 sesi berturut-turut mencapai batas atas rep dengan RPE ≤ target ("2-for-2", NSCA). Langkahnya 1 kg untuk rentang ≥ 10 kg, 0,5 kg untuk ≥ 3 kg, dan 0,25 kg untuk rentang di bawahnya.
- **Tahan** bila RPE sedikit di atas target. **Turun** bila RPE lebih dari target + 1.
- Beban **tidak pernah melewati** batas movement library. Setelah mentok di batas, progresi dilanjutkan lewat tempo.
- Gerakan tahan naik 5 detik (maksimal 60). Gerakan band naik ke band berikutnya.
- Minggu deload: progresi ditunda, dan sesi deload tidak dipakai sebagai basis.
- Data disimpan di **localStorage perangkat ini** dan tidak dikirim ke server. Lakukan **Ekspor JSON** berkala di halaman Log sebagai cadangan, dan **Impor JSON** untuk memulihkan atau memindahkan ke HP lain.

**Saran hari ini** (`lib/coach.ts`). Semuanya non-blokir. Tombolnya hanya menurunkan pilihan, tidak pernah menaikkan.

| Aturan | Pemicu | Saran |
| --- | --- | --- |
| Readiness | HRV < 85% rata-rata 7 hari, resting HR ≥ +5 bpm, atau long run/sesi berat kemarin | Turun satu level (sekali, tidak berantai) |
| 80/20 | ≥ 2 lari berat dalam 7 hari (HR ≥ 155, nama tempo/interval, atau pace ≤ 6:30 tanpa HR) | Lari: Easy |
| Progresi jarak | km 7 hari naik > 30% dari 7 hari sebelumnya (basis ≥ 5 km) | Lari: 30', plus sisa km aman |
| Setelah ST kaki | ST dengan nama Lower/Full/Leg/Squat… kemarin atau hari ini | Lari: maksimal Moderate |
| Setelah lari berat | Lari berat atau long run (≥ 12 km) kemarin atau hari ini | ST: Upper Pull/Push |

Kartu "7 hari terakhir" di Profil juga menampilkan distribusi easy/berat (garis acuan 80%) dan perubahan km dibanding minggu sebelumnya.

Dasar ilmiah: Seiler (distribusi intensitas 80/20), Nielsen dkk. 2014 (kenaikan > 30% dan shin splints), Wilson dkk. 2012 (concurrent training), Bompa & Buzzichelli (periodisasi), NSCA *Essentials* (multi-joint sebagai fondasi), Kassiano dkk. 2022 (variasi sistematis, bukan acak), Moesgaard dkk. 2022 (undulating periodization), Daniels (kategori pace), Helgerud dkk. 2007 (4×4 & 15/15), Heiderscheit dkk. 2011 (cadence +5–10%).

Pembuat pola dan validator/sanitizer dipisah: `validate.ts` membuang gerakan yang tidak terdaftar, meng-clamp RPE dan beban, lalu memvalidasi aturan. Tombol **Generate ulang** memakai seed acak baru. Seed yang sama selalu menghasilkan workout yang sama.

## Testing

```bash
npm test
```

Vitest menjalankan:
- `__tests__/generator.test.ts`: akurasi durasi (±2 menit), RPE ≤ 7, batas beban, prehab wajib, whitelist gerakan, dan seluruh kombinasi input (9 lari + 36 ST) × 25 seed × 3 kondisi blok (normal, deload, blok berikutnya).
- `__tests__/data.test.ts`: tanggal WIB & minggu Senin–Minggu, normalisasi field null/cadence, ringkasan 7 hari, readiness.
- `__tests__/progression.test.ts`: aturan 2-for-2, tahan/turun berdasarkan RPE, batas library, deload, gerakan tahan & band, penerapan ke workout (tetap lolos validator), dan validasi data impor.
- `__tests__/coach.test.ts`: klasifikasi lari berat/ST kaki, aturan 80/20, progresi km > 30%, concurrent training, dan penggabungan saran tanpa penurunan berantai.
- `__tests__/periodization.test.ts`: posisi blok & deload, gerakan utama tetap dalam satu blok dan selalu multi-joint, rotasi skema rep, jumlah pola lari, dan target cadence personal.

Pemeriksaan tambahan:

```bash
npm run typecheck
npm run build
```

## Deployment ke Vercel

### 1. Hubungkan repo GitHub ke Vercel

1. Push project ke GitHub. Pastikan `.env.local` **tidak** ikut ter-commit (sudah diabaikan oleh `.gitignore`).
   ```bash
   git add .
   git commit -m "Hybrid Athlete Dashboard V1"
   git remote add origin https://github.com/<username>/hybrid-athlete-dashboard.git
   git push -u origin main
   ```
2. Login ke https://vercel.com (bisa memakai akun GitHub).
3. Klik **Add New… → Project**, pilih repo `hybrid-athlete-dashboard`, lalu klik **Import**.
4. Framework Preset otomatis terdeteksi sebagai **Next.js**. Build Command (`next build`) dan Output Directory tidak perlu diubah.

### 2. Isi Environment Variables

Sebelum klik **Deploy** (atau nanti lewat **Settings → Environment Variables**), tambahkan:

| Key | Value | Environment |
| --- | --- | --- |
| `INTERVALS_API_KEY` | API key dari intervals.icu | Production (+ Preview jika perlu) |
| `INTERVALS_ATHLETE_ID` | `0` atau ID atlet (mis. `i123456`) | Production (+ Preview jika perlu) |

Lalu klik **Deploy**. Setelah selesai kamu mendapat URL seperti `https://hybrid-athlete-dashboard.vercel.app`.

- Jika environment variable diubah setelah deploy, buka **Deployments → ⋯ → Redeploy** agar nilainya terpakai.
- Setiap `git push` ke branch utama otomatis memicu deploy ulang.
- Tanpa `INTERVALS_API_KEY`, versi Vercel pun berjalan di Demo Mode.

Alternatif via CLI:

```bash
npm i -g vercel
vercel
vercel env add INTERVALS_API_KEY
vercel env add INTERVALS_ATHLETE_ID
vercel --prod
```

> **Privasi:** V1 belum punya login, jadi siapa pun yang tahu URL-nya bisa melihat data intervals.icu kamu. Simpan URL secara privat, atau aktifkan **Settings → Deployment Protection → Vercel Authentication** (hanya akun Vercel kamu yang bisa membuka).

## Install di HP (Add to Home Screen)

Aplikasi ini adalah Progressive Web App (PWA). Setelah di-install, aplikasi punya ikon sendiri di layar utama dan terbuka full-screen tanpa address bar browser.

### Android (Chrome)

1. Buka URL Vercel kamu di **Chrome**.
2. Tekan **titik tiga (⋮)** di pojok kanan atas.
3. Pilih **"Install App"** atau **"Tambahkan ke Layar Utama"**.
4. Konfirmasi dengan **Install**. Ikon "Hybrid App" muncul di layar utama/app drawer.

Chrome kadang juga menampilkan banner "Install app" otomatis di bagian bawah layar.

### iOS (Safari)

1. Buka URL Vercel kamu di **Safari** (di iOS, install PWA hanya bisa lewat Safari).
2. Tekan tombol **Share** (kotak dengan panah ke atas) di bagian bawah layar.
3. Gulir ke bawah, pilih **"Add to Home Screen" / "Tambah ke Layar Utama"**.
4. Tekan **Add**. Ikon "Hybrid App" muncul di layar utama.

### Catatan PWA

- Konfigurasi ada di `public/manifest.json` (nama, warna, ikon, mode `standalone`, orientasi portrait) dan metadata di `app/layout.tsx`.
- Ikon digambar dari `public/icon.svg`. Setelah mengubah SVG, render ulang semua PNG dengan:
  ```bash
  npm run icons
  ```
- Install PWA butuh **HTTPS**, jadi URL Vercel bisa langsung dipakai. Mengakses dev server via IP LAN (`http://192.168.x.x:3000`) tetap bisa dipakai untuk mencoba, tapi tombol Install tidak akan muncul.
- Aplikasi tetap butuh internet untuk mengambil data intervals.icu. V1 belum punya mode offline (service worker).
- Setelah deploy baru, tutup lalu buka lagi aplikasi dari layar utama untuk memuat versi terbaru. Kalau ikon/nama belum berubah, hapus lalu install ulang.

## Struktur folder

```
app/                    halaman (Profil, /run, /strength, /activity/[id])
public/                 manifest.json, icon.svg + ikon PNG (PWA)
scripts/                generate-icons.mjs
components/             UI (profile/, generator/, ui/)
config/athlete-profile.json
lib/
  generator/            modul murni: run.ts, strength.ts, meta.ts, validate.ts, format.ts, rng.ts
  intervals/            client.ts (server-only), normalize.ts, summary.ts, data-source.ts
  mock-data.ts          data Demo Mode
  readiness.ts          aturan Readiness Advisory
  date.ts               helper WIB (UTC+7)
__tests__/              unit test Vitest
```
