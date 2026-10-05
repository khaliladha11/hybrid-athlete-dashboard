import { randomSeed } from "./rng";

/** Seed tetap supaya hasilnya sama di server & client (tanpa hydration mismatch). */
const PROBE_SEEDS = Array.from({ length: 16 }, (_, i) => i * 7919 + 1);

/**
 * Apakah kombinasi input ini punya lebih dari satu pola?
 * `render` memetakan seed → teks workout (identitas visual hasil generate).
 * Contoh tanpa variasi: Norwegian 4×4 yang strukturnya baku.
 */
export function hasVariations(render: (seed: number) => string): boolean {
  const first = render(PROBE_SEEDS[0]);
  return PROBE_SEEDS.some((s) => render(s) !== first);
}

/**
 * Cari seed baru yang menghasilkan workout BERBEDA dari yang sedang tampil,
 * supaya tombol "Variasi lain" tidak pernah terlihat diam.
 * Mengembalikan seed saat ini bila tidak ditemukan variasi.
 */
export function nextDistinctSeed(render: (seed: number) => string, currentSeed: number, tries = 32): number {
  const current = render(currentSeed);
  for (let i = 0; i < tries; i++) {
    const s = randomSeed();
    if (s !== currentSeed && render(s) !== current) return s;
  }
  return currentSeed;
}
