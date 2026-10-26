import { describe, expect, it } from "vitest";
import type { RaceResult } from "@/lib/athlete-settings";
import type { Activity } from "@/lib/intervals/types";
import { RACES, type RaceTarget } from "@/lib/program";
import {
  TIMELINE,
  completedDistance,
  dataMinWeeks,
  hardFloor,
  makeTimeline,
  phaseSummary,
  readiness,
  spacingWarnings,
  standardPeakKm,
  vdotGap,
  weeksBetween,
} from "@/lib/program/timeline";
import { vdot } from "@/lib/run-zones";

// Tanggal & aktivitas fiktif. Mulai Senin 2026-01-05.
const START = "2026-01-05";
const RACES_ALL: RaceTarget[] = ["5k", "10k", "hm", "fm"];
const sundayOfWeek = (w: number) => addDays(START, (w - 1) * 7 + 6);
function addDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
let n = 0;
const run = (date: string, km: number): Activity => ({ id: `a${++n}`, name: "Lari", type: "Run", category: "run", date, distanceKm: km, movingTimeSec: km * 400 });

describe("minggu & batas teknis", () => {
  it("minggu dihitung berbasis Senin, inklusif; Hari H hari apa pun di minggu itu sama", () => {
    expect(weeksBetween(START, "2026-01-11")).toBe(1);
    expect(weeksBetween(START, "2026-03-29")).toBe(12);
    expect(weeksBetween(START, "2026-03-23")).toBe(12);
    expect(weeksBetween("2026-01-07", "2026-03-28")).toBe(12); // mulai Rabu dihitung dari Senin minggunya
  });

  it("di bawah taper + 2 tidak bisa disusun, dengan tanggal paling awal", () => {
    for (const race of RACES_ALL) {
      const t = makeTimeline({ race, startDate: START, completedBefore: false });
      const floor = hardFloor(race);
      expect(floor).toBe(RACES[race].taperWeeks + 2);
      const b = t.bandOf(sundayOfWeek(floor - 1));
      expect(b.band).toBe("blocked");
      expect(b.earliestDate).toBe(addDays(START, (floor - 1) * 7));
      expect(b.reasons[0]).toContain("paling sedikit");
      expect(t.bandOf(sundayOfWeek(floor)).band).not.toBe("blocked");
    }
  });
});

describe("band per jarak (rekomendasi umum, data cukup)", () => {
  // Long run 30 hari setinggi puncak standar: minimum dari data tidak mengalahkan tabel.
  const ctx = (race: RaceTarget, completedBefore = false) => makeTimeline({ race, startDate: START, rawLongestKm: standardPeakKm(race), completedBefore });

  it("batas merah, kuning, hijau, abu-abu sesuai tabel", () => {
    for (const race of RACES_ALL) {
      const r = TIMELINE[race];
      const t = ctx(race);
      const band = (w: number) => t.bandOf(sundayOfWeek(w)).band;
      if (r.min - 1 >= hardFloor(race)) expect(band(r.min - 1)).toBe("red");
      if (r.min < r.rec[0]) expect(band(r.min)).toBe("yellow");
      expect(band(r.rec[0])).toBe("green");
      expect(band(r.rec[1])).toBe("green");
      expect(band(r.max)).toBe("green");
      const grey = t.bandOf(sundayOfWeek(r.max + 3));
      expect(grey.band).toBe("grey");
      expect(grey.preBaseWeeks).toBe(3);
      expect(grey.mainWeeks).toBe(r.max);
    }
  });

  it("FM: sudah pernah menyelesaikan maraton menurunkan minimum 16 → 12", () => {
    expect(ctx("fm").tableMin).toBe(16);
    expect(ctx("fm", true).tableMin).toBe(12);
    expect(ctx("fm").bandOf(sundayOfWeek(13)).band).toBe("red");
    expect(ctx("fm", true).bandOf(sundayOfWeek(13)).band).toBe("yellow");
    expect(ctx("hm", true).tableMin).toBe(10); // toggle hanya berpengaruh untuk FM
  });

  it("panjang standar lama tetap hijau tanpa data (titik awal = long run awal default)", () => {
    for (const race of RACES_ALL) {
      const t = makeTimeline({ race, startDate: START, completedBefore: false });
      expect(t.dataMin.noData).toBe(true);
      expect(t.bandOf(sundayOfWeek(RACES[race].weeks)).band).toBe("green");
    }
  });
});

describe("minimum dari data", () => {
  it("puncak program standar: 5K 8,5 · 10K 10 · HM 18 · FM 25 km", () => {
    expect(RACES_ALL.map(standardPeakKm)).toEqual([8.5, 10, 18, 25]);
  });

  it("long run 0 / 8 km / dekat puncak; minimum efektif = max(tabel, data)", () => {
    expect(dataMinWeeks("fm", 0)).toEqual({ weeks: 16, fromKm: 12, targetKm: 25, noData: true });
    expect(dataMinWeeks("fm", 8).weeks).toBe(24);
    expect(dataMinWeeks("fm", 24).weeks).toBe(5);
    expect(dataMinWeeks("hm", 8).weeks).toBe(17);
    expect(dataMinWeeks("hm", 3).fromKm).toBe(5); // di bawah 5 km dihitung dari 5 km
    const fm8 = makeTimeline({ race: "fm", startDate: START, rawLongestKm: 8, completedBefore: false });
    expect(fm8.effectiveMin).toBe(24);
    const b = fm8.bandOf(sundayOfWeek(14));
    expect(b.band).toBe("red");
    expect(b.reasons[0]).toBe("Long run terjauhmu 8 km. Untuk mencapai long run puncak 25 km dengan kenaikan aman ditambah taper 3 minggu, butuh minimal 24 minggu.");
    const near = makeTimeline({ race: "hm", startDate: START, rawLongestKm: 17, completedBefore: false });
    expect(near.effectiveMin).toBe(10); // data lebih pendek dari tabel → tabel
  });

  it("alasan tanpa em dash atau tanda seru", () => {
    for (const race of RACES_ALL) {
      const t = makeTimeline({ race, startDate: START, rawLongestKm: 6, completedBefore: false });
      for (let w = 1; w <= 30; w++) for (const r of t.bandOf(sundayOfWeek(w)).reasons) expect(r).not.toMatch(/—|!/);
    }
  });
});

