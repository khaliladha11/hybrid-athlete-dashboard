import { describe, expect, it } from "vitest";
import { addDays, startOfWeekMonday } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { RACES, buildProgram, type RaceTarget } from "@/lib/program";
import { evaluateCompliance } from "@/lib/program/compliance";
import { missedSessions, rescheduleOptions } from "@/lib/program/reschedule";
import { planSessions, type PlannedSession } from "@/lib/program/sessions";
import type { ProgramOverride } from "@/lib/program/settings";

// Program fiktif mulai Senin 2026-01-05. Minggu 2: Sen 12 ST Lower, Sel 13 quality, Rab 14 ST Upper,
// Kam 15 easy, (Jum 16 recovery bila 4×), Min 18 long run.
const START = "2026-01-05";
const program = (race: RaceTarget, runsPerWeek: 3 | 4) => buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: START, runsPerWeek });
const sessionsOf = (race: RaceTarget, runsPerWeek: 3 | 4, overrides: ProgramOverride[] = []) => planSessions(program(race, runsPerWeek), `${race}-${START}`, overrides);
const find = (list: PlannedSession[], week: number, kind: PlannedSession["kind"]) => list.find((s) => s.week === week && s.kind === kind)!;
const optionsAt = (s: PlannedSession, list: PlannedSession[], today: string, acts: Activity[] = []) =>
  rescheduleOptions(s, list, evaluateCompliance(list, acts, [], today), acts, today);
const run = (date: string): Activity => ({ id: `r-${date}`, name: "Lari", type: "Run", category: "run", date, startLocal: `${date}T06:00:00`, distanceKm: 5, movingTimeSec: 1800 });
const SKIP = { action: "skip" };
const move = (toDate: string) => ({ action: "move", toDate });

describe("quality terlewat", () => {
  it("3× lari: Selasa terlewat, hari ini Kamis → geser ke Jumat (Kamis ada easy, Sabtu sehari sebelum long run)", () => {
    const list = sessionsOf("hm", 3);
    expect(optionsAt(find(list, 2, "quality"), list, "2026-01-15")).toEqual([move("2026-01-16"), SKIP]);
  });

  it("4× lari: Jumat sudah ada recovery, Sabtu sehari sebelum long run → hanya lewati", () => {
    const list = sessionsOf("hm", 4);
    expect(optionsAt(find(list, 2, "quality"), list, "2026-01-15")).toEqual([SKIP]);
  });

  it("hari yang sudah ada lari tercatat tidak ditawarkan", () => {
    const list = sessionsOf("hm", 3);
    expect(optionsAt(find(list, 2, "quality"), list, "2026-01-16", [run("2026-01-16")])).toEqual([SKIP]);
  });

  it("≥ 48 jam dari quality sebelumnya", () => {
    // Quality minggu ini sudah digeser ke Kamis; quality lain di minggu yang sama tidak boleh di Jumat.
    const q: PlannedSession = { id: "q1", week: 1, day: "Selasa", plannedDate: "2026-01-06", date: "2026-01-06", kind: "quality", title: "Tempo", intensity: "moderate", km: 6 };
    const other: PlannedSession = { ...q, id: "q0", plannedDate: "2026-01-08", date: "2026-01-08", override: { sessionId: "q0", action: "move", toDate: "2026-01-08", decidedAt: "2026-01-07T00:00:00Z" } };
    const today = "2026-01-09";
    const res = new Map([[q.id, { status: "terlewat" as const, activityIds: [] }]]);
    expect(rescheduleOptions(q, [q, other], res, [], today)).toEqual([move("2026-01-10"), SKIP]);
  });
});

