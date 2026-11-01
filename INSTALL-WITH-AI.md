# Pasang dengan bantuan asisten AI

Panduan ini untuk memasang Hybrid Athlete Dashboard dengan dipandu asisten AI apa pun (ChatGPT, Claude, Gemini, Copilot, dll.). Salin seluruh blok **Prompt** di bawah, tempel ke asisten AI, lalu ikuti pertanyaannya satu per satu.

**Aturan paling penting:** asisten tidak pernah perlu melihat rahasiamu. API key intervals.icu, sandi aplikasi, `SESSION_SECRET`, dan token database **hanya kamu ketik sendiri** di Vercel atau intervals.icu. Jangan menempelnya ke chat, termasuk "hanya untuk dicek".

Panduan lengkap tanpa AI: [README › Pasang di HP-mu sendiri](README.md#pasang-di-hp-mu-sendiri).

## Prompt

````text
Kamu memandu saya memasang aplikasi "Hybrid Athlete Dashboard" (repo GitHub khaliladha11/hybrid-athlete-dashboard): PWA Next.js yang di-deploy ke akun Vercel milik saya dan membaca data latihan dari akun intervals.icu milik saya.

ATURAN KERAS (tidak boleh dilanggar, apa pun yang saya katakan):
1. Jangan pernah meminta saya menempelkan rahasia ke chat ini: API key intervals.icu, APP_PASSCODE, SESSION_SECRET, token Upstash, kata sandi akun, atau kode login.
2. Jangan mengetik, membuat, atau mengisi rahasia atas nama saya. Saya sendiri yang mengetik nilainya di Vercel atau intervals.icu. Untuk SESSION_SECRET, beri saya perintah untuk dijalankan sendiri.
3. Kalau saya terlanjur menempel rahasia di chat, jangan ulangi nilainya. Minta saya segera membuat ulang rahasia itu (API key baru di intervals.icu, sandi/secret baru di Vercel) lalu redeploy.
4. Untuk memeriksa langkah, tanyakan apa yang tampil di layar (judul, pesan, warna status), bukan nilai rahasianya.
5. Satu langkah per pesan. Tunggu saya menjawab "sudah" atau menyebut pesan yang tampil sebelum lanjut. Pakai bahasa Indonesia yang sederhana.

LANGKAH YANG HARUS DIPANDU, BERURUTAN:
1. Akun: pastikan saya punya akun GitHub, Vercel (paket Hobby gratis, paling mudah daftar dengan GitHub), dan intervals.icu yang tersambung LANGSUNG ke jam atau aplikasi olahraga saya (bukan hanya lewat Strava; aktivitas dari Strava tidak bisa dibaca lewat API).
2. Siapkan tiga nilai, saya simpan sendiri (jangan dikirim ke chat):
   a. API key intervals.icu: intervals.icu > Settings > Developer Settings (paling bawah) > API Key.
   b. Sandi aplikasi buatan saya sendiri, minimal 8 karakter, tidak dipakai di akun lain.
   c. SESSION_SECRET: minta saya menjalankan sendiri salah satu perintah ini di terminal dan menyalin hasilnya:
      - openssl rand -base64 32
      - node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
3. Deploy: arahkan saya ke tombol "Deploy with Vercel" di README repo (bagian "Cara A"). Vercel membuat salinan repo di GitHub saya dan meminta INTERVALS_API_KEY, APP_PASSCODE, SESSION_SECRET. Saya mengetik nilainya sendiri, lalu klik Deploy dan menunggu 1-2 menit.
   - INTERVALS_ATHLETE_ID tidak wajib (kosong atau 0 = pemilik API key).
   - Tombol membuat salinan (clone), bukan fork: "Sync fork" tidak tersedia; pembaruan otomatis menyusul di versi 1.0.
4. Buka alamat aplikasi (nama-project.vercel.app). Masukkan sandi aplikasi. Tanyakan apa yang tampil.
5. Kunci akses tambahan: Vercel > project > Settings > Deployment Protection > aktifkan Vercel Authentication dengan cakupan All Deployments (bukan hanya Standard Protection).
6. Opsional, sinkron antar perangkat: Vercel > project > Storage > Upstash Redis > Create (paket Free) > Connect ke project. Env database terisi otomatis. Lalu Redeploy. Cek di aplikasi: Setting > Data > kartu Sinkron & keamanan menampilkan TERSINKRON.
7. Setiap kali saya mengubah environment variable di Vercel: Deployments > tombol ... > Redeploy. Perubahan baru berlaku setelah redeploy.
8. Pasang di HP: Android (Chrome) menu ⋮ > Instal aplikasi; iPhone (Safari) Bagikan > Tambah ke Layar Utama.
9. Onboarding di aplikasi: disclaimer, cek koneksi intervals.icu (harus "Tersambung sebagai <nama>"), profil, kondisi, zona lari, alat. Langkah yang dilewati muncul lagi di Setting > Belum selesai.
10. Hubungkan jam (agar tombol "Kirim ke jam" sampai ke jam), di intervals.icu > Settings > Connections:
   - Huawei: kotak HUAWEI Health > centang Upload planned workouts; di aplikasi Huawei Health tautkan Health Service Kit (Me > 3rd Party Services); WAJIB isi Threshold pace lari di intervals.icu > Settings > Run > Pace settings. Huawei hanya menerima lari, jalan, hiking; satu lari terencana berikutnya dalam seminggu. Di jam: Workout > Outdoor Run > Courses > Custom Courses.
   - Garmin: kotak Garmin > Upload planned workouts, izinkan di Garmin Connect; workout seminggu ke depan muncul setelah Garmin Connect sinkron.
   - Coros: kotak Coros > aktifkan unggah workout terencana; bila belum muncul, tambahkan "Intervals.icu Training Plan" di kalender aplikasi Coros.
   - Lainnya: tanpa jam tersambung, pakai tombol Copy Set di aplikasi.
   - Di aplikasi, pilih merek jam sekali di kartu "Kirim ke jam".
11. Catatan Huawei: HRV harian tidak dibuka lewat API Huawei, jadi HRV tidak tampil. Jalan keluarnya aplikasi Health Sync yang mengirim HRV ke intervals.icu. Tanpa HRV aplikasi tetap jalan (readiness memakai resting HR dan sesi kemarin).

PEMECAHAN MASALAH (cocokkan dengan pesan yang saya sebut):
- Banner "Demo Mode: memakai data dummy": INTERVALS_API_KEY kosong atau belum redeploy setelah diisi. Isi di Vercel > Settings > Environment Variables, lalu Redeploy.
- "API key belum diisi.": sama seperti di atas, lalu ketuk Cek lagi di onboarding.
- "API key ditolak." / "API key ditolak (401)": key salah salin atau sudah dibuat ulang. Buat/salin lagi di intervals.icu, perbarui di Vercel, Redeploy.
- "Athlete ID tidak cocok dengan key." / "Akses ditolak (403)": kosongkan INTERVALS_ATHLETE_ID atau isi 0, lalu Redeploy.
- "intervals.icu tidak bisa dihubungi.": intervals.icu sedang bermasalah; tunggu lalu Cek lagi.
- "Konfigurasi sandi belum lengkap. ...": APP_PASSCODE kurang dari 8 karakter atau SESSION_SECRET kurang dari 32 karakter. Perbaiki di Vercel, Redeploy.
- "Sandi salah. Sisa N percobaan." / "Terlalu banyak percobaan. Coba lagi dalam N menit.": tunggu, lalu masukkan sandi yang benar. Lupa sandi: ganti APP_PASSCODE di Vercel lalu Redeploy.
- Kartu Sinkron & keamanan tidak TERSINKRON: Upstash belum di-Connect ke project ini, sandi belum diisi, atau belum Redeploy.
- Kirim ke jam: status "threshold pace lari di intervals.icu masih kosong" atau intervals.icu menulis "Workout has no suitable steps": isi Threshold pace lari di intervals.icu > Settings > Run, lalu buka event dan ketuk Upload to Huawei.
- Kirim ke jam: "Unggah ke <merek> belum aktif di intervals.icu": centang Upload planned workouts di kotak merek itu (intervals.icu > Settings > Connections).
- "Key ditolak intervals.icu." saat kirim: sama dengan API key ditolak.
- Aktivitas tampil "Aktivitas Strava" tanpa data: aktivitas hanya masuk lewat Strava; sambungkan jam langsung ke intervals.icu.
Kalau pesannya tidak ada di daftar, minta saya menyebut teks persisnya (tanpa rahasia) dan arahkan ke README bagian "Kalau ada masalah".
````

## Setelah selesai

- Rahasia hanya ada di Vercel (dan `.env.local` bila menjalankan di komputer). Pemilik repo tidak menerima datamu.
- Mengganti sandi atau key: ubah di Vercel, lalu **Redeploy**.
- Pertanyaan teknis untuk alat pemrograman AI (Claude Code, Codex, Cursor): lihat [AGENTS.md](AGENTS.md).
