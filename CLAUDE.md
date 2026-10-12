# CLAUDE.md

Panduan untuk Claude Code di repo ini. Aturan produk & latihan ada di [docs/PRD.md](docs/PRD.md) §3; arsitektur di [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Desain

- **Wajib ikuti [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** (design system "Tag") untuk setiap perubahan UI. Bila bertentangan dengan PRD §3, PRD yang menang.
- Pakai token semantik di `app/globals.css` (`bg-surface`, `text-brand-ink`, `fill-track`, …), bukan warna Tailwind mentah. Nama token tidak diganti; yang berubah hanya nilainya.
- **Rencana = warna intensitas, selesai = oranye.** Hijau/kuning/merah hanya untuk data (intensitas Easy/Moderate/High, status aktif/nonaktif), tidak untuk chrome. Oranye `#FC4C02` satu-satunya aksen; teks oranye selalu `text-brand-ink`.
- **Tanpa em dash (—) dan en dash (–) di teks UI.** Pakai `·`, titik dua, atau dua kalimat. Rentang angka boleh memakai en dash di dalam angka (`6:15–6:30/km`).
- Nilai kosong ditulis `·` warna faint. Pace di tampilan `5'50"` lewat `formatPaceTag` (`components/ui/format.ts`); jangan ubah `formatPace` di `lib/`.
- Display (`.t-display`) hanya satu per layar. Area sentuh ≥ 44px, input ≥ 16px, kontras AA di kedua tema, reduced motion dihormati, hover hanya untuk pointer presisi.
- Tanpa dependensi UI/animasi/chart baru; grafik pakai SVG sendiri.
