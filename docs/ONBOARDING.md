# Spesifikasi Onboarding & Deploy Pribadi (rencana 0.11)

> Status: **disetujui untuk dikerjakan, 2026-10-22**. Simpan di `docs/ONBOARDING.md`.
> Kalau ada yang bertentangan dengan PRD §3, PRD yang menang. Desain mengikuti [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## 1. Tujuan

Orang yang baru men-deploy aplikasi dari fork bisa langsung memakainya dengan **profil miliknya sendiri**. Tidak perlu mengedit JSON, tidak mewarisi data pemilik repo, dan tidak perlu menebak cara menyambungkan intervals.icu.

**Dianggap berhasil kalau:**
- Fork baru tidak pernah menampilkan nama, target, atau kondisi pemilik repo.
- Dari pertama membuka sampai workout pertama: ≤ 10 langkah, semua langkah opsional bisa dilewati.
- Pengguna lama (yang sudah punya data di perangkat) tidak dipaksa mengulang dari awal dan tidak kehilangan apa pun.
- Semua aturan PRD §3 tetap berlaku. API key tetap hanya di server.

## 2. Model: satu deploy per orang (keputusan 2026-10-22)

- Setiap orang fork repo dan deploy ke Vercel miliknya sendiri. API key intervals.icu ada di Environment Variables Vercel masing-masing.
- Data latihan tetap di intervals.icu milik pengguna. Setting, log, dan status onboarding di `localStorage` perangkat pengguna.
- **Tidak ada akun, login, atau database.** Akun & multi-user tetap ada di daftar "sengaja tidak dikerjakan" (PRD §7).
- Pemilik repo tidak pernah menerima data siapa pun. Pengguna adalah operator deploy dan datanya sendiri.

Pembagian tugas:

| Bagian | Tempat |
| --- | --- |
| Fork, deploy ke Vercel, isi env var | README (tutorial, sudah ada, diperbarui) |
| Cek koneksi, amankan deploy, isi profil, pasang ke HP, tur | Onboarding di dalam aplikasi |

## 3. Alur

```
/onboarding
 1 Selamat datang        → Mulai | Impor cadangan
 2 Disclaimer & lisensi  (wajib)
 3 Koneksi intervals.icu (boleh lewati → Demo Mode)
 4 Amankan deploy        (boleh lewati)
 5 Profil dasar          (wajib: nama; sisanya boleh kosong)
 6 Kondisi & batasan     (wajib: pilih minimal satu, atau "Tidak ada")
 7 Zona lari             (wajib pilih jalur: VDOT | manual | belum tahu)
 8 Alat                  (boleh lewati → bodyweight)
 9 Pasang ke layar utama (boleh lewati; otomatis selesai bila sudah standalone)
10 Ringkasan             → Mulai tur | Lewati tur
→ Tur in-app (4 sampai 5 sorotan) → Profil
```

- Langkah yang dilewati muncul lagi sebagai pengingat di Setting (bagian baru "Belum selesai"), bukan sebagai pop-up.
- Tombol Kembali selalu ada (kecuali langkah 1). Progres tersimpan setiap pindah langkah; membuka ulang aplikasi melanjutkan dari langkah terakhir.
- Impor cadangan di langkah 1: setelah impor berhasil, langsung ke langkah 2 bila disclaimer versi terbaru belum disetujui, selain itu ke langkah 10.

## 4. Isi tiap langkah

Copy di bawah adalah draf. Ikuti DESIGN-SYSTEM §7: tanpa em dash/en dash di teks UI, kalimat aktif, tanpa tanda seru, tombol menyebut hasilnya. Satu Display per layar. Label progres mono: `LANGKAH 3/10`.

### 1. Selamat datang
- Display: `HYBRID ATHLETE`
- Teks: "Pelatih pribadi untuk lari dan strength di rumah. Kita siapkan profilmu dalam beberapa menit."
- Tombol primary: **Mulai**. Secondary: **Impor cadangan** (memakai alur impor yang sama dengan Setting › Data & cadangan).

### 2. Disclaimer & lisensi (wajib)
Poin yang ditampilkan:
1. **Bukan saran medis.** Aplikasi menyusun latihan dari aturan umum dan katalog kondisi berbasis riset. Konsultasikan dengan tenaga kesehatan bila ada cedera aktif, nyeri yang memburuk, atau kondisi medis.
2. **Kamu operator deploy-mu sendiri.** Data dibaca dari intervals.icu milikmu ke deploy Vercel milikmu. Pengembang aplikasi tidak menerima datamu.
3. **Data tersimpan di perangkat ini.** Setting dan log ada di browser ini dan hilang bila data browser dihapus. Cadangkan lewat Setting › Data & cadangan.
4. **Lisensi.** Tautan ke lisensi repo dan `NOTICE.md` (atribusi free-exercise-db).
- Checkbox: "Saya mengerti dan setuju." Tombol **Setuju dan lanjut** nonaktif sampai dicentang.
- Simpan `termsVersion` dan `termsAcceptedAt`. Bila `TERMS_VERSION` di kode naik, hanya langkah ini yang ditampilkan ulang (sebagai layar tunggal, bukan seluruh wizard).
- Catatan: teks ini bukan dokumen hukum. Bila repo dipublikasikan lebih luas, teksnya ditinjau ulang.

### 3. Koneksi intervals.icu
- Memanggil endpoint server baru (lihat §6) yang hanya mengembalikan **status**, tidak pernah key atau data mentah.

| Status | Tampilan |
| --- | --- |
| `ok` | ✓ "Tersambung sebagai {nama atlet intervals.icu}." Tombol **Lanjut** |
| `missing` | "API key belum diisi." Panduan: ambil API key & athlete ID di intervals.icu › Settings › Developer, isi di Vercel › Project › Settings › Environment Variables, lalu **redeploy** |
| `unauthorized` (401) | "API key ditolak." Cek ulang key, lalu redeploy |
| `forbidden` / `not_found` (403/404) | "Athlete ID tidak cocok dengan key." Cek athlete ID |
| `network` / 5xx / timeout | "intervals.icu tidak bisa dihubungi. Coba lagi sebentar." |

- Peringatan khusus di semua status selain `ok`: **perubahan env var baru berlaku setelah redeploy.**
- Tombol **Cek lagi** dan **Lanjut dengan Demo Mode** (ghost).

### 4. Amankan deploy
- Teks: "Deploy-mu berisi data kesehatan. Aktifkan Vercel Authentication supaya hanya kamu yang bisa membukanya."
- Langkah singkat: Vercel › Settings › Deployment Protection › Vercel Authentication › cakupan **All Deployments** (Standard Protection tidak melindungi alamat utama `*.vercel.app`).
- Aplikasi tidak bisa memeriksanya dari dalam. Tombol **Sudah saya aktifkan** (menyimpan konfirmasi) atau **Nanti saja**.

### 5. Profil dasar
- Nama (wajib), usia, gaya hidup/fokus (opsional; field mengikuti yang sudah ada di `athlete-profile.json`).
- Target lomba (opsional, boleh lebih dari satu): jarak + target waktu via `TimePicker`.
- Periodisasi: **Blok mingguan** (pilih tanggal mulai blok, default Senin minggu ini, WIB) atau **Mode bebas**.
- Semua field ini juga bisa diedit di Setting (bagian baru "Profil").

### 6. Kondisi & batasan (wajib)
- Komponen katalog kondisi yang sama dengan Setting, plus opsi eksplisit **Tidak ada kondisi** (saling eksklusif dengan pilihan lain).
- Catatan teks bebas tetap tersedia.
- Tombol lanjut nonaktif sampai ada pilihan. Tidak boleh lolos dalam keadaan kosong tanpa disadari, karena aturan keselamatan bergantung pada langkah ini.

### 7. Zona lari (wajib pilih jalur)
- **Dari hasil lomba (VDOT):** jarak + waktu. Bila intervals.icu tersambung, tawarkan isian awal dari lari terbaik 90 hari terakhir (jarak standar terdekat). Pengguna tetap mengonfirmasi.
- **Manual:** komponen zona yang sama dengan Setting.
- **Belum tahu:** pakai zona default netral (lihat §5) dengan label "perkiraan". Pengingat muncul di Setting.

### 8. Alat (opsional)
- Komponen alat yang sama dengan Setting, termasuk toggle titik tambat band dan daftar beban yang bisa dirakit.
- **Lewati** berarti bodyweight saja. Tampilkan dampaknya: jenis sesi ST yang belum bisa disusun lengkap dengan alat saat ini.

### 9. Pasang ke layar utama
- Bila sudah `display-mode: standalone` → langkah otomatis selesai dan dilewati.
- Android/Chrome: tombol **Pasang aplikasi** memakai `beforeinstallprompt` bila tersedia.
- iOS Safari: instruksi bergambar ikon: Share › Add to Home Screen.
- Catatan jujur: "Aplikasi masih butuh internet untuk dibuka."

### 10. Ringkasan
- Daftar per bagian: status koneksi, profil, kondisi, zona (dengan jalur yang dipilih), alat, pasang. Langkah yang dilewati diberi chip `NANTI`.
- Tombol **Mulai tur** (primary) dan **Lewati tur**.

### Tur in-app
- 4 sampai 5 sorotan, berpindah tab bila perlu:
  1. Profil › Saran hari ini
  2. Lari › Generator + Copy Set
  3. Strength › Generator + Catat sesi (gerakan ★)
  4. Program › pilih target
  5. Setting › Data & cadangan
- Elemen ditandai `data-tour="…"`. Spotlight dibuat sendiri (tanpa library baru): overlay + lubang di sekitar elemen + popover `surface-raised`.
- Lewati kapan saja (tombol + Escape). **Ulangi tur** tersedia di Setting.
- Motion: popover masuk `scale(0.96)` + opacity, `--ease-out`. Reduced motion: hanya fade.

## 5. Profil default netral

`config/athlete-profile.json` di repo menjadi **template netral**:
- Nama: kosong (wajib diisi di langkah 5). Usia, gaya hidup, fokus: kosong.
- Target lomba: kosong.
- Kondisi: kosong. Status "belum dipilih" berbeda dengan "Tidak ada kondisi"; onboarding memaksa pilihan eksplisit.
- Zona: default perkiraan yang konservatif dan terdokumentasi (dari satu nilai VDOT yang dicatat di JSON beserta alasannya).
- Alat: kosong (bodyweight).
- Blok: mode bebas sampai pengguna memilih.

**Migrasi data pemilik repo.** Data pribadi pemilik saat ini ada di JSON. Sebelum JSON dinetralkan:
1. Buat file impor dari nilai JSON lama dalam format impor (hanya bagian profil/Setting, tanpa log) di lokasi yang di-`.gitignore` (mis. `owner-settings.local.json`).
2. Impor file tanpa bagian log **tidak boleh menghapus log yang ada**. Ini wajib diverifikasi dan diuji.
3. Pemilik mengekspor cadangan lengkap dari HP sebelum deploy, lalu mengimpor file profil setelah deploy.

Catatan: data pribadi lama tetap ada di riwayat git. Itu diterima (repo milik pemilik); jangan menulis ulang riwayat.

## 6. Arsitektur & data

### Penyimpanan
Key baru di `localStorage` (ikuti konvensi nama key yang sudah ada):

```ts
type OnboardingState = {
  version: 1;
  currentStep: OnboardingStep;
  completed: OnboardingStep[];
  skipped: OnboardingStep[];
  termsVersion?: number;
  termsAcceptedAt?: string;   // ISO, WIB tidak wajib: simpan UTC
  protectionConfirmedAt?: string;
  completedAt?: string;
  tourCompletedAt?: string;
  migrated?: boolean;         // pengguna lama yang dilewati otomatis
};
```

- Profil dasar (nama, usia, gaya hidup, fokus, target lomba, tanggal mulai blok, mode blok) masuk ke Setting dan ikut `resolveProfile()` seperti kondisi/zona/alat.
- **Ekspor/impor naik ke format v3**: mencakup profil dasar + status onboarding. Impor v2 tetap diterima.

### Modul baru
| Modul | Tanggung jawab | Berjalan di |
| --- | --- | --- |
| `lib/onboarding.ts` | State machine murni: langkah berikutnya/sebelumnya, syarat lanjut per langkah, lewati, lanjut dari langkah tersimpan, deteksi pengguna lama, cek versi disclaimer | Server & client |
| `lib/onboarding-store.ts` | Hook baca/tulis state di localStorage | Client |
| Endpoint status koneksi (route handler atau server action) | Panggil intervals.icu lewat `client.ts`, kembalikan `{ status, athleteName? }` saja | Server |
| `components/onboarding/*` | Layar wizard, memakai ulang komponen Setting | Client |
| `components/onboarding/Tour.tsx` | Spotlight & navigasi tur | Client |

### Gerbang (gate)
- Status onboarding hanya ada di perangkat, jadi pemeriksaan dilakukan di client (komponen gate di layout).
- Selama memeriksa: tampilkan skeleton, jangan kedipkan konten lalu redirect.
- Aturan:
  - Belum ada state onboarding **dan** sudah ada data lama (log/Setting/program) → buat state `migrated: true`, `completedAt` = sekarang, tapi tetap tampilkan **langkah 2 saja** satu kali.
  - Belum ada state dan tidak ada data → ke `/onboarding`.
  - `termsVersion` < `TERMS_VERSION` → tampilkan langkah 2 saja.
- Rute `/onboarding` tanpa BottomNav. Rute lain dan struktur 5 tab tidak berubah.

### Header Profil
Header Profil sekarang dirender server dengan profil default. Dengan JSON netral, header harus membaca profil efektif dari perangkat (`useResolvedProfile`) supaya menampilkan nama pengguna.

## 7. Generator dengan profil minimal

- Profil netral (tanpa kondisi, tanpa alat, zona perkiraan) harus menghasilkan workout lari yang valid untuk semua kombinasi.
- ST bodyweight-only: generator **tidak boleh melempar error**. Bila suatu jenis sesi tidak bisa disusun (mis. Upper Pull tanpa pull-up bar dan tanpa band), sesi ditandai lebih pendek atau UI menjelaskan alat yang dibutuhkan. Perilaku pastinya diputuskan setelah memeriksa library; dicatat di TRAINING-LOGIC.

## 8. Aksesibilitas

- Saat pindah langkah, fokus dipindah ke judul langkah. Pengumuman `aria-live` untuk "Langkah X dari 10".
- Semua kontrol ≥ 44px, CTA 48px, input ≥ 16px.
- Checkbox disclaimer punya label yang bisa diklik.
- Tur: popover bisa dioperasikan keyboard, fokus terjebak di popover selama tur, Escape menutup.

## 9. Test

File baru `onboarding.test.ts`:
- Urutan langkah, maju/mundur, langkah wajib memblokir, langkah opsional bisa dilewati.
- Lanjut dari langkah tersimpan; state rusak/versi tidak dikenal → mulai ulang dengan aman.
- Deteksi pengguna lama dari keberadaan data → `migrated`, hanya disclaimer.
- Kenaikan `TERMS_VERSION` → hanya disclaimer.
- "Tidak ada kondisi" saling eksklusif dengan kondisi lain.

Tambahan di file yang ada:
- `settings.test.ts`: profil dasar di Setting menimpa JSON; impor v3; impor v2 tetap jalan; impor tanpa log tidak menghapus log.
- `generator.test.ts`: profil netral × semua kombinasi lari; ST bodyweight-only × semua kombinasi tidak melempar error dan tetap lolos aturan wajib.
- Endpoint status koneksi: pemetaan 401/403/404/5xx/timeout/missing ke status, dan respons tidak pernah berisi key.

UI (wizard, tur) diverifikasi manual di HP: Android Chrome dan iOS Safari, tema gelap & terang, reduced motion. Hasilnya dicatat di PR/CHANGELOG.

## 10. Rencana rilis

| Versi | Isi |
| --- | --- |
| **0.11.0** | Profil dasar di Setting + `resolveProfile`, header Profil dari perangkat, JSON netral + file migrasi pemilik, format ekspor v3, `lib/onboarding.ts` + test, gate, langkah 1, 2, 5, 6, 7, 8, 10 |
| **0.11.1** | Langkah 3 (endpoint status koneksi), 4, 9; bagian "Belum selesai" di Setting; README diperbarui |
| **0.11.2** | Tur in-app + "Ulangi tur"; test ST bodyweight-only menyeluruh; screenshot dokumentasi |

## 11. Perubahan dokumen

**PRD**
- §1 Ringkasan: sebut onboarding dan model satu deploy per orang.
- §2 Pengguna: "orang lain bisa memasang dengan profil sendiri" sekarang lewat onboarding.
- §3: tambah blok **Onboarding & deploy pribadi** (keputusan 2026-10-22):
  - Satu deploy per orang; tanpa akun, login, atau database.
  - Profil di repo selalu netral; data pribadi siapa pun tidak di-commit.
  - Disclaimer kesehatan wajib disetujui sebelum aplikasi dipakai; versi naik → tampil ulang.
  - Pemilihan kondisi wajib eksplisit ("Tidak ada" adalah pilihan, bukan default).
  - Status koneksi intervals.icu dicek di server; browser hanya menerima status.
  - Pengguna lama tidak dipaksa mengulang onboarding dan tidak kehilangan data.
- §4: tabel baru **4.9 Onboarding**; §4.1 "Edit profil dari dalam aplikasi" dan §4.8 "Edit nama, target lomba, tanggal mulai blok" berubah status saat 0.11.0 rilis.
- §5: selaraskan baris Privasi dengan header (deploy pemilik sudah dilindungi; deploy baru diingatkan lewat onboarding).
- §6: ubah #1 (proteksi sudah aktif di deploy pemilik; risiko bagi fork baru ditangani onboarding); #3 dihapus setelah 0.11.0.
- §7 Roadmap: 0.11 **Onboarding & deploy pribadi**, lalu 0.12 Aman & tersinkron, 0.13 Program hidup, 0.14 Insight, 1.0. Tambah catatan bertanggal 2026-10-22. Backlog "Edit sisa profil" ikut 0.11 (kecuali zona HR/RPE yang tetap di backlog). Tambah backlog "Mode offline" dengan catatan relevan untuk rasa native.
- §8 dan header versi diperbarui saat tiap rilis.

**Lainnya**
- ARCHITECTURE: modul baru, key penyimpanan, gate, format ekspor v3.
- TRAINING-LOGIC: perilaku generator dengan profil minimal/bodyweight-only.
- README: tutorial deploy menyebut onboarding, redeploy setelah isi env var, dan migrasi untuk pengguna lama.
- CHANGELOG per rilis.
