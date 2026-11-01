/**
 * Merek jam dan langkah sampai workout ada di jam (0.17). Murni.
 *
 * intervals.icu tidak punya endpoint API untuk mendorong satu workout ke jam; unggah diatur sakelar per akun
 * (`huawei_upload_workouts`, `icu_garmin_upload_workouts`, `coros_upload_workouts`, spesifikasi OpenAPI) dan waktunya
 * tidak terdokumentasi. Uji pemilik (2026-11-01, Huawei, threshold pace terisi): workout masuk sendiri ke Huawei
 * Health setelah dikirim. Langkah di bawah menulis jalur cadangan bila belum muncul, tanpa menjanjikan "pasti di jam".
 */

export const WATCH_BRANDS = ["huawei", "garmin", "coros", "other"] as const;
export type WatchBrand = (typeof WATCH_BRANDS)[number];
export const isWatchBrand = (x: unknown): x is WatchBrand => typeof x === "string" && (WATCH_BRANDS as readonly string[]).includes(x);

export const WATCH_LABEL: Record<WatchBrand, string> = { huawei: "Huawei", garmin: "Garmin", coros: "Coros", other: "Lainnya" };

/** Sakelar "Upload planned workouts" per merek di objek athlete intervals.icu. */
export const UPLOAD_FLAG: Partial<Record<WatchBrand, string>> = {
  huawei: "huawei_upload_workouts",
  garmin: "icu_garmin_upload_workouts",
  coros: "coros_upload_workouts",
};

/** Langkah setelah "Kirim ke jam", per merek. */
export const WATCH_STEPS: Record<WatchBrand, string[]> = {
  huawei: [
    "Biasanya masuk sendiri ke Huawei Health beberapa saat setelah dikirim (lari terencana berikutnya dalam seminggu).",
    "Belum muncul: buka event di kalender intervals.icu lalu ketuk Upload to Huawei.",
    "Di jam: Workout › Outdoor Run › Courses › Custom Courses. Belum ada di jam: buka Huawei Health › Olahraga › Lari luar ruangan › My running courses, lalu ketuk ikon jam.",
  ],
  garmin: [
    "intervals.icu mengunggah workout seminggu ke depan ke Garmin Connect.",
    "Muncul di jam setelah Garmin Connect sinkron dengan jam.",
  ],
  coros: [
    "intervals.icu mengunggah workout seminggu ke depan ke Coros.",
    "Belum muncul: tambahkan Intervals.icu Training Plan ke kalender aplikasi Coros.",
  ],
  other: [
    "Workout masuk ke kalender intervals.icu. Jam lain mengikuti halaman integrasi intervals.icu.",
    "Tanpa jam yang tersambung ke intervals.icu, pakai Copy Set.",
  ],
};

/** Sakelar unggah merek ini di data athlete; undefined = tidak diketahui (merek lain atau bentuk tidak dikenal). */
export function uploadEnabled(athlete: unknown, brand: WatchBrand): boolean | undefined {
  const key = UPLOAD_FLAG[brand];
  if (!key || !athlete || typeof athlete !== "object") return undefined;
  const v = (athlete as Record<string, unknown>)[key];
  return typeof v === "boolean" ? v : undefined;
}

/** `push_errors` event intervals.icu → teks pendek (maks 3, masing-masing ≤ 160 karakter). */
export function pushErrors(event: unknown): string[] {
  const list = event && typeof event === "object" ? (event as { push_errors?: unknown }).push_errors : undefined;
  if (!Array.isArray(list)) return [];
  return list
    .map((e) => {
      const r = e as { service?: unknown; message?: unknown };
      const msg = typeof r?.message === "string" ? r.message.trim() : "";
      const svc = typeof r?.service === "string" ? r.service.trim() : "";
      return msg ? `${svc ? `${svc}: ` : ""}${msg}`.slice(0, 160) : "";
    })
    .filter(Boolean)
    .slice(0, 3);
}
