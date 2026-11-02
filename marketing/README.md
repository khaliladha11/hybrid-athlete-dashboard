# Media marketing

Video pratinjau dan post media sosial yang dibuat ulang dari repo. Semuanya direkam dari **Demo Mode** (data fiktif `lib/mock-data.ts`, env rahasia dikosongkan), tanpa API key dan tanpa nama orang. Folder ini tidak di-import app dan diabaikan saat deploy (`.vercelignore`).

## Perintah

| Perintah | Hasil | Butuh |
| --- | --- | --- |
| `npm run media:posts` | `out/posts/*.png` (carousel IG 5 slide 1080×1350, single 1080×1350 dan 1080×1080, story 1080×1920) | Playwright |
| `npm run media:video` | `out/video/preview-vertical.mp4` (1080×1920, ±28 dtk, H.264, tanpa audio), `out/video/poster.png`, `../docs/media/preview-readme.webp` (hero README) dan `../docs/media/preview-poster.png` | Playwright + ffmpeg |

Keduanya menjalankan `next build` bila `.next` belum ada, lalu `next start` Demo Mode di port 3302 (`MEDIA_PORT` untuk mengganti). Tambah `--build` untuk memaksa build ulang setelah mengubah app.

- **ffmpeg** harus build lengkap (libx264, libwebp). Di Windows: `winget install Gyan.FFmpeg`, lalu buka terminal baru. Skrip juga mencari lokasi winget/choco, atau pakai env `FFMPEG=<path>`. ffmpeg bawaan Playwright tidak cukup (hanya VP8/WebM, tanpa overlay).
- **Browser:** lokal memakai Microsoft Edge yang terpasang, sama seperti e2e. `MEDIA_BROWSER=chromium` memakai Chromium Playwright (`npx playwright install chromium`).
- Opsi video: `--recorder=shots` (bawaan, screenshot 2× ±17 fps, tajam), `--recorder=cdp` (screencast ±30 fps, lebih lembut), `--recorder=video` (recordVideo Playwright, cadangan), `--keep` (simpan `out/video/work`).
- Opsi post: `--only=carousel-1,story`.

## Isi

| Path | Isi |
| --- | --- |
| `scripts/record-preview.mjs` | Storyboard (adegan, durasi, caption) + rekam + susun video |
| `scripts/stage.mjs` | Lapisan video: bingkai HP, caption, kartu pembuka/penutup (HTML ber-token "Tag") |
| `scripts/render-posts.mjs` | Tangkap screenshot Demo Mode lalu render post |
| `scripts/lib.mjs` | Server Demo Mode, seed localStorage, font app, pencarian ffmpeg |
| `posts/` | Template post: `index.html#<id>` (bisa dibuka langsung di browser setelah sekali render), `posts.js` (copy), `tag.css` (token) |
| `captions.md` | Caption Threads/IG (Indonesia + Inggris), hashtag, alt text |

Storyboard video (±28 dtk, 30 fps, crossfade 0,3 dtk, tanpa musik): pembuka "Hari ini latihan apa?", Profil + saran Gita, generator lari lalu Kirim ke jam, mode latihan strength + peta otot, Program dengan Hari H, heatmap otot Insight, penutup "Gratis. Pasang sendiri."

Variasi workout lari diacak oleh server (seed acak), jadi pola lari bisa berbeda di tiap render. Data dan tata letaknya tetap sama.

## Yang di-commit

- Di-commit: skrip, template, `captions.md`, `out/posts/*.png` (±1,5 MB total), `docs/media/preview-readme.webp` dan `docs/media/preview-poster.png`.
- Tidak di-commit: `out/video/` (MP4 diunggah sebagai aset GitHub Release), `out/shots/`, `out/fonts.css`.
