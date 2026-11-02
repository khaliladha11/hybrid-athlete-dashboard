/*
 * Isi post media sosial (Instagram carousel, single image, story). Semua copy bahasa Indonesia, tanpa em/en
 * dash, tanpa logo pihak ketiga. Screenshot (`shot`) = tangkapan Demo Mode di ../out/shots/<nama>.png.
 * Dirender oleh marketing/scripts/render-posts.mjs; buka index.html#<id> di browser untuk pratinjau.
 */
const REPO = "github.com/khaliladha11/hybrid-athlete-dashboard";
const shot = (name) => `../out/shots/${name}.png`;
const MARK = `<img class="mark" src="../../docs/brand/mark-on-dark.svg" alt="">`;

/** Bingkai HP: x, y, lebar (tinggi mengikuti rasio 390×720 kecuali `h`), screenshot digeser `top` px CSS. */
const phone = ({ x, y, w, h, src, top = 0, rotate = 0 }) => {
  const height = h ?? Math.round(((w - 24) * 720) / 390 + 24);
  const scale = (w - 24) / 390;
  return `<div class="phone" style="left:${x}px;top:${y}px;width:${w}px;height:${height}px;transform:rotate(${rotate}deg)"><div class="screen"><img src="${src}" style="margin-top:${-top * scale}px" alt=""></div></div>`;
};

const foot = (right) => `<div class="foot">${MARK}<span class="label">${right}</span></div>`;

