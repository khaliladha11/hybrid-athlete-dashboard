/**
 * Kartu "Minggu ini · lari" (1.1.0). Murni: data minggu, teks per bahasa, dan layout elemen dalam koordinat
 * 1080×1920 (story). Layout yang sama dipakai kartu di Profil (SVG dengan token tema) dan ekspor PNG
 * (`lib/share-card.ts`, warna tetap), jadi bentuknya selalu sama. Acuan visual: marketing/reference (tidak di-commit).
 *
 * Aturan:
 * - Minggu kalender Senin sampai Minggu (tanggal aktivitas sudah tanggal lokal WIB), huruf hari mulai Senin.
 * - Total = jumlah km mentah, 2 desimal. Angka per hari dibulatkan 1 desimal, jadi jumlahnya bisa beda 0.01 dari
 *   total. Itu wajar (aturan Week Ledger), jangan "dibetulkan".
 * - Hari tanpa lari = titik kecil, tanpa bar dan tanpa angka.
 */
import { addDays, startOfWeekMonday } from "./date";
import type { Activity } from "./intervals/types";

export type CardLang = "en" | "id";

export interface WeekRunDay {
  date: string;
  /** km mentah hari itu; undefined = tidak ada lari. */
  km?: number;
}

export interface WeekRunModel {
  from: string;
  to: string;
  days: WeekRunDay[];
  totalKm: number;
  /** Jumlah aktivitas lari (bukan jumlah hari). */
  runs: number;
}

export function weekRunModel(activities: Pick<Activity, "category" | "date" | "distanceKm">[], today: string): WeekRunModel {
  const from = startOfWeekMonday(today);
  const to = addDays(from, 6);
  const days: WeekRunDay[] = Array.from({ length: 7 }, (_, i) => ({ date: addDays(from, i) }));
  let runs = 0;
  let totalKm = 0;
  for (const a of activities) {
    if (a.category !== "run" || !a.date || a.date < from || a.date > to) continue;
    const d = days.find((x) => x.date === a.date)!;
    d.km = (d.km ?? 0) + (a.distanceKm ?? 0);
    totalKm += a.distanceKm ?? 0;
    runs++;
  }
  return { from, to, days, totalKm, runs };
}

/** Angka per hari, 1 desimal. */
export const dayValue = (km: number) => km.toFixed(1);
/** Total, 2 desimal (mentah, tidak dari angka per hari). */
export const totalValue = (km: number) => km.toFixed(2);

const TEXT: Record<CardLang, { label: [string, string]; letters: string[]; months: string[]; runs: (n: number) => string; to: string }> = {
  en: {
    label: ["THIS WEEK", "RUNNING"],
    letters: ["M", "T", "W", "T", "F", "S", "S"],
    months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    runs: (n) => `${n} ${n === 1 ? "RUN" : "RUNS"}`,
    to: "TO",
  },
  id: {
    label: ["MINGGU INI", "LARI"],
    letters: ["S", "S", "R", "K", "J", "S", "M"],
    months: ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"],
    runs: (n) => `${n} LARI`,
    to: "SAMPAI",
  },
};

export const dayLetters = (lang: CardLang) => TEXT[lang].letters;

/** "NOV 9 TO 15" / "9 SAMPAI 15 NOV"; lintas bulan "OCT 27 TO NOV 2" / "27 OKT SAMPAI 2 NOV". */
export function rangeText(from: string, to: string, lang: CardLang): string {
  const t = TEXT[lang];
  const [fm, fd] = [Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10))];
  const [tm, td] = [Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10))];
  if (lang === "en") return fm === tm ? `${t.months[fm]} ${fd} ${t.to} ${td}` : `${t.months[fm]} ${fd} ${t.to} ${t.months[tm]} ${td}`;
  return fm === tm ? `${fd} ${t.to} ${td} ${t.months[tm]}` : `${fd} ${t.months[fm]} ${t.to} ${td} ${t.months[tm]}`;
}

export interface CardText {
  label: [string, string];
  total: string;
  unit: string;
  letters: string[];
  /** Footer: jumlah lari dan rentang tanggal, dipisah "·" redup. */
  footer: [string, string];
}

export function cardText(m: WeekRunModel, lang: CardLang): CardText {
  const t = TEXT[lang];
  return { label: t.label, total: totalValue(m.totalKm), unit: "KM", letters: t.letters, footer: [t.runs(m.runs), rangeText(m.from, m.to, lang)] };
}

/** Footer satu baris, mis. "3 LARI · 9 SAMPAI 15 NOV". */
export const footerText = (m: WeekRunModel, lang: CardLang) => cardText(m, lang).footer.join(" · ");

// ---- Layout (koordinat story 1080×1920; blok konten ±y 560 sampai 1480) ----

export const CARD_W = 1080;
export const STORY_H = 1920;
export const MARGIN_X = 120;
export const CHART_RIGHT = 960;
export const BAR_W = 74;
export const BAR_RX = 16;
export const BAR_MAX = 300;
/** Tinggi minimum bar (≥ 2× radius supaya sudutnya utuh). */
export const BAR_MIN = 32;
export const BASELINE = 1300;
/** Pusat kolom: 7 kolom rata di antara margin kiri dan tepi kanan grafik. */
export const columnX = (i: number) => MARGIN_X + ((CHART_RIGHT - MARGIN_X) / 7) * (i + 0.5);

