import { describe, expect, it } from "vitest";
import {
  isHardRun,
  isLegStrength,
  readinessAdvice,
  sameDayAdvice,
  todayDone,
  withStSessions,
  suggestFor,
  weekStats,
  weeklyAdvice,
  type Advice,
} from "@/lib/coach";
import { addDays } from "@/lib/date";
import type { Activity } from "@/lib/intervals/types";
import { mockActivities } from "@/lib/mock-data";
import type { StSession } from "@/lib/st-session";

const TODAY = "2026-09-28";
let n = 0;
const run = (daysAgo: number, km: number, extra: Partial<Activity> = {}): Activity => ({
  id: `r${n++}`,
  name: "Easy Run",
  type: "Run",
  category: "run",
  date: addDays(TODAY, -daysAgo),
  distanceKm: km,
  movingTimeSec: km * 480,
  avgHr: 138,
  ...extra,
});
const st = (daysAgo: number, name: string): Activity => ({
  id: `s${n++}`,
  name,
  type: "WeightTraining",
  category: "strength",
  date: addDays(TODAY, -daysAgo),
});
const ids = (a: Advice[]) => a.map((x) => x.id);

describe("klasifikasi aktivitas", () => {
  it("lari berat: nama, HR ≥ 155, atau pace ≤ 6:30 tanpa HR", () => {
    expect(isHardRun(run(0, 5, { name: "Tempo 2×10'" }))).toBe(true);
    expect(isHardRun(run(0, 5, { name: "Norwegian 4×4" }))).toBe(true);
    expect(isHardRun(run(0, 5, { avgHr: 158 }))).toBe(true);
    expect(isHardRun(run(0, 5, { avgHr: 150 }))).toBe(false);
    expect(isHardRun(run(0, 5, { avgHr: undefined, avgPaceSecPerKm: 380 }))).toBe(true);
    expect(isHardRun(run(0, 5, { avgHr: undefined, avgPaceSecPerKm: 500 }))).toBe(false);
    expect(isHardRun(st(0, "Tempo ST"))).toBe(false);
  });

  it("ST kaki dikenali dari nama", () => {
    expect(isLegStrength(st(0, "Lower Body ST"))).toBe(true);
    expect(isLegStrength(st(0, "Full Body ST"))).toBe(true);
    expect(isLegStrength(st(0, "Upper Push ST"))).toBe(false);
  });
});

