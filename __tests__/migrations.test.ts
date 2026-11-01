import { afterEach, describe, expect, it, vi } from "vitest";
import { PREF_KEYS } from "@/lib/preference-keys";
import { baseProfile } from "@/lib/profile";
import { DATA_SCHEMA_VERSION, migrate, MIGRATIONS, parseSchemaVersion, type DataParts } from "@/lib/migrations/schema";
import {
  deviceToParts,
  ensureDeviceMigrated,
  migrateDevice,
  parsePreMigration,
  PRE_MIGRATION_KEY,
  preMigrationBackup,
  resetDeviceMigrationForTest,
  SCHEMA_KEY,
  type DeviceRaw,
} from "@/lib/migrations/device";
import { applyBackup, parseBackup } from "@/lib/backup";
import { emptyMeta, syncOnce, type SyncIO, type SyncMeta } from "@/lib/sync/engine";
import { handleGet, handlePost } from "@/lib/sync/server";
import { memorySyncStore } from "@/lib/sync/store";
import type { PartData } from "@/lib/sync/parts";

vi.mock("server-only", () => ({}));

/** Data fiktif dalam bentuk lama (sebelum 0.12.1 – 0.14.3). */
const TODAY = "2026-03-02";
const ctx = { base: baseProfile, today: TODAY };
const oldLog = { date: "2026-01-05", movement: "Goblet Squat", load: 10, value: 10, valueUnit: "reps", target: { lo: 8, hi: 10 }, rpe: 6, targetRpe: 7, deload: false, blockIndex: 1 };
const oldProgram = JSON.stringify({
  race: "10k",
  goal: "1:05:00",
  startDate: "2026-01-05",
  runsPerWeek: 3,
  overrides: [
    { sessionId: "a", action: "move", toDate: "2026-01-08", decidedAt: "2026-01-06T00:00:00Z" },
    { sessionId: "b", action: "skip", decidedAt: "2026-01-07T00:00:00Z" },
  ],
});
const oldSettings = {
  version: 1,
  profile: { name: "Atlet Uji", lama: "dibuang" },
  conditions: ["shin"],
  equipment: { dumbbell: { enabled: true, handleKg: 2 }, barbell: { enabled: false }, plates: [{ kg: 2, count: 4 }], bands: [] },
  hrZones: { mode: "lthr", lthr: 170 },
};
const oldRaw = (): DeviceRaw => ({
  settings: JSON.stringify(oldSettings),
  program: oldProgram,
  theme: "dark",
  blockEnabled: "1",
  onboarding: null,
  log: JSON.stringify([oldLog]),
  prs: null,
  sessions: null,
  checkins: null,
});

