import { dict } from "../dict";

/**
 * Teks program target (`lib/program.ts`): detail sesi, fokus minggu, peringatan, catatan ST, dan checklist lomba.
 * Nama hari di data tetap Indonesia (dipakai logika urutan); `day` hanya untuk tampilan.
 */
export const PROGRAM_LIB = dict(
  {
    day: { Senin: "Senin", Selasa: "Selasa", Rabu: "Rabu", Kamis: "Kamis", Jumat: "Jumat", Sabtu: "Sabtu", Minggu: "Minggu" } as Record<string, string>,
    easyDetail: (easy: string, below: number) => `Z2 @ ${easy}, HR < ${below}. Fokus cadence 175–180.`,
    recoveryDetail: (easy: string) => `Sangat ringan @ ${easy}, HR < 135. Boleh diganti jalan cepat bila kaki berat.`,
    raceTitle: (race: string, goal: string) => `LOMBA ${race} · target ${goal}`,
    raceDetail: (rp: string) => `Race pace ${rp}. Mulai sedikit lebih lambat 1–2 km pertama, cadence 175–180.`,
    longProgressive: (easy: string, rp: string) => `Z2 @ ${easy}; 3 km terakhir @ race pace ${rp}. Latih minum/gel tiap 30–40 menit.`,
    longEasy: (easy: string, below: number) => `Z2 @ ${easy}, HR < ${below}. Boleh run-walk 4'/1' bila HR naik.`,
    sharpener: (rp: string) => `15' easy + 4×1' @ race pace ${rp} (jeda 1' jalan).`,
    strides: (easy: string) => `25' Z2 @ ${easy} + 4×20" strides santai-cepat.`,
    fartlekTitle: "Fartlek ringan 35'",
    fartlek: (n: number) => `10' Z2, lalu ${n}×1' agak cepat / 1' jog, 5' pendinginan. RPE 5–6.`,
    tempo: (reps: number, min: number, tempo: string) => `10' pemanasan Z2, ${reps}× ${min}' @ ${tempo} (HR 160–170), jog 2' antar set.`,
    interval5k: (pace: string) => `@ ${pace}, jog 2' antar repetisi. Pemanasan & pendinginan 10'.`,
    interval10k: (pace: string) => `@ ${pace}, jog 2'30" antar repetisi. Pemanasan & pendinginan 10'.`,
    racePaceHm: (rp: string) => `@ race pace ${rp}, jog 3' antar set. Pemanasan & pendinginan 10'.`,
    norwegian: (pace: string) => `4×4' @ ${pace} (Z4), recovery jog 3'. Menjaga VO₂max di tengah volume tinggi.`,
    warn: {
      fm: "Full marathon butuh basis kuat. Long run terjauhmu < 12 km. Pertimbangkan program Half Marathon dulu.",
      hm: "Long run terjauhmu < 6 km. Program dimulai dari 10 km. Naikkan dulu ke 8 km dengan lari easy sebelum mulai.",
      peak3: (km: number) => `Dengan 3 lari/minggu, long run puncak (${km} km) > 55% volume mingguan. Pilih 4 lari/minggu supaya beban lebih merata.`,
      capped: (reached: number, standard: number) => `Program lebih pendek dari standar, jadi long run puncak hanya ${reached} km (program standar ${standard} km).`,
      ambitious: (rp: string, tempo: string) => `Target race pace ${rp} jauh lebih cepat dari zona tempo-mu (${tempo}). Target mungkin terlalu ambisius.`,
    },
    strengthNote:
      "ST 2×/minggu: Senin (Lower/Full Body) & Rabu (Upper), mengikuti fase: Build lebih berat, Peak dan taper volume dikurangi dengan beban ditahan, minggu lomba hanya Upper ringan. ST kaki terakhir paling lambat 8 hari sebelum Hari H. Jangan taruh ST kaki sehari sebelum sesi Selasa atau long run Minggu.",
    focus: {
      raceWeek: "Minggu lomba: segarkan kaki, tidur cukup, jangan coba hal baru.",
      prebase: "Pre-Base: lari easy rutin dan long run naik pelan sebelum program inti dimulai.",
      cutback: "Cutback: volume turun ±25% supaya tubuh beradaptasi (sejalan minggu deload blok).",
      base: "Bangun basis aerobik: mayoritas Z2, kenalkan kecepatan ringan.",
      build: "Naikkan ambang (tempo) sambil memperpanjang long run.",
      peak: "Spesifik lomba: interval & race pace, long run terjauh.",
      taper: "Taper: volume turun, intensitas dijaga singkat.",
    },
    weekHead: (label: string, i: number, n: number, phase: string, cutback: boolean) => `${label} · Minggu ${i}/${n} (${phase}${cutback ? ", cutback" : ""})`,
    weekTotal: (km: number, note: string) => `Total ±${km} km lari. ${note}`,
    checklist: {
      predicted: (pred: string, target: string) => `Rencana pace dari perkiraan ${pred} (target ${target}). Mulai sedikit lebih lambat di 1–2 km pertama.`,
      plan: (target: string) => `Rencana pace ${target}. Mulai sedikit lebih lambat di 1–2 km pertama.`,
      sleep: "Tidur cukup dua malam terakhir sebelum lomba.",
      shoes: "Pakai sepatu yang sudah dipakai latihan, bukan sepatu baru.",
      food: "Makan dan minum yang sudah biasa. Hindari menu baru di hari lomba.",
    },
    summary: { week: (i: number, n: number) => `Minggu ${i}/${n}`, sessions: (done: number, total: number) => `${done}/${total} sesi` },
  },
  {
    day: { Senin: "Monday", Selasa: "Tuesday", Rabu: "Wednesday", Kamis: "Thursday", Jumat: "Friday", Sabtu: "Saturday", Minggu: "Sunday" },
    easyDetail: (easy, below) => `Z2 @ ${easy}, HR < ${below}. Cadence focus 175–180.`,
    recoveryDetail: (easy) => `Very easy @ ${easy}, HR < 135. You can swap it for a brisk walk if your legs feel heavy.`,
    raceTitle: (race, goal) => `RACE ${race} · target ${goal}`,
    raceDetail: (rp) => `Race pace ${rp}. Start a little slower over the first 1–2 km, cadence 175–180.`,
    longProgressive: (easy, rp) => `Z2 @ ${easy}; last 3 km @ race pace ${rp}. Practice drinking or gels every 30–40 minutes.`,
    longEasy: (easy, below) => `Z2 @ ${easy}, HR < ${below}. Run-walk 4'/1' is fine if your HR rises.`,
    sharpener: (rp) => `15' easy + 4×1' @ race pace ${rp} (1' walk between).`,
    strides: (easy) => `25' Z2 @ ${easy} + 4×20" relaxed-fast strides.`,
    fartlekTitle: "Easy fartlek 35'",
    fartlek: (n) => `10' Z2, then ${n}×1' moderately fast / 1' jog, 5' cool-down. RPE 5–6.`,
    tempo: (reps, min, tempo) => `10' Z2 warm-up, ${reps}× ${min}' @ ${tempo} (HR 160–170), 2' jog between sets.`,
    interval5k: (pace) => `@ ${pace}, 2' jog between reps. 10' warm-up & cool-down.`,
    interval10k: (pace) => `@ ${pace}, 2'30" jog between reps. 10' warm-up & cool-down.`,
    racePaceHm: (rp) => `@ race pace ${rp}, 3' jog between sets. 10' warm-up & cool-down.`,
    norwegian: (pace) => `4×4' @ ${pace} (Z4), 3' recovery jog. Keeps VO₂max up during high volume.`,
    warn: {
      fm: "A full marathon needs a strong base. Your longest long run is < 12 km. Consider a Half Marathon program first.",
      hm: "Your longest long run is < 6 km. The program starts at 10 km. Build up to 8 km with easy runs before you start.",
      peak3: (km) => `With 3 runs/week, the peak long run (${km} km) is > 55% of weekly volume. Choose 4 runs/week to spread the load.`,
      capped: (reached, standard) => `The program is shorter than standard, so the peak long run is only ${reached} km (standard program ${standard} km).`,
      ambitious: (rp, tempo) => `Target race pace ${rp} is much faster than your tempo zone (${tempo}). The target may be too ambitious.`,
    },
    strengthNote:
      "ST 2×/week: Monday (Lower/Full Body) & Wednesday (Upper), following the phase: Build is heavier, Peak and taper cut volume while holding the load, race week is light Upper only. The last leg ST is at least 8 days before race day. Do not put leg ST the day before the Tuesday session or the Sunday long run.",
    focus: {
      raceWeek: "Race week: freshen up your legs, sleep enough, try nothing new.",
      prebase: "Pre-Base: regular easy runs and a slowly growing long run before the main program starts.",
      cutback: "Cutback: volume drops ±25% so your body can adapt (in line with the block deload week).",
      base: "Build the aerobic base: mostly Z2, introduce light speed.",
      build: "Raise the threshold (tempo) while extending the long run.",
      peak: "Race specific: intervals & race pace, longest long run.",
      taper: "Taper: volume drops, intensity stays short.",
    },
    weekHead: (label, i, n, phase, cutback) => `${label} · Week ${i}/${n} (${phase}${cutback ? ", cutback" : ""})`,
    weekTotal: (km, note) => `Total ±${km} km of running. ${note}`,
    checklist: {
      predicted: (pred, target) => `Pace plan from the prediction ${pred} (target ${target}). Start a little slower over the first 1–2 km.`,
      plan: (target) => `Pace plan ${target}. Start a little slower over the first 1–2 km.`,
      sleep: "Get enough sleep in the last two nights before the race.",
      shoes: "Wear shoes you have trained in, not new ones.",
      food: "Eat and drink what you are used to. Avoid new food on race day.",
    },
    summary: { week: (i, n) => `Week ${i}/${n}`, sessions: (done, total) => `${done}/${total} ${total === 1 ? "session" : "sessions"}` },
  },
);

