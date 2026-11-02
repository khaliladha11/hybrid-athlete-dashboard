# Panduan

Panduan lengkap Hybrid Athlete Dashboard: memakai aplikasi, memasang dan memperbaruinya, serta catatan untuk developer. Ringkasan singkat ada di [README](../README.md); versi ringkas di dalam aplikasi ada di **Setting › Tentang & versi › Bantuan & panduan**.

- [Memakai aplikasi](#memakai-aplikasi): [saran Gita](#membaca-saran-gita), [program mingguan](#program-mingguan), [mode latihan](#mode-latihan), [kirim ke jam](#kirim-workout-ke-jam), [cadangan & sinkron](#cadangan--sinkron), [keterbatasan](#keterbatasan)
- [Memasang](#memasang): [kebutuhan](#yang-kamu-butuhkan), [tombol Deploy](#cara-a--tombol-deploy-to-vercel-paling-mudah), [sandi](#sandi-aplikasi), [Upstash](#upstash-redis), [CLI](#cara-b--vercel-cli), [fork](#cara-c--fork-manual), [kunci akses](#setelah-deploy-kunci-aksesnya), [pasang di HP](#pasang-aplikasi-di-hp), [pembaruan](#menerima-pembaruan), [kalau ada masalah](#kalau-ada-masalah)
- [Fitur lengkap](#fitur-lengkap) · [Galeri screenshot](#galeri-screenshot) · [Untuk developer](#untuk-developer)

## Memakai aplikasi

### Membaca saran Gita

Kartu **Saran hari ini** di Profil (dan strip saran di Generator Lari) menyebut jenis latihan, level, dan alasannya. Gita adalah nama coach di aplikasi; semua sarannya dihitung dari aturan di [TRAINING-LOGIC.md](TRAINING-LOGIC.md), bukan AI.

- **Level:** Easy (hijau), Moderate (kuning), High (merah). Warna yang sama dipakai di generator dan rencana.
- **Alasan** tampil di bawah saran, misalnya resting HR di atas rentang pribadimu, sesi kemarin berat, km minggu ini naik lebih dari 30%, atau ST kaki kemarin. Ketuk untuk melihat dasar kesiapan.
- **Saran hanya menurunkan, tidak memblokir.** Kamu tetap bisa memilih level lain atau tombol **Terapkan** untuk memakai saran dengan satu ketukan. Beberapa pemicu sekaligus tetap hanya turun satu level.
- **Check-in harian** (opsional, di bawah 10 detik): nyeri shin 4/10 ke atas membatasi lari ke Easy (6/10 ke atas: Easy 30 menit), pegal 7/10 ke atas atau tidur 2/5 ke bawah menurunkan satu level, mood hanya dicatat.
- **Ambang pribadi:** HR lari berat dari 90% LTHR (diisi di intervals.icu), HRV dan resting HR dari rata-rata 30 harimu. Sebelum datanya cukup, aplikasi memakai ambang umum dan menyebutnya.
- Data yang tidak dikirim jammu (misalnya HRV dari Huawei) disebut dan aturannya tidak dipakai, bukan dianggap nol.

### Program mingguan

- **Buat program** di tab Program: pilih jarak (5K, 10K, HM, FM), target waktu, dan **Hari H** di kalender. Warna kalender menunjukkan saran lama program (merah terlalu singkat, kuning singkat, hijau ideal, abu-abu panjang dan diawali pre-Base). Semuanya saran; kamu tetap bisa memilih tanggal mana pun yang masih bisa disusun.
- **Sesi minggu ini:** sesi boleh dikerjakan di hari apa pun dalam minggunya. Hari di rencana hanya saran, dan kartu menyarankan sesi yang paling cocok hari ini.
- **Kerjakan sesi hari ini** mengisi Generator Lari atau Strength sesuai rencana.
- **Lewati** sesi yang tidak bisa dikerjakan (dua ketukan). Volume minggu berikutnya tidak bertambah untuk mengejar.
- **Kepatuhan** dihitung otomatis dari aktivitas intervals.icu (tanggal, jenis, dan durasi atau jarak minimal 80%) dan sesi ST yang dicatat di mode latihan.
- Mengganti Hari H, jarak, atau tanggal mulai mengarsipkan program lama beserta riwayatnya.

### Mode latihan

- Buka **Generator Strength**, pilih sesi, lalu **Mulai latihan**. Layar penuh per gerakan, layar tetap menyala.
- Centang setiap set. Timer istirahat dan hitung mundur untuk gerakan tahan berjalan sendiri; getar saat habis bisa diatur.
- Semua set dirancang di **RPE 7 atau lebih ringan** (sisakan sekitar 3 repetisi). Beban selalu bisa dirakit dari alat di Setting.
- Setelah selesai, isi **RPE sesi**. RPE sesi dikali menit menjadi beban strength yang ikut dihitung di saran lari.
- Mode latihan tetap jalan **tanpa sinyal**; sesi tersimpan di HP dan terkirim saat online (bila sinkron aktif).
- Saat beban mentok di batas alat, Gita menyarankan menambah repetisi, tempo/jeda, atau varian yang lebih sulit.

### Kirim workout ke jam

Tombol **Kirim ke jam** (Generator Lari dan sesi program) menaruh workout di kalender intervals.icu. intervals.icu lalu meneruskannya ke jam bila unggah workout terencana diaktifkan di **intervals.icu › Settings › Connections**:

| Jam | Yang perlu diaktifkan | Yang diterima |
| --- | --- | --- |
| **Huawei** | Kotak **HUAWEI Health** › centang **Upload planned workouts**. Di aplikasi Huawei Health, Health Service Kit harus tertaut (Me › 3rd Party Services). **Isi threshold pace lari** di intervals.icu › Settings › Run › Pace settings: tanpa itu unggah gagal ("Workout has no suitable steps") | Hanya lari, jalan, dan hiking. **Satu** workout: lari terencana berikutnya dalam seminggu; biasanya masuk sendiri ke Huawei Health beberapa saat setelah dikirim. Di jam: **Workout › Outdoor Run › Courses › Custom Courses**; bila belum ada, kirim dari Huawei Health (My running courses › ikon jam). Untuk workout lain, ketuk **Upload to Huawei** di event kalender |
| **Garmin** | Kotak Garmin › centang **Upload planned workouts**, lalu izinkan di Garmin Connect | Workout terencana seminggu ke depan, muncul setelah sinkron Garmin Connect |
| **Coros** | Kotak **Coros** › aktifkan unggah workout terencana | Seminggu ke depan. Bila belum muncul, tambahkan "Intervals.icu Training Plan" di kalender aplikasi Coros |
| Lainnya | Lihat halaman integrasi intervals.icu | Tanpa jam yang tersambung, pakai **Copy Set** |

Pilih merek jam sekali di kartu **Kirim ke jam**: setelah kirim, aplikasi menampilkan langkah sampai di jam, memeriksa (hanya membaca) apakah unggah ke merekmu aktif di intervals.icu, dan menyediakan **Cek status unggah** untuk melihat error unggah. intervals.icu tidak punya API untuk mendorong workout ke jam, jadi aplikasi tidak pernah mengklaim workout sudah di jam. Kirim ulang setelah workout diubah memperbarui event yang sama. API key intervals.icu milikmu sudah bisa menulis ke kalender; tanpa key (Demo Mode) tidak ada yang dikirim. Strength tidak dikirim sebagai workout; catatan teks di kalender bisa diaktifkan di **Setting › Tampilan & program**.

Langkah yang sama ada di aplikasi: **Setting › Tentang & versi › Bantuan & panduan**, atau lembar **Apa ini?** di kartu Kirim ke jam.

### Cadangan & sinkron

- **Tanpa sinkron**, data (log, setting, program, check-in) hanya ada di browser HP itu. Ekspor berkala di **Setting › Data & cadangan › Ekspor JSON**, lalu **Impor JSON** di perangkat baru. File cadangan dari versi lama mana pun tetap bisa diimpor; log selalu digabung tanpa duplikat.
- **Dengan Upstash Redis** (lihat [Upstash Redis](#upstash-redis)), data sama di semua perangkat dan kembali sendiri setelah data browser dihapus. Perubahan yang dibuat offline ditandai "belum terkirim" dan dikirim saat online.
- **Riwayat cadangan:** 7 snapshot terakhir (harian, sebelum pulihkan, sebelum pembaruan data). **Pulihkan** mengganti data di semua perangkat dan bisa dibatalkan.
- **Setelah pembaruan aplikasi**, data lama dimigrasi otomatis. Salinan sebelum migrasi bisa diunduh di Setting › Data & cadangan.
- **Kunci perangkat ini** (Setting › Data) mengeluarkan satu perangkat tanpa mengganti sandi.

### Atur di dalam aplikasi

Onboarding sudah menanyakan profil, kondisi, zona lari, dan alat. Langkah yang kamu lewati muncul lagi di **Setting › Belum selesai**. Untuk mengubah semuanya nanti, buka tab **Setting**:

- **Kondisi & batasan:** aktifkan hanya yang benar-benar kamu alami. Setiap kondisi mengubah generator lari dan ST.
- **Zona lari:** isi pace per zona, atau isi hasil lomba/time trial terbaru lalu ketuk **Terapkan ke semua zona** (rumus VDOT Daniels).
- **Alat** dan **Gerakan:** centang yang kamu punya dan mau dipakai.

Tanpa sinkron, pengaturan dan log latihan tersimpan di perangkat itu saja (lihat [Cadangan & sinkron](#cadangan--sinkron)).

### Keterbatasan

Hal yang belum bisa dilakukan aplikasi (HRV Huawei, jam Huawei hanya menerima lari, split per km vs Strava, data satu perangkat tanpa sinkron, dan lainnya) ada di **[LIMITATIONS.md](LIMITATIONS.md)**.

## Memasang

Gratis, sekitar 15 menit, tanpa menulis kode. Hasilnya aplikasi di layar utama HP yang membaca data latihanmu sendiri dari intervals.icu, berjalan di akun Vercel milikmu sendiri. Mau dipandu asisten AI? Pakai [INSTALL-WITH-AI.md](../INSTALL-WITH-AI.md); rahasia tetap kamu ketik sendiri, tidak pernah di chat.

### Yang kamu butuhkan

- Akun **[intervals.icu](https://intervals.icu)** (gratis) yang sudah tersambung **langsung** ke jam atau aplikasi olahragamu (Garmin, Huawei Health, Coros, Polar, Suunto, Wahoo, Zepp, dll.).
  > Strava saja tidak cukup. intervals.icu tidak boleh meneruskan isi aktivitas dari Strava lewat API, jadi aktivitas yang masuk hanya lewat Strava akan tampil kosong ("Aktivitas Strava").
- Akun **[GitHub](https://github.com)** (gratis).
- Akun **[Vercel](https://vercel.com/signup)** paket Hobby (gratis). Paling mudah daftar dengan akun GitHub.
- HP Android dengan Chrome, atau iPhone dengan Safari.
- **Huawei:** HRV harian tidak dibuka lewat API Huawei, jadi baris HRV tidak tampil. Jalan keluarnya aplikasi Health Sync yang mengirim HRV ke intervals.icu; tanpa HRV, readiness memakai resting HR dan sesi kemarin.

### Cara A · Tombol Deploy to Vercel (paling mudah)

Tombol **Deploy to Vercel** ada di [README](../README.md#mulai-cepat).

1. Siapkan tiga nilai dulu (penjelasan di [Variabel lingkungan](../README.md#variabel-lingkungan)): **API key intervals.icu**, **sandi aplikasi** buatanmu, dan **`SESSION_SECRET`** acak.
2. Klik tombol Deploy di README, login ke Vercel dengan GitHub, lalu biarkan Vercel membuat repo baru di akun GitHub-mu.
3. Vercel meminta `INTERVALS_API_KEY`, `APP_PASSCODE`, dan `SESSION_SECRET`. Ketik sendiri nilainya di kolom itu. Tombol tidak membawa nilai apa pun.
4. Klik **Deploy**, tunggu 1 sampai 2 menit, lalu buka alamat yang diberikan. Masukkan sandi aplikasi, lalu ikuti **onboarding**.
5. Lanjutkan: [Upstash Redis](#upstash-redis) (opsional), [kunci aksesnya](#setelah-deploy-kunci-aksesnya), [pasang di HP](#pasang-aplikasi-di-hp), dan [hubungkan jam](#kirim-workout-ke-jam).

> **Salinan (clone), bukan fork.** Tombol membuat repo baru yang tidak terhubung ke repo ini, jadi tombol **Sync fork** di GitHub tidak ada. Pembaruan datang lewat workflow yang membuka pull request, lihat [Menerima pembaruan](#menerima-pembaruan).

Daftar variabel lingkungan dan cara membuat `SESSION_SECRET` ada di [README › Variabel lingkungan](../README.md#variabel-lingkungan).

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
3. Di **Environment Variables**, isi tiga env wajib dari [Variabel lingkungan](../README.md#variabel-lingkungan), lalu **Deploy**.

Dengan fork, pembaruan bisa lewat **Sync fork** atau workflow pembaruan (lihat [Menerima pembaruan](#menerima-pembaruan)).

#### Isi profil lewat file (opsional)

Sejak 0.11.0 profil diisi lewat **onboarding** saat aplikasi pertama dibuka, jadi langkah ini opsional. Nilai di [`config/athlete-profile.json`](../config/athlete-profile.json) hanya jadi default.

| Field | Isi | Bisa diubah lagi di aplikasi? |
| --- | --- | --- |
| `name`, `age`, `occupation`, `category` | Nama dan keterangan di header Profil | Belum, hanya di file ini |
| `targets.goals`, `targets.raceTargets` | Tujuan latihan & target lomba di Profil, juga target default Program | Belum |
| `training.blockStart` | Tanggal **Senin** awal blok latihan 4 minggu (`YYYY-MM-DD`). Isi Senin minggu ini | Belum |
| `conditions` | Kondisi cedera yang aktif: `apt`, `shin`, `overpronation`, `mcu`, `lbp`, `pfp`, `itbs`, `achilles`, `plantar`, `shoulder` (lihat [`lib/conditions.ts`](../lib/conditions.ts)). Isi `[]` bila tidak ada | Ya, Setting › Kondisi |
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

Aplikasi terbuka layar penuh dengan ikon "Forward H", seperti aplikasi biasa. Onboarding langkah 9 membantu hal yang sama: di Android/Chrome ada tombol **Pasang aplikasi**, di iPhone ada petunjuk Bagikan › Tambah ke Layar Utama. Sejak 0.16 aplikasi tetap terbuka tanpa sinyal untuk halaman yang pernah tersimpan.

### Sudah memasang sebelum 0.11?

Sejak 0.11.0 profil (nama, target, kondisi, alat, tanggal blok) disimpan di perangkat, dan `config/athlete-profile.json` di repo netral. Data di HP-mu tidak hilang, tapi nama, target, dan tanggal blok yang dulu ada di JSON perlu dipindahkan sekali:

1. **Ekspor cadangan dulu.** Di HP: **Setting › Data & cadangan › Ekspor JSON**. Simpan filenya.
2. **Buat file migrasi** (bila profilmu ada di `config/athlete-profile.json` fork-mu). Di komputer, sebelum update: clone fork-mu lalu jalankan `node scripts/make-owner-settings.mjs`. Hasilnya `owner-settings.local.json`, yang otomatis diabaikan git, jadi jangan di-commit. Tanpa komputer: lewati langkah ini dan isi ulang di **Setting › Profil** setelah update.
3. **Update dan deploy** seperti di bawah (Sync fork). Kalau GitHub melaporkan konflik di `config/athlete-profile.json`, pilih versi terbaru (netral).
4. **Buka aplikasi.** Kamu hanya diminta menyetujui disclaimer sekali. Onboarding tidak diulang, dan log serta Setting tetap ada.
5. **Impor file migrasi.** **Setting › Data & cadangan › Impor JSON**, pilih `owner-settings.local.json` (kirim ke HP lewat chat atau drive pribadi). File ini hanya mengisi yang masih kosong, jadi alat, zona, dan pilihan gerakan yang sudah kamu ubah di HP tidak tertimpa.
6. **Cek** Setting › Profil (nama, target, tanggal blok), Zona lari, dan Alat.

### Menerima pembaruan

Setiap rilis di repo ini punya tag (`v1.0.0`, …) dan catatan rilis. Repo salinan atau fork-mu menerimanya lewat **pull request**, dan tidak pernah di-merge otomatis: kamu yang memutuskan kapan menerima. Workflow-nya ada di [`.github/workflows/upstream-update.yml`](../.github/workflows/upstream-update.yml) dan sudah ikut tersalin ke repo-mu.

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

## Fitur lengkap

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

Detail aturan dan dasar ilmiahnya ada di **[docs/TRAINING-LOGIC.md](TRAINING-LOGIC.md)**.

## Galeri screenshot

<table>
  <tr>
    <td><img src="screenshots/01-profile.jpg" width="220" alt="Profil dengan saran hari ini"></td>
    <td><img src="screenshots/03-run-generator.jpg" width="220" alt="Generator lari dengan strip saran dan kesulitan berwarna"></td>
    <td><img src="screenshots/04-run-workout.jpg" width="220" alt="Kartu tag Norwegian 4x4 dengan Segment Skyline rencana"></td>
  </tr>
  <tr>
    <td align="center"><sub>Profil &amp; saran hari ini</sub></td>
    <td align="center"><sub>Generator lari</sub></td>
    <td align="center"><sub>Workout + Segment Skyline</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/02-weekly-summary.jpg" width="220" alt="Ringkasan 7 hari dengan StatRow, 80/20, dan Week Ledger"></td>
    <td><img src="screenshots/06-activity.jpg" width="220" alt="Detail aktivitas Norwegian 4x4 dengan kartu tag dan split per km"></td>
    <td><img src="screenshots/08-program.jpg" width="220" alt="Program Half Marathon dengan perkiraan waktu lomba dan detail sumbernya"></td>
  </tr>
  <tr>
    <td align="center"><sub>7 hari terakhir + Week Ledger</sub></td>
    <td align="center"><sub>Detail aktivitas + split per km</sub></td>
    <td align="center"><sub>Program target (5K–FM)</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/05-strength-workout.jpg" width="220" alt="Generator strength dengan thumbnail gerakan"></td>
    <td><img src="screenshots/09-movement-sheet.jpg" width="220" alt="Bottom sheet detail gerakan dengan gambar awal dan akhir"></td>
    <td><img src="screenshots/10-setting.jpg" width="220" alt="Halaman Setting dengan katalog kondisi"></td>
  </tr>
  <tr>
    <td align="center"><sub>Generator ST + gambar gerakan</sub></td>
    <td align="center"><sub>Detail teknik gerakan</sub></td>
    <td align="center"><sub>Setting: kondisi, zona, alat</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/11-onboarding.jpg" width="220" alt="Onboarding langkah 1: selamat datang"></td>
    <td><img src="screenshots/12-onboarding-connection.jpg" width="220" alt="Onboarding langkah 3: cek koneksi intervals.icu"></td>
    <td><img src="screenshots/13-onboarding-summary.jpg" width="220" alt="Ringkasan onboarding dengan tombol Mulai tur"></td>
  </tr>
  <tr>
    <td align="center"><sub>Onboarding</sub></td>
    <td align="center"><sub>Cek koneksi intervals.icu</sub></td>
    <td align="center"><sub>Ringkasan + Mulai tur</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/14-tour.jpg" width="220" alt="Tur in-app menyorot Saran hari ini"></td>
    <td><img src="screenshots/15-sync.jpg" width="220" alt="Setting: Sinkron & keamanan dan Riwayat cadangan"></td>
    <td><img src="screenshots/07-light-mode.jpg" width="220" alt="Mode terang: kartu tag Progression Run"></td>
  </tr>
  <tr>
    <td align="center"><sub>Tur in-app</sub></td>
    <td align="center"><sub>Sinkron & Riwayat cadangan</sub></td>
    <td align="center"><sub>Mode terang</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/16-race-date.jpg" width="220" alt="Pemilih Hari H dengan warna saran lama program"></td>
    <td><img src="screenshots/17-workout-mode.jpg" width="220" alt="Mode latihan: timer istirahat dan centang set gerakan utama"></td>
    <td><img src="screenshots/18-muscle-map.jpg" width="220" alt="Sesi tersimpan dengan peta otot depan dan belakang"></td>
  </tr>
  <tr>
    <td align="center"><sub>Pilih Hari H</sub></td>
    <td align="center"><sub>Mode latihan</sub></td>
    <td align="center"><sub>Peta otot sesi</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/19-week-ledger-st.jpg" width="220" alt="Ringkasan 7 hari dengan beban ST dan Week Ledger berisi baris ST"></td>
    <td><img src="screenshots/20-movement-muscle-map.jpg" width="220" alt="Detail gerakan Seated DB Curl dengan peta otot depan dan belakang"></td>
    <td><img src="screenshots/21-insight.jpg" width="220" alt="Halaman Tren 12 minggu dengan grafik CTL, ATL, dan Form"></td>
  </tr>
  <tr>
    <td align="center"><sub>Week Ledger dengan ST</sub></td>
    <td align="center"><sub>Peta otot per gerakan</sub></td>
    <td align="center"><sub>Tren kebugaran</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/22-insight-weekly-km.jpg" width="220" alt="Mode terang: km mingguan easy dan berat dengan tabel data terbuka"></td>
    <td><img src="screenshots/23-insight-muscle-heatmap.jpg" width="220" alt="Heatmap otot 7 hari dengan otot jarang dilatih bergaris putus-putus"></td>
    <td><img src="screenshots/24-insight-pr-trend.jpg" width="220" alt="Mode terang: tren PR Barbell Squat mentok di 17 kg dengan penanda rep, tempo, dan varian"></td>
  </tr>
  <tr>
    <td align="center"><sub>Km mingguan 80/20 & Lihat tabel</sub></td>
    <td align="center"><sub>Heatmap otot</sub></td>
    <td align="center"><sub>Tren PR</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/25-insight-calendar.jpg" width="220" alt="Kepatuhan program dan kalender aktivitas 12 minggu"></td>
    <td><img src="screenshots/26-checkin.jpg" width="220" alt="Kartu check-in harian dengan slider nyeri shin dan pilihan kualitas tidur"></td>
    <td><img src="screenshots/27-checkin-advice.jpg" width="220" alt="Saran hari ini setelah check-in: nyeri shin maks Easy dan tidur turun satu level"></td>
  </tr>
  <tr>
    <td align="center"><sub>Kepatuhan & kalender</sub></td>
    <td align="center"><sub>Check-in harian</sub></td>
    <td align="center"><sub>Saran dari check-in</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/28-insight-body.jpg" width="220" alt="Mode terang: tren check-in dan status ambang pribadi di Insight"></td>
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

Semua screenshot diambil di Demo Mode (data fiktif).

## Untuk developer

### Menjalankan di komputer

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

API key hanya dibaca di server (`import "server-only"`) dan tidak pernah dikirim ke browser. Error 401/403/404/5xx ditampilkan sebagai pesan singkat tanpa stack trace. Cara deploy ada di [Memasang](#memasang); setiap `git push` ke `main` men-deploy ulang otomatis.

#### Perintah

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
| `npm run check:links` | Memeriksa tautan dan anchor di semua dokumen Markdown (`--external` juga membuka tautan luar) |
| `npm run icons` | Render ulang ikon PWA & favicon dari `public/icon.svg` dan `public/favicon.svg` |

### Struktur project

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

Arsitektur dan strategi test di [ARCHITECTURE.md](ARCHITECTURE.md); cara berkontribusi di [CONTRIBUTING.md](../CONTRIBUTING.md).
