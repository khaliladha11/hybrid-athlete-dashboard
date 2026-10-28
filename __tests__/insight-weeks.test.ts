import { describe, expect, it } from "vitest";
import { bucketIndex, daysBetween, weekBuckets, weekLabel } from "@/lib/insight/weeks";

describe("weekBuckets", () => {
  it("Senin sampai Minggu, lama → baru, minggu berjalan terakhir", () => {
    const b = weekBuckets("2026-01-08", 3); // Kamis
    expect(b).toEqual([
      { start: "2025-12-22", end: "2025-12-28", current: false },
      { start: "2025-12-29", end: "2026-01-04", current: false },
      { start: "2026-01-05", end: "2026-01-11", current: true },
    ]);
  });

  it("hari Minggu masih minggu yang sama; Senin memulai minggu baru", () => {
    expect(weekBuckets("2026-01-11", 1)[0].start).toBe("2026-01-05");
    expect(weekBuckets("2026-01-12", 1)[0].start).toBe("2026-01-12");
  });

  it("6 dan 12 minggu, minggu berurutan 7 hari", () => {
    for (const n of [6, 12]) {
      const b = weekBuckets("2026-03-30", n);
      expect(b).toHaveLength(n);
      b.forEach((w, i) => i && expect(daysBetween(b[i - 1].start, w.start)).toHaveLength(8));
      expect(b.filter((w) => w.current)).toHaveLength(1);
    }
    // Akhir Maret: tidak ada pergeseran jam (string UTC), Senin tetap Senin.
    expect(weekBuckets("2026-03-30", 12).every((w) => new Date(`${w.start}T00:00:00Z`).getUTCDay() === 1)).toBe(true);
  });
});

describe("bucketIndex", () => {
  it("tanggal ke minggu, -1 di luar rentang atau tanpa tanggal", () => {
    const b = weekBuckets("2026-01-08", 2);
    expect(bucketIndex("2026-01-04", b)).toBe(0);
    expect(bucketIndex("2026-01-05", b)).toBe(1);
    expect(bucketIndex("2025-12-28", b)).toBe(-1);
    expect(bucketIndex(undefined, b)).toBe(-1);
  });
});

describe("weekLabel & daysBetween", () => {
  it("label tanggal Senin tanpa titik", () => {
    expect(weekLabel("2026-10-05")).toBe("5 Okt");
  });
  it("rentang hari inklusif", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toEqual(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]);
  });
});