/** Teks band Hari H, syarat umum HM/FM, dan jarak antar lomba (`lib/program/timeline.ts`). */
export const TIMELINE_TEXT = dict(
  {
    blocked: (label: string, floor: number, taper: number, earliest: string) =>
      `Program ${label} butuh paling sedikit ${floor} minggu (taper ${taper} minggu dan 2 minggu latihan). Tanggal paling awal ${earliest}.`,
    grey: (max: number, pre: number) => `Lebih dari ${max} minggu: ${pre} minggu pre-Base (lari easy dan long run naik pelan) sebelum program ${max} minggu.`,
    red: (label: string, min: number, completed: number | null, weeks: number) =>
      `Rekomendasi umum ${label} paling sedikit ${min} minggu${completed ? ` (${completed} bila sudah pernah menyelesaikan jarak ini)` : ""}. Tanggal ini memberi ${weeks} minggu.`,
    yellow: (range: string) => `Di atas minimum, tapi di bawah rekomendasi umum ${range} minggu. Fase Base dipersingkat.`,
    longer: (range: string) => `Lebih panjang dari rekomendasi umum ${range} minggu, masih dalam batas program.`,
    matches: (range: string) => `Sesuai rekomendasi umum ${range} minggu.`,
    noData: (km: string) => `Belum ada long run 30 hari terakhir, jadi minimum dari data dihitung dari long run awal program (${km} km).`,
    fromStart: (km: string) => `Long run awal program ${km} km`,
    fromLongest: (km: string) => `Long run terjauhmu ${km} km`,
    data: (from: string, peak: string, taper: number, weeks: number) =>
      `${from}. Untuk mencapai long run puncak ${peak} km dengan kenaikan aman ditambah taper ${taper} minggu, butuh minimal ${weeks} minggu.`,
    weeks: "minggu",
    avgHm: "Rata-rata ≥ 25 km per minggu (4 minggu terakhir)",
    avgFm: "Rata-rata ≥ 24 km per minggu, idealnya 32–48 km (4 minggu terakhir)",
    longest: "Long run terjauh 30 hari ≥ 10 km",
    further: "Pertimbangkan Hari H lebih jauh, atau mulai dengan pre-Base.",
    firstFm: "Sebelum maraton pertama, umumnya disarankan sekitar satu tahun lari rutin.",
    recover: (date: string) => `Maraton terakhirmu ${date}, kurang dari 2 minggu sebelum program mulai. Sisihkan 1–2 minggu khusus pemulihan dulu.`,
    spacing: (date: string) =>
      `Hari H kurang dari 12 minggu setelah maraton terakhirmu (${date}). Untuk target waktu umumnya disarankan 8–12 minggu, dan ≥ 12 minggu bagi pelari yang belum berpengalaman.`,
  },
  {
    blocked: (label, floor, taper, earliest) =>
      `A ${label} program needs at least ${floor} weeks (${taper} ${taper === 1 ? "week" : "weeks"} of taper and 2 weeks of training). Earliest date ${earliest}.`,
    grey: (max, pre) =>
      `More than ${max} weeks: ${pre} ${pre === 1 ? "week" : "weeks"} of pre-Base (easy runs and a slowly growing long run) before the ${max}-week program.`,
    red: (label, min, completed, weeks) =>
      `The general recommendation for ${label} is at least ${min} weeks${completed ? ` (${completed} if you have finished this distance before)` : ""}. This date gives ${weeks} ${weeks === 1 ? "week" : "weeks"}.`,
    yellow: (range) => `Above the minimum, but below the general recommendation of ${range} weeks. The Base phase is shortened.`,
    longer: (range) => `Longer than the general recommendation of ${range} weeks, still within the program limit.`,
    matches: (range) => `Matches the general recommendation of ${range} weeks.`,
    noData: (km) => `No long run in the last 30 days, so the data minimum uses the program's starting long run (${km} km).`,
    fromStart: (km) => `Starting long run of the program ${km} km`,
    fromLongest: (km) => `Your longest long run ${km} km`,
    data: (from, peak, taper, weeks) =>
      `${from}. Reaching a peak long run of ${peak} km with safe increases plus ${taper} ${taper === 1 ? "week" : "weeks"} of taper takes at least ${weeks} weeks.`,
    weeks: "weeks",
    avgHm: "Average ≥ 25 km per week (last 4 weeks)",
    avgFm: "Average ≥ 24 km per week, ideally 32–48 km (last 4 weeks)",
    longest: "Longest run in 30 days ≥ 10 km",
    further: "Consider a later race day, or start with pre-Base.",
    firstFm: "Before a first marathon, about a year of regular running is generally recommended.",
    recover: (date) => `Your last marathon was ${date}, less than 2 weeks before the program starts. Set aside 1–2 weeks for recovery first.`,
    spacing: (date) =>
      `Race day is less than 12 weeks after your last marathon (${date}). For a time goal, 8–12 weeks is generally recommended, and ≥ 12 weeks for less experienced runners.`,
  },
);