/** Tinggi bar per hari: proporsional ke hari terbesar (maks 300), minimum 32; tanpa lari = undefined. */
export function barHeights(days: WeekRunDay[], max = BAR_MAX, min = BAR_MIN): (number | undefined)[] {
  const top = Math.max(0, ...days.map((d) => d.km ?? 0));
  return days.map((d) => (d.km === undefined ? undefined : top > 0 ? Math.max(min, (d.km / top) * max) : min));
}

/** Peran warna: diterjemahkan ke token tema (layar) atau warna tetap (ekspor). */
export type CardRole = "ink" | "dim" | "faint" | "rule" | "brand";
export type CardFont = "display" | "sans" | "mono";

export interface CardSpan {
  text: string;
  role?: CardRole;
  font?: CardFont;
  size?: number;
  weight?: number;
  /** Jarak horizontal sebelum span (px). */
  dx?: number;
}

export type CardElement =
  | { kind: "text"; key: string; x: number; y: number; size: number; font: CardFont; weight: number; role: CardRole; anchor?: "start" | "middle"; spacing?: number; spans: CardSpan[] }
  | { kind: "rect"; key: string; x: number; y: number; w: number; h: number; rx: number; role: CardRole }
  | { kind: "circle"; key: string; cx: number; cy: number; r: number; role: CardRole }
  | { kind: "line"; key: string; x1: number; x2: number; y: number; width: number; role: CardRole };

const LABEL_SIZE = 40;
const MONO_SPACING = 0.12;

/** Elemen kartu dalam urutan gambar. `watermark` = teks kecil "HYBRID ATHLETE" di bawah footer. */
export function cardElements(m: WeekRunModel, lang: CardLang, opts: { watermark?: boolean } = {}): CardElement[] {
  const t = cardText(m, lang);
  const heights = barHeights(m.days);
  const sep = (dx: number): CardSpan => ({ text: "·", role: "dim", dx });
  const els: CardElement[] = [
    {
      kind: "text",
      key: "label",
      x: MARGIN_X,
      y: 600,
      size: LABEL_SIZE,
      font: "mono",
      weight: 500,
      role: "ink",
      spacing: MONO_SPACING,
      spans: [{ text: t.label[0] }, sep(LABEL_SIZE * 0.5), { text: t.label[1], dx: LABEL_SIZE * 0.5 }],
    },
    {
      kind: "text",
      key: "total",
      x: MARGIN_X,
      y: 800,
      size: 220,
      font: "display",
      weight: 800,
      role: "ink",
      spans: [{ text: t.total }, { text: t.unit, role: "brand", font: "mono", size: 52, weight: 700, dx: 20 }],
    },
  ];
  m.days.forEach((d, i) => {
    const x = columnX(i);
    const h = heights[i];
    if (h === undefined) {
      els.push({ kind: "circle", key: `dot-${i}`, cx: x, cy: BASELINE - 9, r: 9, role: "faint" });
    } else {
      els.push({ kind: "rect", key: `bar-${i}`, x: x - BAR_W / 2, y: BASELINE - h, w: BAR_W, h, rx: BAR_RX, role: "brand" });
      els.push({ kind: "text", key: `value-${i}`, x, y: BASELINE - h - 22, size: 40, font: "sans", weight: 600, role: "ink", anchor: "middle", spans: [{ text: dayValue(d.km!) }] });
    }
    els.push({ kind: "text", key: `day-${i}`, x, y: 1362, size: LABEL_SIZE, font: "mono", weight: 500, role: "ink", anchor: "middle", spans: [{ text: t.letters[i] }] });
  });
  els.push({ kind: "line", key: "rule", x1: MARGIN_X, x2: CHART_RIGHT, y: 1410, width: 2, role: "rule" });
  els.push({
    kind: "text",
    key: "footer",
    x: MARGIN_X,
    y: 1472,
    size: 38,
    font: "mono",
    weight: 500,
    role: "ink",
    spacing: MONO_SPACING,
    spans: [{ text: t.footer[0] }, sep(19), { text: t.footer[1], dx: 19 }],
  });
  if (opts.watermark) {
    els.push({ kind: "text", key: "watermark", x: MARGIN_X, y: 1560, size: 24, font: "mono", weight: 500, role: "dim", spacing: 0.2, spans: [{ text: "HYBRID ATHLETE" }] });
  }
  return els;
}

/** Kotak blok konten (untuk viewBox kartu di layar). */
export const CARD_BLOCK = { x: 80, y: 540, w: 920, h: 960 } as const;

/** Kalimat aksesibel kartu (bahasa UI). */
export function cardAriaLabel(m: WeekRunModel, lang: CardLang = "id"): string {
  const names = lang === "en" ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const days = m.days.flatMap((d, i) => (d.km === undefined ? [] : [`${names[i]} ${dayValue(d.km)} km`]));
  const list = days.length ? ` ${days.join(", ")}.` : "";
  const range = rangeText(m.from, m.to, lang).toLowerCase();
  if (lang === "en") return `This week, ran ${totalValue(m.totalKm)} km over ${m.runs} ${m.runs === 1 ? "run" : "runs"}, ${range}.${list}`;
  return `Minggu ini, lari ${totalValue(m.totalKm)} km dari ${m.runs} lari, ${range}.${list}`;
}
