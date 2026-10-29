import { describe, expect, it } from "vitest";
import { parseRunInputs, parseStrengthInputs, restoreOffline, shouldPromptUpdate, snapshotText } from "@/lib/offline";
import { syncOnce, emptyMeta, type SyncIO, type SyncMeta } from "@/lib/sync/engine";
import type { PartData } from "@/lib/sync/parts";

// 2026-10-29 08:00 WIB = 01:00Z
const NOW = Date.parse("2026-10-29T01:00:00Z");

describe("data terakhir", () => {
  it("hari ini / kemarin / tanggal, jam WIB", () => {
    expect(snapshotText("2026-10-29T00:12:00Z", NOW)).toBe("Data terakhir hari ini 07.12. Saran dan angka dari intervals.icu belum diperbarui.");
    expect(snapshotText("2026-10-28T14:03:00Z", NOW)).toMatch(/^Data terakhir kemarin 21\.03\./);
    expect(snapshotText("2026-10-26T23:30:00Z", NOW)).toMatch(/^Data terakhir 27 Okt 06\.30\./);
    expect(snapshotText("bukan waktu", NOW)).toBeNull();
  });
  it("tanpa em/en dash", () => {
    expect(snapshotText("2026-10-29T00:12:00Z", NOW)).not.toMatch(/[—–]/);
  });
});

describe("prompt versi baru", () => {
  it("tidak tampil selama latihan berjalan atau di mode latihan", () => {
    expect(shouldPromptUpdate({ path: "/", activeWorkout: false })).toBe(true);
    expect(shouldPromptUpdate({ path: "/strength", activeWorkout: false })).toBe(true);
    expect(shouldPromptUpdate({ path: "/strength/sesi", activeWorkout: false })).toBe(false);
    expect(shouldPromptUpdate({ path: "/", activeWorkout: true })).toBe(false);
  });
});

describe("masukan generator saat offline", () => {
  it("validasi masukan tersimpan", () => {
    expect(parseRunInputs(JSON.stringify({ duration: 45, difficulty: "easy", seed: 123 }))).toEqual({ duration: 45, difficulty: "easy", seed: 123 });
    expect(parseRunInputs(JSON.stringify({ duration: 40, difficulty: "easy", seed: 1 }))).toBeNull();
    expect(parseRunInputs(JSON.stringify({ duration: 45, difficulty: "ekstrem", seed: 1 }))).toBeNull();
    expect(parseRunInputs("rusak")).toBeNull();
    expect(parseRunInputs(null)).toBeNull();
    expect(parseStrengthInputs(JSON.stringify({ duration: 30, difficulty: "high", seed: 9, type: "lower" }))).toEqual({ duration: 30, difficulty: "high", seed: 9, type: "lower" });
    expect(parseStrengthInputs(JSON.stringify({ duration: 30, difficulty: "high", seed: 9, type: "cardio" }))).toBeNull();
  });
  it("dipulihkan hanya saat offline dan tanpa isian program", () => {
    const s = { duration: 45, difficulty: "easy", seed: 1 };
    expect(restoreOffline(s, { offline: true, prefilled: false })).toBe(s);
    expect(restoreOffline(s, { offline: false, prefilled: false })).toBeNull();
    expect(restoreOffline(s, { offline: true, prefilled: true })).toBeNull();
  });
});

describe("antrean sinkron saat offline (0.12)", () => {
  const empty = (): PartData => ({ profile: null, settings: null, program: null, preferences: {}, onboarding: null, log: [], prs: [], sessions: [], checkins: [] });
  const entry = { date: "2026-10-29", shin: 3, updatedAt: "2026-10-29T01:00:00.000Z" };

  it("beberapa putaran offline tidak membuang data; terkirim saat online", async () => {
    let online = false;
    let local: PartData = { ...empty(), checkins: [entry] };
    let meta: SyncMeta = { ...emptyMeta(), parts: { checkins: { rev: 0, dirty: ["*"], gen: 1 } } };
    const server: Record<string, { rev: number; data: unknown }> = {};
    const io: SyncIO = {
      async get() {
        if (!online) throw new Error("offline");
        const parts = Object.fromEntries(
          (["profile", "settings", "program", "preferences", "onboarding", "log", "prs", "sessions", "checkins"] as const).map((p) => [p, server[p] ?? { rev: 0, data: null }]),
        );
        return { enabled: true, parts } as never;
      },
      async post(writes) {
        if (!online) throw new Error("offline");
        return writes.map((w) => {
          server[w.part] = { rev: (server[w.part]?.rev ?? 0) + 1, data: w.data };
          return { part: w.part, ok: true as const, rev: server[w.part].rev };
        });
      },
      readLocal: () => local,
      applyLocal: (c) => {
        local = { ...local, ...c };
      },
      getMeta: () => meta,
      setMeta: (m) => {
        meta = m;
      },
      now: () => "2026-10-29T01:00:00.000Z",
    };
    for (let i = 0; i < 3; i++) await syncOnce(io);
    expect(local.checkins).toEqual([entry]);
    expect(meta.parts.checkins?.dirty).toEqual(["*"]);
    expect(meta.state).toBe("pending");
    online = true;
    await syncOnce(io);
    expect(server.checkins?.data).toEqual([entry]);
    expect(meta.parts.checkins?.dirty).toEqual([]);
    expect(meta.state).toBe("ok");
  });
});
