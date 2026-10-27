# Design System "Tag" untuk Hybrid Athlete Dashboard (rencana 0.10-ui)

> Sumber: kartu story lari (Easy 3K, Mini Interval, Fartlek, This Week) + token 0.9 di `app/globals.css`.
> Aturan tambahan dari skill `redesign-existing-projects` & `design-taste-frontend` (Leonxlnx/taste-skill) dan `emil-design-eng` & `mobile-native` (emilkowalski/skills).
> Simpan file ini di `docs/DESIGN-SYSTEM.md`. Kalau ada yang bertentangan dengan PRD §3, PRD yang menang.

## 1. Arah desain

Rasanya seperti **tag lari yang ditempel di layar**: permukaan charcoal, satu oranye Strava, judul italic condensed bertenaga, label mono kecil seperti struk/tag, dan angka yang besar dan rata kolom. Grafiknya menggambar **bentuk latihan**, bukan sekadar hiasan.

- **Dark-first.** Mode gelap adalah wajah utama (sama dengan kartu story). Mode terang tetap ada dengan token yang setara (PRD 4.7: tema Sistem/Terang/Gelap).
- **Satu aksen:** oranye `#FC4C02`. Hijau/kuning/merah tetap ada, tapi hanya sebagai **warna data** (intensitas & status, PRD 4.7). Warna data tidak pernah dipakai untuk chrome (tombol, nav, judul).
- **Bentuk data adalah tanda tangan.** Elemen yang paling diingat adalah *Segment Skyline* (bar segmen) dan *Week Ledger* (tabel minggu ini).

Dial taste-skill untuk app ini: `DESIGN_VARIANCE 4 · MOTION_INTENSITY 3 · VISUAL_DENSITY 6`. Dashboard sebenarnya di luar cakupan taste-skill. Karena itu yang dipakai terutama protokol `redesign-existing-projects` (Scan, Diagnose, Fix) plus aturan warna, tipografi, dan copy dari `design-taste-frontend`.

## 2. Token warna

Nama token **tetap sama dengan 0.9** supaya semua kelas Tailwind yang ada (`bg-surface`, `text-brand-ink`, dst.) langsung ikut berubah. Token baru: `--track`, `--on-brand` (nilai baru), `--surface-raised`.

| Token | Gelap (utama) | Terang | Dipakai untuk |
| --- | --- | --- | --- |
| `--bg` | `#0B0B0C` | `#F7F7F6` | latar halaman (bukan hitam/putih murni) |
| `--surface` | `#161616` | `#FFFFFF` | kartu |
| `--surface-raised` | `#1F1F20` | `#FFFFFF` | sheet, menu, kartu di atas kartu |
| `--subtle` | `#1F1F20` | `#F1F1EF` | baris, isian input |
| `--subtle-strong` | `#27272A` | `#E8E8E5` | chip netral |
| `--line` | `#2A2A2C` | `#ECEBE8` | garis rambut (hairline) |
| `--line-strong` | `#3E3E42` | `#CFCDC8` | border kontrol |
| `--ink` | `#F5F4F1` | `#141414` | teks utama |
| `--muted` | `#A8A7A3` | `#4A4946` | teks sekunder |
| `--faint` | `#8C8B88` | `#6B6A66` | label mono, satuan |
| `--brand` | `#FC4C02` | `#FC4C02` | isi tombol utama, bar kerja, indikator aktif |
| `--brand-hover` | `#FF5F1A` | `#E54400` | hover |
| `--brand-soft` | `#2A1408` | `#FFF0E8` | latar opsi aktif |
| `--brand-ink` | `#FF6A2B` | `#C23F00` | **teks** oranye |
| `--on-brand` | `#0B0B0C` | `#0B0B0C` | teks di atas oranye |
| `--track` | `#6E6E74` | `#8F8E8A` | bar segmen non-kerja (pemanasan, recovery) |
| `--success` / `-ink` / `-soft` | `#4ADE80` / `#6EE7A0` / `#10291A` | `#16A34A` / `#15803D` / `#E8F7EE` | intensitas Easy, status OK |
| `--warning` / `-ink` / `-soft` | `#FACC15` / `#FCD34D` / `#2E2608` | `#EAB308` / `#A16207` / `#FDF6D8` | Moderate |
| `--danger` / `-ink` / `-soft` | `#F87171` / `#FCA5A5` / `#331414` | `#DC2626` / `#B91C1C` / `#FDECEC` | High, status gagal |
| `--info` / `-soft` | `#5AA2FF` / `#0F2440` | `#0060D0` / `#EAF2FD` | catatan/cue |

