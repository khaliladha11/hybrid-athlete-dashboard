/**
 * Kartu "Minggu ini · latihan" (1.3.0). Murni: teks kolom, kalimat aksesibel, dan layout elemen dalam koordinat
 * story 1080×1920, dipakai kartu di Profil (SVG dengan token tema) dan ekspor PNG (`lib/share-card.ts`). Elemen sama
 * dengan kartu lari 1.1.0 (`CardElement`), ditambah peran `ride` dan arsir indoor.
 *
 * Layout (acuan pemilik, marketing/reference, tidak di-commit):
 * - label y 470, total jam y 700, tiga kolom ringkasan y 760 sampai 910 dengan hairline vertikal;
 * - bar bertumpuk per hari, dasar y 1370, tinggi maksimal 330: label menit hari terpanjang tetap di bawah kolom;
 * - huruf hari, hairline, footer jumlah sesi dan rentang tanggal.
 * - Segmen: sudut membulat, celah 8, tinggi minimal 22 supaya sesi pendek tetap terlihat. Run oranye, ride biru,
 *   other tinta redup, strength garis tepi tinta berarsir. Indoor = arsir; kata "indoor" juga ada di aria dan tabel.
 */
import { formatNumber } from "../i18n/format";
import type { Locale } from "../i18n/locale";
import { TRAINING_CARD } from "../i18n/messages/training-card";
import { columnX, dayLetters, rangeText, type CardElement, type CardHatch, type CardRole, type CardSpan } from "../week-run-card";
import { SPORTS, columnShowsKm, hmm, prime, shortDuration, summaryColumns, type DaySegment, type Sport, type SummaryColumn, type TrainingDay, type TrainingWeek } from "./training-week";

// ---- Teks ----

export interface ColumnText {
  sport: Sport;
  label: string;
  value: string;
  unit: string;
  sub: string;
}

export function columnText(c: SummaryColumn, lang: Locale): ColumnText {
  const t = TRAINING_CARD[lang];
  const { sessions, minutes, km, indoorMinutes, indoorNoDistanceMinutes } = c.totals;
  const allIndoor = indoorMinutes > 0 && Math.round(indoorMinutes) >= Math.round(minutes);
  const showKm = columnShowsKm(c);
  const value = showKm ? km.toFixed(1) : hmm(minutes);
  const unit = showKm ? t.km : t.hourUnit;
  let sub: string;
  if (c.key === "strength") sub = `${sessions}x · ${t.indoor}`;
  else if (showKm && (c.key === "run" || c.key === "ride") && indoorNoDistanceMinutes > 0) sub = `+ ${shortDuration(indoorNoDistanceMinutes)} ${t.indoor}`;
  else if (showKm) sub = `${sessions}x · ${hmm(minutes)}`;
  else sub = allIndoor && !c.merged ? `${sessions}x · ${t.indoor}` : `${sessions}x`;
  return { sport: c.key, label: t.sport[c.key], value, unit, sub };
}

export interface TrainingCardText {
  label: [string, string];
  total: string;
  unit: string;
  columns: ColumnText[];
  letters: string[];
  footer: [string, string];
}

export function trainingCardText(w: TrainingWeek, lang: Locale): TrainingCardText {
  const t = TRAINING_CARD[lang];
  return {
    label: t.label,
    total: hmm(w.minutes),
    unit: t.totalUnit,
    columns: summaryColumns(w).map((c) => columnText(c, lang)),
    letters: dayLetters(lang),
    footer: [t.sessions(w.sessions), rangeText(w.from, w.to, lang)],
  };
}

/** Footer satu baris, mis. "8 SESI · 16 SAMPAI 22 NOV". */
export const trainingFooter = (w: TrainingWeek, lang: Locale) => trainingCardText(w, lang).footer.join(" · ");

/** Durasi dalam kata: "5 jam 52 menit" / "5 hours 52 minutes". */
export function durationWords(minutes: number, lang: Locale): string {
  const m = Math.round(minutes);
  return TRAINING_CARD[lang].aria.duration(Math.floor(m / 60), m % 60);
}

