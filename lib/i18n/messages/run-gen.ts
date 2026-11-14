import { dict } from "../dict";

/** Teks generator lari (`lib/generator/run.ts`): judul blok, label langkah, dan catatan sesi. Angka tetap di generator. */
export const RUN_GEN = dict(
  {
    block: {
      warmup: "Pemanasan",
      warmupZ2: "Pemanasan Z2",
      cooldown: "Pendinginan",
      toTempo: "Naik ke Tempo",
      tempoBlock: "Blok Tempo",
      jogBetween: "Jog antar set",
    },
    step: {
      walk: "Jalan",
      briskWalk: "Jalan cepat + dynamic drill ringan",
      easyWalk: "Jalan santai + calf stretch",
      runZ2: "Lari Z2",
      cadenceFocus: (spm: number) => `Fokus cadence ${spm} SPM (langkah pendek)`,
      z2Normal: "Z2 normal",
      wuBuild: "Easy jog Z2 (2 menit terakhir naik bertahap)",
      tempoNoBreak: "Tempo (tanpa jeda)",
      cdJog: "Jog/jalan santai",
      wuStrides: "Easy jog Z2 + 3 strides ringan",
      recoveryWalk: "Jalan/jog pemulihan",
      fast15: 'Cepat 15"',
      slow15: 'Jog lambat 15"',
    },
    note: {
      cadence: "Cadence 175–180 SPM: langkah pendek & cepat, jangan overstride.",
      crossover: 'Cue "rel kereta": kaki mendarat di dua rel sejajar selebar pinggul, jangan menyilang (crossover).',
      cadenceHold: (avg: number) => `Cadence rata-rata 14 hari: ${avg} SPM: sudah di zona target, pertahankan.`,
      cadenceUp: (avg: number, target: number) => `Cadence rata-rata 14 hari: ${avg} SPM → target sesi ini ${target} SPM (naik ±5% bertahap).`,
      cadenceDrill: "Cadence drill: pace tetap Z2. Yang berubah hanya frekuensi langkah, bukan kecepatan.",
      easyHr: (below: number) => `Jaga HR < ${below}. Kalau HR naik, perlambat atau jalan sampai turun.`,
      progression: "Progression run: transisi langsung dari Z2 ke tempo tanpa berhenti.",
      cruise: "Cruise interval: jeda pendek 1' supaya tetap di ambang. Jangan dipercepat.",
      tempo: "Tempo = 'comfortably hard': masih bisa bicara 3–4 kata.",
      formBreak: "Kalau form mulai rusak (cadence turun, kaki menyilang), hentikan repetisi.",
      recoveryJog: "Recovery jog tetap bergerak, jangan berhenti total.",
      f1515: '15/15: 15" cepat terkontrol, 15" jog lambat, jangan berhenti. Akhiri set kalau form mulai rusak.',
      deloadHigh: "Minggu deload: sesi berat sebaiknya diganti Moderate/Easy kecuali badan benar-benar segar.",
      deload: "Minggu deload: jaga sesi tetap ringan, fokus pemulihan.",
      custom: (c: string) => `Catatan kondisimu: ${c}`,
    },
  },
  {
    block: {
      warmup: "Warm-up",
      warmupZ2: "Z2 warm-up",
      cooldown: "Cool-down",
      toTempo: "Build to Tempo",
      tempoBlock: "Tempo block",
      jogBetween: "Jog between sets",
    },
    step: {
      walk: "Walk",
      briskWalk: "Brisk walk + light dynamic drills",
      easyWalk: "Easy walk + calf stretch",
      runZ2: "Run Z2",
      cadenceFocus: (spm) => `Cadence focus ${spm} SPM (short steps)`,
      z2Normal: "Normal Z2",
      wuBuild: "Easy jog Z2 (build up gradually in the last 2 minutes)",
      tempoNoBreak: "Tempo (no break)",
      cdJog: "Easy jog/walk",
      wuStrides: "Easy jog Z2 + 3 light strides",
      recoveryWalk: "Recovery walk/jog",
      fast15: 'Fast 15"',
      slow15: 'Slow jog 15"',
    },
    note: {
      cadence: "Cadence 175–180 SPM: short, quick steps, do not overstride.",
      // REVIEW: cue "rel kereta" diterjemahkan "train tracks" (validator menerima keduanya).
      crossover: 'Cue "train tracks": land on two parallel rails hip-width apart, do not cross over.',
      cadenceHold: (avg) => `14-day average cadence: ${avg} SPM: already in the target zone, keep it there.`,
      cadenceUp: (avg, target) => `14-day average cadence: ${avg} SPM → target for this session ${target} SPM (up ±5% gradually).`,
      cadenceDrill: "Cadence drill: pace stays Z2. Only your step rate changes, not your speed.",
      easyHr: (below) => `Keep HR < ${below}. If your HR rises, slow down or walk until it drops.`,
      progression: "Progression run: go straight from Z2 into tempo without stopping.",
      cruise: "Cruise interval: short 1' breaks to stay at threshold. Do not speed up.",
      tempo: "Tempo = 'comfortably hard': you can still say 3–4 words.",
      formBreak: "If your form starts to break down (cadence drops, feet cross over), stop the reps.",
      recoveryJog: "Keep moving on the recovery jog, do not stop completely.",
      f1515: '15/15: 15" fast and controlled, 15" slow jog, no stopping. End the set if your form starts to break down.',
      deloadHigh: "Deload week: swap hard sessions for Moderate/Easy unless you feel truly fresh.",
      deload: "Deload week: keep the session light and focus on recovery.",
      custom: (c) => `Your condition note: ${c}`,
    },
  },
);