/** Saran sesi minggu ini, catatan akhir minggu (`lib/program/week-plan.ts`), sesi ST & fase ST program. */
export const WEEK_TEXT = dict(
  {
    afterHard: (title: string, long: boolean) => `${title} tidak disarankan hari ini karena kemarin ${long ? "long run" : "lari berat"}.`,
    beforeLong: (title: string) => `${title} tidak disarankan hari ini supaya tidak sehari sebelum long run.`,
    afterLegSt: (title: string) => `${title} tidak disarankan hari ini karena ada ST kaki kemarin atau hari ini (lari maks Moderate).`,
    upperFirst: (title: string) => `${title} sebaiknya tidak hari ini; setelah lari berat atau long run, ST Upper didahulukan.`,
    race: "Hari H.",
    today: (day: string) => `Disarankan hari ${day} di rencana.`,
    longLeft: (days: number) => `Long run belum dikerjakan dan minggu ini tinggal ${days} hari.`,
    overdue: (day: string) => `Disarankan ${day}, belum dikerjakan.`,
    early: (day: string) => `Disarankan ${day}; boleh dikerjakan lebih awal.`,
    rest: "Sesi tersisa sebaiknya tidak hari ini. Istirahat atau pilih sendiri bila tubuh terasa segar.",
    why: {
      quality: "Minggu ini tanpa sesi quality. Wajar sesekali, kalau sering progres pace bisa melambat.",
      long: "Minggu ini tanpa long run. Wajar sesekali, kalau sering daya tahan untuk jarak lomba bisa tertinggal.",
      easy: "Ada easy run yang tidak dikerjakan. Wajar sesekali, kalau sering volume dasar mingguan bisa turun.",
      st: "Minggu ini tanpa sesi ST. Wajar sesekali, kalau sering kekuatan yang sudah dibangun bisa menurun.",
    },
    stLower: "ST Lower / Full Body",
    stLowerLight: "ST Lower ringan",
    stUpper: "ST Upper",
    stUpperLight: "ST Upper ringan",
    stPhase: { base: "Base: volume", build: "Build: lebih berat", "build-cutback": "Build cutback: Moderate", peak: "Peak: maintenance", taper: "Taper: volume setengah", race: "Minggu lomba: ringan" } as Record<string, string>,
    stPhaseNote: (label: string, sets: number, acc: number | null, hold: boolean) =>
      `${label}. Set gerakan inti maks ${sets}${acc !== null ? `, aksesori ${acc}` : ""}${hold ? ", beban tidak dinaikkan" : ""}.`,
    session: "Sesi program",
  },
  {
    afterHard: (title, long) => `${title} is not advised today because of yesterday's ${long ? "long run" : "hard run"}.`,
    beforeLong: (title) => `${title} is not advised today so it does not fall the day before the long run.`,
    afterLegSt: (title) => `${title} is not advised today because of leg ST yesterday or today (runs at Moderate at most).`,
    upperFirst: (title) => `${title} is better not done today; after a hard run or long run, ST Upper comes first.`,
    race: "Race day.",
    today: (day) => `Planned for ${day}.`,
    longLeft: (days) => `The long run is not done yet and this week has ${days} ${days === 1 ? "day" : "days"} left.`,
    overdue: (day) => `Planned for ${day}, not done yet.`,
    early: (day) => `Planned for ${day}; you can do it earlier.`,
    rest: "The remaining sessions are better not done today. Rest, or pick one yourself if you feel fresh.",
    why: {
      quality: "No quality session this week. Fine once in a while; if it happens often, pace progress can slow down.",
      long: "No long run this week. Fine once in a while; if it happens often, endurance for the race distance can fall behind.",
      easy: "An easy run was not done. Fine once in a while; if it happens often, your weekly base volume can drop.",
      st: "No ST session this week. Fine once in a while; if it happens often, the strength you have built can fade.",
    },
    stLower: "ST Lower / Full Body",
    stLowerLight: "Light ST Lower",
    stUpper: "ST Upper",
    stUpperLight: "Light ST Upper",
    stPhase: { base: "Base: volume", build: "Build: heavier", "build-cutback": "Build cutback: Moderate", peak: "Peak: maintenance", taper: "Taper: half volume", race: "Race week: light" },
    stPhaseNote: (label, sets, acc, hold) =>
      `${label}. Main movement sets max ${sets}${acc !== null ? `, accessories max ${acc}` : ""}${hold ? ", load not increased" : ""}.`,
    session: "Program session",
  },
);

/** Nama hari program ("Senin" di data) untuk tampilan. */
export const programDay = (day: string, locale: "id" | "en" = "id"): string => PROGRAM_LIB[locale].day[day] ?? day;
