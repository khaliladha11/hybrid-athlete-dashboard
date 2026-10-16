import type { Activity } from "./types";

/**
 * Selisih jam mulai maksimal agar dua aktivitas dianggap rekaman yang sama.
 * Jam yang sinkron ke Strava (Huawei → Strava → intervals.icu) memakai jam mulai yang sama persis;
 * dua perangkat yang merekam sesi yang sama biasanya selisih < 1 menit.
 */
export const DUPLICATE_WINDOW_SEC = 5 * 60;

/** Aktivitas tanpa data apa pun (mis. salinan Strava: intervals.icu tidak boleh meneruskan isinya lewat API). */
export function isEmptyActivity(a: Activity): boolean {
  return !a.distanceKm && !a.movingTimeSec && !a.avgHr && !a.trainingLoad;
}

function startSec(a: Activity): number | undefined {
  if (!a.startLocal) return undefined;
  // startLocal tanpa zona waktu; dibaca sebagai UTC hanya untuk menghitung selisih.
  const ms = Date.parse(`${a.startLocal.slice(0, 19)}Z`);
  return Number.isNaN(ms) ? undefined : ms / 1000;
}

/** Skor kelengkapan: sumber non-Strava dulu, lalu jumlah field yang terisi. */
function richness(a: Activity): number {
  const fields = [a.distanceKm, a.movingTimeSec, a.avgHr, a.trainingLoad, a.cadenceSpm, a.avgPaceSecPerKm, a.maxHr].filter(Boolean).length;
  return (a.source === "STRAVA" ? 0 : 100) + fields;
}

function sameSession(a: Activity, b: Activity): boolean {
  const sa = startSec(a);
  const sb = startSec(b);
  if (sa === undefined || sb === undefined || Math.abs(sa - sb) > DUPLICATE_WINDOW_SEC) return false;
  // Salinan kosong (tipe tidak diketahui) cocok dengan kategori apa pun; dua rekaman berisi harus sejenis.
  return a.category === b.category || isEmptyActivity(a) || isEmptyActivity(b);
}

/**
 * Buang rekaman ganda dari sesi yang sama (mis. jam Huawei yang juga tersambung ke Strava, sehingga
 * intervals.icu menerima dua salinan). Dari tiap kelompok disimpan yang datanya paling lengkap.
 * Urutan daftar asli dipertahankan.
 */
export function dedupeActivities(list: Activity[]): Activity[] {
  const drop = new Set<number>();
  for (let i = 0; i < list.length; i++) {
    if (drop.has(i)) continue;
    for (let j = i + 1; j < list.length; j++) {
      if (drop.has(j) || !sameSession(list[i], list[j])) continue;
      if (richness(list[j]) > richness(list[i])) {
        drop.add(i);
        break;
      }
      drop.add(j);
    }
  }
  return list.filter((_, i) => !drop.has(i));
}
