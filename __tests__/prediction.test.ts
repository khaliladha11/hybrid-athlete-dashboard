import { describe, expect, it } from "vitest";
import type { RaceResult } from "@/lib/athlete-settings";
import type { Activity } from "@/lib/intervals/types";
import { activitySource, predictRaces, raceSource, riegel, targetGap, zoneOffer } from "@/lib/program/prediction";
import { parseRange, timeForVdot, vdot, zoneVdot } from "@/lib/run-zones";

// Hasil lomba & aktivitas fiktif.
const TODAY = "2026-04-15";
let n = 0;
const act = (date: string, km: number, sec: number, extra: Partial<Activity> = {}): Activity => ({
  id: `a${++n}`,
  name: "Lari pagi",
  type: "Run",
  category: "run",
  date,
  startLocal: `${date}T06:00:00`,
  distanceKm: km,
  movingTimeSec: sec,
  avgHr: 145,
  ...extra,
});
const race = (distance: RaceResult["distance"], seconds: number, date: string): RaceResult => ({ distance, seconds, date });
const byKey = (p: NonNullable<ReturnType<typeof predictRaces>>, k: string) => p.distances.find((d) => d.distance === k)!;

describe("sumber prediksi (§4.6)", () => {
  it("hasil lomba 90 hari mengalahkan lari latihan walau VDOT latihan lebih tinggi", () => {
    const p = predictRaces({ raceResults: [race("10k", 3300, "2026-03-01")], activities: [act("2026-04-10", 5, 1350)], today: TODAY })!;
    expect(p.source.kind).toBe("race");
    expect(p.confidence).toBe("tinggi");
    expect(p.vdot).toBeCloseTo(vdot(10000, 3300), 6);
  });

  it("hasil lomba lebih dari 90 hari diabaikan; tanpa sumber apa pun → null", () => {
    const old = race("10k", 3300, "2026-01-15"); // 90 hari sebelum TODAY
    expect(raceSource([old], TODAY)).toBeNull();
    expect(raceSource([race("10k", 3300, "2026-01-16")], TODAY)?.kind).toBe("race");
    const p = predictRaces({ raceResults: [old], activities: [act("2026-04-01", 8, 2880)], today: TODAY })!;
    expect(p.source.kind).toBe("activity");
    expect(p.confidence).toBe("rendah");
    expect(predictRaces({ raceResults: [old], activities: [], today: TODAY })).toBeNull();
  });

  it("beberapa hasil lomba: yang terbaru dipakai, bukan yang tercepat", () => {
    const s = raceSource([race("5k", 1400, "2026-02-01"), race("10k", 3400, "2026-04-01")], TODAY)!;
    expect(s.kind === "race" && s.distance).toBe("10k");
  });

  it("lari latihan: < 3 km, bukan lari, kosong, pace tidak wajar, dan setelah hari ini diabaikan; VDOT tertinggi dipakai", () => {
    const best = act("2026-04-02", 8, 2700, { name: "Tempo" });
    const list = [
      act("2026-04-01", 2.5, 600), // < 3 km
      act("2026-04-03", 6, 1500, { category: "walk", type: "Walk" }),
      act("2026-04-04", 0, 0, { avgHr: undefined, source: "STRAVA" }), // salinan Strava kosong
      act("2026-04-05", 10, 900), // pace 1:30/km (data rusak)
      act("2026-04-20", 10, 2400), // setelah hari ini
      act("2026-04-06", 6, 2400),
      best,
    ];
    const s = activitySource(list, TODAY)!;
    expect(s.kind === "activity" && s.activityId).toBe(best.id);
  });
});

