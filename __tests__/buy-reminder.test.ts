import { describe, expect, it } from "vitest";
import { buyReminders, stuckAtEquipment, visibleReminders } from "@/lib/buy-reminder";
import type { Equipment } from "@/lib/equipment";
import type { Movement, MovementLibrary } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";

// Library, alat, dan log fiktif.
const eq: Equipment = {
  dumbbell: { enabled: true, handleKg: 2, handles: 2 },
  barbell: { enabled: true, barKg: 10 },
  plates: [{ kg: 1.25, count: 4 }],
  bands: [],
  pullUpBar: false,
  bench: true,
  bandAnchor: false,
  other: [],
  items: [],
};
const mv = (name: string, weight: string, capKg: number, source: "equipment" | "safety" = "equipment"): Movement => ({ name, weight, cap: { kg: capKg, source } });
const LOWER = [
  mv("Barbell Squat", "10–16 kg", 15),
  mv("Barbell Sumo Deadlift / Hip Thrust", "14–20 kg", 15),
  mv("DB RDL Wall-Tap Method", "8–10 kg", 4.5),
  mv("DB Plié Squat", "6–12 kg", 4.5),
  mv("Reverse Lunge", "3–5 kg/tangan", 3.25),
];
const libOf = (lower: Movement[], upperPush: Movement[] = []): MovementLibrary =>
  ({ lower, upperPush, upperPull: [], stabilityAndCore: [], prehab: [], warmupAndCooldown: [] }) as MovementLibrary;

let n = 0;
const at = (m: Movement, date: string, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `b${n++}`,
  date,
  movement: m.name,
  load: m.cap!.kg,
  value: 12,
  valueUnit: "reps",
  target: { lo: 8, hi: 12 },
  rpe: 5,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});
const twice = (m: Movement, over: Partial<LogEntry> = {}) => [at(m, "2026-10-20", over), at(m, "2026-10-23", over)];

describe("syarat mentok di batas alat", () => {
  it("2 sesi terakhir di batas, rep di ujung atas, RPE ≤ target − 1", () => {
    const sq = LOWER[0];
    expect(stuckAtEquipment(sq, twice(sq))).toBe(true);
    expect(stuckAtEquipment(sq, [at(sq, "2026-10-23")])).toBe(false); // baru 1 sesi
    expect(stuckAtEquipment(sq, twice(sq, { rpe: 6 }))).toBe(false); // RPE = target
    expect(stuckAtEquipment(sq, twice(sq, { value: 11 }))).toBe(false); // belum di ujung atas
    expect(stuckAtEquipment(sq, [at(sq, "2026-10-20"), at(sq, "2026-10-23", { load: 12.5 })])).toBe(false); // terakhir di bawah batas
    expect(stuckAtEquipment(mv("Barbell Squat", "10–16 kg", 16, "safety"), twice(mv("Barbell Squat", "10–16 kg", 16, "safety")))).toBe(false);
  });
});

describe("pengingat per area", () => {
  it("≥ 80% gerakan aktif area mentok → pengingat; 60% → tidak", () => {
    const four = LOWER.slice(0, 4).flatMap((m) => twice(m));
    const r = buyReminders({ lib: libOf(LOWER), eq, active: [], log: four });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ area: "lower", stuck: LOWER.slice(0, 4).map((m) => m.name).sort() });
    expect(r[0].text).toMatch(/^Sepasang plat [\d,]+ kg membuka progresi untuk \d gerakan lower\.$/);
    const three = LOWER.slice(0, 3).flatMap((m) => twice(m));
    expect(buyReminders({ lib: libOf(LOWER), eq, active: [], log: three })).toEqual([]);
  });

  it("dihitung per area: upper push tidak terpengaruh lower", () => {
    const push = [mv("Floor Press", "10–20 kg/tangan", 4.5)];
    const r = buyReminders({ lib: libOf(LOWER, push), eq, active: [], log: twice(push[0]) });
    expect(r.map((x) => x.area)).toEqual(["upperPush"]);
    expect(r[0].text).toMatch(/gerakan upper push\.$/);
  });

  it("plat dipilih yang membuka progresi terbanyak; seri → paling ringan; jumlahnya benar", () => {
    const four = LOWER.slice(0, 4).flatMap((m) => twice(m));
    const r = buyReminders({ lib: libOf(LOWER), eq, active: [], log: four })[0];
    // Sepasang 0,5 kg sudah menambah langkah di semua alat (barbell & dumbbell) → paling ringan menang.
    expect(r.plateKg).toBe(0.5);
    expect(r.unlocks).toBe(4);
    expect(r.text).toBe("Sepasang plat 0,5 kg membuka progresi untuk 4 gerakan lower.");
  });

  it("batas keamanan tidak dihitung sebagai kurang alat, dan tidak 'dibuka' oleh plat", () => {
    const capped = LOWER.map((m, i) => (i === 0 ? mv(m.name, m.weight, 15) : m));
    const log = capped.slice(0, 4).flatMap((m) => twice(m));
    // APT: Barbell Squat dibatasi 16 kg; plat yang hanya menaikkan barbell di atas 16 tidak dihitung untuk squat.
    const r = buyReminders({ lib: libOf(capped), eq, active: ["apt"], log })[0];
    expect(r.unlocks).toBeLessThanOrEqual(4);
    const safety = LOWER.map((m) => mv(m.name, m.weight, m.cap!.kg, "safety"));
    expect(buyReminders({ lib: libOf(safety), eq, active: [], log: safety.flatMap((m) => twice(m)) })).toEqual([]);
  });

  it("aturan lama (tanpa batas baru) tidak pernah memunculkan pengingat", () => {
    const old = LOWER.map(({ cap: _cap, ...m }) => m);
    expect(buyReminders({ lib: libOf(old), eq, active: [], log: LOWER.flatMap((m) => twice(m)) })).toEqual([]);
  });

  it("ditutup → hilang; muncul lagi hanya bila syaratnya baru terpenuhi (daftar atau batas berubah)", () => {
    const four = LOWER.slice(0, 4).flatMap((m) => twice(m));
    const r = buyReminders({ lib: libOf(LOWER), eq, active: [], log: four });
    expect(visibleReminders(r, { lower: r[0].signature })).toEqual([]);
    const all = LOWER.flatMap((m) => twice(m));
    const again = buyReminders({ lib: libOf(LOWER), eq, active: [], log: all });
    expect(visibleReminders(again, { lower: r[0].signature })).toHaveLength(1);
  });
});
