<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-on-dark.png">
    <img src="docs/brand/lockup.png" width="360" alt="Hybrid Athlete">
  </picture>
</p>

# Hybrid Athlete Dashboard

Jujur, tiap kali mau olahraga sering bingung hari ini mau latihan apa. Lari atau strength? Santai atau gas? Kemarin udah berat belum? Project ini saya bikin buat jawab pertanyaan itu. Aplikasinya baca data latihan dan wellness dari [intervals.icu](https://intervals.icu), lalu langsung kasih satu workout **lari** atau **strength training (ST)** buat hari ini yang pas sama kondisi badan, riwayat cedera, dan alat yang ada. Dibuat untuk **hybrid athlete**: lari target 10K–21K plus ST di rumah (ini saya btw hehe).

Dibangun mobile-first sebagai **PWA**: bisa di-install ke layar utama HP dan dipakai seperti aplikasi native. Tampilannya mengikuti design system **"Tag"** ([docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)): rasanya seperti tag lari yang ditempel di layar. Dark-first dengan permukaan charcoal, satu aksen oranye, judul italic condensed, label mono kecil, angka besar rata kolom, dan grafik yang menggambar bentuk latihan.

[![CI](https://github.com/khaliladha11/hybrid-athlete-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/khaliladha11/hybrid-athlete-dashboard/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6e9f18?logo=vitest&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?logo=pwa&logoColor=white)

<table>
  <tr>
    <td><img src="docs/screenshots/01-profile.jpg" width="220" alt="Profil dengan saran hari ini"></td>
    <td><img src="docs/screenshots/03-run-generator.jpg" width="220" alt="Generator lari dengan strip saran dan kesulitan berwarna"></td>
    <td><img src="docs/screenshots/04-run-workout.jpg" width="220" alt="Kartu tag Norwegian 4x4 dengan Segment Skyline rencana"></td>
  </tr>
  <tr>
    <td align="center"><sub>Profil &amp; saran hari ini</sub></td>
    <td align="center"><sub>Generator lari</sub></td>
    <td align="center"><sub>Workout + Segment Skyline</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/02-weekly-summary.jpg" width="220" alt="Ringkasan 7 hari dengan StatRow, 80/20, dan Week Ledger"></td>
    <td><img src="docs/screenshots/06-activity.jpg" width="220" alt="Detail aktivitas Norwegian 4x4 dengan kartu tag dan split per km"></td>
    <td><img src="docs/screenshots/08-program.jpg" width="220" alt="Program Half Marathon dengan perkiraan waktu lomba dan detail sumbernya"></td>
  </tr>
  <tr>
    <td align="center"><sub>7 hari terakhir + Week Ledger</sub></td>
    <td align="center"><sub>Detail aktivitas + split per km</sub></td>
    <td align="center"><sub>Program target (5K–FM)</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/05-strength-workout.jpg" width="220" alt="Generator strength dengan thumbnail gerakan"></td>
    <td><img src="docs/screenshots/09-movement-sheet.jpg" width="220" alt="Bottom sheet detail gerakan dengan gambar awal dan akhir"></td>
    <td><img src="docs/screenshots/10-setting.jpg" width="220" alt="Halaman Setting dengan katalog kondisi"></td>
  </tr>
  <tr>
    <td align="center"><sub>Generator ST + gambar gerakan</sub></td>
    <td align="center"><sub>Detail teknik gerakan</sub></td>
    <td align="center"><sub>Setting: kondisi, zona, alat</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/11-onboarding.jpg" width="220" alt="Onboarding langkah 1: selamat datang"></td>
    <td><img src="docs/screenshots/12-onboarding-connection.jpg" width="220" alt="Onboarding langkah 3: cek koneksi intervals.icu"></td>
    <td><img src="docs/screenshots/13-onboarding-summary.jpg" width="220" alt="Ringkasan onboarding dengan tombol Mulai tur"></td>
  </tr>
  <tr>
    <td align="center"><sub>Onboarding</sub></td>
    <td align="center"><sub>Cek koneksi intervals.icu</sub></td>
    <td align="center"><sub>Ringkasan + Mulai tur</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/14-tour.jpg" width="220" alt="Tur in-app menyorot Saran hari ini"></td>
    <td><img src="docs/screenshots/15-sync.jpg" width="220" alt="Setting: Sinkron & keamanan dan Riwayat cadangan"></td>
    <td><img src="docs/screenshots/07-light-mode.jpg" width="220" alt="Mode terang: kartu tag Progression Run"></td>
  </tr>
  <tr>
    <td align="center"><sub>Tur in-app</sub></td>
    <td align="center"><sub>Sinkron & Riwayat cadangan</sub></td>
    <td align="center"><sub>Mode terang</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/16-race-date.jpg" width="220" alt="Pemilih Hari H dengan warna saran lama program"></td>
    <td><img src="docs/screenshots/17-workout-mode.jpg" width="220" alt="Mode latihan: timer istirahat dan centang set gerakan utama"></td>
    <td><img src="docs/screenshots/18-muscle-map.jpg" width="220" alt="Sesi tersimpan dengan peta otot depan dan belakang"></td>
  </tr>
  <tr>
    <td align="center"><sub>Pilih Hari H</sub></td>
    <td align="center"><sub>Mode latihan</sub></td>
    <td align="center"><sub>Peta otot sesi</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/19-week-ledger-st.jpg" width="220" alt="Ringkasan 7 hari dengan beban ST dan Week Ledger berisi baris ST"></td>
    <td><img src="docs/screenshots/20-movement-muscle-map.jpg" width="220" alt="Detail gerakan Seated DB Curl dengan peta otot depan dan belakang"></td>
    <td><img src="docs/screenshots/21-insight.jpg" width="220" alt="Halaman Tren 12 minggu dengan grafik CTL, ATL, dan Form"></td>
  </tr>
  <tr>
    <td align="center"><sub>Week Ledger dengan ST</sub></td>
    <td align="center"><sub>Peta otot per gerakan</sub></td>
    <td align="center"><sub>Tren kebugaran</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/22-insight-weekly-km.jpg" width="220" alt="Mode terang: km mingguan easy dan berat dengan tabel data terbuka"></td>
    <td><img src="docs/screenshots/23-insight-muscle-heatmap.jpg" width="220" alt="Heatmap otot 7 hari dengan otot jarang dilatih bergaris putus-putus"></td>
    <td><img src="docs/screenshots/24-insight-pr-trend.jpg" width="220" alt="Mode terang: tren PR Barbell Squat mentok di 17 kg dengan penanda rep, tempo, dan varian"></td>
  </tr>
  <tr>
    <td align="center"><sub>Km mingguan 80/20 & Lihat tabel</sub></td>
    <td align="center"><sub>Heatmap otot</sub></td>
    <td align="center"><sub>Tren PR</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/25-insight-calendar.jpg" width="220" alt="Kepatuhan program dan kalender aktivitas 12 minggu"></td>
    <td><img src="docs/screenshots/26-checkin.jpg" width="220" alt="Kartu check-in harian dengan slider nyeri shin dan pilihan kualitas tidur"></td>
    <td><img src="docs/screenshots/27-checkin-advice.jpg" width="220" alt="Saran hari ini setelah check-in: nyeri shin maks Easy dan tidur turun satu level"></td>
  </tr>
  <tr>
    <td align="center"><sub>Kepatuhan & kalender</sub></td>
    <td align="center"><sub>Check-in harian</sub></td>
    <td align="center"><sub>Saran dari check-in</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/28-insight-body.jpg" width="220" alt="Mode terang: tren check-in dan status ambang pribadi di Insight"></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td align="center"><sub>Tubuh & ambang</sub></td>
    <td></td>
    <td></td>
  </tr>
</table>

<sub>Screenshot 0.10.0-ui (Profil & detail aktivitas diperbarui di 0.10.1, onboarding & tur di 0.11.2, sinkron di 0.12.2, Program & Hari H di 0.13.2–0.13.3, mode latihan, peta otot & Week Ledger ST di 0.14.1, peta otot per gerakan di 0.14.2, Tren di 0.15.0–0.15.1, check-in di 0.15.2), diambil dalam Demo Mode (data dummy) di lebar 375px.</sub>

> **Mau memakainya dengan data latihanmu sendiri di HP?** Ikuti [Pasang di HP-mu sendiri](#pasang-di-hp-mu-sendiri): gratis, sekitar 15 menit, tanpa menulis kode.

---

## Kenapa project ini ada

Data latihan saya sebenarnya udah lengkap di aplikasi jam. Masalahnya, data doang nggak ngasih tahu hari ini harus ngapain (sebenarnya ada fiturnya di app jam tangannya cuma kadang banyak yang berbayar, **bro in this economy**). Ujungnya saya buka beberapa aplikasi, lihat program dari internet, terus nebak. Kadang kebanyakan sesi berat, kadang malah skip karena kelamaan mikir (ini yang paling bikin males, mau olahraga aja harus mikir padahal bukan athlete).

Program generik juga nggak bisa langsung dipakai, karena badan saya punya aturan sendiri:

- **Anterior pelvic tilt / hiperlordosis:** nggak boleh ada beban axial berat tanpa tumpuan (Spine-Friendly Protocol).
- **Riwayat shin splints:** prehab wajib, dan kenaikan volume lari harus dijaga (masih pemula).
- **Overpronation / crossover gait:** perlu latihan stabilitas panggul, dengan target cadence 175–180 SPM.
- **Home gym terbatas:** cuma dumbbell modular, band, dan pull-up bar. Beban nggak boleh lebih dari yang ada (jarak gym dari rumah 18KM, jadi beli alat seadanya untuk di rumah).

Jadi daripada mikir ulang tiap pagi, semua aturan itu saya tulis jadi **modul TypeScript yang diuji**, bukan cuma catatan di kepala atau teks di prompt. Workout yang keluar selalu dicek dulu sebelum tampil. Sarannya tetap akan jadi saran: keputusan akhir tetap di kamu (bisa di custom kok di library webapp nya).

Awalnya ini cuma buat saya sendiri. Tapi kondisi, alat, zona lari, dan pilihan gerakan bisa diatur di aplikasi, jadi kamu juga bisa pasang pakai profil dan data intervals.icu-mu sendiri.

## Fitur

| Area | Yang bisa dilakukan |
| --- | --- |
| **Profil** | Data diri, target lomba, saran hari ini, wellness, ringkasan 7 hari, dan kalender aktivitas. Sejak 0.15.2 **check-in harian** (nyeri shin, pegal, tidur, mood; di bawah 10 detik) yang hanya bisa menurunkan saran, ambang pribadi dari LTHR/HRV/resting HR, dan ringkasan bulanan di awal bulan. |
| **Tren** | Sejak 0.15.0, "Lihat tren" membuka grafik 6 atau 12 minggu: CTL/ATL/Form, km mingguan dengan pembagian 80/20 (kenaikan > 30%, cutback, dan deload ditandai), pace/HR/cadence easy run, dan VDOT per minggu dengan selisih ke target. Sejak 0.15.1 juga kekuatan: volume ST per pola dan beban session-RPE, heatmap otot (dengan otot yang jarang dilatih dan gerakan untuk melatihnya), tren PR dengan tahap rep/tempo/varian saat beban mentok, kepatuhan program lari & ST, dan kalender aktivitas 12/26 minggu. Setiap grafik punya kalimat ringkasan dan "Lihat tabel"; data yang tidak dikirim jam ditulis apa adanya. |
| **Setting** | Kondisi & batasan dari **katalog berbasis riset** (10 kondisi, masing-masing dengan sumber) yang langsung mengubah generator; zona pace per jenis latihan (manual atau dihitung **VDOT Daniels** dari hasil lomba); alat (dumbbell, plat, barbell, band, pull-up bar); pilihan gerakan movement library; tema; dan cadangan data. |
| **Data intervals.icu** | Ringkasan 7 hari (km, pace, HR, long run, load), kalender aktivitas bulanan (ketuk tanggal untuk detail), detail aktivitas dengan **split per km** (dari data per detik jam atau GPS, divalidasi terhadap ringkasan) dan interval, serta wellness (HRV, resting HR, tidur, CTL/ATL/Form). Aktivitas yang tercatat dobel dari dua sumber (mis. jam + Strava) dihitung sekali. |
| **Generator lari** | 30/45/60 menit × Easy/Moderate/High dengan 13 pola: Z2, run-walk, cadence drill, tempo, cruise interval, progression run, mini interval, Norwegian 4×4, dan 15/15. Target pace dari zona di Setting, cue & catatan dari kondisi aktif, dan durasinya selalu tepat. |
| **Detail gerakan** | Thumbnail di setiap gerakan; tap untuk bottom sheet berisi gambar posisi awal ↔ akhir (crossfade, bisa dijeda), cue teknik, otot utama/sekunder, dan catatan kondisi aktif. Gambar dari free-exercise-db (Unlicense), disimpan lokal. |
| **Generator ST** | Full Body / Upper Push / Upper Pull / Lower. Hanya gerakan yang dipilih & bisa dilakukan dengan alat yang ada, RPE ≤ 7, beban yang benar-benar bisa dirakit dari plat, plus gerakan wajib/terlarang sesuai kondisi aktif (prehab shin, stabilitas panggul, Spine-Friendly, dll.). **Tanpa alat pun jalan**: Upper Push/Pull memakai gerakan cadangan (Push-Up, Wall/Knee Push-Up, Prone Y-T-W, Reverse Snow Angel), dan bila sesi tidak bisa disusun aplikasi menyebut alat yang dibutuhkan. |
| **Periodisasi** | Blok 4 minggu (3 normal + 1 deload). Gerakan utama ★ dikunci per blok, sedangkan aksesori dan skema rep berputar. Bisa **dimatikan** (toggle) untuk latihan bebas tanpa jadwal blok. |
| **Program target** | Program mingguan menuju **PB 5K, PB 10K, Half Marathon, atau Full Marathon**: fase Base → Build → Peak → Taper, long run naik ≤ 10%/minggu dengan cutback, race pace dari target waktu, dan jadwal ST yang tidak bentrok. Sejak 0.13.3 kamu memilih Hari H di kalender yang diwarnai saran lama program (rekomendasi umum + data long run-mu). Sejak 0.13 status sesi otomatis dari aktivitas, perkiraan waktu lomba, dan hitung mundur. Sejak 0.14.3 programnya **mingguan dan fleksibel**: sesi boleh dikerjakan di hari apa pun dalam minggunya (hari di rencana hanya saran), "Sesi minggu ini" menyarankan sesi yang paling cocok hari ini, minggu yang tidak lengkap cukup diberi catatan lembut, dan kalender menampilkan aktivitas di tanggal aslinya. |
| **Saran hari ini** | Menggabungkan readiness (HRV, resting HR, sesi kemarin), distribusi 80/20, kenaikan km mingguan, dan jarak antara ST kaki dan lari berat. Sarannya bisa diterapkan dengan satu tap. |
| **Progresi beban** | Catat sesi, lalu beban berikutnya disesuaikan otomatis (aturan "2-for-2" NSCA) ke beban berikutnya yang bisa dirakit, tanpa pernah melewati batas library. Riwayatnya ada di halaman Strength. |
| **Kirim ke jam** | Sejak 0.17: workout lari dari generator dan program dikirim ke kalender intervals.icu sebagai workout terstruktur, lalu diteruskan ke jam yang terhubung. Kirim ulang memperbarui event yang sama; bisa dihapus dari kalender. Lihat [Kirim workout ke jam](#kirim-workout-ke-jam). |
| **Salin cepat** | Workout ST sebagai teks ringkas; workout lari lewat tombol **Copy Set** (format "Set" Huawei Health), juga sebagai cadangan bila jam tidak tersambung ke intervals.icu. |
| **Onboarding & tur** | Saat pertama dibuka: disclaimer, profil, kondisi, zona lari, alat, cek koneksi intervals.icu, pengingat amankan deploy, pasang ke HP. Lalu tur singkat 5 sorotan; bisa diulang dari Setting › Tampilan. |
| **Demo Mode** | Tanpa API key, aplikasi tetap berjalan penuh memakai data dummy. |
| **PWA & design system** | Bisa di-install ke HP dan full-screen. Sejak 0.16 **tetap terbuka tanpa sinyal** (mis. di gym): mode latihan, log ST, dan check-in tersimpan di HP lalu tersinkron saat online; versi baru tidak pernah memuat ulang di tengah latihan. Design system "Tag": dark-first, satu aksen oranye `#FC4C02`, Archivo + Geist Mono, Segment Skyline & Week Ledger, dengan **toggle tema terang/gelap** yang tersimpan di perangkat. |
| **Sistem warna** | Intensitas: **Easy = hijau, Moderate = kuning, High = merah**. Status: **aktif/tercapai = hijau, nonaktif/belum = merah**. Kontras dijaga di tema terang maupun gelap. |

Detail aturan dan dasar ilmiahnya ada di **[docs/TRAINING-LOGIC.md](docs/TRAINING-LOGIC.md)**.

## Pasang di HP-mu sendiri

Gratis, sekitar 15 menit, tanpa menulis kode. Hasilnya: aplikasi di layar utama HP yang membaca data latihanmu sendiri dari intervals.icu, berjalan di akun Vercel milikmu sendiri.

> Mau dipandu asisten AI (ChatGPT, Claude, Gemini, dll.)? Tempel prompt di **[INSTALL-WITH-AI.md](INSTALL-WITH-AI.md)**. Asisten memandu langkah demi langkah; rahasia (API key, sandi) tetap kamu ketik sendiri di Vercel, tidak pernah di chat.

### Yang kamu butuhkan

- Akun **[intervals.icu](https://intervals.icu)** (gratis) yang sudah tersambung **langsung** ke jam atau aplikasi olahragamu (Garmin, Huawei Health, Coros, Polar, Suunto, Wahoo, Zepp, dll.).
  > Strava saja tidak cukup. intervals.icu tidak boleh meneruskan isi aktivitas dari Strava lewat API, jadi aktivitas yang masuk hanya lewat Strava akan tampil kosong ("Aktivitas Strava").
- Akun **[GitHub](https://github.com)** (gratis).
- Akun **[Vercel](https://vercel.com/signup)** paket Hobby (gratis). Paling mudah daftar dengan akun GitHub.
- HP Android dengan Chrome, atau iPhone dengan Safari.
- **Huawei:** HRV harian tidak dibuka lewat API Huawei, jadi baris HRV tidak tampil. Jalan keluarnya aplikasi Health Sync yang mengirim HRV ke intervals.icu; tanpa HRV, readiness memakai resting HR dan sesi kemarin.

### Cara A · Tombol Deploy to Vercel (paling mudah)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkhaliladha11%2Fhybrid-athlete-dashboard&project-name=hybrid-athlete&repository-name=hybrid-athlete&env=INTERVALS_API_KEY%2CAPP_PASSCODE%2CSESSION_SECRET&envDescription=API+key+intervals.icu%2C+sandi+aplikasi%2C+dan+teks+acak+untuk+sesi.+Cara+mendapatkannya+ada+di+README.&envLink=https%3A%2F%2Fgithub.com%2Fkhaliladha11%2Fhybrid-athlete-dashboard%23variabel-lingkungan)

1. Siapkan tiga nilai dulu (penjelasan di [Variabel lingkungan](#variabel-lingkungan)): **API key intervals.icu**, **sandi aplikasi** buatanmu, dan **`SESSION_SECRET`** acak.
2. Klik tombol di atas, login ke Vercel dengan GitHub, lalu biarkan Vercel membuat repo baru di akun GitHub-mu.
3. Vercel meminta `INTERVALS_API_KEY`, `APP_PASSCODE`, dan `SESSION_SECRET`. Ketik sendiri nilainya di kolom itu. Tombol tidak membawa nilai apa pun.
4. Klik **Deploy**, tunggu 1 sampai 2 menit, lalu buka alamat yang diberikan. Masukkan sandi aplikasi, lalu ikuti **onboarding**.
5. Lanjutkan: [Upstash Redis](#upstash-redis) (opsional), [kunci aksesnya](#setelah-deploy-kunci-aksesnya), [pasang di HP](#pasang-aplikasi-di-hp), dan [hubungkan jam](#kirim-workout-ke-jam).

> **Salinan (clone), bukan fork.** Tombol membuat repo baru yang tidak terhubung ke repo ini, jadi tombol **Sync fork** di GitHub tidak ada. Pembaruan datang lewat workflow yang membuka pull request, lihat [Menerima pembaruan](#menerima-pembaruan).

### Variabel lingkungan

Isi di **Vercel › project-mu › Settings › Environment Variables** (atau di `.env.local` saat menjalankan di komputer). Daftar ini berasal dari [`lib/env-schema.ts`](lib/env-schema.ts) dan dijaga test.

| Nama | Wajib di tombol | Untuk apa | Dari mana |
| --- | --- | --- | --- |
| `INTERVALS_API_KEY` | Ya | API key intervals.icu: membaca aktivitas & wellness dan mengirim workout ke kalender. Kosong = Demo Mode | [intervals.icu › Settings](https://intervals.icu/settings) › **Developer Settings** (paling bawah) › **API Key** |
| `APP_PASSCODE` | Ya | Sandi aplikasi, minimal 8 karakter. Mengunci semua halaman dan API | Buat sendiri. Jangan pakai ulang sandi akun lain |
| `SESSION_SECRET` | Ya | Teks acak minimal 32 karakter untuk menandatangani sesi sandi | Lihat [Membuat SESSION_SECRET](#membuat-session_secret) |
| `INTERVALS_ATHLETE_ID` | Tidak | ID atlet intervals.icu. Kosong atau `0` = pemilik API key | intervals.icu › Settings, di bawah nama (diawali `i`). Biasanya tidak perlu |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Tidak | Database sinkron antar perangkat. Nama `KV_REST_API_URL` / `KV_REST_API_TOKEN` juga diterima | Diisi otomatis saat [Upstash Redis](#upstash-redis) dihubungkan |

- Perlakukan semua nilai di atas seperti kata sandi: jangan ditulis ke file di repo, jangan ditempel ke chat (termasuk asisten AI).
- **Setiap kali mengubah env, redeploy:** Vercel › **Deployments** › **⋯** › **Redeploy**. Perubahan baru berlaku setelah itu.
- API key, sandi, dan secret hanya dibaca di server. Tidak pernah dikirim ke HP atau browser.

#### Membuat SESSION_SECRET

Jalankan salah satu di terminal, lalu salin hasilnya sendiri ke Vercel. Nilainya tidak disimpan di mana pun.

```bash
npm run secret
```

```bash
openssl rand -base64 32
```

Tanpa clone repo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Jangan pakai ulang secret dari tempat lain.

### Sandi aplikasi

Dengan `APP_PASSCODE`, setiap perangkat harus memasukkan sandi sekali sebelum aplikasi terbuka, lalu tetap terbuka 90 hari. Tombol Deploy mewajibkan sandi ini; di komputer sendiri boleh dikosongkan.

- **Salah sandi** 5 kali dari alamat yang sama → harus menunggu 15 menit.
- **Mengganti sandi:** ubah `APP_PASSCODE` di Vercel › Settings › Environment Variables, lalu **Redeploy**. Semua perangkat langsung terkunci dan perlu sandi baru. Mengganti `SESSION_SECRET` juga mengunci semua perangkat.
- **Mengunci satu perangkat** (mis. HP yang dipinjamkan): **Setting › Data › Kunci perangkat ini**.
- Bila `APP_PASSCODE` diisi tapi kurang dari 8 karakter atau `SESSION_SECRET` kurang dari 32 karakter, aplikasi tetap terkunci dan halaman sandi meminta konfigurasi dilengkapi.
- Sandi dan secret hanya dibaca di server; tidak pernah dikirim ke browser atau ditulis di log.

### Upstash Redis

Dengan database milikmu sendiri, log, Setting, program, dan profil sama di HP dan laptop, dan kembali sendiri setelah data browser dihapus. Butuh sandi aplikasi. Tombol Deploy belum bisa memasang database ini secara resmi (slug Upstash untuk tombol tidak didokumentasikan Vercel), jadi pasang sendiri setelah deploy:

1. Di Vercel, buka project-mu › **Storage** (atau **Marketplace**) › **Upstash Redis** › **Create** / **Install**. Paket **Free** sudah cukup.
2. **Connect** database ke project ini. Vercel mengisi env var otomatis: `KV_REST_API_URL` + `KV_REST_API_TOKEN` atau `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (keduanya didukung).
3. Pastikan `APP_PASSCODE` dan `SESSION_SECRET` sudah terisi, lalu **Redeploy**.
4. Buka **Setting › Data**: kartu **Sinkron & keamanan** menampilkan **TERSINKRON**.
5. **Perangkat kedua:** buka alamatmu, masukkan sandi, lalu di onboarding ketuk **Sambungkan perangkat ini** (atau tunggu sebentar; data diambil otomatis).

- **Cadangan otomatis:** sinkron pertama tiap hari (WIB) menyimpan snapshot; 7 terakhir ada di **Setting › Data & cadangan › Riwayat cadangan**. **Pulihkan** mengganti data di semua perangkat dan menyimpan keadaan sekarang dulu, jadi bisa dibatalkan.
- **Batas paket Free Upstash** (halaman harga resmi, dicek 2026-10-23): 500K perintah/bulan, data 256 MB, request maks 10 MB, bandwidth 10 GB/bulan. Satu sinkron memakai sekitar 2 perintah tulis/baca per bagian yang berubah, jauh di bawah batas untuk satu orang. Cek ulang di [upstash.com/pricing/redis](https://upstash.com/pricing/redis) karena bisa berubah.
- **Privasi:** database ada di akun Vercel-mu, hanya diakses server aplikasi setelah sandi diperiksa, dan pemilik repo tidak menerima apa pun. Data disimpan tanpa enkripsi tambahan dari aplikasi (Upstash mengenkripsi saat disimpan). **Menghapus data:** hapus database di Vercel › Storage.

### Cara B · Vercel CLI

Untuk yang terbiasa dengan terminal. Rahasia diketik di prompt CLI, tidak pernah ditulis di perintah atau file.

```bash
npm i -g vercel
```

1. **Fork** repo ini ke akun GitHub-mu, lalu clone ke komputer dan masuk ke foldernya.
2. Hubungkan ke project Vercel baru: `vercel link`.
3. Tambahkan env satu per satu; CLI menanyakan nilainya dan kamu yang mengetik: `vercel env add INTERVALS_API_KEY production`, lalu `APP_PASSCODE`, lalu `SESSION_SECRET`.
4. Deploy: `vercel deploy --prod`.

### Cara C · Fork manual

1. Login ke GitHub, buka halaman repo ini, klik **Fork** lalu **Create fork**.
2. Buka **[vercel.com/new](https://vercel.com/new)**, pilih fork-mu, klik **Import**. Nama project menjadi alamat aplikasimu: `nama-project.vercel.app`.
3. Di **Environment Variables**, isi tiga env wajib dari [Variabel lingkungan](#variabel-lingkungan), lalu **Deploy**.

Dengan fork, pembaruan bisa lewat **Sync fork** atau workflow pembaruan (lihat [Menerima pembaruan](#menerima-pembaruan)).

#### Isi profil lewat file (opsional)

Sejak 0.11.0 profil diisi lewat **onboarding** saat aplikasi pertama dibuka, jadi langkah ini opsional. Nilai di [`config/athlete-profile.json`](config/athlete-profile.json) hanya jadi default.

| Field | Isi | Bisa diubah lagi di aplikasi? |
| --- | --- | --- |
| `name`, `age`, `occupation`, `category` | Nama dan keterangan di header Profil | Belum, hanya di file ini |
| `targets.goals`, `targets.raceTargets` | Tujuan latihan & target lomba di Profil, juga target default Program | Belum |
| `training.blockStart` | Tanggal **Senin** awal blok latihan 4 minggu (`YYYY-MM-DD`). Isi Senin minggu ini | Belum |
| `conditions` | Kondisi cedera yang aktif: `apt`, `shin`, `overpronation`, `mcu`, `lbp`, `pfp`, `itbs`, `achilles`, `plantar`, `shoulder` (lihat [`lib/conditions.ts`](lib/conditions.ts)). Isi `[]` bila tidak ada | Ya, Setting › Kondisi |
| `equipment` | Alat di rumah: dumbbell (jumlah handle), barbell, plat (`kg` × `count`), band, pull-up bar, kursi | Ya, Setting › Alat |
| `runZones` | Pace default per zona latihan | Ya, Setting › Zona lari (manual atau hitung dari hasil lomba) |
| `movementLibrary` | Gerakan yang boleh dipakai & batas bebannya | Pilihan gerakan ya; batas beban hanya di file |

Repo publik ikut publik, jadi jangan isi file ini dengan data yang tidak mau dilihat orang lain. Kalau ragu, biarkan nilai bawaannya dan atur sisanya di aplikasi.

### Setelah deploy: kunci aksesnya

Tanpa proteksi, siapa pun yang tahu alamatnya bisa melihat data latihan dan kesehatanmu. Sandi aplikasi sudah mengunci aplikasinya; Vercel Authentication menambah lapisan di luarnya dan tetap dianjurkan. Onboarding langkah 4 menampilkan langkah yang sama; bila dilewati, pengingatnya ada di **Setting › Belum selesai**.

1. Di Vercel, buka project-mu, lalu **Settings › Deployment Protection**.
2. Aktifkan **Vercel Authentication** dengan cakupan **All Deployments**. Pilihan ini gratis di paket Hobby. Jangan berhenti di **Standard Protection**, karena cakupan itu tidak melindungi alamat utama `nama-project.vercel.app`.
3. Setelah itu, saat membuka aplikasi kamu diminta login dengan akun Vercel-mu.

Aplikasi yang dipasang di iPhone memakai penyimpanan terpisah dari Safari, jadi mungkin perlu login sekali lagi dari dalam aplikasi. Kombinasi proteksi ini dengan aplikasi yang dipasang belum diuji di semua HP.

### Pasang aplikasi di HP

- **Android (Chrome):** buka alamat Vercel-mu, ketuk menu **⋮**, lalu **Instal aplikasi** atau **Tambahkan ke layar utama**.
- **iPhone (Safari):** buka alamat Vercel-mu, ketuk **Bagikan**, lalu **Tambah ke Layar Utama**.

Aplikasi terbuka layar penuh dengan ikon "Forward H", seperti aplikasi biasa. Onboarding langkah 9 membantu hal yang sama: di Android/Chrome ada tombol **Pasang aplikasi**, di iPhone ada petunjuk Bagikan › Tambah ke Layar Utama. Aplikasi masih butuh internet untuk dibuka.

### Atur di dalam aplikasi

Onboarding sudah menanyakan profil, kondisi, zona lari, dan alat. Langkah yang kamu lewati muncul lagi di **Setting › Belum selesai**. Untuk mengubah semuanya nanti, buka tab **Setting**:

- **Kondisi & batasan:** aktifkan hanya yang benar-benar kamu alami. Setiap kondisi mengubah generator lari dan ST.
- **Zona lari:** isi pace per zona, atau isi hasil lomba/time trial terbaru lalu ketuk **Terapkan ke semua zona** (rumus VDOT Daniels).
- **Alat** dan **Gerakan:** centang yang kamu punya dan mau dipakai.

Pengaturan dan log latihan tersimpan di perangkat itu saja. Untuk pindah atau menambah perangkat: **Setting › Data & cadangan**, ekspor JSON, lalu impor di perangkat baru.

### Kirim workout ke jam

Tombol **Kirim ke jam** (Generator Lari dan sesi program) menaruh workout di kalender intervals.icu. intervals.icu lalu meneruskannya ke jam bila unggah workout terencana diaktifkan di **intervals.icu › Settings › Connections**:

| Jam | Yang perlu diaktifkan | Yang diterima |
| --- | --- | --- |
| **Huawei** | Kotak **HUAWEI Health** › centang **Upload planned workouts**. Di aplikasi Huawei Health, Health Service Kit harus tertaut (Me › 3rd Party Services). **Isi threshold pace lari** di intervals.icu › Settings › Run › Pace settings: tanpa itu unggah gagal ("Workout has no suitable steps") | Hanya lari, jalan, dan hiking. **Satu** workout: lari terencana berikutnya dalam seminggu; biasanya masuk sendiri ke Huawei Health beberapa saat setelah dikirim. Di jam: **Workout › Outdoor Run › Courses › Custom Courses**; bila belum ada, kirim dari Huawei Health (My running courses › ikon jam). Untuk workout lain, ketuk **Upload to Huawei** di event kalender |
| **Garmin** | Kotak Garmin › centang **Upload planned workouts**, lalu izinkan di Garmin Connect | Workout terencana seminggu ke depan, muncul setelah sinkron Garmin Connect |
| **Coros** | Kotak **Coros** › aktifkan unggah workout terencana | Seminggu ke depan. Bila belum muncul, tambahkan "Intervals.icu Training Plan" di kalender aplikasi Coros |
| Lainnya | Lihat halaman integrasi intervals.icu | Tanpa jam yang tersambung, pakai **Copy Set** |

Pilih merek jam sekali di kartu **Kirim ke jam**: setelah kirim, aplikasi menampilkan langkah sampai di jam, memeriksa (hanya membaca) apakah unggah ke merekmu aktif di intervals.icu, dan menyediakan **Cek status unggah** untuk melihat error unggah. intervals.icu tidak punya API untuk mendorong workout ke jam, jadi aplikasi tidak pernah mengklaim workout sudah di jam. Kirim ulang setelah workout diubah memperbarui event yang sama. API key intervals.icu milikmu sudah bisa menulis ke kalender; tanpa key (Demo Mode) tidak ada yang dikirim. Strength tidak dikirim sebagai workout; catatan teks di kalender bisa diaktifkan di **Setting › Tampilan & program**.

### Sudah memasang sebelum 0.11?

Sejak 0.11.0 profil (nama, target, kondisi, alat, tanggal blok) disimpan di perangkat, dan `config/athlete-profile.json` di repo netral. Data di HP-mu tidak hilang, tapi nama, target, dan tanggal blok yang dulu ada di JSON perlu dipindahkan sekali:

1. **Ekspor cadangan dulu.** Di HP: **Setting › Data & cadangan › Ekspor JSON**. Simpan filenya.
2. **Buat file migrasi** (bila profilmu ada di `config/athlete-profile.json` fork-mu). Di komputer, sebelum update: clone fork-mu lalu jalankan `node scripts/make-owner-settings.mjs`. Hasilnya `owner-settings.local.json`, yang otomatis diabaikan git, jadi jangan di-commit. Tanpa komputer: lewati langkah ini dan isi ulang di **Setting › Profil** setelah update.
3. **Update dan deploy** seperti di bawah (Sync fork). Kalau GitHub melaporkan konflik di `config/athlete-profile.json`, pilih versi terbaru (netral).
4. **Buka aplikasi.** Kamu hanya diminta menyetujui disclaimer sekali. Onboarding tidak diulang, dan log serta Setting tetap ada.
5. **Impor file migrasi.** **Setting › Data & cadangan › Impor JSON**, pilih `owner-settings.local.json` (kirim ke HP lewat chat atau drive pribadi). File ini hanya mengisi yang masih kosong, jadi alat, zona, dan pilihan gerakan yang sudah kamu ubah di HP tidak tertimpa.
6. **Cek** Setting › Profil (nama, target, tanggal blok), Zona lari, dan Alat.

### Menerima pembaruan

Setiap rilis di repo ini punya tag (`v1.0.0`, …) dan catatan rilis. Repo salinan atau fork-mu menerimanya lewat **pull request**, dan tidak pernah di-merge otomatis: kamu yang memutuskan kapan menerima. Workflow-nya ada di [`.github/workflows/upstream-update.yml`](.github/workflows/upstream-update.yml) dan sudah ikut tersalin ke repo-mu.

**Siapkan sekali di repo-mu (GitHub):**
1. **Fork:** buka tab **Actions**, lalu klik **I understand my workflows, go ahead and enable them**. Salinan dari tombol Deploy sudah aktif.
2. **Settings › Actions › General › Workflow permissions**: centang **Allow GitHub Actions to create and approve pull requests**, lalu **Save**. Tanpa ini workflow tidak bisa membuka PR.
3. Opsional, **Settings › Secrets and variables › Actions**:
   - Variabel **`UPSTREAM_REPO`** bila kamu mengikuti repo lain (bawaannya `khaliladha11/hybrid-athlete-dashboard`).
   - Secret **`UPSTREAM_UPDATE_TOKEN`**: [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) khusus repo-mu dengan izin **Contents**, **Pull requests**, **Workflows**, dan **Actions**: *Read and write*. Dengan token ini perubahan file workflow ikut di PR dan CI berjalan seperti biasa. Tanpa token, perubahan workflow ditulis sebagai langkah manual di PR (token bawaan GitHub tidak boleh mengubah `.github/workflows/`). Kamu sendiri yang mengetik token ini di GitHub; jangan menempelnya ke chat.

**Cara kerjanya:**
- Setiap **Senin 08:00 WIB** (atau kapan saja lewat **Actions › Upstream update › Run workflow**, boleh diisi tag tertentu), workflow membandingkan versi di `package.json` repo-mu dengan rilis stabil terbaru repo ini. Prarilis (`-rc`) hanya diambil bila tag-nya diisi manual.
- Bila ada versi baru, workflow membuat branch `upstream-update/<tag>` dan PR berisi perubahan, **Langkah manual** (mis. variabel lingkungan baru), dan catatan rilis. CI dijalankan untuk branch itu.
- Bila kamu mengubah baris yang juga diubah di sini, PR dibuka sebagai **draft** dengan daftar file yang konflik. Selesaikan penanda konflik di file itu, commit, lalu tandai siap. Bila pembaruan sama sekali tidak bisa diterapkan, workflow membuka issue dan gagal (kamu mendapat email dari GitHub).
- PR yang ditutup tidak dibuat ulang untuk tag yang sama. Hapus branch-nya bila ingin dibuat lagi.
- GitHub mematikan jadwal di repo publik yang 60 hari tanpa aktivitas. Bila itu terjadi, aktifkan lagi di tab Actions.

**Menerima pembaruan:**
1. Baca **Langkah manual** di PR dan kerjakan dulu (di Vercel, lalu Redeploy bila diminta).
2. Tunggu CI hijau, lalu **Merge**. Vercel men-deploy versi baru.
3. Di HP, tutup lalu buka lagi aplikasinya. Data lama dimigrasi otomatis; salinan sebelum migrasi bisa diunduh di Setting › Data & cadangan.

**Fork** juga tetap bisa memakai **Sync fork › Update branch**. Bila GitHub melaporkan konflik di `config/athlete-profile.json`, salin dulu isi file profilmu, pilih **Discard commits**, lalu isi lagi (lihat Isi profil lewat file).

### Kalau ada masalah

| Gejala | Penyebab dan solusinya |
| --- | --- |
| Banner **Demo Mode** masih muncul | Environment variable belum terisi, atau belum di-deploy ulang setelah diisi. Vercel › **Deployments** › **⋯** › **Redeploy**. |
| Langkah 3 onboarding: **API key belum diisi** | `INTERVALS_API_KEY` kosong. Isi di Vercel › Settings › Environment Variables, lalu Redeploy dan ketuk **Cek lagi**. |
| **API key ditolak (401)** | API key salah ketik atau sudah dibuat ulang. Salin lagi dari intervals.icu, perbarui di Vercel, lalu Redeploy. |
| **Akses ditolak (403)** / **Athlete ID tidak cocok dengan key** | Athlete ID tidak cocok dengan pemilik API key. Isi `0`, lalu Redeploy. |
| Langkah 3: **intervals.icu tidak bisa dihubungi** | intervals.icu sedang bermasalah atau koneksi server putus. Tunggu sebentar lalu **Cek lagi**. |
| Aktivitas tampil sebagai **Aktivitas Strava** tanpa data | Aktivitas itu hanya masuk lewat Strava. Sambungkan jam atau aplikasimu langsung ke intervals.icu. |
| **Split per km** tidak muncul | Jam tidak mengirim jarak per detik atau GPS ke intervals.icu, atau datanya tidak cocok dengan ringkasan aktivitas. Ringkasan sesi tetap tampil. |
| Tampilan atau ikon di HP masih versi lama | Tutup lalu buka lagi aplikasinya. Untuk ikon, hapus aplikasi dari layar utama lalu pasang ulang. |

## Progres pengembangan

| Versi | Status | Isi |
| --- | --- | --- |
| **0.1** Fondasi | ✅ Selesai | Profil + integrasi intervals.icu, generator lari & ST, validator aturan WAJIB, Demo Mode, readiness advisory, PWA, deploy Vercel |
| **0.2** Variasi terstruktur | ✅ Selesai | Periodisasi blok 4 minggu + deload, gerakan utama ★ per blok, rotasi skema rep, perpustakaan pola lari, target cadence personal, polesan UI mobile-native |
| **0.3** Konteks mingguan | ✅ Selesai | Aturan 80/20, peringatan kenaikan km > 30%, jarak concurrent training, kartu "Saran hari ini" dengan tombol aksi |
| **0.4** Progresi beban | ✅ Selesai | Log sesi di perangkat, progresi otomatis 2-for-2, halaman Log, ekspor/impor JSON |
| **0.5** Redesign UI | ✅ Selesai | Design system baru: token semantik, oranye sebagai warna utama, kartu ber-shadow, tipografi sistem, kontras teks AA, dark mode dari token yang sama |
| **0.6** Fleksibilitas & program target | ✅ Selesai | Toggle tema terang/gelap, sudut membulat, warna intensitas & status, toggle blok mingguan (mode bebas), modul Program Target 5K/10K/HM/FM |
| **0.7** Profil lebih ringkas | ✅ Selesai | Kalender aktivitas bulanan (ketuk tanggal untuk detail), saran hari ini ringkas dengan dropdown, kondisi & batasan dropdown |
| **0.8** Halaman Setting | ✅ Selesai | Tab Log → Setting: katalog kondisi berbasis riset yang mengubah generator, zona pace (VDOT Daniels), alat & beban yang bisa dirakit, pilihan movement library, cadangan data. Riwayat log pindah ke Strength |
| **0.9** Visual gerakan | ✅ Selesai | Gambar & detail teknik untuk 35/40 gerakan (free-exercise-db), 13 gerakan baru (stabilitas panggul, core, unilateral, soleus, bahu), toggle titik tambat band |
| **0.10-ui** Redesign "Tag" | ✅ Selesai | Token dark-first, tipografi Archivo + Geist Mono, StatRow, Segment Skyline (rencana & selesai), Week Ledger, kontras tombol AA |
| **0.10.1–0.10.2** Logo & data aktivitas | ✅ Selesai | Logo "Forward H", aktivitas ganda Huawei + Strava dihitung sekali, split per km yang divalidasi (GPS bila perlu), pemilih waktu & pace di Setting |
| **0.11** Onboarding & deploy pribadi | ✅ Selesai | Wizard 10 langkah, profil di perangkat + JSON netral, cek koneksi di server, pengingat proteksi deploy, pasang ke HP, tur in-app, strength tanpa alat |
| **0.12** Aman & tersinkron | ✅ Selesai | CI GitHub Actions, sandi aplikasi opsional, sinkron ke Upstash Redis milikmu, cadangan otomatis harian dengan Pulihkan, Sambungkan perangkat ini |
| **0.13** Program hidup | ✅ Selesai | Kepatuhan rencana vs aktual, rencana di kalender, ringkasan minggu di Profil, "Kerjakan sesi hari ini" ke generator, saran tahu rencana, perkiraan waktu lomba, saran update zona, geser/lewati sesi terlewat, hitung mundur. Spesifikasi: [docs/PROGRAM-HIDUP.md](docs/PROGRAM-HIDUP.md) |
| **0.14** Strength hidup | ✅ Selesai | 0.14.0 batas beban dari alat & keamanan, alat berbobot tetap, PR kemampuan, double progression, saran Gita, pengingat beli plat. 0.14.1 mode latihan + timer, session-RPE, ST mengikuti fase program, jeda 3 jam lari + ST, peta otot sesi. 0.14.2 11 gerakan baru (bisep, trisep, lats, betis, tibialis, varian satu sisi) & peta otot per gerakan. Cakupan: [docs/STRENGTH-HIDUP.md](docs/STRENGTH-HIDUP.md) |
| **0.15** Insight | ✅ Selesai | 0.15.0 halaman Tren: CTL/ATL/Form, km mingguan 80/20, easy run pace/HR/cadence, VDOT per minggu, setiap grafik dengan "Lihat tabel". 0.15.1 tren kekuatan: volume ST & session-RPE, heatmap otot, tren PR, kepatuhan, kalender heatmap. 0.15.2 check-in harian yang hanya menurunkan saran, ambang pribadi (LTHR, HRV, resting HR), ringkasan bulanan. Spesifikasi: [docs/INSIGHT.md](docs/INSIGHT.md) |
| **0.16** Siap offline & teruji | ✅ Selesai | Aplikasi terbuka tanpa sinyal (mode latihan & log ST offline, sinkron saat online), test e2e Playwright di CI, kontras & axe, anggaran Lighthouse, CSP dan header keamanan, latihan pemulihan data. Rencana: [docs/RELEASE-1.0.md](docs/RELEASE-1.0.md) |
| **0.17** Terhubung & mudah dipasang | ✅ Selesai | Kirim workout lari ke kalender intervals.icu (lalu ke jam), zona HR & RPE di Setting, tombol Deploy to Vercel, panduan pasang dengan AI |
| **1.0** Rilis | 💡 Rencana | Pembaruan otomatis lewat PR untuk fork, panduan pengguna lengkap, feature freeze. Detail: [roadmap di PRD](docs/PRD.md#7-roadmap--saran-pengembangan) |

Riwayat lengkap per versi ada di **[CHANGELOG.md](CHANGELOG.md)**.

## Tech stack

- **Next.js 16** (App Router, Server Components) + **React 19** + **TypeScript**
- **Tailwind CSS 4** dengan token semantik di [`app/globals.css`](app/globals.css). Dark mode mengikuti pengaturan sistem.
- **Vitest**: 46 file test, 588 test yang mencakup seluruh kombinasi input generator, program target, efek setiap kondisi/alat di Setting, dan perhitungan split per km dari data jam
- **intervals.icu REST API** (aktivitas, wellness, stream per detik), dipanggil hanya dari server
- Grafik SVG buatan sendiri (Segment Skyline), tanpa library chart
- Tanpa database. Profil default disimpan di JSON; Setting, log sesi, dan program di localStorage perangkat (bisa diekspor/impor).
- Deploy di **Vercel**

Arsitektur dan alur data dijelaskan di **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Menjalankan di komputer (untuk developer)

Butuh Node.js 20.9 atau lebih baru.

```bash
git clone https://github.com/khaliladha11/hybrid-athlete-dashboard.git
cd hybrid-athlete-dashboard
npm install
npm run dev
```

Buka http://localhost:3000. Tanpa konfigurasi apa pun, aplikasi berjalan di **Demo Mode** dengan data dummy.

Untuk memakai data asli, salin `.env.example` menjadi `.env.local` (sudah masuk `.gitignore`), lalu restart `npm run dev`:

```env
INTERVALS_API_KEY=isi_api_key_kamu
INTERVALS_ATHLETE_ID=0   # 0 = pemilik API key, atau ID seperti i123456
# Opsional: kunci aplikasi dengan sandi
# APP_PASSCODE=minimal-8-karakter
# SESSION_SECRET=teks-acak-minimal-32-karakter   # buat: npm run secret
```

API key hanya dibaca di server (`import "server-only"`) dan tidak pernah dikirim ke browser. Error 401/403/404/5xx ditampilkan sebagai pesan singkat tanpa stack trace. Cara deploy ada di [Pasang di HP-mu sendiri](#pasang-di-hp-mu-sendiri); setiap `git push` ke `main` men-deploy ulang otomatis.

### Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server development |
| `npm test` | Semua unit test (Vitest) |
| `npm run e2e` | Test end-to-end Playwright (setelah `npm run build`; Demo Mode, lokal memakai Microsoft Edge) |
| `npm run lighthouse -- http://localhost:3400` | Anggaran Lighthouse mobile terhadap server produksi yang berjalan |
| `npm run check:bundle` | Memastikan rahasia server tidak ada di bundle klien |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run build` | Build produksi |
| `npm run secret` | Mencetak `SESSION_SECRET` acak ke terminal (tidak disimpan) |
| `npm run icons` | Render ulang ikon PWA & favicon dari `public/icon.svg` dan `public/favicon.svg` |

## Struktur project

```
app/                     halaman: Profil, /run, /program, /strength, /setting, /activity/[id]
components/              UI: profile/, generator/, program/, settings/, log/, movements/, charts/, ui/
config/athlete-profile.json
lib/
  generator/             modul murni: run, strength, block (periodisasi), validate, format, rng
  intervals/             client (server-only), normalize, summary, data-source, dedupe, splits
  coach.ts               saran mingguan (80/20, progresi km, concurrent)
  conditions.ts          katalog kondisi berbasis riset → aturan generator
  run-zones.ts           rumus VDOT Daniels & pace
  equipment.ts           kebutuhan alat per gerakan, beban yang bisa dirakit
  athlete-settings.ts    pengaturan Setting → profil efektif
  movements/media.ts     gambar, cue, otot & sumber per gerakan
  program.ts             program target 5K / 10K / HM / FM
  preferences.ts         tema & toggle blok (localStorage)
  progression.ts         aturan progresi beban 2-for-2
  training-log.ts        penyimpanan log di perangkat
  readiness.ts           sinyal kesiapan dari wellness
  mock-data.ts           data Demo Mode
public/                  manifest PWA, ikon, favicon & gambar gerakan (movements/)
__tests__/               unit test Vitest
docs/                    PRD, dokumentasi, screenshot & aset logo (brand/)
```

## Masukan & kontribusi

- **Ide, pertanyaan, dan masukan** di [GitHub Discussions](https://github.com/khaliladha11/hybrid-athlete-dashboard/discussions). Bug dan masukan logika latihan (wajib dengan sumber) lewat templat issue.
- Cara menjalankan, menguji, dan mengusulkan perubahan ada di [CONTRIBUTING.md](CONTRIBUTING.md). Aturan perilaku di [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Kerentanan dilaporkan secara privat, lihat [SECURITY.md](SECURITY.md). Jangan pernah menempel API key, sandi, atau token di mana pun.

## Dokumentasi

Tampilan mengikuti **[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** (design system "Tag"), logo di **[docs/brand/LOGO.md](docs/brand/LOGO.md)**.

- **[docs/PRD.md](docs/PRD.md)**: gambaran produk, status semua fitur (sudah/belum), keterbatasan, dan roadmap pengembangan.
- **[docs/TRAINING-LOGIC.md](docs/TRAINING-LOGIC.md)**: semua aturan generator, periodisasi, saran, progresi beban, dan referensi ilmiahnya.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: arsitektur, alur data, batas keamanan, dan strategi testing.
- **[CHANGELOG.md](CHANGELOG.md)**: riwayat perubahan per versi.
- **[NOTICE.md](NOTICE.md)**: atribusi semua aset pihak ketiga (gambar gerakan, peta otot, font, ikon, dependensi) beserta lisensinya.

## Lisensi

Kode dirilis di bawah [MIT License](LICENSE), Copyright (c) 2026 Muhammad Khalil Adha. Aset pihak ketiga (gambar gerakan, path SVG peta otot, font Archivo & Geist Mono, beberapa ikon) memakai lisensinya sendiri, semuanya tercantum di [NOTICE.md](NOTICE.md).

## Disclaimer

Aplikasi ini adalah alat bantu perencanaan latihan pribadi, **bukan pengganti saran dokter, fisioterapis, atau pelatih bersertifikat**. Aturan di dalamnya awalnya dirancang untuk satu profil atlet tertentu. Bila kamu memasangnya untuk dirimu sendiri, sesuaikan kondisi, alat, dan zona dengan keadaanmu, konsultasikan cedera dengan tenaga kesehatan, dan hentikan latihan bila muncul nyeri. Segala saran yang ada di project ini harus di tinjau kembali, apa bila terjadi sesuatu berdasarkan saran dari project ini di tanggung masing masing. Saya bukan dokter cuma athelte rekreasional yang suka ngulik hal hal yang berbau teknologi, sains, dan kesehatan. Termakasih, boleh dong bintangnya hehe.