describe("waktu per jarak, keyakinan, Riegel", () => {
  it("waktu = kebalikan VDOT; jarak sumber kembali ke waktunya sendiri", () => {
    const p = predictRaces({ raceResults: [race("10k", 3300, "2026-04-01")], activities: [act("2026-04-10", 14, 5400)], today: TODAY })!;
    expect(Math.abs(byKey(p, "10k").seconds - 3300)).toBeLessThanOrEqual(1);
    expect(byKey(p, "hm").seconds).toBe(Math.round(timeForVdot(21097.5, p.vdot)));
    expect(p.distances.map((d) => d.distance)).toEqual(["5k", "10k", "hm", "fm"]);
  });

  it("FM maksimal rendah bila long run terjauh 30 hari < 12 km; jarak lain tetap", () => {
    const results = [race("hm", 7000, "2026-03-20")];
    const longOk = predictRaces({ raceResults: results, activities: [act("2026-04-12", 16, 6600)], today: TODAY })!;
    expect(byKey(longOk, "fm").confidence).toBe("tinggi");
    expect(longOk.fmLimited).toBe(false);
    const short = predictRaces({ raceResults: results, activities: [act("2026-04-12", 10, 3900), act("2026-03-10", 20, 8400)], today: TODAY })!;
    expect(short.longestRunKm).toBe(10);
    expect(short.fmLimited).toBe(true);
    expect(byKey(short, "fm").confidence).toBe("rendah");
    expect(byKey(short, "hm").confidence).toBe("tinggi");
    expect(predictRaces({ raceResults: results, activities: [], today: TODAY })!.fmLimited).toBe(true);
  });

  it("Riegel pembanding: T2 = T1 × (D2/D1)^1.06", () => {
    expect(riegel(3000, 10000, 21097.5)).toBeCloseTo(3000 * Math.pow(2.10975, 1.06), 6);
    const p = predictRaces({ raceResults: [race("10k", 3000, "2026-04-01")], activities: [], today: TODAY })!;
    expect(byKey(p, "fm").riegelSeconds).toBe(Math.round(riegel(3000, 10000, 42195)));
    // Dua rumus berbeda, angka berdekatan untuk performa yang sama.
    expect(Math.abs(byKey(p, "fm").riegelSeconds - byKey(p, "fm").seconds) / byKey(p, "fm").seconds).toBeLessThan(0.03);
  });

  it("selisih terhadap target: di jalur, atau detik/km yang dibutuhkan (dibulatkan ke atas)", () => {
    expect(targetGap(7100, 7200, 21097.5)).toEqual({ onTrack: true });
    expect(targetGap(7200, 7200, 21097.5)).toEqual({ onTrack: true });
    expect(targetGap(7200 + 253, 7200, 21097.5)).toEqual({ onTrack: false, secPerKm: 12 });
  });
});

describe("saran update zona (§4.7)", () => {
  const zv = zoneVdot(parseRange("6:24–6:42/km")!); // ±30
  const at = (v: number, distance: RaceResult["distance"], date: string) => race(distance, Math.round(timeForVdot(distance === "5k" ? 5000 : 10000, v)), date);

  it("satu hasil saja tidak memicu; dua hasil < 14 hari tidak; ≥ 14 hari memicu dengan hasil terbaru", () => {
    expect(zoneOffer({ raceResults: [at(32, "5k", "2026-04-01")], zoneVdot: zv, today: TODAY })).toBeNull();
    expect(zoneOffer({ raceResults: [at(32, "5k", "2026-04-01"), at(32.5, "10k", "2026-03-20")], zoneVdot: zv, today: TODAY })).toBeNull();
    const o = zoneOffer({ raceResults: [at(32, "5k", "2026-04-01"), at(31.5, "10k", "2026-03-18")], zoneVdot: zv, today: TODAY })!;
    expect(o.result.date).toBe("2026-04-01");
    expect(o.vdot).toBeCloseTo(32, 1);
  });

  it("hasil di bawah VDOT zona + 1 tidak dihitung; di luar 90 hari tidak dihitung", () => {
    expect(zoneOffer({ raceResults: [at(32, "5k", "2026-04-01"), at(30.5, "10k", "2026-03-10")], zoneVdot: zv, today: TODAY })).toBeNull();
    expect(zoneOffer({ raceResults: [at(32, "5k", "2026-04-01"), at(32, "10k", "2026-01-10")], zoneVdot: zv, today: TODAY })).toBeNull();
  });

  it("ditolak → tidak ditawarkan lagi sampai VDOT naik ≥ 1 lagi; tanpa VDOT zona → tidak ada tawaran", () => {
    const base = [at(32, "5k", "2026-03-01"), at(32, "10k", "2026-03-20")];
    expect(zoneOffer({ raceResults: base, zoneVdot: zv, dismissedVdot: 32, today: TODAY })).toBeNull();
    expect(zoneOffer({ raceResults: [at(32.6, "5k", "2026-04-10"), ...base], zoneVdot: zv, dismissedVdot: 32, today: TODAY })).toBeNull();
    expect(zoneOffer({ raceResults: [at(33.1, "5k", "2026-04-10"), ...base], zoneVdot: zv, dismissedVdot: 32, today: TODAY })?.result.date).toBe("2026-04-10");
    expect(zoneOffer({ raceResults: base, zoneVdot: undefined, today: TODAY })).toBeNull();
  });
});
