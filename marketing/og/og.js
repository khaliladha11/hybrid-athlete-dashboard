/*
 * Social preview GitHub (kartu tautan di Threads, LinkedIn, WhatsApp, X, Slack): 1280×640, gelap saja.
 * Dua varian: A = HP dengan screenshot Demo Mode (peta otot), B = motif Segment Skyline.
 * Safe area 64 px untuk teks dan logo; maksimal tiga tingkat teks; tanpa logo pihak ketiga.
 * Dirender oleh `npm run media:og`; buka index.html#a atau #b untuk pratinjau.
 */
const SAFE = 64;
const shot = (name) => `../out/shots/${name}.png`;

/** Kolom kiri yang sama untuk kedua varian. */
const left = `
  <div class="og-left">
    <img class="og-lockup" src="../../docs/brand/lockup-on-dark.svg" alt="Hybrid Athlete">
    <h1 class="display og-head"><span class="nowrap">Lari + strength</span><br><em>di rumah</em></h1>
    <p class="og-sub">Saran harian · program lomba<br>peta otot · kirim ke jam</p>
    <p class="label og-foot"><b>Open source · MIT</b><br><span class="url">github.com/khaliladha11/hybrid-athlete-dashboard</span></p>
  </div>`;

/** Segment Skyline: pemanasan, 5 blok kerja + pemulihan, pendinginan. Oranye = sesi selesai (DESIGN-SYSTEM). */
function skyline() {
  const bars = [{ w: 40, h: 150 }];
  for (let i = 0; i < 5; i++) {
    bars.push({ w: 30, h: 330, work: true });
    if (i < 4) bars.push({ w: 10, h: 96 });
  }
  bars.push({ w: 36, h: 120 });
  return `<div class="og-skyline">${bars.map((b) => `<span class="${b.work ? "work" : ""}" style="width:${b.w}px;height:${b.h}px"></span>`).join("")}</div>`;
}

window.OG_RECOMMENDED = "a";
window.OG = {
  a: {
    size: [1280, 640],
    html: `${left}
      <div class="phone" style="left:808px;top:${SAFE + 20}px;width:440px;height:840px">
        <div class="screen"><img src="${shot("otot")}" alt="" style="margin-top:-${Math.round(16 * (416 / 390))}px"></div>
      </div>`,
  },
  b: {
    size: [1280, 640],
    html: `${left}
      <div class="og-panel">${skyline()}</div>`,
  },
};
