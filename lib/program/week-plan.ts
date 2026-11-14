/**
 * "Sesi minggu ini" (0.14.3, model mingguan fleksibel). Murni: tanggal dari parameter, WIB.
 *
 * - Sisa sesi = sesi minggu kalender ini yang belum terpenuhi/sebagian dan tidak dilewati.
 * - Rekomendasi hari ini hanya saran; atlet bebas memilih sesi sisa mana pun:
 *   - quality atau long run tidak disarankan sehari setelah lari berat atau long run;
 *   - quality tidak disarankan bila long run masih terbuka dan minggu tinggal ≤ 2 hari (supaya tidak sehari sebelum
 *     long run);
 *   - aturan concurrent lama tetap: setelah ST kaki (kemarin/hari ini) lari maks Moderate, jadi quality High tidak
 *     disarankan; setelah lari berat atau long run, ST Upper didahulukan dari ST Lower;
 *   - readiness, 80/20, dan progresi km tetap diterapkan coach (`suggestFor`) dan hanya menurunkan.
 * - Catatan akhir minggu: lembut dan spesifik per sesi yang tersisa, sekali per minggu. Sesi tidak pernah dibawa ke
 *   minggu berikutnya (D5).
 */
import { addDays } from "@/lib/date";
import { formatDay, WEEKDAY_LONG } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { isHardRun, isLegStrength, isLongRun } from "@/lib/coach";
import type { Activity } from "@/lib/intervals/types";
import { isLegSession, type StSession } from "@/lib/st-session";
import { isDone, weekBounds, type SessionResult } from "./compliance";
import { isRunKind, type PlannedSession } from "./sessions";
import { WEEK_TEXT } from "@/lib/i18n/messages/program-lib";

export const dayName = (d: string, locale: Locale = "id") => formatDay(locale, d, WEEKDAY_LONG);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Sesi minggu kalender `today` beserta sisanya. */
export function weekSessions(sessions: PlannedSession[], results: Map<string, SessionResult>, today: string) {
  const { start, end } = weekBounds(today);
  const all = sessions.filter((s) => s.plannedDate >= start && s.plannedDate <= end);
  const remaining = all.filter((s) => !isDone(results.get(s.id)) && results.get(s.id)?.status !== "dilewati");
  return { start, end, all, remaining };
}

/** Sesi minggu ini yang belum dikerjakan boleh dilewati (lomba tidak). */
export const canSkip = (s: PlannedSession, r: SessionResult | undefined, today: string) =>
  s.kind !== "race" && r?.status === "belum" && weekBounds(s.plannedDate).start === weekBounds(today).start;

export interface Recommendation {
  session: PlannedSession | null;
  /** Alasan pilihan, lalu alasan sesi yang tidak disarankan hari ini. */
  reasons: string[];
  /** Sesi sisa yang sebaiknya tidak hari ini (tetap boleh dipilih). */
  notToday: string[];
}