describe("daftar migrasi", () => {
  it("berurutan 1..N tanpa lubang; versi sekarang = migrasi terakhir", () => {
    expect(MIGRATIONS.map((m) => m.to)).toEqual(MIGRATIONS.map((_, i) => i + 1));
    expect(DATA_SCHEMA_VERSION).toBe(MIGRATIONS[MIGRATIONS.length - 1].to);
    for (const m of MIGRATIONS) expect(m.title).not.toMatch(/[—–]/);
  });

  it("versi tersimpan: kosong/rusak = 0", () => {
    expect([null, "", "x", "-1", "1.5", undefined].map(parseSchemaVersion)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(parseSchemaVersion("1")).toBe(1);
    expect(parseSchemaVersion(2)).toBe(2);
  });
});

describe("migrasi 1 · bentuk kanonis sampai 0.17", () => {
  const parts = deviceToParts(oldRaw());
  const r = migrate(parts, 0, ctx);

  it("log diberi id & updatedAt, program mendapat Hari H dan geser dibuang, alat mendapat items, field asing dibuang", () => {
    const log = r.parts.log as { id: string; updatedAt: string }[];
    expect(log).toHaveLength(1);
    expect(log[0].id).toBeTruthy();
    expect(log[0].updatedAt).toBe("2026-01-05T00:00:00.000Z");
    const program = JSON.parse(r.parts.program as string);
    expect(program.raceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(program.overrides).toEqual([{ sessionId: "b", action: "skip", decidedAt: "2026-01-07T00:00:00Z" }]);
    expect((r.parts.settings as { equipment: { items: unknown[] } }).equipment.items).toEqual([]);
    expect((r.parts.settings as { hrZones: unknown }).hrZones).toEqual({ mode: "lthr", lthr: 170 });
    expect(r.parts.profile).toEqual({ name: "Atlet Uji" });
    expect(r).toMatchObject({ from: 0, to: 1, newer: false });
    expect(r.applied).toHaveLength(1);
  });

  it("idempoten: diulang atau dijalankan pada data yang sudah baru, hasilnya sama", () => {
    expect(migrate(r.parts, 0, ctx).parts).toEqual(r.parts);
    expect(migrate(r.parts, 1, ctx)).toEqual({ parts: r.parts, from: 1, to: 1, applied: [], newer: false });
  });

  it("bagian yang tidak ada tetap tidak ada; nilai rusak dibiarkan", () => {
    const out = migrate({ log: "bukan daftar", program: "{rusak" } as DataParts, 0, ctx).parts;
    expect(out).toEqual({ log: "bukan daftar", program: "{rusak" });
    expect(migrate({}, 0, ctx).parts).toEqual({});
  });

  it("data dari versi yang lebih baru tidak disentuh", () => {
    expect(migrate(parts, DATA_SCHEMA_VERSION + 1, ctx)).toEqual({ parts, from: DATA_SCHEMA_VERSION + 1, to: DATA_SCHEMA_VERSION + 1, applied: [], newer: true });
  });
});

describe("perangkat", () => {
  it("versi 0 → snapshot isi mentah dulu, lalu tulis yang berubah saja; tema & blok tidak disentuh", () => {
    const plan = migrateDevice(oldRaw(), null, ctx, "2026-03-02T01:00:00.000Z");
    if (plan.kind !== "migrate") throw new Error(plan.kind);
    expect(plan.snapshot).toEqual({ from: 0, to: 1, at: "2026-03-02T01:00:00.000Z", raw: { settings: oldRaw().settings, program: oldProgram, theme: "dark", blockEnabled: "1", log: oldRaw().log } });
    expect(Object.keys(plan.writes).sort()).toEqual(["log", "program", "settings"]);
    // Hasil tulisan dimigrasi lagi = tidak ada yang berubah.
    const after = { ...oldRaw(), ...plan.writes };
    const again = migrateDevice(after, "0", ctx, "x");
    expect(again.kind === "migrate" && again.writes).toEqual({});
    expect(again.kind === "migrate" && again.snapshot).toBeNull();
    expect(migrateDevice(after, "1", ctx, "x")).toEqual({ kind: "current" });
    expect(migrateDevice(after, "9", ctx, "x")).toEqual({ kind: "newer", version: 9 });
  });

  it("perangkat kosong: tanpa snapshot, versi tetap dicatat", () => {
    const empty = Object.fromEntries(Object.keys(oldRaw()).map((k) => [k, null])) as DeviceRaw;
    expect(migrateDevice(empty, null, ctx, "x")).toEqual({ kind: "migrate", from: 0, to: 1, writes: {}, snapshot: null, applied: [MIGRATIONS[0].title] });
  });

  it("snapshot pra-migrasi bisa diimpor kembali sebagai cadangan", () => {
    const plan = migrateDevice(oldRaw(), null, ctx, "2026-03-02T01:00:00.000Z");
    if (plan.kind !== "migrate" || !plan.snapshot) throw new Error("tanpa snapshot");
    const snap = parsePreMigration(JSON.stringify(plan.snapshot))!;
    const parsed = parseBackup(JSON.parse(JSON.stringify(preMigrationBackup(snap))), baseProfile, TODAY)!;
    expect(parsed).toMatchObject({ version: 7, kind: "backup", theme: "dark", blockEnabled: true });
    expect(parsed.log).toHaveLength(1);
    expect(parsePreMigration("rusak")).toBeNull();
  });

  describe("ensureDeviceMigrated (localStorage tiruan)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      resetDeviceMigrationForTest();
    });
    const stub = (init: Record<string, string>) => {
      const m = new Map(Object.entries(init));
      vi.stubGlobal("window", {});
      vi.stubGlobal("localStorage", {
        getItem: (k: string) => m.get(k) ?? null,
        setItem: (k: string, v: string) => void m.set(k, v),
        removeItem: (k: string) => void m.delete(k),
      });
      return m;
    };

    it("sekali per halaman: snapshot, data baru, versi", () => {
      const m = stub({ [PREF_KEYS.log]: JSON.stringify([oldLog]), [PREF_KEYS.program]: oldProgram });
      ensureDeviceMigrated();
      expect(m.get(SCHEMA_KEY)).toBe(String(DATA_SCHEMA_VERSION));
      expect(JSON.parse(m.get(PRE_MIGRATION_KEY)!).raw.log).toBe(JSON.stringify([oldLog]));
      expect(JSON.parse(m.get(PREF_KEYS.log)!)[0].id).toBeTruthy();
      m.set(PREF_KEYS.log, "[]");
      ensureDeviceMigrated();
      expect(m.get(PREF_KEYS.log)).toBe("[]");
    });

    it("gagal menulis: versi tidak naik, snapshot tetap ada", () => {
      const m = stub({ [PREF_KEYS.log]: JSON.stringify([oldLog]) });
      const ls = localStorage as unknown as { setItem: (k: string, v: string) => void };
      const real = ls.setItem;
      ls.setItem = (k, v) => {
        if (k === PREF_KEYS.log) throw new Error("penuh");
        real(k, v);
      };
      ensureDeviceMigrated();
      expect(m.has(SCHEMA_KEY)).toBe(false);
      expect(m.has(PRE_MIGRATION_KEY)).toBe(true);
      expect(m.get(PREF_KEYS.log)).toBe(JSON.stringify([oldLog]));
    });
  });
});

