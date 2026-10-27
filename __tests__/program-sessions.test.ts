import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/intervals/types";
import { buildProgram, RACES, type RaceTarget } from "@/lib/program";
import { planSessions, sessionId } from "@/lib/program/sessions";
import { programShape } from "@/lib/program/timeline";
import {
  baseLongRunKm,
  createProgram,
  isProgramActive,
  mergeArchived,
  mergeOverrides,
  parseProgramSettings,
  programDataOldest,
  programIdOf,
  serializeProgramSettings,
  type ArchivedProgram,
  type ProgramOverride,
  type ProgramSettings,
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

  it("tanggal sesi sesuai hari; ST Senin & Rabu; minggu lomba hanya Upper (0.14.1: taper sebelumnya tetap 2×)", () => {
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
    for (const w of p.weeks.filter((x) => x.phase === "taper")) {
      const st = s.filter((x) => x.week === w.index && x.kind.startsWith("st-"));
      expect(st.map((x) => x.kind)).toEqual(w.raceWeek ? ["st-upper"] : ["st-lower", "st-upper"]);
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
      // Hari H hasil migrasi (0.13.3): Minggu terakhir program HM 12 minggu.
      '{"race":"hm","goal":"2:30:00","startDate":"2026-01-05","raceDate":"2026-03-29","runsPerWeek":4,"overrides":[{"sessionId":"a","action":"skip","decidedAt":"2026-01-06T00:00:00Z"}]}',
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

// Program seperti yang dibangun hook (0.13.3): bentuk dari mulai & Hari H.
const fromSettings = (st: ProgramSettings, currentLongRunKm?: number) => {
  const shape = programShape(st.race, st.startDate, st.raceDate)!;
  const p = buildProgram({
    race: st.race,
    goalSec: RACES[st.race].defaultGoalSec,
    startDate: st.startDate,
    runsPerWeek: st.runsPerWeek,
    currentLongRunKm,
    weeks: shape.mainWeeks,
    preBaseWeeks: shape.preBaseWeeks,
    rawLongestKm: currentLongRunKm,
    raceDate: st.raceDate,
  });
  return planSessions(p, programIdOf(st), st.overrides, st.activeFrom);
};

describe("Hari H, migrasi, arsip (0.13.3)", () => {
  it("migrasi: program tanpa Hari H → Minggu terakhir panjang lama, id lama, sesi & override identik", () => {
    for (const race of ["5k", "10k", "hm", "fm"] as RaceTarget[]) {
      const legacyId = `${race}-${START}`;
      const skip = ov(`${legacyId}:2:selasa:quality`, "2026-01-14T00:00:00Z");
      const st = parseProgramSettings(JSON.stringify({ race, goal: "1:00:00", startDate: START, runsPerWeek: 3, overrides: [skip] }), "2026-01-20");
      expect(st.raceDate).toBe(addDaysLocal(START, RACES[race].weeks * 7 - 1));
      expect(st.id).toBeUndefined();
      expect(programIdOf(st)).toBe(legacyId);
      const before = planSessions(build(race, { currentLongRunKm: 9 }), legacyId, [skip]);
      expect(fromSettings(st, 9)).toEqual(before);
    }
  });

  it("ganti Hari H di tengah program: program lama diarsipkan dengan riwayatnya, program baru mulai hari ini dengan id baru", () => {
    const today = "2026-02-04"; // Rabu minggu ke-5
    const old = parseProgramSettings(JSON.stringify({ race: "hm", goal: "2:00:00", startDate: START, runsPerWeek: 3, overrides: [ov(`hm-${START}:2:selasa:quality`, "2026-01-14T00:00:00Z")] }), today);
    const oldSessions = fromSettings(old, 9);
    const next = createProgram(old, { race: "hm", goal: "2:00:00", startDate: START, raceDate: "2026-05-10", runsPerWeek: 3 }, { today, active: true, hasHistory: true, baseLongRunKm: 9 });
    expect(next.startDate).toBe("2026-02-02");
    expect(next.activeFrom).toBe(today);
    expect(next.id).toBe("hm-2026-02-02-2026-05-10");
    expect(next.overrides).toEqual([]);
    expect(next.archived).toHaveLength(1);
    const a = next.archived[0];
    expect(a).toMatchObject({ id: `hm-${START}`, raceDate: "2026-03-29", endedAt: today, baseLongRunKm: 9 });
    expect(a.overrides).toEqual(old.overrides);
    // Riwayat: sesi arsip sebelum tanggal ganti sama persis dengan sebelum diarsipkan.
    const archivedSessions = planSessions(
      buildProgram({ race: a.race, goalSec: RACES.hm.defaultGoalSec, startDate: a.startDate, runsPerWeek: a.runsPerWeek, currentLongRunKm: a.baseLongRunKm, weeks: 12, raceDate: a.raceDate }),
      a.id,
      a.overrides,
    ).filter((x) => x.plannedDate < a.endedAt);
    expect(archivedSessions).toEqual(oldSessions.filter((x) => x.plannedDate < today));
    // Program baru: tidak ada sesi sebelum hari ini; id tidak bertabrakan dengan arsip.
    const fresh = fromSettings(serializeAndParse(next, today));
    expect(fresh.every((x) => x.plannedDate >= today)).toBe(true);
    expect(fresh.every((x) => x.id.startsWith("hm-2026-02-02-2026-05-10:"))).toBe(true);
  });

  it("program yang belum mulai diganti tanpa arsip; id yang sudah dipakai arsip diberi akhiran", () => {
    const today = "2026-01-02";
    const old = parseProgramSettings(JSON.stringify({ race: "10k", goal: "55:00", startDate: START, runsPerWeek: 3 }), today);
    const next = createProgram(old, { race: "10k", goal: "55:00", startDate: START, raceDate: "2026-03-22", runsPerWeek: 4 }, { today, active: false, hasHistory: false });
    expect(next.archived).toEqual([]);
    expect(next.startDate).toBe(START);
    expect(next.activeFrom).toBeUndefined();
    const again = createProgram(
      { ...next, archived: [{ ...arch("10k-2026-01-05-2026-03-22"), endedAt: "2026-01-01" }] },
      { race: "10k", goal: "55:00", startDate: START, raceDate: "2026-03-22", runsPerWeek: 4 },
      { today, active: false, hasHistory: false },
    );
    expect(again.id).toBe("10k-2026-01-05-2026-03-22-2");
  });

  it("konfirmasi risiko & pilihan pengalaman tersimpan; arsip & Hari H bolak-balik parse/serialize", () => {
    const next = createProgram(null, { race: "fm", goal: "4:30:00", startDate: START, raceDate: "2026-04-12", runsPerWeek: 4, riskAckAt: "2026-01-02T03:00:00.000Z", completedBefore: false }, { today: "2026-01-02", active: false, hasHistory: false });
    const round = serializeAndParse({ ...next, archived: [arch("hm-2025-09-01")] }, "2026-01-02");
    expect(round).toMatchObject({ raceDate: "2026-04-12", riskAckAt: "2026-01-02T03:00:00.000Z", completedBefore: false, id: next.id });
    expect(round.archived.map((a) => a.id)).toEqual(["hm-2025-09-01"]);
    // Arsip rusak dibuang.
    const broken = parseProgramSettings(JSON.stringify({ ...JSON.parse(serializeProgramSettings(round)), archived: [{ id: "x" }, arch("ok")] }), "2026-01-02");
    expect(broken.archived.map((a) => a.id)).toEqual(["ok"]);
  });

  it("sesi sebelum activeFrom dan sesudah Hari H di minggu lomba tidak dibuat", () => {
    const st = parseProgramSettings(JSON.stringify({ race: "hm", goal: "2:00:00", startDate: START, raceDate: "2026-03-28", runsPerWeek: 4, activeFrom: "2026-01-08", id: "hm-x" }), "2026-01-08");
    const list = fromSettings(st);
    expect(list.every((x) => x.plannedDate >= "2026-01-08" && x.plannedDate <= "2026-03-28")).toBe(true);
    expect(list.at(-1)).toMatchObject({ kind: "race", plannedDate: "2026-03-28", day: "Sabtu" });
  });

  it("gabungan arsip per id: override digabung, endedAt paling awal, komutatif & idempoten", () => {
    const a1 = { ...arch("p1"), overrides: [ov("p1:1:selasa:quality", "2026-01-06T00:00:00Z")] };
    const a2 = { ...arch("p1"), endedAt: "2026-02-01", overrides: [ov("p1:2:selasa:quality", "2026-01-13T00:00:00Z")] };
    const m = mergeArchived([a1], [a2, arch("p2")]);
    expect(m.map((x) => x.id)).toEqual(["p1", "p2"]);
    const p1 = m.find((x) => x.id === "p1")!;
    expect(p1.endedAt).toBe("2025-11-10");
    expect(p1.overrides.map((o) => o.sessionId)).toEqual(["p1:1:selasa:quality", "p1:2:selasa:quality"]);
    expect(mergeArchived([a2, arch("p2")], [a1])).toEqual(m);
    expect(mergeArchived(m, m)).toEqual(m);
  });
});

function arch(id: string): ArchivedProgram {
  return { id, race: "hm", goal: "2:00:00", startDate: "2025-09-01", raceDate: "2025-11-23", runsPerWeek: 3, overrides: [], endedAt: "2025-11-10" };
}
function serializeAndParse(st: ProgramSettings, today: string) {
  return parseProgramSettings(serializeProgramSettings(st), today);
}
function addDaysLocal(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
