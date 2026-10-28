import { describe, expect, it } from "vitest";
import {
  checkinAdvice,
  checkinOn,
  compactCheckinTombstones,
  mergeCheckins,
  moodNote,
  normalizeCheckin,
  normalizeCheckins,
  tombstoneCheckin,
  withCheckin,
  type Checkin,
} from "@/lib/checkin";
import { readinessAdvice, suggestFor } from "@/lib/coach";
import type { Readiness } from "@/lib/readiness";

const c = (over: Partial<Checkin> = {}): Checkin => ({ date: "2026-03-02", updatedAt: "2026-03-02T00:10:00.000Z", ...over });
const ids = (xs: { id: string }[]) => xs.map((a) => a.id);

describe("validasi", () => {
  it("rentang per isian, bilangan bulat, isian kosong boleh", () => {
    expect(normalizeCheckin(c({ shin: 0, soreness: 10, sleep: 1, mood: 5 }))).toEqual(c({ shin: 0, soreness: 10, sleep: 1, mood: 5 }));
    expect(normalizeCheckin(c())).toEqual(c());
    expect(normalizeCheckin(c({ shin: 11 }))).toBeNull();
    expect(normalizeCheckin(c({ sleep: 0 }))).toBeNull();
    expect(normalizeCheckin(c({ mood: 6 }))).toBeNull();
    expect(normalizeCheckin(c({ soreness: 4.5 }))).toBeNull();
    expect(normalizeCheckin({ ...c(), date: "2026-02-30x" })).toBeNull();
    expect(normalizeCheckin({ ...c(), shin: null })).toEqual(c());
  });
});

describe("gabungan per tanggal", () => {
  const a = c({ shin: 3, updatedAt: "2026-03-02T01:00:00.000Z" });
  const b = c({ shin: 5, updatedAt: "2026-03-02T02:00:00.000Z" });
  const other = c({ date: "2026-03-01", sleep: 4 });

  it("terbaru menang, komutatif, idempoten", () => {
    expect(mergeCheckins([a], [b])).toEqual([b]);
    expect(mergeCheckins([b], [a])).toEqual([b]);
    expect(mergeCheckins([a, other], [a, other])).toEqual([other, a]);
  });

  it("tombstone menang; dibuang setelah 90 hari; tidak dianggap check-in hari itu", () => {
    const t = tombstoneCheckin(a, "2026-03-03T00:00:00.000Z");
    expect(mergeCheckins([b], [t])).toEqual([t]);
    expect(checkinOn([t], "2026-03-02")).toBeUndefined();
    expect(compactCheckinTombstones([t], Date.parse("2026-07-01T00:00:00Z"))).toEqual([]);
    expect(normalizeCheckins([a, "x", b])).toEqual([b]);
  });
});

describe("aturan check-in (batas)", () => {
  it("nyeri shin 3 → tidak ada; 4 dan 5 → lari maks Easy + prehab; 6 → Easy 30 menit, istirahat/jalan, ST Upper", () => {
    expect(checkinAdvice(c({ shin: 3 }))).toEqual([]);
    for (const shin of [4, 5]) {
      const a = checkinAdvice(c({ shin }));
      expect(a).toHaveLength(1);
      expect(a[0]).toMatchObject({ id: "checkin-shin", targets: ["run"], maxDifficulty: "easy" });
      expect(a[0].maxDuration).toBeUndefined();
      expect(a[0].message).toContain("Tibialis Wall Raise");
    }
    const six = checkinAdvice(c({ shin: 6 }));
    expect(six.find((a) => a.targets.includes("run"))).toMatchObject({ maxDifficulty: "easy", maxDuration: 30 });
    expect(six.find((a) => a.targets.includes("run"))!.message).toContain("tenaga profesional");
    expect(six.find((a) => a.targets.includes("strength"))!.preferTypes).toEqual(["upperPush", "upperPull"]);
  });

  it("pegal 6 → tidak ada, 7 → turun satu level; tidur 3 → tidak ada, 2 → turun satu level; mood tanpa aturan", () => {
    expect(checkinAdvice(c({ soreness: 6 }))).toEqual([]);
    expect(checkinAdvice(c({ soreness: 7 }))[0]).toMatchObject({ id: "checkin-soreness", lowerBy: 1, targets: ["run", "strength"] });
    expect(checkinAdvice(c({ sleep: 3 }))).toEqual([]);
    expect(checkinAdvice(c({ sleep: 2 }))[0]).toMatchObject({ id: "checkin-sleep", lowerBy: 1 });
    expect(checkinAdvice(c({ mood: 1 }))).toEqual([]);
    expect(moodNote(c({ mood: 2 }))).toContain("Tidak mengubah saran");
    expect(moodNote(c({ mood: 4 }))).toBeNull();
    expect(checkinAdvice(undefined)).toEqual([]);
  });

  it("nyeri shin 5 di hari quality → Easy (sesi rencana)", () => {
    const s = suggestFor(checkinAdvice(c({ shin: 5 })), "run", { difficulty: "high", duration: 45 }, { plan: { kind: "quality", difficulty: "high", duration: 45 } });
    expect(s.difficulty).toBe("easy");
  });

  it("tidur buruk + pegal + readiness rendah = tetap turun satu level (tidak berantai)", () => {
    const r: Readiness = { caution: true, reasons: ["HRV 40 ms, 20% di bawah rata-rata 7 hari (50 ms)."], hasData: true, basis: "", used: [], baselines: { hrv: { days: 0, active: false }, restingHr: { days: 0, active: false } } };
    const advice = withCheckin(readinessAdvice(r), c({ sleep: 1, soreness: 8 }));
    expect(ids(advice)).toEqual(["readiness", "checkin-soreness", "checkin-sleep"]);
    expect(suggestFor(advice, "run", { difficulty: "high", duration: 45 }).difficulty).toBe("moderate");
    expect(suggestFor(advice, "strength", { difficulty: "moderate", duration: 45 }).difficulty).toBe("easy");
    expect(suggestFor(advice, "run", { difficulty: "high", duration: 45 }, { plan: { kind: "quality", difficulty: "high", duration: 45 } }).difficulty).toBe("moderate");
  });

  it("hanya menurunkan: Easy tetap Easy; lomba tidak diturunkan; tidak dobel", () => {
    const advice = checkinAdvice(c({ sleep: 1, shin: 7 }));
    expect(suggestFor(advice, "run", { difficulty: "easy", duration: 30 })).toEqual({});
    expect(suggestFor(advice, "run", { difficulty: "high", duration: 60 }, { plan: { kind: "race", difficulty: "high" } })).toEqual({});
    expect(withCheckin(advice, c({ sleep: 1 }))).toBe(advice);
  });
});
