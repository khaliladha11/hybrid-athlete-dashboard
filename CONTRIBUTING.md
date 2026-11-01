# Berkontribusi

> **English summary.** Thanks for helping.
> - **Run it in Demo Mode:** `npm install`, then `npm run dev`. No API key is needed.
> - **Before a PR:** `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` must pass.
> - **Where to post:** ideas start in [GitHub Discussions](https://github.com/khaliladha11/hybrid-athlete-dashboard/discussions); bugs go to issues.
> - **Training logic:** any change needs a credible source (a guideline, a consensus statement, or a peer-reviewed study) and tests ([PRD §3](docs/PRD.md#3-aturan-yang-tidak-boleh-dilanggar)).
> - **Privacy:** never commit real health data, activity IDs, or secrets. Take screenshots only in Demo Mode.
> - **UI copy:** Indonesian, following [DESIGN-SYSTEM §7](docs/DESIGN-SYSTEM.md).
> - **Also see:** [SECURITY.md](SECURITY.md) for security issues and [AGENTS.md](AGENTS.md) for AI coding tools.

Terima kasih sudah mau membantu. Aplikasi ini dipakai untuk latihan sungguhan dan menyimpan data kesehatan, jadi ada beberapa aturan yang tidak bisa ditawar. Semuanya ada di bawah.

## Menjalankan di komputer

```bash
npm install
npm run dev
```

Tanpa `INTERVALS_API_KEY`, aplikasi berjalan di **Demo Mode** dengan data fiktif. Itu cukup untuk hampir semua perubahan. Bila perlu data sendiri, salin `.env.example` ke `.env.local` (diabaikan git) dan isi di sana.

## Sebelum membuka pull request

```bash
npm run typecheck
npm test
npm run build
npm run e2e
```

`npm run e2e` butuh Chromium Playwright; pasang sekali dengan `npx playwright install chromium`.

Selain perintah di atas, CI juga menjalankan:
- audit dependensi;
- pemeriksaan bundle klien (rahasia server tidak boleh sampai ke browser);
- anggaran Lighthouse;
- `actionlint`.

## Mengusulkan sesuatu

1. **Ide atau pertanyaan:** mulai di [Discussions](https://github.com/khaliladha11/hybrid-athlete-dashboard/discussions). Arahnya lebih mudah dibahas sebelum ada kode.
2. **Bug:** buka issue dengan templat **Laporan bug**. Versi aplikasi ada di Setting › Tentang & versi.
3. **Masukan logika latihan:** pakai templat **Masukan logika latihan**, wajib dengan sumber.
4. **Pull request:** kecil dan satu tujuan. Isi checklist di templat PR.

## Aturan yang tidak bisa ditawar

- **Logika latihan butuh sumber dan test.**
  - Ini berlaku untuk perubahan aturan generator, saran, progresi, kondisi, atau ambang apa pun.
  - Sumbernya harus kredibel (guideline, consensus statement, atau studi peer-review) dan dicantumkan di [docs/TRAINING-LOGIC.md](docs/TRAINING-LOGIC.md).
  - Sertakan test yang mengunci perilakunya.
  - Aturan umum di [PRD §3](docs/PRD.md#3-aturan-yang-tidak-boleh-dilanggar) (RPE ≤ 7, batas alat & keamanan, kenaikan long run, saran tidak memblokir) tidak diubah tanpa persetujuan pemilik.
- **Privasi.**
  - Jangan commit data asli: ID aktivitas intervals.icu/Strava, tanggal & jam sesi, nilai HR/HRV/tidur, atau angka dari situs deploy siapa pun.
  - Test dan dokumen memakai data fiktif atau Demo Mode.
  - Screenshot hanya dari Demo Mode.
- **Rahasia.** API key, sandi, dan token hanya disimpan di `.env.local` atau di environment variable Vercel. API key hanya dibaca di server (`server-only`).
- **Data tersimpan.**
  - Setiap perubahan bentuk data di perangkat, sinkron, atau cadangan wajib menambah migrasi di `lib/migrations/schema.ts`, beserta fixture di `__tests__/fixtures/backups/`.
  - Migrasi harus idempoten dan tidak pernah menghapus data yang tidak dikenali.
- **Tampilan** mengikuti [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md):
  - token semantik;
  - copy bahasa Indonesia tanpa em dash/en dash dan tanpa tanda seru;
  - area sentuh ≥ 44px;
  - kontras AA di kedua tema;
  - tanpa dependensi UI, animasi, atau chart baru.
- **String di `lib/`** yang tampil ke pengguna dijaga test pemindai copy. Perubahan string beserta test-nya di-commit terpisah dari perubahan logika.
- **Aset pihak ketiga** hanya boleh berlisensi bebas, dan dicatat di [NOTICE.md](NOTICE.md) dengan sumber, lisensi, dan tautan.

## Rilis

- Versi mengikuti semver ([PRD §9](docs/PRD.md#9-cara-memperbarui-dokumen-ini)).
- Setiap rilis menambah bagian di [CHANGELOG.md](CHANGELOG.md).
- Tindakan yang harus dilakukan pemilik deploy ditulis di bawah `### Langkah manual`, karena bagian itu diangkat ke PR pembaruan untuk salinan dan fork.

## Perilaku

Ikuti [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