describe("ringkasan fase", () => {
  it("fase kosong tidak ditulis; pre-Base di depan", () => {
    expect(phaseSummary("hm", 12)).toBe("Base 4 · Build 4 · Peak 2 · Taper 2 minggu");
    expect(phaseSummary("hm", 6)).toBe("Build 2 · Peak 2 · Taper 2 minggu");
    expect(phaseSummary("hm", 20, 4)).toBe("Pre-Base 4 · Base 7 · Build 6 · Peak 5 · Taper 2 minggu");
  });
});

describe("kesiapan, pengalaman, jarak antar lomba", () => {
  const TODAY = "2026-03-01";
  // Tiap minggu: satu long run + lari pendek 4 km sampai total mingguan.
  const weekly = (kmPerWeek: number, longest: number) =>
    [0, 7, 14, 21].flatMap((d) => [run(addDays(TODAY, -d - 1), longest), ...Array.from({ length: (kmPerWeek - longest) / 4 }, (_, i) => run(addDays(TODAY, -d - 2 - i), 4))]);

  it("HM: rata-rata ≥ 25 km dan terjauh ≥ 10 km", () => {
    const ok = readiness("hm", weekly(27, 11), [], TODAY);
    expect(ok.checks.map((c) => c.met)).toEqual([true, true]);
    expect(ok.notes).toEqual([]);
    const no = readiness("hm", weekly(21, 9), [], TODAY);
    expect(no.checks.map((c) => c.met)).toEqual([false, false]);
    expect(no.notes[0]).toContain("pre-Base");
  });

  it("FM: ≥ 24 km & ≥ 10 km; catatan satu tahun lari rutin bila belum pernah HM/FM", () => {
    const first = readiness("fm", weekly(28, 12), [], TODAY);
    expect(first.checks.every((c) => c.met)).toBe(true);
    expect(first.notes).toEqual(["Sebelum maraton pertama, umumnya disarankan sekitar satu tahun lari rutin."]);
    const veteran = readiness("fm", weekly(28, 12), [{ distance: "hm", seconds: 7200, date: "2025-10-01" }], TODAY);
    expect(veteran.notes).toEqual([]);
  });

  it("5K/10K tanpa syarat; data kosong aman", () => {
    expect(readiness("5k", [], [], TODAY)).toEqual({ checks: [], notes: [] });
    expect(readiness("10k", [], [], TODAY).checks).toEqual([]);
    expect(readiness("hm", [], [], TODAY).checks.map((c) => c.value)).toEqual(["0 km", "0 km"]);
    expect(makeTimeline({ race: "fm", startDate: START, rawLongestKm: undefined, completedBefore: false }).dataMin.noData).toBe(true);
  });

  it("pernah menyelesaikan jarak: hasil lomba atau lari ≥ 90% jarak", () => {
    expect(completedDistance("hm", [], [run("2026-01-01", 19)])).toBe(true);
    expect(completedDistance("hm", [], [run("2026-01-01", 18.9)])).toBe(false);
    expect(completedDistance("fm", [{ distance: "fm", seconds: 16000, date: "2025-01-01" }], [])).toBe(true);
  });

  it("jarak antar lomba hanya untuk FM sebelumnya", () => {
    const fm = (date: string): RaceResult => ({ distance: "fm", seconds: 16000, date });
    expect(spacingWarnings("hm", [{ distance: "hm", seconds: 7000, date: "2026-01-01" }], START, "2026-03-29")).toEqual([]);
    const soon = spacingWarnings("hm", [fm("2025-12-28")], START, "2026-03-29");
    expect(soon).toHaveLength(1);
    expect(soon[0]).toContain("kurang dari 2 minggu sebelum program mulai");
    const fmAgain = spacingWarnings("fm", [fm("2025-12-01")], START, "2026-02-15");
    expect(fmAgain).toHaveLength(1);
    expect(fmAgain[0]).toContain("kurang dari 12 minggu");
    expect(spacingWarnings("fm", [fm("2025-10-01")], START, "2026-03-29")).toEqual([]);
    expect(spacingWarnings("fm", [fm("2026-04-05")], START, "2026-03-29")).toEqual([]); // lomba setelah Hari H diabaikan
  });

  it("selisih VDOT: informasi saja", () => {
    expect(vdotGap("hm", 7200, 40)).toEqual({ required: vdot(21097.5, 7200), current: 40 });
    expect(vdotGap("hm", 7200, undefined)).toEqual({ required: vdot(21097.5, 7200) });
  });
});
