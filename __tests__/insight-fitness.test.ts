import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/date";
import { FORM_BAND, MIN_FITNESS_DAYS, fitnessSeries } from "@/lib/insight/fitness";
import type { Wellness } from "@/lib/intervals/types";

const TODAY = "2026-01-08"; // Kamis

/** Wellness fiktif: CTL naik pelan 30 → …, ATL berayun. */
function series(n: number, opts: { ctlStep?: number; skip?: (i: number) => boolean } = {}): Wellness[] {
  return Array.from({ length: n }, (_, i) => ({ date: addDays(TODAY, -(n - 1 - i)), i }))
    .filter(({ i }) => !opts.skip?.(i))
    .map(({ date, i }) => ({ date, ctl: 30 + i * (opts.ctlStep ?? 0.1), atl: 30 + (i % 7) * 2 }));
}

describe("fitnessSeries", () => {
  it("rentang 6 / 12 minggu mulai Senin, sampai hari ini", () => {
    const six = fitnessSeries(series(90), TODAY, 6);
    expect(six.days[0].date).toBe("2025-12-01");
    expect(six.days.at(-1)!.date).toBe(TODAY);
    expect(six.days).toHaveLength(39);
    expect(fitnessSeries(series(90), TODAY, 12).days[0].date).toBe("2025-10-20");
  });

  it("Form = CTL − ATL", () => {
    const s = fitnessSeries(series(90), TODAY, 6);
    for (const d of s.days) expect(d.form).toBeCloseTo(d.ctl! - d.atl!, 1);
    expect(s.drawable).toBe(true);
  });

  it("hari tanpa data tetap kosong, bukan nol", () => {
    const s = fitnessSeries(series(90, { skip: (i) => i === 85 }), TODAY, 6);
    const gap = s.days.find((d) => d.date === addDays(TODAY, -4))!;
    expect(gap.ctl).toBeUndefined();
    expect(gap.form).toBeUndefined();
  });

  it("ringkasan naik / turun / stabil dengan angka gaya Indonesia", () => {
    expect(fitnessSeries(series(90, { ctlStep: 0.1 }), TODAY, 6).summary).toMatch(/^CTL naik 3,8 dalam 6 minggu\. Form terakhir −?\d+,\d\.$/);
    expect(fitnessSeries(series(90, { ctlStep: -0.1 }), TODAY, 6).summary).toMatch(/^CTL turun 3,8 dalam 6 minggu/);
    expect(fitnessSeries(series(90, { ctlStep: 0 }), TODAY, 12).summary).toMatch(/^CTL stabil di 30,0 dalam 12 minggu/);
  });

  it("CTL/ATL tidak tersedia 14 hari terakhir → kalimat, bukan grafik", () => {
    const old = series(90, { skip: (i) => i >= 76 });
    const s = fitnessSeries(old, TODAY, 12);
    expect(s.drawable).toBe(false);
    expect(s.summary).toContain("CTL/ATL tidak dikirim");
    expect(fitnessSeries([], TODAY, 6).drawable).toBe(false);
  });

  it("kurang dari 2 minggu data → belum cukup", () => {
    const s = fitnessSeries(series(MIN_FITNESS_DAYS - 1), TODAY, 6);
    expect(s.drawable).toBe(false);
    expect(s.summary).toContain("butuh 2 minggu");
  });

  it("pita Form netral", () => {
    expect(FORM_BAND).toEqual([-10, 5]);
  });
});
