# NOTICE

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
