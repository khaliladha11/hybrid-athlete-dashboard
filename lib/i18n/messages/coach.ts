import { dict } from "../dict";

/**
 * Teks saran Gita dari `lib/` (1.2.0): check-in, readiness, konteks mingguan, dan aturan hari yang sama.
 * Logika & angka tetap di modul asal; kamus ini hanya merangkai kalimat.
 */
export const COACH = dict(
  {
    checkin: {
      label: { shin: "Nyeri shin", soreness: "Pegal", sleep: "Kualitas tidur", mood: "Mood" },
      prehab: "Prehab shin hari ini: Tibialis Wall Raise dan Eccentric Calf Raise.",
      shinTitle: (n: number) => `Nyeri shin ${n}/10`,
      shinRest: (n: number, min: number, prehab: string) =>
        `Nyeri shin ${n}/10. Pertimbangkan istirahat atau jalan; bila tetap lari, maksimal Easy ${min} menit. Bila nyeri menetap atau memburuk beberapa hari, periksakan ke tenaga profesional. ${prehab}`,
      shinRestSt: (n: number) => `Nyeri shin ${n}/10: ST Upper didahulukan, beban kaki ditunda dulu.`,
      shinEasy: (n: number, prehab: string) => `Nyeri shin ${n}/10: lari hari ini maksimal Easy, tanpa quality. ${prehab}`,
      soreTitle: (n: number) => `Pegal ${n}/10`,
      sore: (n: number) => `Pegal ${n}/10: turun satu level hari ini.`,
      sleepTitle: (n: number) => `Tidur ${n}/5`,
      sleep: (n: number) => `Kualitas tidur ${n}/5: turun satu level hari ini.`,
      mood: (n: number) => `Mood ${n}/5 dicatat. Tidak mengubah saran.`,
    },
    readiness: {
      hrvPersonal: (rolling: number, floor: number) => `HRV rata-rata 7 hari ${rolling} ms, di bawah batas normal pribadi ${floor} ms (rata-rata 30 hari − 0,5 SD).`,
      hrvDrop: (hrv: number, pct: number, avg: number) => `HRV ${hrv} ms, ${pct}% di bawah rata-rata 7 hari (${avg} ms).`,
      rhrPersonal: (rhr: number, limit: number, mean: number) => `Resting HR ${rhr} bpm, di atas batas pribadi ${limit} bpm (rata-rata 30 hari ${mean} bpm).`,
      rhrRise: (rhr: number, rise: number, avg: number) => `Resting HR ${rhr} bpm, naik ${rise} bpm dari rata-rata (${avg}).`,
      longRun: (km: string | null, name: string) => `Kemarin long run${km ? ` ${km} km` : ""} (${name}).`,
      heavy: (name: string, load: number) => `Kemarin sesi berat: ${name} (load ${load}).`,
      title: { hrv: "HRV di bawah rata-rata", rhr: "Resting HR naik", longRun: "Kemarin long run", heavy: "Kemarin sesi berat", low: "Readiness rendah" },
      basis: (list: string) => `Kesiapan dihitung dari ${list}.`,
      noBasis: "Data HRV dan resting HR dari jam belum ada, jadi kesiapan hanya dihitung dari sesi kemarin.",
      yesterday: "sesi kemarin",
      checkin: "check-in",
    },
    signal: { hrv: "HRV", restingHr: "resting HR", sleep: "tidur", load: "CTL/ATL" },
    and: "dan",
    weekly: {
      polarizedTitle: (n: number) => `${n} lari berat dalam 7 hari`,
      polarized: (n: number, pct: number, runs: number) => `Sudah ${n} sesi lari berat dalam 7 hari (${pct}% dari ${runs} sesi). Prinsip 80/20: sesi berikutnya sebaiknya Easy.`,
      volumeTitle: (pct: number) => `Jarak lari naik ${pct}%`,
      volume: (km: string, pct: number, prev: string, left: string | null) =>
        `Jarak lari 7 hari ${km} km, naik ${pct}% dari minggu sebelumnya (${prev} km). Kenaikan > 30% dikaitkan dengan shin splints. ` +
        (left ? `Sisa ruang aman ±${left} km.` : "Pertimbangkan hari istirahat atau sesi pendek."),
      legTitle: (today: boolean) => `${today ? "Hari ini" : "Kemarin"} ST kaki`,
      leg: (today: boolean, name: string) =>
        `${today ? "Hari ini" : "Kemarin"} ada ST kaki (${name}). Hindari interval berat dulu supaya adaptasi kekuatan & pemulihan kaki tidak terganggu.`,
      hardTitle: (today: boolean, long: boolean) => `${today ? "Hari ini" : "Kemarin"} ${long ? "long run" : "lari berat"}`,
      hard: (today: boolean, long: boolean, name: string) =>
        `${today ? "Hari ini" : "Kemarin"} ${long ? "long run" : "lari berat"} (${name}). Kalau ST hari ini, prioritaskan Upper Push/Pull agar kaki pulih.`,
      sameDayTitle: (h: number) => `Lari dan ST hari ini: jeda ≥ ${h} jam`,
      sameDay: (h: number) => `Hari ini ada lari dan ST. Beri jeda minimal ${h} jam di antaranya supaya adaptasi kekuatan tidak terganggu.`,
    },
  },
  {
    checkin: {
      label: { shin: "Shin pain", soreness: "Soreness", sleep: "Sleep quality", mood: "Mood" },
      prehab: "Shin prehab today: Tibialis Wall Raise and Eccentric Calf Raise.",
      shinTitle: (n) => `Shin pain ${n}/10`,
      shinRest: (n, min, prehab) =>
        `Shin pain ${n}/10. Consider resting or walking; if you still run, keep it Easy for ${min} minutes at most. If the pain persists or gets worse over several days, see a health professional. ${prehab}`,
      shinRestSt: (n) => `Shin pain ${n}/10: do ST Upper first and hold off on leg loading for now.`,
      shinEasy: (n, prehab) => `Shin pain ${n}/10: today's run is Easy at most, with no quality work. ${prehab}`,
      soreTitle: (n) => `Soreness ${n}/10`,
      sore: (n) => `Soreness ${n}/10: drop one level today.`,
      sleepTitle: (n) => `Sleep ${n}/5`,
      sleep: (n) => `Sleep quality ${n}/5: drop one level today.`,
      mood: (n) => `Mood ${n}/5 noted. It does not change the advice.`,
    },
    readiness: {
      hrvPersonal: (rolling, floor) => `7-day average HRV ${rolling} ms, below your personal normal floor of ${floor} ms (30-day average − 0.5 SD).`,
      hrvDrop: (hrv, pct, avg) => `HRV ${hrv} ms, ${pct}% below the 7-day average (${avg} ms).`,
      rhrPersonal: (rhr, limit, mean) => `Resting HR ${rhr} bpm, above your personal limit of ${limit} bpm (30-day average ${mean} bpm).`,
      rhrRise: (rhr, rise, avg) => `Resting HR ${rhr} bpm, up ${rise} bpm from the average (${avg}).`,
      longRun: (km, name) => `Long run yesterday${km ? ` ${km} km` : ""} (${name}).`,
      heavy: (name, load) => `Hard session yesterday: ${name} (load ${load}).`,
      title: { hrv: "HRV below average", rhr: "Resting HR up", longRun: "Long run yesterday", heavy: "Hard session yesterday", low: "Low readiness" },
      basis: (list) => `Readiness is based on ${list}.`,
      noBasis: "No HRV or resting HR data from the watch yet, so readiness only uses yesterday's session.",
      yesterday: "yesterday's session",
      checkin: "check-in",
    },
    signal: { hrv: "HRV", restingHr: "resting HR", sleep: "sleep", load: "CTL/ATL" },
    and: "and",
    weekly: {
      polarizedTitle: (n) => `${n} hard ${n === 1 ? "run" : "runs"} in 7 days`,
      polarized: (n, pct, runs) =>
        `${n} hard ${n === 1 ? "run" : "runs"} in 7 days already (${pct}% of ${runs} ${runs === 1 ? "run" : "runs"}). 80/20 principle: make the next one Easy.`,
      volumeTitle: (pct) => `Run distance up ${pct}%`,
      volume: (km, pct, prev, left) =>
        `7-day run distance ${km} km, up ${pct}% from the previous week (${prev} km). Increases above 30% are linked to shin splints. ` +
        (left ? `About ${left} km of safe room left.` : "Consider a rest day or a short run."),
      legTitle: (today) => `Leg ST ${today ? "today" : "yesterday"}`,
      leg: (today, name) =>
        `Leg ST ${today ? "today" : "yesterday"} (${name}). Avoid hard intervals for now so strength adaptation and leg recovery are not disrupted.`,
      hardTitle: (today, long) => `${long ? "Long run" : "Hard run"} ${today ? "today" : "yesterday"}`,
      hard: (today, long, name) =>
        `${long ? "Long run" : "Hard run"} ${today ? "today" : "yesterday"} (${name}). If you do ST today, prioritize Upper Push/Pull so your legs recover.`,
      sameDayTitle: (h) => `Run and ST today: gap of ≥ ${h} hours`,
      sameDay: (h) => `You have a run and ST today. Leave at least ${h} hours between them so strength adaptation is not disrupted.`,
    },
  },
);