export function recommendToday(
  remaining: PlannedSession[],
  ctx: { today: string; weekEnd: string; activities: Activity[]; stSessions?: StSession[]; locale?: Locale },
): Recommendation {
  const { today } = ctx;
  const locale = ctx.locale ?? "id";
  const T = WEEK_TEXT[locale];
  const yesterday = addDays(today, -1);
  const recent = ctx.activities.filter((a) => a.date === today || a.date === yesterday);
  const hardYesterday = ctx.activities.find((a) => a.date === yesterday && (isHardRun(a) || isLongRun(a)));
  const legSt =
    recent.some(isLegStrength) || (ctx.stSessions ?? []).some((s) => !s.deletedAt && (s.date === today || s.date === yesterday) && isLegSession(s));
  const hardRecent = recent.some((a) => isHardRun(a) || isLongRun(a));
  const daysLeft = daysBetween(today, ctx.weekEnd) + 1;
  const longOpen = remaining.some((s) => s.kind === "long");

  const blocked = new Map<string, string>();
  for (const s of remaining) {
    if ((s.kind === "quality" || s.kind === "long") && hardYesterday) {
      blocked.set(s.id, T.afterHard(s.title, isLongRun(hardYesterday)));
    } else if (s.kind === "quality" && longOpen && daysLeft <= 2) {
      blocked.set(s.id, T.beforeLong(s.title));
    } else if (s.kind === "quality" && s.intensity === "high" && legSt) {
      blocked.set(s.id, T.afterLegSt(s.title));
    } else if (s.kind === "st-lower" && hardRecent && remaining.some((x) => x.kind === "st-upper")) {
      blocked.set(s.id, T.upperFirst(s.title));
    }
  }
  const allowed = remaining.filter((s) => !blocked.has(s.id) && s.kind !== "race");

  const rank = (s: PlannedSession) => {
    if (s.plannedDate === today) return 0;
    if (s.kind === "long" && daysLeft <= 2) return 1;
    return 2;
  };
  const pick = [...allowed].sort(
    (a, b) => rank(a) - rank(b) || a.plannedDate.localeCompare(b.plannedDate) || Number(isRunKind(b.kind)) - Number(isRunKind(a.kind)) || a.id.localeCompare(b.id),
  )[0];

  const race = remaining.find((s) => s.kind === "race" && s.plannedDate === today);
  const session = race ?? pick ?? null;
  const reasons: string[] = [];
  if (session) {
    if (session.kind === "race") reasons.push(T.race);
    else if (session.plannedDate === today) reasons.push(T.today(dayName(today, locale)));
    else if (session.kind === "long" && daysLeft <= 2) reasons.push(T.longLeft(daysLeft));
    else if (session.plannedDate < today) reasons.push(T.overdue(dayName(session.plannedDate, locale)));
    else reasons.push(T.early(dayName(session.plannedDate, locale)));
  } else if (remaining.length) {
    reasons.push(T.rest);
  }
  const notToday = remaining.filter((s) => blocked.has(s.id)).map((s) => blocked.get(s.id)!);
  return { session, reasons, notToday };
}

/** Kenapa sesi yang tersisa di akhir minggu tetap penting (lembut, tanpa rasa bersalah). */
type WhyKey = "quality" | "long" | "easy" | "st";

export interface WeekEndNote {
  /** `{programId}:{minggu}`, untuk tanda sudah ditutup. */
  id: string;
  week: number;
  lines: string[];
}

/** Id program dari id sesi `{programId}:{minggu}:{hari}:{jenis}`. */
const programIdOfSession = (id: string) => id.split(":").slice(0, -3).join(":");

/**
 * Catatan untuk minggu yang baru selesai (minggu sebelum minggu `today`), bila ada sesi yang belum dikerjakan dan
 * tidak dilewati. Null bila minggu lengkap, sudah ditutup (`seen`), atau tidak ada minggu program sebelumnya.
 */
export function weekEndNote(
  sessions: PlannedSession[],
  results: Map<string, SessionResult>,
  today: string,
  seen: readonly string[] = [],
  locale: Locale = "id",
): WeekEndNote | null {
  const lastWeek = weekBounds(addDays(weekBounds(today).start, -1));
  const list = sessions.filter((s) => s.plannedDate >= lastWeek.start && s.plannedDate <= lastWeek.end);
  if (!list.length) return null;
  const id = `${programIdOfSession(list[0].id)}:${list[0].week}`;
  if (seen.includes(id)) return null;
  const missing = list.filter((s) => results.get(s.id)?.status === "belum" && s.kind !== "race");
  if (!missing.length) return null;
  const kinds = new Set(missing.map((s) => (s.kind === "quality" ? "quality" : s.kind === "long" ? "long" : isRunKind(s.kind) ? "easy" : "st") as WhyKey));
  const lines = (["quality", "long", "easy", "st"] as const).filter((k) => kinds.has(k)).map((k) => WEEK_TEXT[locale].why[k]);
  return { id, week: list[0].week, lines };
}
