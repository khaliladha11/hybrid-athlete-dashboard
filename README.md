# Hybrid Athlete Dashboard (V1)

Dashboard profil atlet yang tersambung ke [intervals.icu](https://intervals.icu), plus generator latihan **lari** dan **strength training (ST)** berdasarkan profil atlet. Tampilan mobile-first dengan dukungan dark mode (mengikuti pengaturan sistem).

- **Profil**: data diri, target, kondisi cedera, alat, zona lari, ringkasan 7 hari, 10 aktivitas terakhir, dan kartu wellness (HRV, resting HR, CTL/ATL).
- **Generator Lari**: 30/45/60 menit × Easy/Moderate/High, lengkap dengan pace, HR, RPE, format "Set" ala Huawei Health.
- **Generator ST**: Full Body/Upper Push/Upper Pull/Lower dengan Spine-Friendly Protocol, RPE maks 7, prehab wajib.
- **Readiness Advisory**: saran turun satu level bila HRV turun, resting HR naik, atau kemarin ada long run/sesi berat.
- **Demo Mode** otomatis jika `INTERVALS_API_KEY` kosong.
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

## Aturan generator

**Lari** (`lib/generator/run.ts`). Total durasi selalu tepat sesuai pilihan.

| Level | Isi |
| --- | --- |
| Easy | Continuous Z2 atau run-walk 4'/1', HR < 140 |
| Moderate | Pemanasan Z2 → blok tempo 6:15–6:30/km, HR 160–170, RPE 6–7 → pendinginan |
| High 30' | Mini interval 5:15–5:35/km, RPE 7–8, repetisi disesuaikan agar muat |
| High 45'/60' | Norwegian 4×4 @ 5:50/km, recovery jog 3' |

Setiap workout lari menyertakan pengingat cadence 175–180 SPM dan cue "rel kereta".

**ST** (`lib/generator/strength.ts`):
- RPE Easy 5 / Moderate 6 / High 7, dan tidak pernah lebih dari 7.
- Lower & Full Body selalu berisi Tibialis Wall Raise, Eccentric Calf Raise, dan minimal satu gerakan stabilitas panggul (Lateral Band Walk/Clamshell).
- Upper Pull selalu diawali progresi pull-up (Dead Hang).
- Durasi menentukan jumlah gerakan dan set. Estimasi waktu dijaga ±2 menit dari target.
- Pola axial loading berat tanpa tumpuan (conventional deadlift, back squat, dll.) diblokir oleh validator.

Pembuat pola dan validator/sanitizer dipisah: `validate.ts` membuang gerakan yang tidak terdaftar, meng-clamp RPE dan beban, lalu memvalidasi aturan. Tombol **Generate ulang** memakai seed acak baru. Seed yang sama selalu menghasilkan workout yang sama.

## Testing

```bash
npm test
```

Vitest menjalankan:
- `__tests__/generator.test.ts`: akurasi durasi (±2 menit), RPE ≤ 7, batas beban, prehab wajib, whitelist gerakan, dan seluruh kombinasi input (9 lari + 36 ST) × 25 seed.
- `__tests__/data.test.ts`: tanggal WIB & minggu Senin–Minggu, normalisasi field null/cadence, ringkasan 7 hari, readiness.

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