describe("server sinkron", () => {
  const seed = () => {
    const s = memorySyncStore();
    s.raw.set("log", { rev: 4, data: JSON.stringify([oldLog]) });
    s.raw.set("program", { rev: 2, data: JSON.stringify(oldProgram) });
    return s;
  };
  const NOW = new Date("2026-03-02T01:00:00.000Z");

  it("data tanpa versi: snapshot before-migrate, tulis bersyarat, versi disimpan, sekali saja", async () => {
    const s = seed();
    const out = await handleGet(s, baseProfile, NOW);
    if ("blocked" in out) throw new Error("blocked");
    expect(s.schema.value).toBe(String(DATA_SCHEMA_VERSION));
    const snaps = await s.listSnapshots();
    expect(snaps.map((x) => x.kind).sort()).toEqual(["before-migrate", "daily"]);
    const before = await s.getSnapshot(snaps.find((x) => x.kind === "before-migrate")!.id);
    expect(before!.log.data).toEqual([oldLog]);
    expect(out.parts.log.rev).toBe(5);
    expect(JSON.parse(out.parts.program.data as string).overrides).toHaveLength(1);
    await handleGet(s, baseProfile, NOW);
    expect((await s.listSnapshots()).filter((x) => x.kind === "before-migrate")).toHaveLength(1);
    expect(s.raw.get("log")!.rev).toBe(5);
  });

  it("bentrok saat migrasi: versi tidak disimpan, dicoba lagi", async () => {
    const s = seed();
    const write = s.writeMany.bind(s);
    s.writeMany = async (w) => (await write(w)).map((r) => (r.part === "log" ? { part: "log", ok: false, rev: 9, data: null } : r));
    await handleGet(s, baseProfile, NOW);
    expect(s.schema.value).toBeNull();
  });

  it("database kosong: versi langsung dicatat tanpa snapshot", async () => {
    const s = memorySyncStore();
    await handleGet(s, baseProfile, NOW);
    expect(s.schema.value).toBe(String(DATA_SCHEMA_VERSION));
    expect(await s.listSnapshots()).toEqual([]);
  });

  it("data dari versi yang lebih baru: GET diblokir, POST 409, tidak ada yang ditulis", async () => {
    const s = seed();
    s.schema.value = String(DATA_SCHEMA_VERSION + 1);
    expect(await handleGet(s, baseProfile, NOW)).toEqual({ enabled: true, blocked: "schema-newer" });
    const post = await handlePost(s, JSON.stringify({ writes: [{ part: "program", baseRev: 2, data: null }] }), baseProfile);
    expect(post).toEqual({ status: 409, body: { error: "schema_newer" } });
    expect(s.raw.get("program")!.rev).toBe(2);
    expect(await s.listSnapshots()).toEqual([]);
  });

  it("klien: sinkron berhenti dengan tanda blocked tanpa mengirim, lalu pulih saat server cocok lagi", async () => {
    let meta: SyncMeta = emptyMeta();
    const post = vi.fn();
    let blocked = true;
    const local: PartData = { profile: null, settings: null, program: null, preferences: {}, onboarding: null, log: [], prs: [], sessions: [], checkins: [] };
    const io: SyncIO = {
      get: async () => (blocked ? { enabled: true, blocked: "schema-newer" } : { enabled: false }),
      post,
      readLocal: () => local,
      applyLocal: () => {},
      getMeta: () => meta,
      setMeta: (m) => (meta = m),
      now: () => "2026-03-02T01:00:00.000Z",
    };
    expect((await syncOnce(io)).blocked).toBe("schema-newer");
    expect(post).not.toHaveBeenCalled();
    blocked = false;
    expect((await syncOnce(io)).blocked).toBeUndefined();
  });
});

describe("cadangan", () => {
  it("impor menjalankan migrasi yang sama: program lama tanpa geser, log lama ber-id", () => {
    const parsed = parseBackup({ version: 3, kind: "backup", log: [oldLog], program: oldProgram, settings: { conditions: ["shin"] } }, baseProfile, TODAY)!;
    expect(JSON.parse(parsed.program!).overrides).toHaveLength(1);
    expect((parsed.log![0] as { id: string }).id).toBeTruthy();
    // Kunci setting yang tidak ada di file tetap tidak ada (penting untuk kind "defaults").
    expect(Object.keys(parsed.settings!)).toEqual(["conditions"]);
    const st: string[] = [];
    applyBackup(parsed, { getSettingsRaw: () => "", setSettingsRaw: (v) => void st.push(v), getProgramRaw: () => "", setProgramRaw: () => {}, getThemeRaw: () => "", setTheme: () => {}, getBlockRaw: () => "", setBlockEnabled: () => {}, setOnboarding: () => {}, mergeLog: () => ({ added: 1, skipped: 0 }), mergePrs: () => ({ added: 0, skipped: 0 }), mergeSessions: () => ({ added: 0, skipped: 0 }), mergeCheckins: () => ({ added: 0, skipped: 0 }) }, baseProfile);
    expect(JSON.parse(st[0]).conditions).toEqual(["shin"]);
  });
});
