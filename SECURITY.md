# Keamanan

> **English summary.** Please report vulnerabilities privately via [Report a vulnerability](https://github.com/khaliladha11/hybrid-athlete-dashboard/security/advisories/new), not in public issues. Never paste secrets or health data anywhere: API keys, passcodes, session secrets, Redis tokens. That includes reports and AI chats. If you already did, rotate the secret. Only the latest release is supported.

## Melaporkan kerentanan

Laporkan **secara privat** lewat [Security › Report a vulnerability](https://github.com/khaliladha11/hybrid-athlete-dashboard/security/advisories/new). Hanya pemilik repo yang bisa membacanya. Jangan membuka issue publik untuk masalah keamanan.

Sertakan:
- versi (Setting › Tentang & versi) dan cara memasang (tombol Deploy, fork, lokal);
- langkah untuk mereproduksi, sebaiknya di **Demo Mode**;
- dampak yang kamu lihat.

Ini proyek pribadi tanpa tim keamanan. Laporan dibalas sebisanya, biasanya dalam beberapa hari.

## Jangan pernah menempel rahasia

Rahasia dan data kesehatan **tidak pernah** ditulis di issue, pull request, diskusi, laporan, atau chat dengan asisten AI. Ini berlaku untuk API key intervals.icu, `APP_PASSCODE`, `SESSION_SECRET`, token Upstash/Redis, dan data kesehatan apa pun.

Bila terlanjur menempelnya:

1. **intervals.icu:** buat API key baru di Settings › Developer Settings, lalu ganti `INTERVALS_API_KEY` di Vercel.
2. **Sandi aplikasi:** ganti `APP_PASSCODE` dan `SESSION_SECRET` (buat nilai baru dengan `npm run secret`). Semua sesi otomatis keluar.
3. **Upstash:** buat ulang token database di dashboard Upstash atau Vercel Storage.
4. Redeploy di Vercel.

## Versi yang didukung

Hanya rilis terbaru yang didukung. Salinan dan fork menerima perbaikan lewat workflow pembaruan (README › Menerima pembaruan).

## Cakupan

Setiap orang memasang deploy dan database sendiri, jadi pemilik repo tidak menyimpan data siapa pun. Masalah keamanan pada deploy milik orang lain dilaporkan ke pemilik deploy itu.