window.POSTS = {
  // ---------- Instagram carousel 1080×1350 ----------
  "carousel-1": {
    size: [1080, 1350],
    html: `
      <p class="label"><span class="dot"></span>Hybrid Athlete <b>· 1/5</b></p>
      <h1 class="display" style="font-size:140px;margin-top:40px">Hari ini<br>latihan<br><em>apa</em>?</h1>
      <p class="lede" style="margin-top:40px;max-width:500px">Saran <strong>lari + strength</strong> harian dari data jammu. Gratis dan open source.</p>
      ${phone({ x: 600, y: 330, w: 430, src: shot("profil") })}
      ${foot("Geser untuk lihat →")}`,
  },
  "carousel-2": {
    size: [1080, 1350],
    html: `
      <p class="label"><span class="dot"></span>Masalahnya <b>· 2/5</b></p>
      <h1 class="display" style="font-size:132px;margin-top:40px">Datanya ada.<br><em>Arahnya</em> tidak.</h1>
      <ul class="ledger" style="margin-top:72px">
        <li><span class="n">01</span><span class="v">Jam mencatat semuanya, tapi <strong style="color:var(--ink)">tidak bilang hari ini harus latihan apa</strong> dan seberapa berat.</span></li>
        <li><span class="n">02</span><span class="v">Program generik tidak tahu riwayat cedera, alat di rumah, dan lelahmu.</span></li>
        <li><span class="n">03</span><span class="v">Lari dan strength disusun terpisah, jadi sering saling bertabrakan.</span></li>
      </ul>
      ${foot("Hybrid Athlete")}`,
  },
  "carousel-3": {
    size: [1080, 1350],
    html: `
      <p class="label"><span class="dot"></span>Fiturnya <b>· 3/5</b></p>
      <h1 class="display" style="font-size:104px;margin-top:32px">Satu app,<br><em>empat</em> hal</h1>
      <div class="tiles" style="margin-top:48px">
        <div class="tile"><h3>Lari</h3><p>Pace dari zonamu<br>Kirim ke jam</p><div class="crop"><img src="${shot("lari")}" alt=""></div></div>
        <div class="tile"><h3>Strength</h3><p>Dari alatmu · RPE ≤ 7<br>Peta otot</p><div class="crop"><img src="${shot("otot")}" alt=""></div></div>
        <div class="tile"><h3>Program</h3><p>5K, 10K, HM, FM<br>Dari Hari H</p><div class="crop"><img src="${shot("program")}" alt=""></div></div>
        <div class="tile"><h3>Insight</h3><p>Tren · PR<br>Heatmap otot</p><div class="crop"><img src="${shot("insight")}" alt=""></div></div>
      </div>`,
  },
  "carousel-4": {
    size: [1080, 1350],
    html: `
      <p class="label"><span class="dot"></span>Berbasis riset <b>· 4/5</b></p>
      <h1 class="display" style="font-size:128px;margin-top:40px">Aturan,<br>bukan <em>tebakan</em></h1>
      <ul class="ledger" style="margin-top:60px">
        <li><span class="k">10</span><span class="v">kondisi cedera dengan batas beban masing-masing</span></li>
        <li><span class="k">RPE ≤ 7</span><span class="v">strength tidak pernah sampai gagal</span></li>
        <li><span class="k">80/20</span><span class="v">porsi intensitas lari dijaga</span></li>
        <li><span class="k">Taper</span><span class="v">dan batas kenaikan km mingguan</span></li>
      </ul>
      <p class="lede" style="font-size:30px;margin-top:40px">Ditulis sebagai kode yang diuji, bukan prompt AI. Sumber dan tingkat buktinya terbuka di repo. Bukan pengganti saran tenaga medis.</p>
      ${foot("docs/REFERENCES.md")}`,
  },
  "carousel-5": {
    size: [1080, 1350],
    html: `
      <p class="label"><span class="dot"></span>Cara pasang <b>· 5/5</b></p>
      <h1 class="display" style="font-size:132px;margin-top:40px">Pasang<br><em>sendiri</em>, gratis</h1>
      <ol class="steps" style="margin-top:52px">
        <li><div>Akun intervals.icu <span>yang tersambung ke jammu.</span></div></li>
        <li><div>Tekan tombol Deploy <span>di README (Vercel Hobby, gratis).</span></div></li>
        <li><div>Isi 3 variabel, <span>buka di HP, pasang ke layar utama.</span></div></li>
      </ol>
      <div style="margin-top:56px;display:flex;align-items:center;gap:36px"><span class="btn">Deploy</span><span class="lede" style="font-size:30px">Mau coba dulu?<br>Ada Demo Mode tanpa akun.</span></div>
      <p class="link" style="margin-top:48px">${REPO}</p>
      ${foot("Open source · MIT")}`,
  },

  // ---------- Single image (Threads / IG) ----------
  "single-1080x1350": {
    size: [1080, 1350],
    html: `
      <p class="label"><span class="dot"></span>Hybrid Athlete · open source</p>
      <h1 class="display" style="font-size:112px;margin-top:36px">Latihan apa hari ini?<br><em>Tanya Gita</em>.</h1>
      ${phone({ x: 130, y: 540, w: 370, src: shot("lari"), rotate: -4 })}
      ${phone({ x: 580, y: 570, w: 370, src: shot("strength"), rotate: 4 })}
      ${foot("Lari + strength · dari data jammu")}`,
  },
  "single-1080x1080": {
    size: [1080, 1080],
    html: `
      <p class="label"><span class="dot"></span>Hybrid Athlete</p>
      <h1 class="display" style="font-size:112px;margin-top:36px;max-width:560px">Lari dan strength, <em>satu</em> rencana</h1>
      <p class="lede" style="font-size:32px;margin-top:36px;max-width:500px">Saran harian dari data jammu, dengan aturan cedera berbasis riset. Gratis, open source.</p>
      ${phone({ x: 640, y: 120, w: 380, src: shot("profil") })}
      ${foot("Demo Mode · data fiktif")}`,
  },

  // ---------- Story 1080×1920 ----------
  story: {
    size: [1080, 1920],
    html: `
      <p class="label" style="margin-top:80px"><span class="dot"></span>Hybrid Athlete · open source</p>
      <h1 class="display" style="font-size:150px;margin-top:36px">Hari ini<br>latihan <em>apa</em>?</h1>
      <p class="lede" style="margin-top:36px;max-width:820px">Saran lari + strength dari data jammu. Pasang sendiri, gratis.</p>
      <p class="label" style="margin-top:36px"><b>GitHub · hybrid-athlete-dashboard</b></p>
      ${phone({ x: 230, y: 880, w: 620, src: shot("lari") })}`,
  },
};
