import { describe, expect, it } from "vitest";
import { dedupeActivities } from "@/lib/intervals/dedupe";
import { normalizeActivity, normalizeList } from "@/lib/intervals/normalize";
import type { Activity } from "@/lib/intervals/types";
import type { StSession } from "@/lib/st-session";
import { columnShowsKm, daySegments, hmm, prime, shortDuration, summaryColumns, trainingWeek, trainingWeeks } from "@/lib/weekly/training-week";

// Data fiktif. Minggu Senin 2 Maret sampai Minggu 8 Maret 2026.
const TODAY = "2026-03-05";
let n = 0;
const act = (type: string, date: string, min: number, over: Partial<Activity> = {}): Activity => {
  const a = normalizeActivity({ id: `a${++n}`, type, start_date_local: `${date}T06:00:00`, moving_time: min * 60, ...(over as object) });
  return { ...a!, ...over };
};
const ses = (date: string, durationMin: number, over: Partial<StSession> = {}): StSession => ({
  id: `s-${date}-${durationMin}`,
  date,
  startedAt: `${date}T12:00:00.000Z`, // 19:00 WIB
  type: "lower",
  title: "Lower",
  difficulty: "moderate",
  durationMin,
  rpe: 6,
  setsDone: 12,
  setsPlanned: 12,
  movements: [],
  updatedAt: `${date}T13:00:00.000Z`,
  ...over,
});

/** Minggu seperti acuan: lari 3×, sepeda outdoor + trainer, strength 3×. */
function referenceWeek() {
  const acts = [
    act("WeightTraining", "2026-03-02", 45, { startLocal: "2026-03-02T19:00:00" }),
    act("Run", "2026-03-03", 40, { distanceKm: 6.2 }),
    act("VirtualRide", "2026-03-04", 45),
    act("Run", "2026-03-05", 38, { distanceKm: 4.4 }),
    act("Run", "2026-03-07", 64, { distanceKm: 4 }),
    act("Ride", "2026-03-07", 41, { distanceKm: 18.4 }),
  ];
  const st = [ses("2026-03-03", 34), ses("2026-03-07", 45), ses("2026-03-02", 45, { startedAt: "2026-03-02T12:05:00.000Z" })];
  return trainingWeek(acts, st, TODAY);
}

describe("trainingWeek", () => {
  it("minggu acuan: total, sesi, kategori, indoor", () => {
    const w = referenceWeek();
    expect([w.from, w.to]).toEqual(["2026-03-02", "2026-03-08"]);
    // ST Senin lokal dan WeightTraining Senin satu sesi (selisih 5 menit) → strength 3, bukan 4.
    expect(w.sessions).toBe(8);
    expect(w.sports.strength).toMatchObject({ sessions: 3, minutes: 124, indoorMinutes: 124 });
    expect(w.sports.run).toMatchObject({ sessions: 3, minutes: 142, indoorMinutes: 0 });
    expect(w.sports.run.km).toBeCloseTo(14.6);
    expect(w.sports.ride).toMatchObject({ sessions: 2, minutes: 86, km: 18.4, indoorMinutes: 45, indoorNoDistanceMinutes: 45 });
    expect(hmm(w.minutes)).toBe("5:52");
  });

  it("tumpukan per hari: run, ride, other, strength dari bawah; menit per hari", () => {
    const w = referenceWeek();
    expect(w.days.map((d) => Math.round(d.minutes))).toEqual([45, 74, 45, 38, 0, 150, 0]);
    expect(w.days[5].segments).toEqual([
      { sport: "run", minutes: 64, indoor: false },
      { sport: "ride", minutes: 41, indoor: false },
      { sport: "strength", minutes: 45, indoor: true },
    ]);
    expect(w.days[2].segments).toEqual([{ sport: "ride", minutes: 45, indoor: true }]);
    expect(w.days[4].segments).toEqual([]);
  });

  it("outdoor di bawah indoor untuk olahraga yang sama; other di bawah strength", () => {
    const s = daySegments([
      { sport: "strength", date: "d", minutes: 30, indoor: true },
      { sport: "run", date: "d", minutes: 20, indoor: true },
      { sport: "other", date: "d", minutes: 15, indoor: false },
      { sport: "run", date: "d", minutes: 10, indoor: false },
    ]);
    expect(s.map((x) => `${x.sport}${x.indoor ? "+in" : ""}`)).toEqual(["run", "run+in", "other", "strength+in"]);
  });

  it("dedupe: Huawei + Strava dihitung sekali; salinan kosong dan aktivitas tanpa id dibuang", () => {
    const raw = [
      { id: "h1", type: "Run", start_date_local: "2026-03-03T06:00:00", moving_time: 2400, distance: 6000, source: "HUAWEI" },
      { id: "s1", type: "Run", start_date_local: "2026-03-03T06:00:30", moving_time: 2400, distance: 6000, source: "STRAVA" },
      { id: "s2", start_date_local: "2026-03-04T06:00:00", _note: "STRAVA activities are not available via the API" },
      { type: "Run", start_date_local: "2026-03-05T06:00:00", moving_time: 1800 },
    ];
    const acts = dedupeActivities(normalizeList(raw, normalizeActivity));
    const w = trainingWeek(acts, [], TODAY);
    expect(w.sessions).toBe(1);
    expect(w.sports.run.km).toBe(6);
  });

  it("ST lokal tanpa pasangan dan WeightTraining tanpa pasangan sama-sama dihitung", () => {
    const w = trainingWeek([act("WeightTraining", "2026-03-04", 40, { startLocal: "2026-03-04T06:00:00" })], [ses("2026-03-04", 50)], TODAY);
    // Selisih 13 jam > 2 jam → dua sesi.
    expect(w.sports.strength).toMatchObject({ sessions: 2, minutes: 90 });
  });

  it("walk, hike, swim, yoga masuk other; jarak hanya dari jalan/hike", () => {
    const w = trainingWeek([act("Walk", "2026-03-02", 30, { distanceKm: 2.5 }), act("Swim", "2026-03-03", 40, { distanceKm: 1.2 }), act("Yoga", "2026-03-04", 20)], [], TODAY);
    expect(w.sports.other).toMatchObject({ sessions: 3, minutes: 90, km: 2.5, allWithDistance: false });
  });

  it("minggu kosong; aktivitas di luar minggu diabaikan", () => {
    const w = trainingWeek([act("Run", "2026-03-01", 30, { distanceKm: 5 }), act("Run", "2026-03-09", 30, { distanceKm: 5 })], [], TODAY);
    expect(w).toMatchObject({ minutes: 0, sessions: 0 });
    expect(w.days.every((d) => d.segments.length === 0)).toBe(true);
    expect(summaryColumns(w)).toEqual([]);
  });

  it("trainingWeeks: minggu berurutan sampai minggu ini", () => {
    const ws = trainingWeeks([act("Run", "2026-02-24", 30, { distanceKm: 5 })], [], TODAY, 3);
    expect(ws.map((w) => w.from)).toEqual(["2026-02-16", "2026-02-23", "2026-03-02"]);
    expect(ws.map((w) => w.sessions)).toEqual([0, 1, 0]);
  });
});

