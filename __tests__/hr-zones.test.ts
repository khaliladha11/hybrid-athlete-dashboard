import { describe, expect, it } from "vitest";
import { defaultSettings, parseSettings, resolveProfile } from "@/lib/athlete-settings";
import {
  DEFAULT_STRENGTH_RPE,
  DEFAULT_TOPS,
  HR_MODE_SOURCE,
  RUN_RPE,
  hrTargets,
  parseHrZoneSettings,
  parseStrengthRpe,
  strengthRpeFor,
  validateRef,
  validateStrengthRpe,
  validateTops,
  zoneRangeText,
  zoneRows,
  zoneTops,
} from "@/lib/hr-zones";
import { baseProfile } from "@/lib/profile";

describe("zona HR", () => {
  it("bawaan = angka generator lama (Easy < 140, Tempo 160–170, pemulihan < 130)", () => {
    const t = hrTargets(zoneTops(undefined));
    expect(t).toMatchObject({ recovery: "< 130", easy: "< 140", tempo: "160–170", norwegian: "160–170", interval: "≥ 160", easyBelow: 140 });
    expect(zoneTops({ mode: "default" })).toEqual(DEFAULT_TOPS);
  });

  it("dari LTHR (Friel) dan HR maks (Edwards)", () => {
    // LTHR 168 fiktif: Z2 dari 85% (143), Z4 dari 95% (160), Z5 dari 100% (168).
    expect(zoneTops({ mode: "lthr", lthr: 168 })).toEqual([142, 150, 159, 167]);
    expect(hrTargets(zoneTops({ mode: "lthr", lthr: 168 })).tempo).toBe("160–167");
    // HR maks 190 fiktif: Z2 dari 60% (114), Z4 dari 80% (152), Z5 dari 90% (171).
    expect(zoneTops({ mode: "maxHr", maxHr: 190 })).toEqual([113, 132, 151, 170]);
    expect(hrTargets(zoneTops({ mode: "maxHr", maxHr: 190 })).easy).toBe("< 133");
  });

  it("manual; acuan atau batas tidak valid jatuh ke bawaan", () => {
    expect(zoneTops({ mode: "manual", tops: [120, 135, 150, 165] })).toEqual([120, 135, 150, 165]);
    expect(zoneTops({ mode: "manual", tops: [120, 119, 150, 165] })).toEqual(DEFAULT_TOPS);
    expect(zoneTops({ mode: "manual" })).toEqual(DEFAULT_TOPS);
    expect(zoneTops({ mode: "lthr" })).toEqual(DEFAULT_TOPS);
    expect(zoneTops({ mode: "lthr", lthr: 300 })).toEqual(DEFAULT_TOPS);
  });

  it("validasi mencegah zona tumpang tindih", () => {
    expect(validateTops([129, 139, 159, 170])).toEqual([null, null, null, null]);
    expect(validateTops([130, 130, 159, 170])[1]).toMatch(/Minimal 133 bpm.*Z2.*Z1/);
    expect(validateTops([130, 140, 135, 170])[2]).toMatch(/tumpang tindih/);
    expect(validateTops([70, 140, 150, 170])[0]).toMatch(/Antara 80 dan 230/);
    expect(validateTops([130, 140, 150])[3]).toBe("Isi angka bpm.");
    expect(validateTops([130.5, 140, 150, 170])[0]).toBe("Isi angka bpm.");
    expect(validateRef("lthr", 168)).toBeNull();
    expect(validateRef("lthr", 90)).toMatch(/LTHR antara 100 dan 220/);
    expect(validateRef("maxHr", 250)).toMatch(/HR maks antara 120 dan 230/);
  });

  it("tabel zona tanpa celah dan tanpa tumpang tindih", () => {
    for (const t of [DEFAULT_TOPS, zoneTops({ mode: "lthr", lthr: 175 }), zoneTops({ mode: "maxHr", maxHr: 200 })]) {
      const rows = zoneRows(t);
      for (let i = 1; i < rows.length; i++) expect(rows[i].lo).toBe((rows[i - 1].hi ?? 0) + 1);
    }
    expect(zoneRows(DEFAULT_TOPS).map(zoneRangeText)).toEqual(["< 130", "130–139", "140–159", "160–170", "≥ 171"]);
  });

  it("parser tahan data rusak", () => {
    expect(parseHrZoneSettings(undefined)).toBeUndefined();
    expect(parseHrZoneSettings({ mode: "x" })).toBeUndefined();
    expect(parseHrZoneSettings({ mode: "default", lthr: 168 })).toEqual({ mode: "default" });
    expect(parseHrZoneSettings({ mode: "lthr", lthr: 168, maxHr: "190" })).toEqual({ mode: "lthr", lthr: 168 });
    expect(parseHrZoneSettings({ mode: "manual", tops: [1, 2, 3, 4] })).toEqual({ mode: "manual" });
    expect(parseHrZoneSettings({ mode: "manual", tops: [120, 135, 150, 165] })).toEqual({ mode: "manual", tops: [120, 135, 150, 165] });
  });

  it("tersimpan di pengaturan dan masuk profil efektif", () => {
    const s = parseSettings(JSON.stringify({ ...defaultSettings(baseProfile), hrZones: { mode: "lthr", lthr: 168 }, strengthRpe: { easy: 4, moderate: 5, high: 6 } }), baseProfile);
    expect(s.hrZones).toEqual({ mode: "lthr", lthr: 168 });
    const p = resolveProfile(baseProfile, s);
    expect(p.hrTops).toEqual([142, 150, 159, 167]);
    expect(p.strengthRpe).toEqual({ easy: 4, moderate: 5, high: 6 });
    const d = resolveProfile(baseProfile, defaultSettings(baseProfile));
    expect(d.hrTops).toEqual(DEFAULT_TOPS);
    expect(d.strengthRpe).toBeUndefined();
  });
});

