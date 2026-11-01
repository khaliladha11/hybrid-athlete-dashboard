## Apa yang berubah

<!-- Satu atau dua kalimat. Tautkan issue atau diskusi bila ada. -->

## Checklist

**Aturan PRD §3**
- [ ] Tidak melanggar aturan umum latihan:
  - RPE ≤ 7;
  - batas alat & keamanan;
  - long run naik ≤ 10% dan ≤ 2 km per minggu;
  - saran tidak memblokir.
- [ ] Bila mengubah logika latihan: sumber kredibel dicantumkan di docs/TRAINING-LOGIC.md, dan ada test yang mengunci perilakunya.
- [ ] Aturan kondisi hanya berlaku bila kondisinya aktif, dan kondisi baru membawa sumber serta test.
- [ ] Keamanan:
  - API key dan token database hanya dibaca di server;
  - pesan error tanpa stack trace atau rahasia;
  - Demo Mode tetap jalan.

**Privasi & data**
- [ ] Tanpa data asli (ID aktivitas, tanggal/jam sesi, HR/HRV/tidur, alamat deploy). Screenshot dari Demo Mode.
- [ ] Bila bentuk data tersimpan berubah: migrasi baru di `lib/migrations/schema.ts` beserta fixture cadangan.

**Tampilan**
- [ ] Mengikuti DESIGN-SYSTEM:
  - token semantik;
  - copy bahasa Indonesia tanpa em dash/en dash dan tanpa tanda seru;
  - area sentuh ≥ 44px;
  - kontras AA di dua tema;
  - tanpa dependensi UI baru.

**Uji**
- [ ] `npm run typecheck`, `npm test`, `npm run build`, dan `npm run e2e` lolos.
- [ ] CHANGELOG diperbarui. Tindakan untuk pemilik deploy ditulis di `### Langkah manual`.
