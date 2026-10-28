import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/date";
import { normalizeList, normalizeWellness } from "@/lib/intervals/normalize";
import type { Activity, Wellness } from "@/lib/intervals/types";
import { assessReadiness } from "@/lib/readiness";
import { availableSignals, joinId } from "@/lib/wellness-signals";
import fixture from "./fixtures/intervals-wellness.json";

const TODAY = "2026-03-15";
const day = (n: number, over: Partial<Wellness> = {}): Wellness => ({ date: addDays(TODAY, -n), ...over });
// 8 hari data fiktif dengan semua sinyal; hari ini RHR naik.
const full = (over: Partial<Wellness> = {}) =>
  Array.from({ length: 8 }, (_, i) => day(7 - i, { hrv: 60, restingHr: 55, sleepSecs: 25000, ctl: 40, atl: 42, ...(i === 7 ? over : {}) }));

describe("bentuk respons wellness intervals.icu", () => {
  it("hrv (rMSSD) dulu, lalu hrvSDNN; null dibaca tidak ada", () => {
    const w = normalizeList(fixture, normalizeWellness);
    expect(w.map((x) => [x.date, x.hrv, x.restingHr, x.sleepSecs])).toEqual([
      ["2026-03-01", undefined, 57, 24600],
      ["2026-03-02", 46, 58, undefined],
      ["2026-03-03", 52.5, undefined, 26100],
    ]);
    expect(w[0]).toMatchObject({ ctl: 38.2, atl: 41.5 });
  });
});

describe("sinyal tidak tersedia (14 hari)", () => {
  it("setiap sinyal: ada nilai dalam 14 hari → tersedia; hanya lebih lama → tidak", () => {
    const old = [day(14, { hrv: 50, restingHr: 55, sleepSecs: 20000, ctl: 30 })];
    expect([...availableSignals(old, TODAY)]).toEqual([]);
    const recent = [day(13, { hrv: 50 }), day(3, { restingHr: 55 }), day(0, { sleepSecs: 20000 }), day(5, { atl: 30 })];
    expect([...availableSignals(recent, TODAY)].sort()).toEqual(["hrv", "load", "restingHr", "sleep"]);
    expect([...availableSignals([day(1, { restingHr: 55, ctl: 40 })], TODAY)].sort()).toEqual(["load", "restingHr"]);
  });

  it("gabungan kata Indonesia", () => {
    expect(joinId(["a"])).toBe("a");
    expect(joinId(["a", "b"])).toBe("a dan b");
    expect(joinId(["a", "b", "c"])).toBe("a, b, dan c");
  });
});

describe("readiness dengan sebagian sinyal", () => {
  const acts: Activity[] = [];

  it("semua sinyal: HRV & resting HR dipakai dan disebut", () => {
    const r = assessReadiness(full({ restingHr: 62 }), acts, TODAY);
    expect(r.basis).toBe("Kesiapan dihitung dari HRV, resting HR, dan sesi kemarin.");
    expect(r.reasons.some((x) => x.startsWith("Resting HR"))).toBe(true);
  });

  it("tanpa HRV (jam tidak mengirim): aturan HRV dilewati, basis hanya resting HR", () => {
    const w = full({ restingHr: 62 }).map(({ hrv: _h, ...x }) => x);
    const r = assessReadiness(w, acts, TODAY);
    expect(r.basis).toBe("Kesiapan dihitung dari resting HR dan sesi kemarin.");
    expect(r.reasons.some((x) => x.startsWith("HRV"))).toBe(false);
    expect(r.caution).toBe(true);
  });

  it("tanpa resting HR: hanya HRV", () => {
    const w = full({ hrv: 40 }).map(({ restingHr: _r, ...x }) => x);
    const r = assessReadiness(w, acts, TODAY);
    expect(r.basis).toBe("Kesiapan dihitung dari HRV dan sesi kemarin.");
    expect(r.reasons[0]).toMatch(/^HRV 40 ms/);
  });

  it("tanpa sinyal apa pun: bilang begitu, tetap memakai sesi kemarin", () => {
    const long: Activity = { id: "l1", name: "Long Run", type: "Run", category: "run", date: addDays(TODAY, -1), distanceKm: 14 };
    const r = assessReadiness([day(1, { sleepSecs: 25000 })], [long], TODAY);
    expect(r.basis).toBe("Data HRV dan resting HR dari jam belum ada, jadi kesiapan hanya dihitung dari sesi kemarin.");
    expect(r.reasons).toEqual(["Kemarin long run 14.0 km (Long Run)."]);
  });
});