**Kontras (sudah dihitung, WCAG):** ink di surface gelap 16.5:1 · muted 7.5:1 · faint 5.3:1 · brand-ink gelap 6.3:1 · brand-ink terang di putih 5.2:1 · faint terang di putih 5.4:1.

**Temuan penting:** teks putih di atas `#FC4C02` hanya **3.4:1**, sehingga tombol oranye 0.9 (teks putih 15 sampai 16px) **tidak lolos AA**, padahal PRD §5 mencatat AA ✅. Di sistem ini `--on-brand` diganti `#0B0B0C` (5.8:1), seperti stiker kartu lari. Bar `--track` sudah dipilih ≥ 3:1 terhadap surface (objek grafis): 3.6:1 gelap, 3.3:1 terang.

**Aturan pemakaian warna**
- Oranye sebagai isi hanya untuk: tombol utama, bar segmen kerja, indikator nav aktif, titik penanda. Jangan pakai oranye untuk blok teks panjang.
- Teks oranye selalu `text-brand-ink`, tidak pernah `text-brand`.
- Bayangan kartu dihapus di mode gelap. Elevasi cukup dari beda tone `surface` → `surface-raised`. Mode terang memakai bayangan tipis bertint (`rgba(20,20,20,0.06)`).
- Garis aksen kiri pada kartu (`border-l-[3px] border-l-brand` di CoachCard/CoachStrip) **dihapus**. Pola ini termasuk tanda desain AI generik; diganti ikon + label mono + chip severity.

## 3. Tipografi

Dua keluarga saja, dimuat lewat `next/font/google` (bawaan Next, tanpa dependensi baru):

- **Archivo** (variable, sumbu `wdth` 62–125 + `wght`, plus italic). Satu keluarga untuk tiga peran: condensed italic untuk display, normal untuk body, expanded untuk ledger.
- **Geist Mono** untuk label, satuan, eyebrow, dan chip.

`"Boathouse"` di `--font-sans` sekarang tidak pernah termuat (tidak ada `@font-face`), jadi praktis app memakai Segoe UI. Ganti dengan variabel `next/font`.

| Peran | Kelas/utility | Spesifikasi |
| --- | --- | --- |
| Display XL | `.t-display` | Archivo *italic*, `wdth 75`, `wght 800`, 40/0.95, UPPERCASE, tracking −0.01em, `pb-1` (ruang untuk descender italic) |
| Display M | `.t-display-sm` | sama, 26/1 |
| Stat XL | `.t-stat-xl` | Archivo `wdth 100`, `wght 700`, 44/1, `tabular-nums` |
| Stat | `.t-stat` | 24/1.05, `wght 700`, `tabular-nums` |
| Ledger | `.t-ledger` | Archivo `wdth 125`, `wght 800`, 13/1.2, UPPERCASE, tracking 0.02em |
| Ledger angka | `.t-ledger-num` | `wdth 125`, `wght 800`, 20/1; total 28/1 |
| Body | `text-body` | Archivo `wdth 100`, `wght 400`, 15/1.4; tebal `600` |
| Caption | `text-[13px]` | 13/1.35, `text-muted` |
| Label mono | `.t-label` (ganti `.eyebrow`) | Geist Mono 11/1.2, UPPERCASE, tracking 0.12em, `text-faint` |

Aturan:
- Display hanya **satu per layar** (judul workout, nama aktivitas, judul halaman). Judul kartu tetap Archivo 16/600 biasa.
- Semua angka memakai `tabular-nums`.
- Format pace di tampilan: `5'50"` (seperti jam Huawei). Pakai helper UI baru `formatPaceTag()` di `components/ui/format.ts`. **Jangan** ubah `formatPace` di `lib/` karena dipakai test dan Copy Set.
- Input, select, dan textarea minimal **16px** (iOS tidak zoom otomatis).

## 4. Bentuk, ruang, elevasi

- Radius satu skala "lembut": kartu `20px` (`--radius-card: 1.25rem`), kontrol `12px`, elemen dalam `10px`, chip/pill `999px`, sheet `24px 24px 0 0`.
- Grid 4px. Padding kartu 20px, jarak antar kartu 12px, jarak antar kelompok dalam kartu 16px.
- Area sentuh ≥ 44px (sudah aturan PRD); CTA utama 48px.
- Pemisah dalam kartu memakai garis rambut 1px `--line`, bukan kartu bersarang.
- Skala z-index: nav 20, header status-bar 30, sheet 40, toast 50.