describe("long run, easy, ST, lomba", () => {
  it("long run Minggu terlewat (terdeteksi Selasa): +1/+2 hari jatuh di minggu berikutnya → hanya lewati", () => {
    for (const rpw of [3, 4] as const) {
      const list = sessionsOf("hm", rpw);
      expect(optionsAt(find(list, 2, "long"), list, "2026-01-20")).toEqual([SKIP]);
    }
  });

  it("aturan long run umum: +1/+2 hari di minggu yang sama, bukan hari quality atau sehari sebelumnya", () => {
    const long: PlannedSession = { id: "l", week: 1, day: "Kamis", plannedDate: "2026-01-08", date: "2026-01-08", kind: "long", title: "Long run 12 km", intensity: "easy", km: 12 };
    const res = new Map([[long.id, { status: "terlewat" as const, activityIds: [] }]]);
    expect(rescheduleOptions(long, [long], res, [], "2026-01-10")).toEqual([move("2026-01-10"), SKIP]);
    const quality: PlannedSession = { ...long, id: "q", kind: "quality", day: "Minggu", plannedDate: "2026-01-11", date: "2026-01-11", title: "Tempo" };
    expect(rescheduleOptions(long, [long, quality], res, [], "2026-01-10")).toEqual([SKIP]);
  });

  it("easy & recovery terlewat → hanya lewati", () => {
    const list = sessionsOf("hm", 4);
    expect(optionsAt(find(list, 2, "easy"), list, "2026-01-17")).toEqual([SKIP]);
    expect(optionsAt(find(list, 2, "recovery"), list, "2026-01-18")).toEqual([SKIP]);
  });

  it("ST terlewat → hari kosong berikutnya di minggu yang sama, bukan sehari sebelum quality/long run", () => {
    const three = sessionsOf("hm", 3);
    expect(optionsAt(find(three, 2, "st-lower"), three, "2026-01-14")).toEqual([move("2026-01-16"), SKIP]);
    const four = sessionsOf("hm", 4);
    expect(optionsAt(find(four, 2, "st-lower"), four, "2026-01-14")).toEqual([SKIP]);
  });

  it("lomba, sesi yang belum terlewat, dan sesi yang sudah punya keputusan tidak diberi opsi", () => {
    const list = sessionsOf("10k", 3);
    const race = list.find((s) => s.kind === "race")!;
    expect(optionsAt(race, list, addDays(race.date, 3))).toEqual([]);
    const q = find(list, 2, "quality");
    expect(optionsAt(q, list, q.date)).toEqual([]); // hari ini
    expect(optionsAt(q, list, addDays(q.date, 1))).toEqual([]); // kemarin: masih bisa
    expect(optionsAt(q, list, addDays(q.date, 2), [run(q.date)])).toEqual([]); // selesai
    const skipped = sessionsOf("10k", 3, [{ sessionId: q.id, action: "skip", decidedAt: "2026-01-15T00:00:00Z" }]);
    expect(optionsAt(find(skipped, 2, "quality"), skipped, "2026-01-16")).toEqual([]);
  });

  it("missedSessions: hanya terlewat 7 hari terakhir tanpa keputusan", () => {
    const list = sessionsOf("hm", 3, [{ sessionId: `hm-${START}:2:selasa:quality`, action: "skip", decidedAt: "2026-01-15T00:00:00Z" }]);
    const today = "2026-01-20";
    const missed = missedSessions(list, evaluateCompliance(list, [], [], today), today);
    // ST Lower 12 Jan sudah lebih dari 7 hari; quality dilewati; ST Lower 19 Jan masih bisa (kemarin).
    expect(missed.map((s) => `${s.week}:${s.kind}`)).toEqual(["2:st-upper", "2:easy", "2:long"]);
  });
});

describe("D5: geser tidak pernah menambah volume minggu berikutnya", () => {
  it("semua program × 3/4 lari × setiap sesi × setiap hari sesudahnya di minggu itu", () => {
    for (const race of Object.keys(RACES) as RaceTarget[]) {
      for (const rpw of [3, 4] as const) {
        const list = sessionsOf(race, rpw);
        for (const s of list) {
          const weekEnd = addDays(startOfWeekMonday(s.plannedDate), 6);
          for (let today = addDays(s.date, 2); today <= addDays(weekEnd, 2); today = addDays(today, 1)) {
            const opts = optionsAt(s, list, today);
            for (const o of opts) {
              if (o.action !== "move") continue;
              expect(o.toDate >= today && o.toDate > s.plannedDate && o.toDate <= weekEnd).toBe(true);
              // Diterapkan: jumlah sesi & km per minggu kalender sama untuk setiap minggu selain minggu sesi itu.
              const moved = sessionsOf(race, rpw, [{ sessionId: s.id, action: "move", toDate: o.toDate, decidedAt: "2026-01-01T00:00:00Z" }]);
              const perWeek = (l: PlannedSession[]) => {
                const m = new Map<string, number>();
                for (const x of l) m.set(startOfWeekMonday(x.date), (m.get(startOfWeekMonday(x.date)) ?? 0) + 1 + (x.km ?? 0));
                return m;
              };
              const before = perWeek(list);
              const after = perWeek(moved);
              for (const [w, v] of after) expect(v).toBe(before.get(w));
              expect(moved).toHaveLength(list.length);
            }
          }
        }
      }
    }
  });
});
