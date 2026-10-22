import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { completeTour, initialState, parseOnboardingState } from "@/lib/onboarding";
import { TOUR_STEPS, holeRect, placePopover } from "@/lib/tour";

const VIEW = { width: 375, height: 812, insetTop: 44, insetBottom: 34 };
const POP = { width: 360, height: 200 };

describe("langkah tur", () => {
  it("4 sampai 5 sorotan, urutan sesuai ONBOARDING §4: Profil, Lari, Strength, Program, Setting", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(5);
    expect(TOUR_STEPS.map((s) => s.route)).toEqual(["/", "/run", "/strength", "/program", "/setting"]);
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
  });

  it("setiap rute ada sebagai halaman", () => {
    for (const s of TOUR_STEPS) expect(existsSync(path.join(process.cwd(), "app", s.route, "page.tsx")), s.route).toBe(true);
  });

  it("teks tanpa em/en dash dan tanpa tanda seru (DESIGN-SYSTEM §7)", () => {
    for (const s of TOUR_STEPS) for (const t of [s.title, s.body]) expect(t).not.toMatch(/[—–!]/);
  });
});

describe("placePopover", () => {
  it("di bawah elemen bila muat, rata tengah elemen, dijepit 16px dari tepi", () => {
    const r = placePopover({ top: 100, left: 16, width: 343, height: 120 }, VIEW, POP);
    expect(r).toEqual({ top: 232, left: 16, width: 343, side: "bottom" });
  });

  it("di atas elemen bila bawah tidak muat", () => {
    const r = placePopover({ top: 600, left: 16, width: 343, height: 80 }, VIEW, POP);
    expect(r.side).toBe("top");
    expect(r.top).toBe(600 - 12 - 200);
  });

  it("elemen setinggi layar: menempel di sisi yang lebih lega, tetap di dalam safe area", () => {
    const r = placePopover({ top: 70, left: 16, width: 343, height: 700 }, VIEW, POP);
    expect(r.top).toBeGreaterThanOrEqual(44 + 16);
    expect(r.top + POP.height).toBeLessThanOrEqual(812 - 34 - 16);
  });

  it("tanpa elemen: tengah layar", () => {
    const r = placePopover(null, VIEW, POP);
    expect(r.side).toBe("center");
    expect(r.left).toBe((375 - 343) / 2);
    expect(r.top).toBe((812 - 200) / 2);
  });

  it("layar lebar: lebar popover tetap maksimal 360, mengikuti posisi elemen", () => {
    const r = placePopover({ top: 100, left: 900, width: 100, height: 40 }, { width: 1024, height: 768 }, POP);
    expect(r.width).toBe(360);
    expect(r.left).toBe(1024 - 16 - 360);
  });
});

describe("holeRect", () => {
  it("padding 8px dan dipotong ke viewport", () => {
    expect(holeRect({ top: 100, left: 16, width: 343, height: 50 }, VIEW)).toEqual({ top: 92, left: 8, width: 359, height: 66 });
    expect(holeRect({ top: -100, left: 0, width: 375, height: 2000 }, VIEW)).toEqual({ top: 0, left: 0, width: 375, height: 812 });
  });

  it("elemen di luar layar → null", () => {
    expect(holeRect({ top: 900, left: 0, width: 100, height: 40 }, VIEW)).toBeNull();
  });
});

describe("status tur", () => {
  it("selesai atau dilewati mencatat tourCompletedAt, tersimpan dan terbaca kembali", () => {
    const s = completeTour(initialState(), "2026-01-05T00:00:00.000Z");
    expect(s.tourCompletedAt).toBe("2026-01-05T00:00:00.000Z");
    expect(parseOnboardingState(JSON.stringify(s))?.tourCompletedAt).toBe("2026-01-05T00:00:00.000Z");
  });
});
