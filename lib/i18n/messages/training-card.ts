import { dict } from "../dict";

/**
 * Kartu "Minggu ini · latihan" (1.3.0): teks di kartu (UPPERCASE mono, juga di PNG ekspor), kalimat aksesibel, dan
 * tabel per hari. Nama olahraga mengikuti urutan `SPORTS` di `lib/weekly/training-week.ts`.
 */
export const TRAINING_CARD = dict(
  {
    label: ["MINGGU INI", "LATIHAN"] as [string, string],
    totalUnit: "JAM",
    hourUnit: "J",
    km: "KM",
    indoor: "INDOOR",
    sport: { run: "LARI", ride: "SEPEDA", strength: "STRENGTH", other: "LAINNYA" } as Record<string, string>,
    sessions: (n: number) => `${n} SESI`,
    aria: {
      sport: { run: "lari", ride: "sepeda", strength: "strength", other: "lainnya" } as Record<string, string>,
      duration: (h: number, m: number) => [h ? `${h} jam` : "", m || !h ? `${m} menit` : ""].filter(Boolean).join(" "),
      sessions: (n: number) => `${n} sesi`,
      indoor: (d: string) => `${d} indoor`,
      allIndoor: "indoor",
      week: (total: string, sessions: string, parts: string, range: string) =>
        parts ? `Minggu ini ${total}, ${sessions}: ${parts}. ${range}.` : `Minggu ini belum ada latihan. ${range}.`,
    },
    table: {
      show: "Lihat tabel",
      hide: "Sembunyikan tabel",
      caption: "Latihan per hari minggu ini",
      day: "Hari",
      sport: "Olahraga",
      minutes: "Menit",
      where: "Tempat",
      indoor: "Indoor",
      outdoor: "Outdoor",
      none: "Tidak ada latihan",
      sports: { run: "Lari", ride: "Sepeda", strength: "Strength", other: "Lainnya" } as Record<string, string>,
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
    },
    trend: {
      title: "Waktu per olahraga",
      summary: (current: string, avg: string, weeks: number) => `Minggu ini ${current} jam. Rata-rata ${avg} jam per minggu dalam ${weeks} minggu sebelumnya.`,
      currentOnly: (current: string) => `Minggu ini ${current} jam.`,
      empty: "Belum ada latihan di rentang ini.",
      aria: (weeks: number, summary: string) => `Grafik batang waktu latihan per olahraga, ${weeks} minggu. ${summary}`,
      week: "Minggu",
      total: "Total",
    },
  },
  {
    label: ["THIS WEEK", "TRAINING"],
    totalUnit: "HRS",
    hourUnit: "H",
    km: "KM",
    indoor: "INDOOR",
    sport: { run: "RUN", ride: "RIDE", strength: "STRENGTH", other: "OTHER" },
    sessions: (n) => `${n} ${n === 1 ? "SESSION" : "SESSIONS"}`,
    aria: {
      sport: { run: "run", ride: "ride", strength: "strength", other: "other" },
      duration: (h, m) =>
        [h ? `${h} ${h === 1 ? "hour" : "hours"}` : "", m || !h ? `${m} ${m === 1 ? "minute" : "minutes"}` : ""].filter(Boolean).join(" "),
      sessions: (n) => `${n} ${n === 1 ? "session" : "sessions"}`,
      indoor: (d) => `${d} indoor`,
      allIndoor: "indoor",
      week: (total, sessions, parts, range) => (parts ? `This week ${total}, ${sessions}: ${parts}. ${range}.` : `No training yet this week. ${range}.`),
    },
    table: {
      show: "View table",
      hide: "Hide table",
      caption: "Training per day this week",
      day: "Day",
      sport: "Sport",
      minutes: "Minutes",
      where: "Where",
      indoor: "Indoor",
      outdoor: "Outdoor",
      none: "No training",
      sports: { run: "Run", ride: "Ride", strength: "Strength", other: "Other" },
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    trend: {
      title: "Time by sport",
      summary: (current, avg, weeks) => `This week ${current} h. Average ${avg} h per week over the previous ${weeks} ${weeks === 1 ? "week" : "weeks"}.`,
      currentOnly: (current) => `This week ${current} h.`,
      empty: "No training in this range yet.",
      aria: (weeks, summary) => `Bar chart of training time by sport, ${weeks} weeks. ${summary}`,
      week: "Week",
      total: "Total",
    },
  },
);