describe("80/20 (Seiler)", () => {
  it("≥ 2 lari berat dalam 7 hari → sarankan Easy", () => {
    const acts = [run(1, 6, { avgHr: 160 }), run(3, 5), run(5, 7, { name: "Interval 6×800" })];
    const a = weeklyAdvice(acts, TODAY);
    expect(ids(a)).toContain("polarized");
    expect(suggestFor(a, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("easy");
  });

  it("1 lari berat → tidak ada saran", () => {
    expect(ids(weeklyAdvice([run(2, 6, { avgHr: 160 }), run(4, 5)], TODAY))).not.toContain("polarized");
  });

  it("lari berat > 7 hari lalu tidak dihitung", () => {
    expect(weekStats([run(8, 6, { avgHr: 160 }), run(9, 6, { avgHr: 160 })], TODAY).hardRuns7).toBe(0);
  });
});

describe("progresi jarak (Nielsen 2014)", () => {
  it("naik > 30% → peringatan + sarankan 30'", () => {
    const acts = [run(1, 10), run(3, 8), run(9, 7), run(11, 6)]; // 18 vs 13 km = +38%
    const s = weekStats(acts, TODAY);
    expect(s.runKm7).toBe(18);
    expect(s.runKmPrev7).toBe(13);
    expect(s.kmChange).toBeCloseTo(18 / 13 - 1);
    const a = weeklyAdvice(acts, TODAY);
    expect(ids(a)).toContain("volume");
    expect(a.find((x) => x.id === "volume")!.message).toMatch(/38%/);
    expect(suggestFor(a, "run", { difficulty: "easy", duration: 60 }).duration).toBe(30);
    expect(suggestFor(a, "run", { difficulty: "easy", duration: 30 }).duration).toBeUndefined();
  });

  it("naik ≤ 30% aman; basis < 5 km diabaikan", () => {
    expect(ids(weeklyAdvice([run(1, 12), run(9, 10)], TODAY))).not.toContain("volume");
    expect(weekStats([run(1, 10), run(9, 3)], TODAY).kmChange).toBeUndefined();
  });

  it("sisa ruang aman dihitung dari 130% minggu lalu", () => {
    const acts = [run(1, 10), run(9, 7), run(10, 3)]; // 10 vs 10: aman
    expect(weekStats(acts, TODAY).safeKmCap).toBeCloseTo(13);
  });
});

describe("concurrent training (Wilson 2012)", () => {
  it("setelah ST kaki kemarin → lari maksimal Moderate", () => {
    const a = weeklyAdvice([st(1, "Lower Body ST")], TODAY);
    expect(ids(a)).toEqual(["after-leg-st"]);
    expect(suggestFor(a, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("moderate");
    expect(suggestFor(a, "run", { difficulty: "easy", duration: 45 })).toEqual({});
    expect(suggestFor(a, "strength", { difficulty: "high", duration: 45, type: "lower" })).toEqual({});
  });

  it("setelah long run / lari berat → ST sarankan Upper", () => {
    const a = weeklyAdvice([run(1, 14)], TODAY);
    expect(ids(a)).toContain("after-hard-run");
    expect(suggestFor(a, "strength", { difficulty: "moderate", duration: 45, type: "lower" }).type).toBe("upperPull");
    expect(suggestFor(a, "strength", { difficulty: "moderate", duration: 45, type: "upperPush" }).type).toBeUndefined();
  });

  it("aktivitas 2 hari lalu tidak memicu saran concurrent", () => {
    expect(weeklyAdvice([st(2, "Lower Body ST"), run(2, 14)], TODAY)).toEqual([]);
  });
});

describe("gabungan dengan readiness", () => {
  it("readiness turun satu level; dikombinasikan dengan batas lain ambil yang paling ringan", () => {
    const r = readinessAdvice({ caution: true, reasons: ["HRV turun"], hasData: true, basis: "" });
    expect(suggestFor(r, "strength", { difficulty: "high", duration: 45, type: "upperPush" }).difficulty).toBe("moderate");
    const combined = [...r, ...weeklyAdvice([st(1, "Lower Body ST")], TODAY)];
    expect(suggestFor(combined, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("moderate");
    expect(readinessAdvice(null)).toEqual([]);
    expect(readinessAdvice({ caution: false, reasons: [], hasData: true, basis: "" })).toEqual([]);
  });

  it("data demo: +53% km dan long run kemarin terdeteksi, 80/20 aman", () => {
    const acts = mockActivities(TODAY);
    const a = weeklyAdvice(acts, TODAY);
    expect(ids(a).sort()).toEqual(["after-hard-run", "volume"]);
    expect(weekStats(acts, TODAY).hardRuns7).toBe(1);
  });
});

describe("saran relatif tidak berantai", () => {
  it("ignoreLowerBy: setelah diterapkan, readiness tidak menurunkan lagi; batas absolut tetap berlaku", () => {
    const r = readinessAdvice({ caution: true, reasons: ["HRV turun"], hasData: true, basis: "" });
    expect(suggestFor(r, "run", { difficulty: "moderate", duration: 45 }, { ignoreLowerBy: true })).toEqual({});
    const withPolarized: Advice[] = [...r, { id: "polarized", targets: ["run"], title: "", message: "", maxDifficulty: "easy" }];
    expect(suggestFor(withPolarized, "run", { difficulty: "moderate", duration: 45 }, { ignoreLowerBy: true }).difficulty).toBe("easy");
  });
});

describe("saran terhadap rencana hari ini (0.13.1, PROGRAM-HIDUP §4.5)", () => {
  const readiness: Advice = { id: "readiness", targets: ["run", "strength"], title: "HRV di bawah rata-rata", message: "x", lowerBy: 1 };
  const polarized: Advice = { id: "polarized", targets: ["run"], title: "3 lari berat", message: "x", maxDifficulty: "easy" };
  const volume: Advice = { id: "volume", targets: ["run"], title: "Jarak naik 40%", message: "x", maxDuration: 30 };
  const legSt: Advice = { id: "after-leg-st", targets: ["run"], title: "Kemarin ST kaki", message: "x", maxDifficulty: "moderate" };
  const quality = { kind: "quality" as const, difficulty: "moderate" as const, duration: 45 as const };
  const high = { kind: "quality" as const, difficulty: "high" as const, duration: 45 as const };
  const long = { kind: "long" as const, difficulty: "easy" as const, km: 14, prevLongKm: 12 };
  const cur = { difficulty: "moderate" as const, duration: 45 as const };

  it("readiness rendah + quality → turun satu level, durasi sama", () => {
    expect(suggestFor([readiness], "run", cur, { plan: quality })).toEqual({ difficulty: "easy" });
    expect(suggestFor([readiness], "run", { difficulty: "high", duration: 45 }, { plan: high })).toEqual({ difficulty: "moderate" });
  });

  it("80/20 terlampaui + quality → Easy; batas lain yang ada tetap berlaku terhadap rencana", () => {
    expect(suggestFor([polarized], "run", { difficulty: "high", duration: 45 }, { plan: high })).toEqual({ difficulty: "easy" });
    expect(suggestFor([legSt], "run", { difficulty: "high", duration: 45 }, { plan: high })).toEqual({ difficulty: "moderate" });
    expect(suggestFor([volume], "run", cur, { plan: quality })).toEqual({ duration: 30 });
  });

  it("readiness rendah + long run → ±75% jarak, pace easy; kenaikan km > 30% → tahan jarak minggu lalu", () => {
    expect(suggestFor([readiness], "run", cur, { plan: long })).toEqual({ longRunKm: 10.5, longRunEasy: true });
    expect(suggestFor([volume], "run", cur, { plan: long })).toEqual({ longRunKm: 12 });
    // Keduanya: ambil yang lebih pendek.
    expect(suggestFor([readiness, volume], "run", cur, { plan: { ...long, prevLongKm: 9 } })).toEqual({ longRunKm: 9, longRunEasy: true });
    // Minggu lalu lebih panjang (cutback minggu ini) → tidak ditahan.
    expect(suggestFor([volume], "run", cur, { plan: { ...long, prevLongKm: 16 } })).toEqual({});
  });

  it("hanya menurunkan: rencana easy + readiness → tidak ada saran; lomba tidak pernah diturunkan", () => {
    expect(suggestFor([readiness], "run", { difficulty: "easy", duration: 45 }, { plan: { kind: "easy", difficulty: "easy", duration: 45 } })).toEqual({});
    expect(suggestFor([readiness, volume, polarized], "run", cur, { plan: { kind: "race", difficulty: "high", km: 21.1 } })).toEqual({});
  });

  it("tidak berantai: basis rencana, jadi setelah diturunkan saran tetap sama", () => {
    const first = suggestFor([readiness], "run", cur, { plan: quality });
    const afterApply = suggestFor([readiness], "run", { difficulty: first.difficulty!, duration: 45 }, { plan: quality });
    expect(afterApply).toEqual(first);
    // ignoreLowerBy tidak relevan untuk saran berbasis rencana.
    expect(suggestFor([readiness], "run", { difficulty: "easy", duration: 45 }, { plan: quality, ignoreLowerBy: true })).toEqual(first);
  });

  it("tanpa rencana perilaku lama identik; target strength mengabaikan rencana", () => {
    const sets = [[readiness], [polarized], [volume], [legSt], [readiness, polarized, volume, legSt]];
    for (const advice of sets) {
      for (const difficulty of ["easy", "moderate", "high"] as const) {
        for (const duration of [30, 45, 60] as const) {
          for (const ignoreLowerBy of [false, true]) {
            const a = suggestFor(advice, "run", { difficulty, duration }, { ignoreLowerBy });
            expect(suggestFor(advice, "run", { difficulty, duration }, { ignoreLowerBy, plan: undefined })).toEqual(a);
          }
        }
      }
    }
    expect(suggestFor([readiness], "strength", { difficulty: "high", duration: 45, type: "lower" }, { plan: quality })).toEqual({ difficulty: "moderate" });
  });
});

// Sesi mode latihan fiktif (0.14.1).
const ses = (daysAgo: number, over: Partial<StSession> = {}): StSession => ({
  id: `ses${n++}`,
  date: addDays(TODAY, -daysAgo),
  startedAt: `${addDays(TODAY, -daysAgo)}T10:00:00.000Z`,
  type: "lower",
  title: "Lower · Moderate 45'",
  difficulty: "moderate",
  durationMin: 45,
  rpe: 6,
  setsDone: 12,
  setsPlanned: 12,
  movements: [],
  updatedAt: `${addDays(TODAY, -daysAgo)}T11:00:00.000Z`,
  ...over,
});

describe("ST di beban 7 hari (0.14.1)", () => {
  it("sesi lokal masuk jumlah, menit, dan beban AU; aktivitas tanpa pasangan dihitung tanpa AU", () => {
    const s = weekStats([{ ...st(4, "Weight Training"), movingTimeSec: 1800 }], TODAY, [ses(1), ses(3, { type: "upperPush", rpe: 5, durationMin: 30 })]);
    expect(s).toMatchObject({ st7: 3, stMin7: 105, stLoad7: 270 + 150, stNoRpe7: 1 });
  });

  it("sesi lokal dan aktivitas intervals.icu yang sama tidak dihitung dobel", () => {
    const dup: Activity = { ...st(1, "Weight Training"), startLocal: `${addDays(TODAY, -1)}T17:20:00`, movingTimeSec: 2700 };
    expect(weekStats([dup], TODAY, [ses(1)])).toMatchObject({ st7: 1, stMin7: 45, stLoad7: 270, stNoRpe7: 0 });
  });

  it("di luar 7 hari dan sesi terhapus tidak dihitung; tanpa sesi = hanya aktivitas", () => {
    expect(weekStats([], TODAY, [ses(7), ses(1, { deletedAt: "2026-09-28T00:00:00.000Z" })]).st7).toBe(0);
    expect(weekStats([st(2, "Upper")], TODAY)).toMatchObject({ st7: 1, stLoad7: 0, stNoRpe7: 1 });
  });

  it("ST kaki dari sesi mode latihan juga memicu batas lari Moderate (aturan concurrent tetap)", () => {
    const a = weeklyAdvice([], TODAY, [ses(1)]);
    expect(a.find((x) => x.id === "after-leg-st")).toMatchObject({ title: "Kemarin ST kaki", maxDifficulty: "moderate" });
    expect(ids(weeklyAdvice([], TODAY, [ses(0, { type: "upperPull" })]))).not.toContain("after-leg-st");
    expect(ids(weeklyAdvice([], TODAY, [ses(2)]))).not.toContain("after-leg-st");
    // Aturan lama dari nama aktivitas tetap.
    expect(ids(weeklyAdvice([st(0, "ST Lower")], TODAY))).toContain("after-leg-st");
  });
});

describe("aturan hari yang sama (D5, Schumann 2022)", () => {
  it("lari dan ST hari ini → sarankan jeda ≥ 3 jam, non-blokir", () => {
    const a = sameDayAdvice({ activities: [run(0, 5)], plannedToday: { run: false, strength: true }, today: TODAY });
    expect(a).toMatchObject({ id: "same-day", targets: ["run", "strength"] });
    expect(a?.message).toBe("Hari ini ada lari dan ST. Beri jeda minimal 3 jam di antaranya supaya adaptasi kekuatan tidak terganggu.");
    expect(a?.maxDifficulty).toBeUndefined();
    expect(a?.lowerBy).toBeUndefined();
  });

  it("sumber: sesi program, sesi lokal, atau generator yang dibuka", () => {
    expect(sameDayAdvice({ activities: [], plannedToday: { run: true, strength: true }, today: TODAY })).not.toBeNull();
    expect(sameDayAdvice({ activities: [], sessions: [ses(0)], current: "run", today: TODAY })).not.toBeNull();
    expect(sameDayAdvice({ activities: [run(0, 5)], current: "strength", today: TODAY })).not.toBeNull();
  });

  it("hanya satu jenis, hari lain, atau keduanya sudah tercatat → tidak muncul", () => {
    expect(sameDayAdvice({ activities: [run(0, 5)], today: TODAY })).toBeNull();
    expect(sameDayAdvice({ activities: [run(1, 5)], current: "strength", today: TODAY })).toBeNull();
    expect(sameDayAdvice({ activities: [run(0, 5), st(0, "Upper")], current: "strength", today: TODAY })).toBeNull();
  });
});

describe("saran server + sesi perangkat (0.14.1)", () => {
  it("ST kaki lokal menambah after-leg-st bila belum ada, tanpa dobel", () => {
    const a = withStSessions([], { sessions: [ses(0)], today: TODAY });
    expect(ids(a)).toEqual(["after-leg-st"]);
    const server = weeklyAdvice([st(0, "ST Lower")], TODAY);
    expect(ids(withStSessions(server, { sessions: [ses(0)], today: TODAY })).filter((x) => x === "after-leg-st")).toHaveLength(1);
  });

  it("hari yang sama dari ringkasan server (tanpa daftar aktivitas) dan generator yang dibuka", () => {
    expect(ids(withStSessions([], { sessions: [], today: TODAY, done: { run: true, strength: false }, current: "strength" }))).toEqual(["same-day"]);
    expect(ids(withStSessions([], { sessions: [], today: TODAY, done: { run: true, strength: true }, current: "strength" }))).toEqual([]);
    expect(todayDone([run(0, 5), st(1, "Upper")], TODAY)).toEqual({ run: true, strength: false });
  });
});
