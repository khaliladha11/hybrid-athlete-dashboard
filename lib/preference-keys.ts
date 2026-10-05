/** Kunci localStorage preferensi (dipakai client & server-rendered boot script). */
export const PREF_KEYS = {
  theme: "hybrid-athlete.theme",
  blockEnabled: "hybrid-athlete.block-enabled",
  program: "hybrid-athlete.program",
} as const;

/**
 * Script kecil yang dijalankan di <head> sebelum render, supaya tema pilihan
 * langsung terpasang tanpa kedipan (flash) tema yang salah.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${PREF_KEYS.theme}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
