# NOTICE

Kode project ini dirilis di bawah **MIT License** (lihat [LICENSE](LICENSE)), Copyright (c) 2026 Muhammad Khalil Adha.
Aset dan kode pihak ketiga di bawah ini tetap memakai lisensinya masing-masing. Audit terakhir: 2026-11-01 (1.0.0-rc.1).

## Ringkasan

| Aset | Dipakai di | Sumber | Lisensi |
| --- | --- | --- | --- |
| Gambar gerakan (WebP) | `public/movements/` | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | [The Unlicense](https://unlicense.org/) (public domain) |
| Path SVG tubuh depan & belakang | `components/charts/muscle-paths.ts` | [MuscleMapJS](https://github.com/abdofallah/MuscleMapJS), diturunkan dari [MuscleMap SwiftUI](https://github.com/melihcolpan/MuscleMap); region sama dengan [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) | MIT (ketiganya) |
| Font Archivo | `app/layout.tsx` lewat `next/font` (file font ikut di build) | [Omnibus-Type/Archivo](https://github.com/Omnibus-Type/Archivo) via [Google Fonts](https://fonts.google.com/specimen/Archivo) | [SIL OFL 1.1](https://openfontlicense.org/) |
| Font Geist Mono | `app/layout.tsx` lewat `next/font` | [vercel/geist-font](https://github.com/vercel/geist-font) via [Google Fonts](https://fonts.google.com/specimen/Geist+Mono) | [SIL OFL 1.1](https://openfontlicense.org/) |
| Ikon peringatan (segitiga) dan bulan | `components/generator/CoachCard.tsx`, `CoachStrip.tsx`, `components/ui/AppBar.tsx` | [Feather](https://github.com/feathericons/feather) (`alert-triangle`, `moon`), koordinat dibulatkan | MIT |
| Ikon matahari | `components/ui/AppBar.tsx` | [Lucide](https://github.com/lucide-icons/lucide) (`sun`), koordinat dibulatkan | ISC |
| Ikon lain (navigasi bawah, tutup, putar/jeda, centang, tambah, panah) | `components/` | Dibuat sendiri (geometri sederhana) | MIT (project ini) |
| Dependensi runtime | bundel aplikasi | [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), React DOM, scheduler, styled-jsx, server-only | MIT |
| | | [@swc/helpers](https://github.com/swc-project/swc) | Apache-2.0 |
| | | [tslib](https://github.com/microsoft/tslib) | 0BSD |
| Optimasi gambar di server | dipakai Next.js di server/Vercel, tidak dikirim ke browser | [sharp](https://github.com/lovell/sharp) / [libvips](https://github.com/libvips/libvips) | Apache-2.0 / LGPL-3.0 (pustaka tidak diubah, ditautkan dinamis) |

- Alat pengembangan (Tailwind CSS, TypeScript, Vitest, Playwright, axe-core, PostCSS) tidak dikirim ke pengguna; lisensinya MIT atau Apache-2.0 / MPL-2.0. `caniuse-lite` (CC-BY-4.0) hanya dipakai saat build.
- **openGym** (AGPL-3.0) hanya dirujuk sebagai **konsep** latihan (docs/STRENGTH-HIDUP.md §5). Tidak ada kode, teks, atau aset UI yang disalin.
- Teks cue teknik, nama otot bahasa Indonesia, aturan latihan, dan semua copy UI ditulis sendiri; referensi ilmiahnya ada di docs/TRAINING-LOGIC.md.

## Gambar gerakan

Gambar di `public/movements/` berasal dari **free-exercise-db**
(https://github.com/yuhonas/free-exercise-db) oleh Yuhonas dan kontributor, yang dirilis di bawah
**The Unlicense** (public domain). Atribusi ini tidak diwajibkan oleh lisensinya; dicantumkan demi transparansi.

- Gambar diunduh hanya untuk gerakan yang dipakai, lalu diperkecil (lebar maks 600 px) dan dikonversi ke WebP
  oleh `scripts/fetch-movement-media.mjs`.
- Pemetaan gerakan ↔ ID sumber ada di `lib/movements/media.ts`; dasar pemilihannya di `docs/movement-media-audit.md`.
- Cue teknik, nama otot (bahasa Indonesia), dan catatan kondisi ditulis sendiri, bukan salinan instruksi sumber.
- Gerakan tanpa padanan yang layak sengaja tidak diberi gambar ("Gambar belum tersedia"); tidak ada gambar
  buatan AI atau dari sumber lain.
- 0.14.2: 11 gerakan baru dan gambar Dead Hang (`Scapular_Pull-Up`) serta Negative Pull-Up (`Pullups`, urutan dibalik)
  memakai sumber yang sama. wger dan Wikimedia Commons sudah dicek untuk gerakan tanpa gambar, tetapi tidak ada
  pasangan gambar awal/akhir yang cocok, jadi tidak ada gambar dari sumber lain.

## Peta otot (SVG anatomi)

Path tubuh depan & belakang di `components/charts/muscle-paths.ts` (dipakai `components/charts/MuscleMap.tsx`) disalin dari
**MuscleMapJS** (https://github.com/abdofallah/MuscleMapJS, MIT). MuscleMapJS menyebut path tubuhnya diturunkan dari
**MuscleMap SwiftUI** (https://github.com/melihcolpan/MuscleMap, MIT). Nama region dan bentuknya sama dengan
**react-native-body-highlighter** (https://github.com/HichamELBSI/react-native-body-highlighter, MIT), sehingga
pemberitahuan lisensi ketiganya dicantumkan.

- Yang disalin hanya data path model pria untuk region yang dipakai; path kiri, kanan, dan umum digabung per region.
  Renderer canvas, gaya, dan kode lain dari sumber tidak dipakai. Warna diambil dari token tema app.
- Pemetaan nama otot kita ke region ada di `lib/movements/muscle-regions.ts` (karya sendiri).
- Tidak dipasang sebagai dependensi npm.

### MuscleMapJS

```
MIT License

Copyright (c) 2026 Abdofallah

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### MuscleMap (SwiftUI)

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### react-native-body-highlighter

```
MIT License

Copyright (c) 2022 ELABBASSI Hicham

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Font

Archivo dan Geist Mono dimuat lewat `next/font/google`; file fontnya ikut di hasil build dan dikirim ke browser, jadi pemberitahuan lisensinya dicantumkan di sini.

- Archivo: Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)
- Geist Mono: Copyright (c) 2023 Vercel, in collaboration with basement.studio

Kedua font dilisensikan di bawah SIL Open Font License, Version 1.1:

```
-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

## Ikon

Path ikon peringatan dan bulan berasal dari Feather; path ikon matahari dari Lucide (Lucide sendiri turunan Feather). Koordinatnya dibulatkan, bentuknya sama.

### Feather

```
The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Lucide

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