const km1 = (v: number, lang: Locale) => formatNumber(lang, v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Kalimat aksesibel kartu (bahasa UI), semua olahraga yang ada, indoor ditulis dengan kata. */
export function trainingAriaLabel(w: TrainingWeek, lang: Locale = "id"): string {
  const a = TRAINING_CARD[lang].aria;
  const parts = SPORTS.filter((s) => w.sports[s].sessions > 0).map((s) => {
    const x = w.sports[s];
    // Sama dengan kolom kartu: lari/sepeda dengan km memakai km; lainnya hanya bila semua sesinya berjarak.
    const useKm = x.km > 0 && (s === "run" || s === "ride" || (s === "other" && x.allWithDistance));
    const main = useKm ? `${km1(x.km, lang)} km` : durationWords(x.minutes, lang);
    const allIndoor = x.indoorMinutes > 0 && Math.round(x.indoorMinutes) >= Math.round(x.minutes);
    const indoor = allIndoor ? ` (${a.allIndoor})` : x.indoorMinutes > 0 ? ` (${a.indoor(durationWords(x.indoorMinutes, lang))})` : "";
    return `${a.sport[s]} ${main}${indoor}`;
  });
  const range = rangeText(w.from, w.to, lang).toLowerCase();
  return a.week(durationWords(w.minutes, lang), a.sessions(w.sessions), parts.join(", "), range);
}

/**
 * Tabel "Lihat tabel" (bahasa UI): satu baris per segmen (hari, olahraga, menit, indoor/outdoor); hari tanpa latihan
 * satu baris "Tidak ada latihan". Indoor selalu tertulis, jadi arsir di grafik bukan satu-satunya penanda.
 */
export function trainingTableRows(w: TrainingWeek, lang: Locale): string[][] {
  const t = TRAINING_CARD[lang].table;
  return w.days.flatMap((d, i) =>
    d.segments.length
      ? d.segments.map((s) => [t.days[i], t.sports[s.sport], String(Math.round(s.minutes)), s.indoor ? t.indoor : t.outdoor])
      : [[t.days[i], t.none, "·", "·"]],
  );
}

// ---- Layout ----

export const T_BAR_BASE = 1370;
export const T_BAR_MAX = 330;
export const T_BAR_W = 78;
export const SEG_RX = 14;
export const SEG_GAP = 8;
export const SEG_MIN = 22;
/** Bawah kolom ringkasan; label menit di atas bar tertinggi harus tetap di bawahnya. */
export const SUMMARY_BOTTOM = 910;
const COL_X = [120, 400, 680];
const LABEL_SIZE = 40;
const MONO_SPACING = 0.16;

/** Kotak blok konten (viewBox kartu di layar dan pusat untuk feed). */
export const TRAINING_BLOCK = { x: 80, y: 400, w: 920, h: 1180 } as const;

const gaps = (d: TrainingDay) => Math.max(0, d.segments.length - 1) * SEG_GAP;

/**
 * Tinggi segmen per hari: satu skala untuk seluruh minggu (hari terpanjang = 330 termasuk celah), minimal 22 per
 * segmen. Bila minimum membuat bar melewati batas, segmen yang lebih tinggi dari minimum dikecilkan sebanding.
 */
export function stackHeights(days: TrainingDay[]): number[][] {
  const active = days.filter((d) => d.minutes > 0);
  if (!active.length) return days.map(() => []);
  const scale = Math.min(...active.map((d) => (T_BAR_MAX - gaps(d)) / d.minutes));
  return days.map((d) => {
    const avail = T_BAR_MAX - gaps(d);
    let hs = d.segments.map((s) => Math.max(SEG_MIN, s.minutes * scale));
    const over = hs.reduce((n, h) => n + h, 0) - avail;
    if (over > 0.01) {
      const room = hs.reduce((n, h) => n + (h - SEG_MIN), 0);
      hs = hs.map((h) => (room > 0 ? h - (over * (h - SEG_MIN)) / room : h));
    }
    return hs;
  });
}

const SPORT_ROLE: Record<Sport, CardRole> = { run: "brand", ride: "ride", strength: "ink", other: "dim" };

/** Gaya segmen: warna, arsir indoor, garis tepi untuk strength. */
export function segmentStyle(s: Pick<DaySegment, "sport" | "indoor">): { role: CardRole; hatch?: CardHatch; outline?: boolean } {
  if (s.sport === "strength") return { role: "ink", hatch: "ink", outline: true };
  if (!s.indoor) return { role: SPORT_ROLE[s.sport] };
  return { role: SPORT_ROLE[s.sport], hatch: s.sport === "other" ? "ink" : "light" };
}

/** Elemen kartu dalam urutan gambar. `watermark` = "HYBRID ATHLETE" kecil di bawah footer. */
export function trainingCardElements(w: TrainingWeek, lang: Locale, opts: { watermark?: boolean } = {}): CardElement[] {
  const t = trainingCardText(w, lang);
  const sep = (dx: number): CardSpan => ({ text: "·", role: "dim", dx });
  const els: CardElement[] = [
    {
      kind: "text",
      key: "label",
      x: 120,
      y: 470,
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
      x: 120,
      y: 700,
      size: 220,
      font: "display",
      weight: 800,
      role: "ink",
      spans: [{ text: t.total }, { text: t.unit, role: "brand", font: "mono", size: 52, weight: 700, dx: 20 }],
    },
  ];

  t.columns.forEach((c, i) => {
    const x = COL_X[i];
    if (i > 0) els.push({ kind: "rect", key: `col-rule-${i}`, x: x - 22, y: 758, w: 2, h: 152, rx: 0, role: "rule" });
    els.push({ kind: "rect", key: `col-key-${i}`, x, y: 763, w: 22, h: 22, rx: 5, role: SPORT_ROLE[c.sport] });
    els.push({ kind: "text", key: `col-label-${i}`, x: x + 34, y: 785, size: 30, font: "mono", weight: 500, role: "ink", spacing: MONO_SPACING, spans: [{ text: c.label }] });
    els.push({
      kind: "text",
      key: `col-value-${i}`,
      x,
      y: 860,
      size: 76,
      font: "sans",
      weight: 600,
      role: "ink",
      spans: [{ text: c.value }, { text: c.unit, font: "mono", size: 30, weight: 500, dx: 10 }],
    });
    els.push({ kind: "text", key: `col-sub-${i}`, x, y: 904, size: 28, font: "mono", weight: 500, role: "dim", spacing: 0.12, spans: [{ text: c.sub }] });
  });

  const heights = stackHeights(w.days);
  w.days.forEach((d, i) => {
    const cx = columnX(i);
    if (!d.segments.length) {
      els.push({ kind: "circle", key: `dot-${i}`, cx, cy: T_BAR_BASE - 9, r: 9, role: "faint" });
    } else {
      let top = T_BAR_BASE;
      d.segments.forEach((s, j) => {
        const h = heights[i][j];
        top -= h;
        els.push({ kind: "rect", key: `seg-${i}-${j}`, x: cx - T_BAR_W / 2, y: top, w: T_BAR_W, h, rx: SEG_RX, ...segmentStyle(s) });
        top -= SEG_GAP;
      });
      top += SEG_GAP;
      els.push({ kind: "text", key: `value-${i}`, x: cx, y: top - 22, size: 40, font: "sans", weight: 600, role: "ink", anchor: "middle", spans: [{ text: prime(d.minutes) }] });
    }
    els.push({ kind: "text", key: `day-${i}`, x: cx, y: 1432, size: LABEL_SIZE, font: "mono", weight: 500, role: "ink", anchor: "middle", spans: [{ text: t.letters[i] }] });
  });

  els.push({ kind: "line", key: "rule", x1: 120, x2: 960, y: 1478, width: 2, role: "rule" });
  els.push({
    kind: "text",
    key: "footer",
    x: 120,
    y: 1540,
    size: 38,
    font: "mono",
    weight: 500,
    role: "ink",
    spacing: 0.12,
    spans: [{ text: t.footer[0] }, sep(19), { text: t.footer[1], dx: 19 }],
  });
  if (opts.watermark) {
    els.push({ kind: "text", key: "watermark", x: 120, y: 1625, size: 24, font: "mono", weight: 500, role: "dim", spacing: 0.2, spans: [{ text: "HYBRID ATHLETE" }] });
  }
  return els;
}
