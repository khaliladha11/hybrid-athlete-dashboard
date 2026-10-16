# Logo Hybrid Athlete: "Forward H"

![Lockup](lockup.png)

## Makna

| Bagian | Arti |
| --- | --- |
| Tiang kiri padat | **Strength**: massa, beban, fondasi |
| Palang oranye | **Hybrid**: yang menyatukan dua kemampuan |
| Tiga lajur yang menikung | **Lari**: lintasan 400 m yang keluar dari tikungan; satu huruf, dua sifat = **adaptasi** |
| Huruf condong 12° ke depan | **Mental**: selalu bergerak maju (sama dengan kemiringan judul Archivo italic) |

## Konstruksi

- Grid 120 unit, `viewBox="10 15 100 100"`, lalu `translate(13 0) skewX(-12)`.
- Tiang kiri 24 × 84, radius 3. Palang 26 × 14, rata tengah tinggi tiang.
- Lajur: garis 6 unit, jarak pusat 9 unit, tikungan konsentris berjari-jari 12 / 21 / 30.
- **Versi kecil (≤ 24 px)**: tiga lajur dilebur menjadi satu jalur tebal 24 unit (`mark-small.svg`, `favicon.svg`).

## Warna

| Latar | Tiang & lajur | Palang |
| --- | --- | --- |
| Terang `#F7F7F6` / putih | `#141414` (ink) | `#FC4C02` (brand) |
| Gelap `#0B0B0C` | `#F5F4F1` | `#FC4C02` |
| Oranye `#FC4C02` (ikon app) | `#0B0B0C` | `#F5F4F1` |
| Satu warna | `currentColor` (`mark-mono.svg`) | sama |

Palang oranye tidak pernah dipakai di atas latar oranye; di ikon app palangnya off-white.

## Ukuran & ruang

- Ruang kosong di sekeliling tanda minimal setinggi palang (14 unit).
- Ukuran minimum: 16 px (pakai versi kecil). Lockup minimum: tinggi 20 px.
- Di lockup, tinggi tanda = 1,5 × tinggi huruf kapital, jarak ke wordmark = 22% lebar tanda.
- Wordmark: Archivo Italic, lebar 75, tebal 800, UPPERCASE. Di SVG lockup sudah dikonversi jadi kurva (tidak butuh font).

## Jangan

- Jangan tegakkan (hilangkan kemiringan) atau balik arah huruf.
- Jangan ganti warna palang selain oranye/off-white, dan jangan beri efek bayangan, gradien, atau garis luar.
- Jangan pakai versi detail di bawah 24 px, atau versi kecil di atas 64 px.
- Jangan pisahkan palang dari tiang kiri.

## File

| File | Pakai untuk |
| --- | --- |
| `mark.svg`, `mark-on-dark.svg`, `mark-mono.svg` | tanda saja (README, dokumen) |
| `mark-small.svg`, `mark-small-on-dark.svg` | 16 sampai 24 px |
| `lockup.svg`, `lockup-on-dark.svg` (+ `.png` transparan) | tanda + wordmark |
| `public/icon.svg` → `icon-192/512.png`, `apple-touch-icon.png` | ikon PWA (aman untuk maskable) |
| `public/favicon.svg` → `favicon-32.png`, `favicon-16.png` | favicon tab browser |
| `components/ui/LogoMark.tsx` | tanda di dalam UI (ikut token tema) |
