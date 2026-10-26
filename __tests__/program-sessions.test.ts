import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/intervals/types";
import { buildProgram, RACES, type RaceTarget } from "@/lib/program";
import { planSessions, sessionId } from "@/lib/program/sessions";
import {
  baseLongRunKm,
  isProgramActive,
  mergeOverrides,
  parseProgramSettings,
  programDataOldest,
  programIdOf,
  serializeProgramSettings,
  type ProgramOverride,
} from "@/lib/program/settings";

// Program & aktivitas fiktif.
const START = "2026-01-05"; // Senin
const build = (race: RaceTarget = "hm", extra: Partial<Parameters<typeof buildProgram>[0]> = {}) =>
  buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: START, runsPerWeek: 3, ...extra });
const run = (id: string, date: string, km: number): Activity => ({ id, name: "Lari", type: "Run", category: "run", date, distanceKm: km, movingTimeSec: km * 480 });
const ov = (sessionId: string, decidedAt: string, extra: Partial<ProgramOverride> = {}): ProgramOverride => ({ sessionId, action: "skip", decidedAt, ...extra });

describe("sesi rencana ber-id", () => {
  it("id {programId}:{minggu}:{hari}:{jenis}, stabil antar render & saat target waktu berubah", () => {
    const id = programIdOf({ race: "hm", startDate: START });
    const a = planSessions(build("hm"), id);
    const b = planSessions(build("hm", { goalSec: 2 * 3600 + 30 * 60 }), id);
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
    expect(a[0].id).toBe("hm-2026-01-05:1:senin:st-lower");
    expect(a.find((s) => s.kind === "long")?.id).toBe("hm-2026-01-05:1:minggu:long");
    expect(new Set(a.map((s) => s.id)).size).toBe(a.length);
  });

  it("program berganti (jarak atau tanggal mulai) → id baru", () => {
    expect(programIdOf({ race: "fm", startDate: START })).not.toBe(programIdOf({ race: "hm", startDate: START }));
    expect(programIdOf({ race: "hm", startDate: "2026-01-12" })).not.toBe(programIdOf({ race: "hm", startDate: START }));
    // Tanggal tengah minggu dinormalkan ke Senin.
    expect(programIdOf({ race: "hm", startDate: "2026-01-07" })).toBe(programIdOf({ race: "hm", startDate: START }));
  });

  it("tanggal sesi sesuai hari; ST Senin & Rabu, minggu taper dan lomba hanya 1× (Rabu)", () => {
    const p = build("hm");
    const s = planSessions(p, "x");
    const w1 = s.filter((x) => x.week === 1);
    expect(w1.map((x) => [x.day, x.kind, x.date])).toEqual([
      ["Senin", "st-lower", "2026-01-05"],
      ["Selasa", "quality", "2026-01-06"],
      ["Rabu", "st-upper", "2026-01-07"],
      ["Kamis", "easy", "2026-01-08"],
      ["Minggu", "long", "2026-01-11"],
    ]);
    for (const w of p.weeks.filter((x) => x.phase === "taper" || x.raceWeek)) {
      const st = s.filter((x) => x.week === w.index && x.kind.startsWith("st-"));
      expect(st.map((x) => x.kind)).toEqual(["st-upper"]);
    }
    expect(s.filter((x) => x.week === 12).find((x) => x.kind === "race")?.date).toBe(p.raceDate);
  });

  it("4 lari/minggu menambah recovery Jumat tanpa mengubah id sesi lain", () => {
    const three = planSessions(build("hm"), "x").map((s) => s.id);
    const four = planSessions(build("hm", { runsPerWeek: 4 }), "x").map((s) => s.id);
    expect(four.filter((id) => !three.includes(id)).every((id) => id.endsWith(":jumat:recovery"))).toBe(true);
    expect(three.every((id) => four.includes(id))).toBe(true);
  });

  it("override move mengubah tanggal efektif; skip menandai", () => {
    const tempo = sessionId("x", 5, "Selasa", "quality");
    const s = planSessions(build("hm"), "x", [ov(tempo, "2026-02-03T01:00:00Z", { action: "move", toDate: "2026-02-05" }), ov("x:5:kamis:easy", "2026-02-03T01:00:00Z")]);
    const moved = s.find((x) => x.id === tempo)!;
    expect([moved.plannedDate, moved.date, moved.override?.action]).toEqual(["2026-02-03", "2026-02-05", "move"]);
    expect(s.find((x) => x.id === "x:5:kamis:easy")?.override?.action).toBe("skip");
  });
});

describe("pengaturan program", () => {
  it("parse/serialize mempertahankan override; override rusak dibuang; urutan kunci stabil", () => {
    const raw = JSON.stringify({ goal: "2:30:00", race: "hm", runsPerWeek: 4, startDate: START, overrides: [ov("a", "2026-01-06T00:00:00Z"), { sessionId: "b" }, ov("c", "2026-01-06T00:00:00Z", { action: "move" })] });
    const s = parseProgramSettings(raw, "2026-01-10");
    expect(s.overrides.map((o) => o.sessionId)).toEqual(["a"]);
    expect(serializeProgramSettings(s)).toBe(
      '{"race":"hm","goal":"2:30:00","startDate":"2026-01-05","runsPerWeek":4,"overrides":[{"sessionId":"a","action":"skip","decidedAt":"2026-01-06T00:00:00Z"}]}',
    );
    expect(serializeProgramSettings({ ...s, overrides: [] })).not.toContain("overrides");
    expect(parseProgramSettings("rusak", "2026-01-10").race).toBe("10k");
  });

  it("gabungan override per sesi: keputusan terbaru menang, komutatif & idempoten", () => {
    const a = [ov("s1", "2026-01-06T00:00:00Z"), ov("s2", "2026-01-06T00:00:00Z")];
    const b = [ov("s1", "2026-01-07T00:00:00Z", { action: "move", toDate: "2026-01-08" })];
    const m = mergeOverrides(a, b);
    expect(m.find((o) => o.sessionId === "s1")?.action).toBe("move");
    expect(mergeOverrides(b, a)).toEqual(m);
    expect(mergeOverrides(m, m)).toEqual(m);
  });

  it("program aktif hanya bila disimpan dan hari ini di rentang program (+1 hari setelah lomba)", () => {
    const p = build("hm");
    expect(isProgramActive("", p, "2026-01-10")).toBe(false);
    expect(isProgramActive("{}", p, "2026-01-04")).toBe(false);
    expect(isProgramActive("{}", p, "2026-01-05")).toBe(true);
    expect(isProgramActive("{}", p, p.raceDate)).toBe(true);
    expect(p.raceDate).toBe("2026-03-29");
    expect(isProgramActive("{}", p, "2026-03-30")).toBe(true);
    expect(isProgramActive("{}", p, "2026-03-31")).toBe(false);
  });

  it("long run awal = terjauh 30 hari sebelum mulai, tetap setelah program berjalan", () => {
    const acts = [run("a", "2025-12-20", 9), run("b", "2026-01-11", 14), run("c", "2025-11-01", 20)];
    expect(baseLongRunKm(acts, START, "2026-01-02")).toBe(9);
    expect(baseLongRunKm(acts, START, "2026-02-20")).toBe(9);
    // Program yang belum mulai memakai 30 hari terakhir sampai hari ini.
    expect(baseLongRunKm(acts, "2026-03-02", "2026-01-12")).toBe(14);
    expect(baseLongRunKm([], START, "2026-01-02")).toBeUndefined();
    expect(programDataOldest(START)).toBe("2025-12-06");
  });
});
