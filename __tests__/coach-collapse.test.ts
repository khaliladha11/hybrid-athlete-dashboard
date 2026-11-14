import { describe, expect, it } from "vitest";
import { adviceLevel, coachOpen, isCollapsible, LONG_REASON, mainAdvice, nextCollapseState, parseCollapseState, SEVERITY_RANK } from "@/lib/coach-collapse";

const a = (over: Partial<{ id: string; message: string; maxDifficulty: "easy"; lowerBy: 1; maxDuration: 30 }> = {}) => ({
  id: "x",
  title: over.id ?? "Saran",
  message: "Pesan pendek.",
  ...over,
});

describe("isCollapsible", () => {
  it("satu saran pendek tidak dilipat", () => {
    expect(isCollapsible([a()])).toBe(false);
  });
  it("lebih dari satu saran dilipat", () => {
    expect(isCollapsible([a(), a()])).toBe(true);
  });
  it("satu saran dengan alasan panjang dilipat", () => {
    expect(isCollapsible([a({ message: "x".repeat(LONG_REASON + 1) })])).toBe(true);
    expect(isCollapsible([a({ message: "x".repeat(LONG_REASON) })])).toBe(false);
  });
});

describe("level & kalimat utama", () => {
  it("urutan Info < Batasi < Turunkan < Easy", () => {
    expect(adviceLevel([a()])).toBe("info");
    expect(adviceLevel([a({ maxDuration: 30 })])).toBe("limit");
    expect(adviceLevel([a({ maxDuration: 30 }), a({ lowerBy: 1 })])).toBe("lower");
    expect(adviceLevel([a({ lowerBy: 1 }), a({ maxDifficulty: "easy" })])).toBe("easy");
    expect(SEVERITY_RANK.info < SEVERITY_RANK.limit && SEVERITY_RANK.limit < SEVERITY_RANK.lower && SEVERITY_RANK.lower < SEVERITY_RANK.easy).toBe(true);
  });
  it("kalimat utama = saran paling berat, urutan asli bila sama", () => {
    expect(mainAdvice([a({ id: "info" }), a({ id: "batas", maxDuration: 30 }), a({ id: "easy", maxDifficulty: "easy" })])?.title).toBe("easy");
    expect(mainAdvice([a({ id: "satu" }), a({ id: "dua" })])?.title).toBe("satu");
    expect(mainAdvice([])).toBeUndefined();
  });
});

describe("coachOpen · per hari", () => {
  const today = "2026-11-14";
  it("belum ada status: tertutup", () => {
    expect(coachOpen(null, today, 2)).toBe(false);
  });
  it("hari yang sama: pilihan tersimpan", () => {
    expect(coachOpen({ date: today, open: true, rank: 2 }, today, 2)).toBe(true);
    expect(coachOpen({ date: today, open: false, rank: 2 }, today, 2)).toBe(false);
  });
  it("hari baru: tertutup lagi walau kemarin dibuka", () => {
    expect(coachOpen({ date: "2026-11-13", open: true, rank: 3 }, today, 3)).toBe(false);
  });
  it("saran baru lebih berat: terbuka otomatis", () => {
    expect(coachOpen({ date: today, open: false, rank: 1 }, today, 3)).toBe(true);
  });
  it("severity sama atau turun: tidak membuka", () => {
    expect(coachOpen({ date: today, open: false, rank: 3 }, today, 3)).toBe(false);
    expect(coachOpen({ date: today, open: false, rank: 3 }, today, 0)).toBe(false);
  });
  it("setelah dibuka otomatis lalu ditutup, rank baru tersimpan sehingga tidak membuka lagi", () => {
    const s = nextCollapseState(today, false, 3);
    expect(coachOpen(s, today, 3)).toBe(false);
  });
});

describe("parseCollapseState", () => {
  it("bentuk benar dibaca, bentuk salah = null", () => {
    expect(parseCollapseState(JSON.stringify({ date: "2026-11-14", open: true, rank: 1 }))).toEqual({ date: "2026-11-14", open: true, rank: 1 });
    expect(parseCollapseState(null)).toBeNull();
    expect(parseCollapseState("{rusak")).toBeNull();
    expect(parseCollapseState(JSON.stringify({ date: "2026-11-14", open: "ya", rank: 1 }))).toBeNull();
  });
});
