import { describe, expect, it } from "vitest";
import type { Activity } from "@/lib/intervals/types";
import {
  compactSessionTombstones,
  completion,
  dedupeStSessions,
  isComplete,
  mergeSessions,
  normalizeSession,
  normalizeSessions,
  sessionLoad,
  tombstoneSession,
  type StSession,
} from "@/lib/st-session";

// Sesi dan aktivitas fiktif.
const ses = (over: Partial<StSession> = {}): StSession => ({
  id: "s1",
  date: "2026-03-02",
  // 07:00 WIB
  startedAt: "2026-03-02T00:00:00.000Z",
  type: "lower",
  title: "Lower · Moderate 45'",
  difficulty: "moderate",
  durationMin: 45,
  rpe: 6,
  setsDone: 12,
  setsPlanned: 12,
  movements: ["Glute Bridge"],
  updatedAt: "2026-03-02T01:00:00.000Z",
  ...over,
});
const act = (id: string, over: Partial<Activity> = {}): Activity => ({
  id,
  name: "Weight Training",
  type: "WeightTraining",
  category: "strength",
  date: "2026-03-02",
  startLocal: "2026-03-02T07:05:00",
  movingTimeSec: 2700,
  ...over,
});

describe("session-RPE (Foster)", () => {
  it("beban = RPE × menit, dibulatkan", () => {
    expect(sessionLoad({ rpe: 6, durationMin: 45 })).toBe(270);
    expect(sessionLoad({ rpe: 0, durationMin: 30 })).toBe(0);
    expect(sessionLoad({ rpe: 10, durationMin: 1 })).toBe(10);
  });

  it("kelengkapan set: ≥ 80% selesai, di bawahnya sebagian", () => {
    expect(completion({ setsDone: 9, setsPlanned: 12 })).toBe(0.75);
    expect(isComplete({ setsDone: 9, setsPlanned: 12 })).toBe(false);
    expect(isComplete({ setsDone: 10, setsPlanned: 12 })).toBe(true);
    expect(isComplete({ setsDone: 0, setsPlanned: 0 })).toBe(true);
  });
});

describe("validasi & gabungan", () => {
  it("menolak RPE di luar 0–10, durasi 0, tipe tidak dikenal, tanggal rusak", () => {
    expect(normalizeSession(ses())).toEqual(ses());
    expect(normalizeSession({ ...ses(), rpe: 11 })).toBeNull();
    expect(normalizeSession({ ...ses(), rpe: 6.5 })).toBeNull();
    expect(normalizeSession({ ...ses(), durationMin: 0 })).toBeNull();
    expect(normalizeSession({ ...ses(), type: "cardio" })).toBeNull();
    expect(normalizeSession({ ...ses(), date: "2026-13-40" })).toBeNull();
    expect(normalizeSession({ ...ses(), setsDone: 20, setsPlanned: 12 })?.setsDone).toBe(12);
  });

  it("tombstone menang, komutatif & idempoten", () => {
    const a = ses();
    const b = ses({ rpe: 7, updatedAt: "2026-03-02T02:00:00.000Z" });
    const dead = tombstoneSession(a, "2026-03-02T01:30:00.000Z");
    expect(mergeSessions([a], [b])).toEqual(mergeSessions([b], [a]));
    expect(mergeSessions([a], [b])[0].rpe).toBe(7);
    expect(mergeSessions([b], [dead])[0].deletedAt).toBeDefined();
    expect(mergeSessions(mergeSessions([a], [dead]), [dead])).toEqual(mergeSessions([a], [dead]));
    expect(normalizeSessions([a, { bukan: "sesi" }, a])).toHaveLength(1);
  });

  it("tombstone lebih tua dari 90 hari dibuang", () => {
    const dead = tombstoneSession(ses(), "2026-01-01T00:00:00.000Z");
    expect(compactSessionTombstones([dead], Date.parse("2026-03-01T00:00:00Z"))).toHaveLength(1);
    expect(compactSessionTombstones([dead], Date.parse("2026-05-01T00:00:00Z"))).toHaveLength(0);
  });
});

describe("dedupe dengan intervals.icu", () => {
  it("tanggal sama & jam mulai ≤ 2 jam → satu sesi, memakai sesi lokal", () => {
    const items = dedupeStSessions([ses()], [act("i1")]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: "local", activityId: "i1", minutes: 45, load: 270, leg: true });
  });

  it("jam mulai selisih > 2 jam → dua sesi; aktivitas tanpa pasangan tanpa beban AU", () => {
    const items = dedupeStSessions([ses()], [act("i1", { startLocal: "2026-03-02T18:00:00" })]);
    expect(items.map((i) => i.source)).toEqual(["local", "intervals"]);
    expect(items[1]).toMatchObject({ minutes: 45 });
    expect(items[1].load).toBeUndefined();
  });

  it("aktivitas tanpa jam mulai di tanggal yang sama tetap dipasangkan", () => {
    expect(dedupeStSessions([ses()], [act("i1", { startLocal: undefined })])).toHaveLength(1);
  });

  it("tanggal lain atau kategori lain tidak dipasangkan", () => {
    expect(dedupeStSessions([ses()], [act("i1", { date: "2026-03-03" })])).toHaveLength(2);
    expect(dedupeStSessions([ses()], [act("r1", { category: "run", type: "Run" })])).toHaveLength(1);
  });

  it("satu-ke-satu: dua sesi lokal & dua aktivitas di hari yang sama dipasangkan menurut jam terdekat", () => {
    const pagi = ses({ id: "pagi" });
    const sore = ses({ id: "sore", startedAt: "2026-03-02T10:00:00.000Z" }); // 17:00 WIB
    const items = dedupeStSessions([pagi, sore], [act("i-sore", { startLocal: "2026-03-02T17:10:00" }), act("i-pagi")]);
    expect(items).toHaveLength(2);
    const by = Object.fromEntries(items.map((i) => [i.source === "local" ? i.session.id : "x", i.source === "local" ? i.activityId : undefined]));
    expect(by).toEqual({ pagi: "i-pagi", sore: "i-sore" });
  });

  it("sesi terhapus tidak dihitung; aktivitasnya kembali dihitung sendiri", () => {
    const items = dedupeStSessions([tombstoneSession(ses(), "2026-03-02T03:00:00.000Z")], [act("i1")]);
    expect(items.map((i) => i.source)).toEqual(["intervals"]);
  });
});
