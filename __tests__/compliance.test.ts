import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/intervals/types";
import { evaluateCompliance, weekSummary } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";
import type { StSession } from "@/lib/st-session";

// Sesi & aktivitas fiktif. Minggu 1: Senin 2026-01-05 s.d. Minggu 2026-01-11; minggu 2 mulai 2026-01-12.
const sess = (id: string, date: string, kind: PlannedSession["kind"], extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id,
  week: 1,
  day: "",
  plannedDate: date,
  date,
  kind,
  title: id,
  intensity: kind === "quality" ? "moderate" : "easy",
  ...extra,
});
let n = 0;
const act = (date: string, extra: Partial<Activity> = {}): Activity => ({
  id: `a${++n}`,
  name: "Lari pagi",
  type: "Run",
  category: "run",
  date,
  startLocal: `${date}T06:00:00`,
  distanceKm: 6,
  movingTimeSec: 40 * 60,
  avgHr: 140,
  ...extra,
});
const hard = (date: string, extra: Partial<Activity> = {}) => act(date, { name: "Tempo", avgHr: 160, distanceKm: 7, movingTimeSec: 45 * 60, ...extra });
const TODAY = "2026-01-14";
const status = (r: ReturnType<typeof evaluateCompliance>, id: string) => r.get(id)?.status;

describe("program mingguan: hari apa pun dalam minggu yang sama", () => {
  const quality = sess("q", "2026-01-06", "quality", { minutes: 45, km: 7 });

  it("quality yang dikerjakan Rabu atau Jumat memenuhi quality Selasa; tanggal aktual dicatat", () => {
    expect(evaluateCompliance([quality], [hard("2026-01-07")], [], TODAY).get("q")).toMatchObject({ status: "terpenuhi", actualDate: "2026-01-07" });
    expect(evaluateCompliance([quality], [hard("2026-01-09")], [], TODAY).get("q")).toMatchObject({ status: "terpenuhi", actualDate: "2026-01-09" });
    // Senin sebelum hari disarankan juga boleh.
    expect(status(evaluateCompliance([quality], [hard("2026-01-05")], [], TODAY), "q")).toBe("terpenuhi");
  });

  it("aktivitas di minggu lain tidak dihitung", () => {
    expect(status(evaluateCompliance([quality], [hard("2026-01-12")], [], TODAY), "q")).toBe("belum");
    expect(status(evaluateCompliance([quality], [hard("2026-01-04")], [], TODAY), "q")).toBe("belum");
  });

  it("satu aktivitas untuk satu sesi; jenis cocok lebih dulu, lalu hari disarankan terdekat", () => {
    const easyThu = sess("easy-kam", "2026-01-08", "easy", { minutes: 40 });
    const easyFri = sess("easy-jum", "2026-01-09", "recovery", { minutes: 30 });
    // Lari berat Kamis → quality (jenis cocok), bukan easy Kamis walau harinya sama.
    const r = evaluateCompliance([quality, easyThu, easyFri], [hard("2026-01-08"), act("2026-01-09")], [], TODAY);
    expect(r.get("q")).toMatchObject({ status: "terpenuhi", actualDate: "2026-01-08" });
    // Easy Jumat → sesi easy dengan hari disarankan terdekat (Jumat), Kamis tetap belum.
    expect(status(r, "easy-jum")).toBe("terpenuhi");
    expect(status(r, "easy-kam")).toBe("belum");
  });

  it("long run dikerjakan Kamis tetap memenuhi long run Minggu (jarak cocok), bukan easy Kamis", () => {
    const easyThu = sess("easy-kam", "2026-01-08", "easy", { minutes: 40 });
    const long = sess("long", "2026-01-11", "long", { km: 14 });
    const r = evaluateCompliance([easyThu, long], [act("2026-01-08", { distanceKm: 14, movingTimeSec: 100 * 60 })], [], TODAY);
    expect(r.get("long")).toMatchObject({ status: "terpenuhi", actualDate: "2026-01-08" });
    expect(status(r, "easy-kam")).toBe("belum");
  });

  it("ambang 80%: di bawahnya sebagian; quality dikerjakan ringan → sebagian", () => {
    const easy = sess("easy", "2026-01-08", "easy", { minutes: 40, km: 4.7 });
    expect(evaluateCompliance([easy], [act("2026-01-10", { movingTimeSec: 25 * 60, distanceKm: 3 })], [], TODAY).get("easy")).toMatchObject({ status: "sebagian", ratio: 0.64 });
    expect(status(evaluateCompliance([quality], [act("2026-01-06")], [], TODAY), "q")).toBe("sebagian");
  });

  it("easy yang dikerjakan berat tetap terpenuhi dengan catatan lebih-berat", () => {
    const easy = sess("easy", "2026-01-08", "easy", { minutes: 40 });
    expect(evaluateCompliance([easy], [hard("2026-01-08")], [], TODAY).get("easy")).toMatchObject({ status: "terpenuhi", note: "lebih-berat" });
  });

  it("long run dipecah dua di hari yang sama dijumlah", () => {
    const long = sess("long", "2026-01-11", "long", { km: 14 });
    const r = evaluateCompliance([long], [act("2026-01-10", { distanceKm: 7 }), act("2026-01-10", { distanceKm: 5, startLocal: "2026-01-10T17:00:00" })], [], TODAY);
    expect(r.get("long")).toMatchObject({ status: "terpenuhi", actualDate: "2026-01-10" });
    expect(r.get("long")?.activityIds).toHaveLength(2);
  });

  it("tanpa aktivitas → belum (tanpa terlewat); dilewati tidak dicocokkan", () => {
    const skip = sess("skip", "2026-01-08", "easy", { override: { sessionId: "skip", action: "skip", decidedAt: "2026-01-08T00:00:00Z" } });
    const r = evaluateCompliance([quality, skip, sess("next", "2026-01-15", "easy", { week: 2 })], [act("2026-01-08")], [], TODAY);
    expect(status(r, "q")).toBe("sebagian"); // lari easy Kamis dipakai quality (satu-satunya sesi yang tersisa)
    expect(r.get("skip")).toEqual({ status: "dilewati", activityIds: [] });
    expect(status(r, "next")).toBe("belum");
  });

  it("data kosong/null aman", () => {
    const easy = sess("easy", "2026-01-08", "easy", { minutes: 40 });
    const r = evaluateCompliance([easy], [act("2026-01-08", { distanceKm: undefined, movingTimeSec: undefined }), { ...act("x"), date: undefined }], [], TODAY);
    expect(status(r, "easy")).toBe("terpenuhi");
    expect(evaluateCompliance([], [], [], TODAY).size).toBe(0);
  });
});