describe("kolom ringkasan", () => {
  const week = (types: string[]) =>
    trainingWeek(
      types.map((t) => act(t, "2026-03-03", 30, t === "Run" || t === "Ride" ? { distanceKm: 5 } : {})),
      [],
      TODAY,
    );
  const keys = (types: string[]) => summaryColumns(week(types)).map((c) => (c.merged ? "other+" : c.key));

  it("0 sampai 3 olahraga: sesuai urutan, yang kosong dibuang", () => {
    expect(keys([])).toEqual([]);
    expect(keys(["Run"])).toEqual(["run"]);
    expect(keys(["WeightTraining", "Run"])).toEqual(["run", "strength"]);
    expect(keys(["Yoga", "Ride", "Run"])).toEqual(["run", "ride", "other"]);
  });

  it("4 olahraga: kolom ketiga gabungan strength + other", () => {
    const w = week(["Run", "Ride", "WeightTraining", "Yoga"]);
    const c = summaryColumns(w);
    expect(c.map((x) => x.key)).toEqual(["run", "ride", "other"]);
    expect(c[2]).toMatchObject({ merged: true, totals: { sessions: 2, minutes: 60 } });
    expect(columnShowsKm(c[2])).toBe(false);
  });

  it("km atau waktu: sepeda hanya trainer memakai waktu; other jalan saja memakai km", () => {
    const ride = summaryColumns(trainingWeek([act("VirtualRide", "2026-03-03", 45)], [], TODAY))[0];
    expect(columnShowsKm(ride)).toBe(false);
    const walk = summaryColumns(trainingWeek([act("Walk", "2026-03-03", 45, { distanceKm: 3 })], [], TODAY))[0];
    expect(columnShowsKm(walk)).toBe(true);
    const run = summaryColumns(referenceWeek())[0];
    expect(columnShowsKm(run)).toBe(true);
  });
});

describe("angka", () => {
  it("h:mm, prime, durasi pendek", () => {
    expect(hmm(352)).toBe("5:52");
    expect(hmm(45)).toBe("0:45");
    expect(hmm(59.6)).toBe("1:00");
    expect(hmm(0)).toBe("0:00");
    expect(prime(150)).toBe("150'");
    expect(shortDuration(45)).toBe("45'");
    expect(shortDuration(70)).toBe("1:10");
  });
});