## 5. Motion (dari `emil-design-eng` dan `mobile-native`)

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* masuk/keluar, default */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* bergerak di layar */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* sheet, sudah dipakai 0.9 */
--dur-press: 140ms; --dur-pop: 180ms; --dur-sheet-in: 320ms; --dur-sheet-out: 220ms;
```

- Tidak pernah `ease-in`. Keluar lebih cepat dari masuk.
- Tekan: `scale(0.97)` 140ms ease-out (sudah `.pressable`, ganti `ease` → `--ease-out`).
- Hover hanya di `@media (hover: hover) and (pointer: fine)` (sekarang baru `(hover: hover)`).
- Animasi hanya `transform` dan `opacity`. Jangan animasikan width/height/padding.
- Tidak dianimasikan karena sering dipakai: ganti tab, toggle tema, Segmented, scroll spy.
- Dianimasikan karena jarang: hasil generate (bar skyline tumbuh `scaleY` dari 0.6 + opacity, origin bawah, 240ms, stagger 30ms, total ≤ 300ms), buka sheet, saran baru.
- Tidak pernah mulai dari `scale(0)`. Popover mulai dari `scale(0.96)` + `opacity:0`, origin dari pemicu.
- Reduced motion: hapus gerak posisi/skala, **pertahankan** fade opacity yang membantu pemahaman.
- `overscroll-behavior: none` di `html, body`, dan `contain` di isi sheet.

## 6. Komponen

Setiap komponen dipetakan ke file yang ada. Tidak ada komponen yang dibuat ulang dari nol.

### Card (`components/ui/Card.tsx`)
- `surface`, border `--line`, radius 20, padding 20. Tanpa bayangan di gelap.
- Header: judul 16/600 kiri, aksi kanan. Varian baru `tone="tag"` untuk kartu ringkasan utama: label mono di kiri atas (`● EASY RUN`), judul Display M, lalu StatRow.

### StatRow (baru, menggantikan grid `Stat` 3 kolom)
- 3 sampai 4 kolom dibagi garis vertikal 1px `--line`. Urutan: label mono (`DISTANCE`) → angka `.t-stat` → satuan mono (`KM`).
- Di 375px: maksimal 3 kolom per baris; baris kedua dipisah garis horizontal.
- Nilai kosong: `·` warna `--faint`, bukan em dash.
- Dipakai di: WeeklySummary, WellnessCard, header `/activity/[id]`, header workout.

### Segment Skyline (baru, `components/charts/SegmentSkyline.tsx`)
Grafik bar SVG tanpa library. **Lebar bar ∝ durasi, tinggi bar ∝ kecepatan.**
- **Aktivitas selesai** (`/activity/[id]`, dari `ActivityInterval.movingTimeSec` + `avgPaceSecPerKm`): bar kerja oranye `--brand`, recovery/pemanasan/pendinginan `--track`. Kerja = `type` "WORK" dari intervals.icu; kalau tidak ada, pace lebih cepat dari median. Label pace (`5'00"`) di atas bar kerja bila lebar ≥ 44px. Footer mono: `BEST REP 6'25"/KM`.
- **Workout rencana** (Generator Lari): menggantikan bar hijau/merah 0.9. Lebar dari `durationMin`; tinggi dari tier intensitas langkah (walk 1 · jog/Z2 2 · tempo 3 · interval 4). **Warna tetap tone intensitas** (Easy hijau, Moderate kuning, High merah, jalan `--track`) supaya sistem warna intensitas PRD 4.7 utuh.
- Aturannya mudah diingat: **rencana = warna intensitas, yang sudah selesai = oranye.**
- Skala: tinggi minimum 10% supaya bar tetap terlihat; untuk lari steady (selisih pace < 60 detik) pakai kecepatan relatif dari 0, bukan min-max, supaya tidak melebih-lebihkan selisih kecil.
- Aksesibilitas: `<svg role="img" aria-label="…">` + daftar interval tetap ada di bawahnya sebagai sumber data teks.

### Week Ledger (baru, di `WeeklySummary`)
- Tabel "MINGGU INI · KM": baris per hari lari (`SELASA 3.3`), garis rambut antar baris, baris TOTAL lebih besar (`.t-ledger-num` 28px).
- Data dari aktivitas minggu kalender (sudah dihitung di `summarizeLast7Days().calendarWeek`; tambah rincian per hari di komponen).
- Total adalah jumlah jarak mentah. Angka per hari dibulatkan 1 desimal, jadi jumlahnya bisa beda 0.01 dari total. Itu wajar; jangan "dibetulkan".

### Button (`BUTTON` di Card.tsx)
- Primary: `bg-brand text-on-brand` (teks gelap), 600, tinggi 44/48, radius 12.
- Secondary: border `--line-strong`, latar `surface`.
- Ghost: teks `--ink`, tanpa border, untuk aksi tersier.
- Disabled: `subtle-strong` + `faint`, tanpa animasi tekan.