describe("RPE ST", () => {
  it("bawaan 5/6/7; deload turun satu, minimal 5, tidak pernah naik", () => {
    expect(DEFAULT_STRENGTH_RPE).toEqual({ easy: 5, moderate: 6, high: 7 });
    expect([strengthRpeFor(DEFAULT_STRENGTH_RPE, "easy", true), strengthRpeFor(DEFAULT_STRENGTH_RPE, "moderate", true), strengthRpeFor(DEFAULT_STRENGTH_RPE, "high", true)]).toEqual([5, 5, 6]);
    expect(strengthRpeFor({ easy: 4, moderate: 5, high: 6 }, "easy", true)).toBe(4);
    expect(strengthRpeFor({ easy: 4, moderate: 5, high: 6 }, "high", false)).toBe(6);
  });

  it("tidak pernah lebih dari 7 (PRD §3)", () => {
    expect(validateStrengthRpe({ easy: 5, moderate: 6, high: 8 }).high).toMatch(/RPE 4 sampai 7/);
    expect(parseStrengthRpe({ easy: 5, moderate: 6, high: 8 })).toBeUndefined();
    expect(strengthRpeFor({ easy: 5, moderate: 6, high: 9 }, "high", false)).toBe(7);
    expect(validateStrengthRpe({ easy: 3, moderate: 6, high: 7 }).easy).toMatch(/RPE 4 sampai 7/);
  });

  it("level tidak boleh lebih ringan dari sebelumnya", () => {
    expect(validateStrengthRpe({ easy: 6, moderate: 5, high: 7 }).moderate).toMatch(/lebih ringan/);
    expect(parseStrengthRpe({ easy: 6, moderate: 5, high: 7 })).toBeUndefined();
    expect(parseStrengthRpe({ easy: 5, moderate: 5, high: 5 })).toEqual({ easy: 5, moderate: 5, high: 5 });
  });

  it("teks Setting tanpa em dash dan tanpa tanda seru", () => {
    const all = [...Object.values(HR_MODE_SOURCE), ...RUN_RPE.flatMap((r) => [r.label, r.rpe]), ...validateTops([70, 70, 0, 0]).filter(Boolean), ...Object.values(validateStrengthRpe({ easy: 9, moderate: 1 })).filter(Boolean)];
    for (const t of all) expect(t).not.toMatch(/[—!]/);
  });
});
