import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyBackup, parseBackup, type BackupStore } from "@/lib/backup";
import { compactTombstones, contentId, isLive, mergeLogs, normalizeLog, normalizeLogEntry, pickEntry, tombstone } from "@/lib/log-entries";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";

// Entri fiktif.
const base = {
  date: "2026-01-05",
  movement: "Goblet Squat",
  load: 10,
  value: 10,
  valueUnit: "reps" as const,
  target: { lo: 8, hi: 10 },
  rpe: 6,
  targetRpe: 7,
  deload: false,
  blockIndex: 1,
};
const entry = (id: string, extra: Partial<LogEntry> = {}): LogEntry => ({ ...base, id, updatedAt: "2026-01-05T10:00:00.000Z", ...extra });

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}
let storage: MemoryStorage;
const KEY = "hybrid-athlete.log.v1";
async function freshLog() {
  vi.resetModules();
  return (await import("@/lib/training-log")).trainingLog;
}

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
});

describe("migrasi entri log", () => {
  it("entri tanpa id diberi id deterministik (sama di dua perangkat) dan updatedAt tengah malam UTC", () => {
    const a = normalizeLogEntry({ ...base });
    const b = normalizeLogEntry(JSON.parse(JSON.stringify(base)));
    expect(a?.id).toMatch(/^m-[0-9a-f]{16}$/);
    expect(a?.id).toBe(b?.id);
    expect(a?.updatedAt).toBe("2026-01-05T00:00:00.000Z");
    expect(contentId({ ...base, value: 11 })).not.toBe(a?.id);
  });

  it("entri rusak dibuang; entri yang sudah lengkap tidak diubah", () => {
    const ok = entry("u1");
    expect(normalizeLogEntry(ok)).toBe(ok);
    for (const bad of [null, 1, "x", [], { ...base, date: "5 Jan" }, { ...base, value: "10" }]) expect(normalizeLogEntry(bad)).toBeNull();
  });

  it("baca pertama memigrasi isi localStorage lama sekali, lalu stabil", async () => {
    storage.setItem(KEY, JSON.stringify([{ ...base }, { id: "u2", ...base, date: "2026-01-06" }, { rusak: true }]));
    const log = await freshLog();
    const all = log.all();
    expect(all).toHaveLength(2);
    expect(all.every((e) => e.id && e.updatedAt)).toBe(true);
    const saved = storage.getItem(KEY);
    expect(JSON.parse(saved!)).toEqual(all);
    const again = await freshLog();
    again.all();
    expect(storage.getItem(KEY)).toBe(saved);
  });
});

describe("tombstone", () => {
  it("remove & clear menulis tombstone; entri hidup dan ekspor tanpa tombstone", async () => {
    const log = await freshLog();
    log.add([entry("a"), entry("b", { date: "2026-01-06" }), entry("c", { date: "2026-01-07" })]);
    log.remove("a");
    expect(log.all().find((e) => e.id === "a")?.deletedAt).toBeTruthy();
    expect(JSON.parse(log.exportJson()).map((e: LogEntry) => e.id)).toEqual(["b", "c"]);
    log.clear();
    expect(log.all()).toHaveLength(3);
    expect(log.all().every((e) => e.deletedAt)).toBe(true);
    expect(JSON.parse(log.exportJson())).toEqual([]);
  });

  it("impor tidak menghidupkan lagi entri yang sudah dihapus; entri baru ditambahkan", async () => {
    const log = await freshLog();
    log.add([entry("a")]);
    log.remove("a");
    const r = log.merge([entry("a"), entry("z", { date: "2026-01-09" })]);
    expect(r).toMatchObject({ added: 1, skipped: 1 });
    expect(log.all().filter(isLive).map((e) => e.id)).toEqual(["z"]);
  });

  it("impor v1 (array), v2, dan v3 lama tetap jalan, termasuk entri tanpa id", async () => {
    const log = await freshLog();
    const store: BackupStore = {
      getSettingsRaw: () => "",
      setSettingsRaw: () => {},
      getProgramRaw: () => "",
      setProgramRaw: () => {},
      getThemeRaw: () => "",
      setTheme: () => {},
      getBlockRaw: () => "",
      setBlockEnabled: () => {},
      setOnboarding: () => {},
      mergeLog: (e) => log.merge(e),
    };
    applyBackup(parseBackup([{ ...base }])!, store, baseProfile);
    applyBackup(parseBackup({ version: 2, log: [entry("v2", { date: "2026-01-06" })] })!, store, baseProfile);
    applyBackup(parseBackup({ app: "hybrid-athlete", version: 3, kind: "backup", log: [entry("v3", { date: "2026-01-07" })] })!, store, baseProfile);
    expect(log.all().filter(isLive)).toHaveLength(3);
  });

  it("tombstone berumur > 90 hari dipadatkan; yang lebih muda dipertahankan", () => {
    const now = Date.parse("2026-06-01T00:00:00Z");
    const old = tombstone(entry("o"), "2026-02-01T00:00:00.000Z");
    const young = tombstone(entry("y"), "2026-05-01T00:00:00.000Z");
    expect(compactTombstones([old, young, entry("l")], now).map((e) => e.id)).toEqual(["y", "l"]);
  });
});

describe("gabungan log per id", () => {
  const A = [entry("a"), entry("b", { date: "2026-01-06" })];
  const B = [tombstone(entry("a"), "2026-01-08T00:00:00.000Z"), entry("c", { date: "2026-01-07" })];

  it("dua perangkat: entri baru keduanya masuk, hapus di satu perangkat ikut", () => {
    const m = mergeLogs(A, B);
    expect(m.map((e) => [e.id, !!e.deletedAt])).toEqual([["a", true], ["b", false], ["c", false]]);
  });

  it("tombstone menang atas versi hidup yang lebih baru", () => {
    const dead = tombstone(entry("a"), "2026-01-06T00:00:00.000Z");
    const editedLater = entry("a", { updatedAt: "2026-02-01T00:00:00.000Z", value: 12 });
    expect(pickEntry(dead, editedLater)).toBe(dead);
    expect(pickEntry(editedLater, dead)).toBe(dead);
  });

  it("idempoten, komutatif, dan urutan acak menghasilkan hasil sama", () => {
    const lists = [A, B, [entry("b", { date: "2026-01-06", updatedAt: "2026-01-09T00:00:00.000Z", value: 11 })], [entry("d", { date: "2026-01-04" })]];
    const expected = mergeLogs(...lists);
    expect(mergeLogs(expected, expected)).toEqual(expected);
    expect(mergeLogs(A, B)).toEqual(mergeLogs(B, A));
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed / 2 ** 31);
    for (let i = 0; i < 50; i++) {
      const shuffled = [...lists].sort(() => rand() - 0.5).map((l) => [...l].sort(() => rand() - 0.5));
      expect(mergeLogs(...shuffled)).toEqual(expected);
    }
  });

  it("normalizeLog menghapus duplikat id", () => {
    expect(normalizeLog([entry("a"), entry("a")]).entries).toHaveLength(1);
  });
});
