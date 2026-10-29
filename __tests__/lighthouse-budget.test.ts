import { describe, expect, it } from "vitest";
// @ts-expect-error skrip Node tanpa deklarasi tipe
import { BUDGET, PAGES, overBudget } from "../scripts/lighthouse-budget.mjs";

const ok = { performance: 0.93, accessibility: 1, "best-practices": 1, lcpMs: 900, tbtMs: 300, cls: 0 };

describe("anggaran Lighthouse mobile", () => {
  it("halaman utama diukur, anggaran terkunci", () => {
    expect(PAGES).toEqual(["/", "/run", "/strength", "/program", "/insight"]);
    expect(BUDGET).toEqual({ performance: 0.85, accessibility: 0.95, "best-practices": 0.95, lcpMs: 2500, tbtMs: 350, cls: 0.1 });
  });
  it("dalam anggaran → kosong; setiap batas dilanggar → disebut", () => {
    expect(overBudget(ok)).toEqual([]);
    expect(overBudget({ ...ok, performance: 0.8, tbtMs: 400, lcpMs: 3000, cls: 0.2, accessibility: 0.9 })).toEqual([
      "performance 0.8 < 0.85",
      "accessibility 0.9 < 0.95",
      "LCP 3000 ms > 2500",
      "TBT 400 ms > 350",
      "CLS 0.2 > 0.1",
    ]);
  });
});