/** Teks generator strength (`lib/generator/strength.ts`): catatan sesi dan nama skema. */
export const ST_GEN = dict(
  {
    scheme: { Volume: "Volume", Standar: "Standar", Tegangan: "Tegangan" } as Record<string, string>,
    rpe: (rpe: number, left: number) => `Intensitas RPE ${rpe}: sisakan ${left} repetisi di "tangki". Jangan sampai gagal (failure).`,
    scheme_: (name: string, reps: string) => `Skema ${name} (${reps} rep). Skema berputar antar sesi supaya stimulus bervariasi.`,
    free: "Mode bebas: tanpa blok mingguan & deload. Gerakan ★ = gerakan utama sesi ini (tetap dicatat untuk progresi).",
    block: (label: string) => `${label}: gerakan bertanda ★ tetap sama sampai blok berganti; sisanya berganti tiap generate.`,
    custom: (c: string) => `Catatan kondisimu: ${c}`,
    deload: "Minggu deload: set dan beban diturunkan satu tingkat. Pulihkan, jangan kejar angka.",
    pullFirst: "Progresi pull-up dikerjakan paling awal selagi grip masih segar.",
    noNegative: "Negative Pull-Up belum aktif. Fokus Dead Hang dulu. Aktifkan di Setting › Movement library saat siap.",
    limited: (est: number, duration: number) =>
      `Gerakan aktif terbatas: sesi ini ±${est} menit. Aktifkan lebih banyak gerakan/alat di Setting untuk sesi ${duration}' penuh.`,
  },
  {
    scheme: { Volume: "Volume", Standar: "Standard", Tegangan: "Tension" },
    rpe: (rpe, left) => `Intensity RPE ${rpe}: keep ${left} reps "in the tank". Do not go to failure.`,
    scheme_: (name, reps) => `${name} scheme (${reps} reps). The scheme rotates between sessions to vary the stimulus.`,
    free: "Free mode: no weekly blocks or deload. ★ movements = this session's main movements (still logged for progression).",
    block: (label) => `${label}: ★ movements stay the same until the block changes; the rest change with every generate.`,
    custom: (c) => `Your condition note: ${c}`,
    deload: "Deload week: sets and loads drop one step. Recover, do not chase numbers.",
    pullFirst: "Pull-up progression comes first, while your grip is still fresh.",
    noNegative: "Negative Pull-Up is not active yet. Focus on Dead Hang first. Turn it on in Settings › Movement library when you are ready.",
    limited: (est, duration) =>
      `Limited active movements: this session is about ${est} minutes. Turn on more movements or equipment in Settings for a full ${duration}' session.`,
  },
);

export const schemeName = (label: string, locale: "id" | "en" = "id"): string => ST_GEN[locale].scheme[label] ?? label;