### Segmented (`components/ui/Segmented.tsx`)
- Tetap: opsi aktif = border + soft + ink (oranye atau tone intensitas). Label legend memakai `.t-label`.
- Tanpa animasi pindah indikator (dipakai puluhan kali per hari).

### Chip / Pill (`Chip`, `pillClasses`)
- Geist Mono 11px UPPERCASE, radius pill, tinggi 22px. Pill intensitas tetap memakai titik warna + teks ink.

### Coach (`CoachStrip`, `CoachCard`)
- Hapus garis aksen kiri. Struktur: label mono `SARAN HARI INI` + chip severity (`EASY` / `ISTIRAHAT`), satu kalimat utama, lalu dropdown alasan.
- Tombol terapkan saran tetap primary kecil (min-h 32 dengan area sentuh diperluas, seperti sekarang).

### AppBar & BottomNav
- AppBar: `LogoMark` 22px (`text-ink`, palang oranye) + wordmark `HYBRID ATHLETE` (Display, 15px), jarak `gap-2`. Tombol tema tetap.
- Logo "Forward H": makna, konstruksi, warna, ukuran minimum, dan larangan ada di [`docs/brand/LOGO.md`](brand/LOGO.md). Di UI selalu lewat `components/ui/LogoMark.tsx` (ikut token tema); ≤ 24px otomatis memakai versi kecil.
- BottomNav: latar `bg/90` + blur, indikator aktif garis 3px oranye di atas (tetap), label Geist Mono 10px UPPERCASE, ikon stroke 1.8 seragam (aktif 2.2).
- `theme-color` gelap → `#0B0B0C`, terang → `#F7F7F6`.

### Movement Sheet
- `surface-raised`, radius 24 atas, buka 320ms `--ease-drawer`, tutup 220ms. Isi `overscroll-behavior: contain`, padding bawah `calc(1rem + env(safe-area-inset-bottom))`.

### State
- Loading: skeleton blok `subtle` (tanpa shimmer bergerak). Kosong: kalimat yang menyebut langkah berikutnya. Error: `ErrorState` yang ada, judul + saran tindakan, tanpa stack trace (PRD §3).

## 7. Copy

- **Tanpa em dash (—) dan en dash (–) di teks UI.** Ganti dengan `·`, titik dua, atau dua kalimat. Rentang angka ditulis `8:00 sampai 8:50/km` atau `8'00"–8'50"` hanya di dalam angka. Catatan: 23 tempat di `components/`/`app/` dan banyak string di `lib/` (coach, readiness, generator). String di `lib/` hanya diubah bersama test-nya, di commit terpisah.
- Kalimat aktif, sentence case untuk kalimat; UPPERCASE hanya untuk label mono dan Display.
- Tanpa tanda seru di pesan sukses. Tombol menyebut hasilnya: "Generate lari", "Salin set", "Terapkan Easy".
- **Nama coach: Gita** (0.14.0, D1). Dipakai konsisten di teks UI: label `Saran Gita` di kartu gerakan dan detail gerakan, kartu saran harian `Saran Gita · hari ini`, dan pengingat alat `Saran Gita · alat`. Nama di kode (`coach`, `CoachCard`) tidak diganti. Gita menjelaskan alasan dengan angka dan tidak pernah memblokir.

## 8. Yang tidak boleh berubah

- Semua logika di `lib/` dan 136 unit test. Redesign ini **tidak** menyentuh generator, aturan cedera, atau RPE.
- Struktur 5 tab, rute, `localStorage` key, Demo Mode, API key hanya di server.
- Gambar gerakan hanya dari free-exercise-db yang ada (tidak ada gambar AI baru).
- Tanpa library UI/animasi baru. Tailwind v4 `@theme` yang sudah ada dipakai apa adanya.

## 9. Kemungkinan lanjutan (bukan bagian rilis ini)

- **MuscleMap** (0.14.2, [STRENGTH-HIDUP.md](STRENGTH-HIDUP.md) §3 & §6): diagram tubuh depan/belakang sebagai komponen SVG sendiri (`components/charts/MuscleMap.tsx`), warna dari token tema sehingga ikut mode gelap/terang. Keputusan terbuka: warna otot utama/sekunder (usulan `--brand` / `--brand-soft`, otot lain `--subtle-strong`) perlu dicatat di sini karena oranye selama ini berarti "selesai".
- **Bagikan kartu story** dari `/activity/[id]`: render RunTag (komponen yang sama dengan kartu story) ke PNG transparan 1920×1280 lewat `<canvas>`. Ini fitur baru, jadi masukkan dulu ke backlog PRD §7 sebagai P2.
