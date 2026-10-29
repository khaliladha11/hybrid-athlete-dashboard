# Spesifikasi Aman & Tersinkron (0.12)

> Status: **selesai di 0.12.0 sampai 0.12.2, 2026-10-23** (diusulkan 2026-10-23). Status per fitur ada di [PRD §4.10](PRD.md#410-sinkron--keamanan). Bergantung pada 0.11 (onboarding, format ekspor v3).
> Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Desain mengikuti [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## 1. Tujuan

Data yang makin berharga sejak 0.8 (Setting, log ST, program, profil, status onboarding) **tidak hilang** saat data browser dihapus dan **sama di HP dan laptop**. Deploy juga tetap aman walaupun pemiliknya melewatkan langkah Vercel Authentication.

**Dianggap berhasil kalau:**
- Hapus data browser, buka lagi, masukkan sandi, lalu semua data kembali tanpa impor manual.
- Mencatat sesi di HP, lalu membuka laptop: sesi itu ada dalam hitungan detik setelah halaman dibuka.
- Tanpa database terpasang, aplikasi berjalan persis seperti 0.11 (lokal saja), seperti prinsip Demo Mode.
- Tidak ada data yang hilang karena dua perangkat mengubah hal berbeda pada waktu yang sama.

## 2. Konteks: tetap satu deploy per orang

Model 0.11 tidak berubah. Konsekuensinya:
- **Setiap orang memasang database sendiri** di akun Vercel-nya (Upstash Redis lewat Vercel Marketplace). Tidak ada database bersama, pemilik repo tetap tidak menerima data siapa pun.
- **Sinkron bersifat opsional.** Bila env var database tidak ada, aplikasi berjalan lokal saja.
- Tidak ada akun. Pemilik deploy dikenali lewat **sandi aplikasi** (env var), bukan login.

## 3. Bagian A: Sandi aplikasi

### Kenapa masih perlu walau ada Vercel Authentication
- Fork baru bisa saja melewatkan langkah "Amankan deploy" di onboarding.
- Endpoint tulis sinkron butuh pemeriksaan otorisasi sendiri, bukan hanya bergantung pada pengaturan Vercel.
- PWA yang terpasang di iOS memakai konteks cookie terpisah, sehingga login Vercel bisa diminta berulang. Sandi aplikasi memberi pengalaman "kunci" yang lebih terasa native.

Vercel Authentication tetap dianjurkan sebagai lapisan luar.

### Aturan
- Env var `APP_PASSCODE` (minimal 8 karakter) dan `SESSION_SECRET` (acak, ≥ 32 byte).
- Bila `APP_PASSCODE` **tidak diisi**: perilaku sama dengan 0.11, dan sinkron tidak aktif (sinkron mewajibkan sandi).
- Bila diisi: middleware mengunci semua halaman dan API, kecuali `/unlock`, aset statis, `manifest`, ikon, dan file yang dibutuhkan pemasangan PWA.
- `/unlock`: satu input sandi (≥ 16px, `type="password"`, `autocomplete="current-password"`), tombol **Buka**. Copy mengikuti DESIGN-SYSTEM §7.
- Berhasil: server memasang cookie sesi `httpOnly`, `Secure`, `SameSite=Lax`, berlaku 90 hari, ditandatangani HMAC dengan `SESSION_SECRET`. Tanda tangan menyertakan sidik jari sandi, sehingga **mengganti sandi membatalkan semua sesi**.
- Perbandingan sandi memakai perbandingan waktu-konstan.
- Pembatasan percobaan: maks 5 gagal per 15 menit per IP, disimpan di Redis bila tersedia. Tanpa Redis, batas di memori bersifat upaya terbaik dan dicatat sebagai keterbatasan.
- Tombol **Kunci perangkat ini** di Setting menghapus cookie.
- Sandi tidak pernah disimpan di `localStorage` dan tidak pernah dikirim balik ke browser.

## 4. Bagian B: Sinkron

### Penyimpanan
- Upstash Redis dari Vercel Marketplace. Nama env var yang dipasang integrasi bisa berbeda (`KV_REST_API_URL`/`KV_REST_API_TOKEN` atau `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`); dukung keduanya.
- Semua akses database hanya di server (`server-only`), sama seperti client intervals.icu.
- Batas paket gratis Upstash dicek saat implementasi dan dicatat di README. Desain di bawah dibuat hemat perintah (satu baca + satu tulis per sinkron).

### Bentuk data
Payload memakai bagian-bagian format ekspor v3, dipisah menjadi **dokumen per bagian**:

| Bagian | Contoh isi | Cara merge |
| --- | --- | --- |
| `profile` | nama, target, blok | Seluruh bagian, versi terbaru menang |
| `settings` | kondisi, zona, alat, gerakan, titik tambat | Per sub-bagian (kondisi, zona, alat, gerakan) |
| `program` | program target aktif | Seluruh bagian |
| `preferences` | tema, blok mingguan | Per kunci |
| `onboarding` | status langkah, disclaimer | Gabung: langkah selesai = gabungan; `termsVersion` = maksimum |
| `log` | entri sesi ST | **Per entri**: gabungan berdasarkan `id`, hapus memakai tombstone |
| `prs` (0.14.0), `sessions` (0.14.1) | PR kemampuan, sesi mode latihan (sejak 0.15.1 dengan rincian set) | Per entri seperti `log` |
| `checkins` (0.15.2) | check-in harian: nyeri shin, pegal, tidur, mood | **Per tanggal**: satu entri per hari, versi terbaru (`updatedAt`) menang, hapus memakai tombstone (dipadatkan setelah 90 hari). "Lewati hari ini" = entri tanpa isian, jadi perangkat lain juga tidak menanyakan lagi |

Aturan log:
- Setiap entri punya `id` stabil (UUID), `updatedAt`, dan opsional `deletedAt`.
- Entri lama tanpa `id` diberi `id` sekali saat migrasi.
- Menghapus entri membuat tombstone, bukan menghapus fisik. Tombstone disimpan minimal 90 hari lalu boleh dipadatkan.

### Konkurensi
- Server menyimpan nomor `rev` per bagian. Klien mengirim `baseRev` saat menulis.
- `baseRev` cocok → simpan, `rev` naik.
- Tidak cocok → server menolak dengan versi terbaru; klien menggabungkan (merge murni di atas), lalu mengulang. Maksimal 3 kali, lalu tampilkan status konflik.
- Urutan memakai `rev` dari server, bukan jam perangkat (jam HP bisa meleset).

### Kapan sinkron
- Saat aplikasi dibuka dan saat kembali terlihat (`visibilitychange`).
- Setelah perubahan lokal, dengan jeda 2 detik (debounce).
- Tombol **Sinkron sekarang** di Setting.
- Sejak 0.16 aplikasi terbuka offline (service worker, docs/ARCHITECTURE.md "Offline"): log ST, mode latihan, check-in, dan program tetap ditulis ke perangkat; banner "Sedang offline" memberi tahu. `/api/sync` tidak pernah di-cache.
- Offline atau gagal: perubahan ditandai "belum terkirim" di perangkat dan dicoba lagi pada pemicu berikutnya. Tidak ada data lokal yang dibuang karena gagal kirim.

### Cadangan otomatis
- Sekali sehari (saat sinkron pertama hari itu, WIB), server menyimpan snapshot seluruh bagian. Simpan 7 snapshot terakhir.
- Setting › Data & cadangan: **Riwayat cadangan** (tanggal + ringkasan jumlah log) dengan tombol **Pulihkan**. Memulihkan membuat snapshot dari keadaan saat ini dulu, supaya bisa dibatalkan.
- Ekspor/impor JSON manual tetap ada.

### Privasi data
- Data kesehatan kini tersimpan di database milik pengguna sendiri. Ini mengubah prinsip ARCHITECTURE "data kesehatan tidak keluar dari HP" dan harus dicatat sebagai keputusan.
- **Usulan default: tanpa enkripsi sisi klien** untuk 0.12. Database ada di akun pengguna sendiri, dibatasi sandi aplikasi, dan Upstash mengenkripsi data saat disimpan. Enkripsi sisi klien (passphrase + WebCrypto) masuk backlog sebagai opsi.
- Disclaimer onboarding poin 3 diperbarui bila sinkron aktif; `TERMS_VERSION` naik, sehingga disclaimer tampil ulang sekali.

## 5. Bagian C: Onboarding & perangkat kedua

- Langkah 4 "Amankan deploy" bertambah: status sandi aplikasi (terpasang/belum) dan status database (terpasang/belum). Keduanya dibaca dari endpoint status server yang hanya mengembalikan boolean.
- Panduan memasang: Vercel › Storage/Marketplace › Upstash Redis › hubungkan ke project; isi `APP_PASSCODE` dan `SESSION_SECRET`; redeploy.
- Langkah 1 "Selamat datang" bertambah tombol **Sambungkan perangkat ini**: bila sinkron aktif dan data server sudah ada, ambil semua data, lalu lewati wizard. Disclaimer tetap tampil bila versinya belum disetujui di data server.
- Pertama kali sinkron diaktifkan dengan data lokal yang sudah ada dan server masih kosong: unggah data lokal. Bila server dan lokal sama-sama berisi: gabungkan per aturan merge, dan buat snapshot dulu.

## 6. Bagian D: CI

GitHub Actions di setiap push dan PR: `npm ci`, typecheck, `npm test`, `next build` (tanpa env rahasia, memakai Demo Mode). Status badge di README. Mencegah rilis rusak sebelum sampai Vercel.

## 7. Tampilan

- Setting › bagian baru **Sinkron & keamanan**:
  - Status: `TERSINKRON · 2 MENIT LALU` / `BELUM TERKIRIM` / `KONFLIK` / `TIDAK AKTIF` (label mono, chip status hijau/merah sesuai sistem warna status).
  - Sinkron sekarang, Riwayat cadangan, Kunci perangkat ini.
  - Bila tidak aktif: kalimat yang menyebut langkah berikutnya (pasang database, isi sandi, redeploy).
- AppBar: titik kecil status hanya bila ada masalah (belum terkirim > 10 menit atau konflik). Tidak ada indikator saat semuanya normal.
- Tanpa toast untuk sinkron sukses.

## 8. Arsitektur

| Modul | Tanggung jawab | Berjalan di |
| --- | --- | --- |
| `middleware.ts` | Kunci sandi, pengecualian aset/PWA | Edge |
| `lib/auth/session.ts` | Tanda tangan & verifikasi cookie, sidik jari sandi | Server |
| `lib/sync/merge.ts` | Merge murni per bagian, tombstone, gabungan onboarding | Server & client |
| `lib/sync/store.ts` | Akses Redis: baca/tulis bagian dengan `rev`, snapshot, batas percobaan | Server |
| `lib/sync/client.ts` | Antrean "belum terkirim", pemicu, debounce, ulang saat konflik | Client |
| Route `/api/sync`, `/api/unlock`, `/api/status` | Endpoint tipis; `status` hanya mengembalikan boolean | Server |

## 9. Test

- `sync.test.ts`: merge setiap bagian; log gabungan dua perangkat; hapus di satu perangkat + ubah di perangkat lain; tombstone; idempoten (merge dua kali = sekali); urutan acak menghasilkan hasil sama; migrasi entri tanpa `id`; payload rusak ditolak memakai validator impor yang ada.
- `auth.test.ts`: cookie valid/kedaluwarsa/dipalsukan; ganti sandi membatalkan sesi; perbandingan waktu-konstan dipakai; pembatasan percobaan.
- Store diuji dengan Redis tiruan di memori: `baseRev` cocok/tidak, retensi 7 snapshot, pulihkan membuat snapshot dulu.
- Tanpa env database/sandi: aplikasi dan semua test lama tetap lolos.
- Manual: dua perangkat (HP + laptop), offline lalu online, hapus data browser lalu pulihkan, iOS PWA standalone dengan cookie sandi.

## 10. Rencana rilis

| Versi | Isi |
| --- | --- |
| **0.12.0** | CI GitHub Actions; sandi aplikasi (middleware, `/unlock`, sesi, batas percobaan, Kunci perangkat ini) |
| **0.12.1** | `lib/sync` (merge + store + client), migrasi `id` log + tombstone, Setting › Sinkron & keamanan, status di onboarding langkah 4 |
| **0.12.2** | Cadangan otomatis + Riwayat cadangan, "Sambungkan perangkat ini" di onboarding, update disclaimer (`TERMS_VERSION` naik), README panduan Upstash |

## 11. Keputusan terbuka

1. Enkripsi sisi klien: usulan **tidak** di 0.12 (lihat §4).
2. Masa berlaku sesi sandi: usulan 90 hari.
3. Retensi snapshot: usulan 7 harian.

## 12. Perubahan dokumen

**PRD**
- §3 Keamanan & privasi: tambah aturan sandi aplikasi, database hanya diakses server, sinkron opsional, tanpa database bersama.
- §4: tabel baru **4.10 Sinkron & keamanan**; §4.6 "Sinkron antar perangkat" dan §4.7 "Login / proteksi akses" berubah status saat rilis.
- §5: baris Privasi, CI.
- §6: hapus #1 dan #2 saat 0.12.2 rilis; tambah keterbatasan baru (batas percobaan tanpa Redis, ketergantungan paket gratis Upstash).
- §7: tandai backlog P0 (proteksi akses, sinkron, CI) masuk 0.12; tambah backlog "Enkripsi sisi klien (opsional)".
- Header, §8 diperbarui tiap rilis.

**Lainnya**
- ARCHITECTURE: diagram (Redis, middleware), tabel modul, tabel Penyimpanan, paragraf keterbatasan; catat perubahan prinsip "data kesehatan tidak keluar dari HP".
- README: env var baru, panduan Upstash, badge CI.
- CHANGELOG per rilis.
