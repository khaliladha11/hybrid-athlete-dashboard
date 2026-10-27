import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/intervals/types";
import type { StSession } from "@/lib/st-session";
import { ledgerDays } from "@/lib/week-ledger";

// Data fiktif satu minggu kalender.
const FROM = "2026-03-02";
const TO = "2026-03-08";
const run = (id: string, date: string, km: number): Activity => ({ id, name: "Easy Run", type: "Run", category: "run", date, distanceKm: km });
const stAct = (id: string, date: string, startLocal: string): Activity => ({ id, name: "Weight Training", type: "WeightTraining", category: "strength", date, startLocal, movingTimeSec: 2400 });
const ses = (date: string, over: Partial<StSession> = {}): StSession => ({
  id: `s-${date}`,
  date,
  startedAt: `${date}T00:00:00.000Z`, // 07:00 WIB
  type: "lower",
  title: "Lower",
  difficulty: "moderate",
  durationMin: 45,
  rpe: 6,
  setsDone: 12,
  setsPlanned: 12,
  movements: [],
  updatedAt: `${date}T01:00:00.000Z`,
  ...over,
});

describe("Week Ledger dengan ST", () => {
  it("baris ST per hari dari sesi lokal, km lari dijumlah, urut tanggal", () => {
    const days = ledgerDays([run("r1", "2026-03-03", 5), run("r2", "2026-03-03", 2.5)], [ses("2026-03-02")], FROM, TO);
    expect(days).toEqual([
      { date: "2026-03-02", st: [{ label: "ST Lower", minutes: 45 }] },
      { date: "2026-03-03", runKm: 7.5, st: [] },
    ]);
  });

  it("sesi lokal + aktivitas strength yang sama → satu baris; aktivitas lain → baris 'ST' dengan waktu geraknya", () => {
    const days = ledgerDays([stAct("i1", "2026-03-02", "2026-03-02T07:10:00"), stAct("i2", "2026-03-05", "2026-03-05T18:00:00")], [ses("2026-03-02", { type: "upperPush" })], FROM, TO);
    expect(days.map((d) => d.st)).toEqual([[{ label: "ST Upper Push", minutes: 45 }], [{ label: "ST", minutes: 40 }]]);
  });

  it("lari dan ST di hari yang sama satu baris hari; di luar minggu diabaikan", () => {
    const days = ledgerDays([run("r1", "2026-03-04", 6), run("r0", "2026-03-01", 10)], [ses("2026-03-04"), ses("2026-03-09")], FROM, TO);
    expect(days).toEqual([{ date: "2026-03-04", runKm: 6, st: [{ label: "ST Lower", minutes: 45 }] }]);
  });
});
