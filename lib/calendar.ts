/**
 * Isi kalender per tanggal (0.14.3). Murni.
 *
 * - Aktivitas selalu di **tanggal aslinya**: lari & ST dari intervals.icu, ditambah ST lokal (sesi mode latihan & log ★)
 *   yang tidak punya pasangan aktivitas strength di intervals.icu (`dedupeStSessions`), supaya tidak dobel.
 * - Sesi rencana hanya **penanda** di hari yang disarankan. Penanda tidak pernah berstatus "selesai" di sel; sesi yang
 *   sudah dipenuhi di hari lain cukup diberi catatan "dipenuhi {hari}" di detail.
 */
import { STRENGTH_TYPE_LABEL } from "./generator/types";
import type { Activity } from "./intervals/types";
import type { SessionResult } from "./program/compliance";
import type { PlannedSession } from "./program/sessions";
import { dedupeStSessions, type StSession } from "./st-session";

export type CalendarItem =
  | { kind: "activity"; date: string; activity: Activity }
  | { kind: "local-st"; date: string; id: string; title: string; minutes?: number };

/** Item per tanggal, urut pagi → malam (ST lokal tanpa jam di akhir hari). */
export function calendarItems(activities: Activity[], stSessions: StSession[], stLogDates: string[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  const add = (i: CalendarItem) => map.set(i.date, [...(map.get(i.date) ?? []), i]);
  const sorted = [...activities].filter((a) => a.date).sort((x, y) => (x.startLocal ?? "").localeCompare(y.startLocal ?? ""));
  for (const a of sorted) add({ kind: "activity", date: a.date!, activity: a });
  const items = dedupeStSessions(stSessions, activities);
  const covered = new Set<string>();
  for (const i of items) {
    covered.add(i.date);
    if (i.source === "local" && !i.activityId) {
      add({ kind: "local-st", date: i.date, id: `ses:${i.session.id}`, title: `ST ${STRENGTH_TYPE_LABEL[i.session.type]}`, minutes: i.minutes });
    }
  }
  for (const d of [...new Set(stLogDates)].sort()) {
    if (!covered.has(d)) add({ kind: "local-st", date: d, id: `log:${d}`, title: "ST (log ★)" });
  }
  return map;
}

export type PlanMarker = "planned" | "open" | "fulfilled" | "skipped";

/**
 * Penanda sesi rencana di sel tanggal: `planned` (mendatang, warna intensitas), `open` (sudah lewat, belum dikerjakan;
 * netral, tanpa merah), `fulfilled` (dipenuhi di hari mana pun; redup), `skipped` (dilewati).
 */
export function planMarker(s: PlannedSession, r: SessionResult | undefined, today: string): PlanMarker {
  if (r?.status === "dilewati") return "skipped";
  if (r?.status === "terpenuhi" || r?.status === "sebagian") return "fulfilled";
  return s.plannedDate >= today ? "planned" : "open";
}