describe("ST di minggu yang sama", () => {
  const lower = sess("p:1:senin:st-lower", "2026-01-05", "st-lower", { intensity: "moderate" });
  const upper = sess("p:1:rabu:st-upper", "2026-01-07", "st-upper", { intensity: "moderate" });
  const ses = (id: string, date: string, over: Partial<StSession> = {}): StSession => ({
    id,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    type: "lower",
    title: "Lower",
    difficulty: "moderate",
    durationMin: 45,
    rpe: 6,
    setsDone: 12,
    setsPlanned: 12,
    movements: [],
    updatedAt: `${date}T11:00:00.000Z`,
    ...over,
  });

  it("ST Lower dikerjakan Kamis memenuhi ST Lower Senin; Senin tetap tanpa aktivitas", () => {
    const r = evaluateCompliance([lower, upper], [], [], TODAY, [ses("s1", "2026-01-08")]);
    expect(r.get(lower.id)).toMatchObject({ status: "terpenuhi", actualDate: "2026-01-08", stSessionId: "s1" });
    expect(status(r, upper.id)).toBe("belum");
  });

  it("tipe cocok diutamakan: sesi Upper memenuhi ST Upper walau dekat hari Senin", () => {
    const r = evaluateCompliance([lower, upper], [], [], TODAY, [ses("u", "2026-01-05", { type: "upperPull" })]);
    expect(r.get(upper.id)?.stSessionId).toBe("u");
    expect(status(r, lower.id)).toBe("belum");
  });

  it("set ≥ 80% → terpenuhi; di bawahnya sebagian dengan rasio", () => {
    expect(evaluateCompliance([lower], [], [], TODAY, [ses("s1", "2026-01-06", { setsDone: 6 })]).get(lower.id)).toMatchObject({ status: "sebagian", ratio: 0.5 });
  });

  it("aktivitas strength intervals.icu yang sama dengan sesi lokal tidak dihitung dua kali", () => {
    const dup = act("2026-01-06", { category: "strength", type: "WeightTraining", startLocal: "2026-01-06T17:10:00" });
    const r = evaluateCompliance([lower, upper], [dup], [], TODAY, [ses("s1", "2026-01-06")]);
    expect(r.get(lower.id)?.stSessionId).toBe("s1");
    expect(status(r, upper.id)).toBe("belum");
  });

  it("log ★ di tanggal sesi lokal tidak dihitung dua kali; log tanpa sesi terpenuhi; lari tidak memenuhi ST", () => {
    const r = evaluateCompliance([lower, upper], [act("2026-01-05")], ["2026-01-06"], TODAY, [ses("s1", "2026-01-06")]);
    expect(status(r, upper.id)).toBe("belum");
    expect(evaluateCompliance([upper], [], ["2026-01-10"], TODAY).get(upper.id)).toMatchObject({ status: "terpenuhi", logDate: "2026-01-10", actualDate: "2026-01-10" });
  });

  it("sesi yang dimulai dari sesi program diutamakan untuk sesi itu", () => {
    const r = evaluateCompliance([lower, upper], [], [], TODAY, [ses("s1", "2026-01-06", { planSessionId: upper.id })]);
    expect(r.get(upper.id)?.stSessionId).toBe("s1");
  });
});

describe("ringkasan & status minggu", () => {
  const list = [
    sess("lower", "2026-01-05", "st-lower"),
    sess("q", "2026-01-06", "quality", { km: 7, minutes: 45 }),
    sess("easy", "2026-01-08", "easy", { minutes: 40 }),
    sess("long", "2026-01-11", "long", { km: 14 }),
    sess("next", "2026-01-13", "easy", { week: 2 }),
  ];

  it("terpenuhi dari total sesi minggu; long run; minggu sebagian bila ada yang belum", () => {
    const r = evaluateCompliance(list, [hard("2026-01-09"), act("2026-01-10", { distanceKm: 14 })], ["2026-01-07"], TODAY);
    expect(weekSummary(list, r, 1)).toEqual({ week: 1, done: 3, total: 4, status: "sebagian", longRun: { km: 14, status: "terpenuhi" } });
    expect(weekSummary(list, r, 2)).toEqual({ week: 2, done: 0, total: 1, status: "sebagian" });
  });

  it("semua yang tidak dilewati terpenuhi → minggu terpenuhi", () => {
    const withSkip = list.map((s) => (s.id === "easy" ? { ...s, override: { sessionId: "easy", action: "skip" as const, decidedAt: "2026-01-08T00:00:00Z" } } : s));
    const r = evaluateCompliance(withSkip, [hard("2026-01-09"), act("2026-01-10", { distanceKm: 14 })], ["2026-01-07"], TODAY);
    expect(weekSummary(withSkip, r, 1).status).toBe("terpenuhi");
  });
});
