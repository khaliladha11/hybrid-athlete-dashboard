/** Kunci localStorage preferensi (dipakai client & server-rendered boot script). */
export const PREF_KEYS = {
  theme: "hybrid-athlete.theme",
  blockEnabled: "hybrid-athlete.block-enabled",
  program: "hybrid-athlete.program",
  /** Pengaturan atlet (profil dasar, kondisi, zona, alat, movement library). */
  settings: "hybrid-athlete.settings.v1",
  /** Log sesi ST (dibaca/ditulis lewat `lib/training-log.ts`). */
  log: "hybrid-athlete.log.v1",
  /** Status onboarding (`lib/onboarding.ts`). */
  onboarding: "hybrid-athlete.onboarding.v1",
  /** PR kemampuan (0.14.0, `lib/pr-store.ts`). */
  prs: "hybrid-athlete.prs.v1",
  /** Sesi ST dari mode latihan (0.14.1, `lib/st-session-store.ts`). */
  sessions: "hybrid-athlete.st-sessions.v1",
  /** Check-in harian (0.15.2, `lib/checkin-store.ts`). */
  checkins: "hybrid-athlete.checkins.v1",
  /** Bulan ringkasan bulanan yang sudah ditutup (YYYY-MM, 0.15.2; hanya perangkat ini). */
  monthlyDismissed: "hybrid-athlete.monthly-dismissed",
  /** Sesi latihan yang sedang berjalan (0.14.1, tidak disinkron). */
  activeWorkout: "hybrid-athlete.st-active.v1",
  /** Getar saat timer mode latihan habis (per perangkat, tidak disinkron). */
  workoutVibrate: "hybrid-athlete.workout-vibrate",
} as const;

/**
 * Script kecil yang dijalankan di <head> sebelum render, supaya tema pilihan
 * langsung terpasang tanpa kedipan (flash) tema yang salah.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${PREF_KEYS.theme}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
