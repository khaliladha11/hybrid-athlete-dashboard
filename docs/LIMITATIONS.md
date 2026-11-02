# Keterbatasan yang diketahui

Hal-hal yang belum bisa atau sengaja tidak dilakukan aplikasi, ditulis dari sisi pemakai. Setiap butir menyebut dampaknya dan jalan keluarnya bila ada. Utang teknis untuk pengembang ada di [PRD §6](PRD.md#6-keterbatasan--utang-teknis). Panduan pemakaian ada di [GUIDE.md](GUIDE.md).

> **Bukan alat medis.** Saran latihan dihitung dari aturan umum berbasis riset ([REFERENCES.md](REFERENCES.md)). Aplikasi tidak mendiagnosis apa pun dan tidak menggantikan dokter, fisioterapis, atau pelatih. Hentikan latihan bila muncul nyeri.

## Jam & data latihan

- **HRV dari jam Huawei tidak tersedia.**
  - Penyebab: integrasi Huawei di intervals.icu tidak meneruskan HRV harian.
  - Dampak: baris HRV disembunyikan, dan kesiapan dihitung dari resting HR serta sesi kemarin.
  - Jalan keluar: aplikasi **Health Sync** di Android bisa mengirim HRV ke intervals.icu. Setelah HRV masuk 30 hari, ambang HRV pribadi aktif sendiri.
- **Jam Huawei hanya menerima lari.**
  - Yang diteruskan intervals.icu ke Huawei hanya lari, jalan, dan hiking, dan hanya **satu** lari terencana berikutnya dalam seminggu.
  - Unggah butuh **threshold pace lari** di intervals.icu. Tanpa itu, Huawei menolak dengan "Workout has no suitable steps".
  - Sesi strength tetap di aplikasi; jam tidak punya padanan yang berguna.
- **Kirim ke jam baru diuji di Huawei.**
  - Garmin dan Coros mengikuti dokumentasi intervals.icu dan belum diuji pemilik.
  - Aplikasi tidak bisa memastikan workout sudah sampai di jam, karena intervals.icu tidak punya API untuk itu. Aplikasi hanya membaca sakelar unggah dan error unggah, lalu menampilkan langkah per merek.
  - Target HR tidak dikirim, hanya pace.
- **Split per km bisa berbeda beberapa detik dari Strava.** Data per detik dari sebagian jam (terutama Huawei) kadang berupa total jarak yang dibagi rata atau jarak bertangga. Split lalu dihitung dari GPS dan diskalakan ke jarak jam, sedangkan Strava menghitung ulang jaraknya sendiri. Ringkasan sesi tetap sama.
- **Isi aktivitas Strava tidak bisa dibaca.** Kebijakan Strava melarang intervals.icu meneruskan data Strava lewat API. Aktivitas yang hanya masuk lewat Strava tampil sebagai "Aktivitas Strava" tanpa detail. Jalan keluar: sambungkan jam langsung ke intervals.icu.
- **Strength hanya terukur penuh di mode latihan.** ST yang tercatat di jam saja (tanpa RPE sesi) dihitung jumlah dan menitnya, tanpa beban (AU) untuk saran.

## Data, sinkron & offline

- **Tanpa sinkron, data hanya ada di satu perangkat.**
  - Tanpa Upstash Redis, log, setting, dan program tersimpan di browser HP itu saja, dan bisa hilang bila data situs dihapus atau HP diganti.
  - Jalan keluar: ekspor cadangan JSON berkala (Setting › Data & cadangan), atau pasang Upstash (gratis).
- **Pulihkan berlaku untuk semua perangkat.** Memulihkan snapshot mengganti data di semua perangkat yang tersinkron. Perubahan dari perangkat lain yang belum terkirim saat itu ikut tergantikan; snapshot "Sebelum pulihkan" bisa dipakai untuk membatalkan.
- **Sinkron memakai paket gratis Upstash** (sekitar 500 ribu perintah per bulan, data 256 MB, dicek 2026-10-23). Satu sinkron memakai satu baca dan satu tulis, jadi pemakaian satu orang jauh di bawah batas. Tema ikut tersinkron ke semua perangkat.
- **Data tidak dienkripsi di sisi klien.** Database ada di akun Upstash-mu sendiri, dienkripsi saat disimpan oleh Upstash, dan hanya bisa diakses lewat sandi aplikasi, tetapi isinya tidak dienkripsi dengan passphrase pribadi.
- **Offline hanya untuk halaman yang pernah tersimpan.** Tab utama, Insight, mode latihan, dan Bantuan tersimpan otomatis. Halaman lain (mis. detail aktivitas) hanya bila pernah dibuka saat online. Data intervals.icu saat offline adalah salinan terakhir.
- **Catatan "sudah dikirim ke jam" hanya di perangkat yang mengirim**, tidak disinkron.

## Fitur yang terbatas

- **Gerakan hanya dari kurasi.** Ada 56 gerakan; kamu belum bisa menambah gerakan sendiri. 9 gerakan belum punya gambar karena tidak ada sumber berlisensi bebas yang cocok.
- **Kondisi di luar katalog hanya catatan.** Teks bebas di Setting › Kondisi tampil di catatan workout tetapi tidak mengubah generator, karena setiap aturan kondisi butuh sumber dan test.
- **Kalender tanpa program hanya 2 bulan** (bulan ini dan bulan lalu). Dengan program aktif, kalender mengikuti rentang program.
- **Batas percobaan sandi tanpa Redis hanya upaya terbaik.** Tanpa Upstash, hitungan salah sandi disimpan di memori server dan bisa ter-reset.
- **Satu deploy untuk satu orang.** Tidak ada akun, multi-atlet, atau berbagi ke pelatih. Ini disengaja demi privasi.
