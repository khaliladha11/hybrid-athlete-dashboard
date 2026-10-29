import { describe, expect, it, vi } from "vitest";
import { defaultSettings, parseSettings } from "@/lib/athlete-settings";
import { applyBackup, buildBackup, parseBackup, type BackupStore } from "@/lib/backup";
import { mergeCheckins, normalizeCheckins, type Checkin } from "@/lib/checkin";
import { isLive, mergeLogs, normalizeLog, tombstone } from "@/lib/log-entries";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { mergePrs, normalizePrs } from "@/lib/prs";
import { mergeSessions, normalizeSessions, type StSession } from "@/lib/st-session";
import { emptyMeta, syncOnce, type ServerParts, type SyncIO, type SyncMeta } from "@/lib/sync/engine";
import { emptyPart, PART_NAMES, type PartData } from "@/lib/sync/parts";
import { handleGet, handleListSnapshots, handleRestore } from "@/lib/sync/server";
import { memorySyncStore, type SyncStore } from "@/lib/sync/store";

vi.mock("server-only", () => ({}));

/**
 * Latihan pemulihan data (0.16, docs/RELEASE-1.0.md #5; checklist manual di docs/SYNC.md "Latihan pemulihan").
 * Semua data fiktif.
 */

const log = (id: string, date = "2026-01-05"): LogEntry => ({
  id,
  date,
  movement: "Goblet Squat",
  load: 10,
  value: 10,
  valueUnit: "reps",
  target: { lo: 8, hi: 10 },
  rpe: 6,
  targetRpe: 7,
  deload: false,
  blockIndex: 1,
  updatedAt: `${date}T08:00:00.000Z`,
});
const session: StSession = {
  id: "s1",
  date: "2026-01-05",
  startedAt: "2026-01-05T12:00:00.000Z",
  type: "lower",
  title: "Lower",
  difficulty: "moderate",
  durationMin: 40,
  rpe: 6,
  setsDone: 6,
  setsPlanned: 6,
  movements: ["Goblet Squat"],
  sets: [{ movement: "Goblet Squat", load: 10, value: 10, unit: "reps" }],
  updatedAt: "2026-01-05T13:00:00.000Z",
};
const checkin: Checkin = { date: "2026-01-05", shin: 3, sleep: 4, updatedAt: "2026-01-05T01:00:00.000Z" };
const pr = { id: "p1", movement: "Floor Press", loadKg: 10, date: "2026-01-05", source: "manual" as const, updatedAt: "2026-01-05T00:00:00.000Z" };
/** 2026-01-05 jam WIB → Date. */
const at = (day: number, hourWib = 10) => new Date(Date.UTC(2026, 0, day, hourWib - 7));

/** Perangkat dengan penyimpanan lokal & meta sinkron, terhubung ke store server memori. */
function device(store: SyncStore, initial: Partial<PartData> = {}) {
  let local: PartData = { profile: null, settings: null, program: null, preferences: {}, onboarding: null, log: [], prs: [], sessions: [], checkins: [], ...initial };
  let meta: SyncMeta = emptyMeta();
  const io: SyncIO = {
    async get() {
      const out = await handleGet(store, baseProfile, at(5));
      const parts = Object.fromEntries(PART_NAMES.map((p) => [p, { ...out.parts[p], data: out.parts[p].data ?? emptyPart(p) }])) as ServerParts;
      return { enabled: true, parts };
    },
    post: (w) => store.writeMany(w),
    readLocal: () => local,
    applyLocal: (c) => (local = { ...local, ...c }),
    getMeta: () => meta,
    setMeta: (m) => (meta = m),
    now: () => "2026-01-05T12:00:00.000Z",
  };
  return {
    io,
    get local() {
      return local;
    },
    edit(change: Partial<PartData>) {
      local = { ...local, ...change };
      meta = { ...meta, parts: Object.fromEntries(Object.entries(meta.parts).map(([k, v]) => [k, k in change ? { ...v!, dirty: ["*"], gen: v!.gen + 1 } : v])) };
    },
  };
}

const FULL: Partial<PartData> = { profile: { name: "Atlet Uji" }, log: [log("a"), log("b")], sessions: [session], checkins: [checkin], prs: [pr], program: '{"race":"hm"}' };

describe("skenario 1 · HP hilang, pindah ke perangkat baru", () => {
  it("perangkat baru kosong mengambil semua bagian; data server tidak tertimpa", async () => {
    const store = memorySyncStore();
    const lama = device(store, FULL);
    await syncOnce(lama.io);
    const before = await store.readAll();

    const baru = device(store);
    await syncOnce(baru.io); // "Sambungkan perangkat ini" = aktivasi pertama
    expect(baru.local.profile).toEqual({ name: "Atlet Uji" });
    expect(baru.local.log.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(baru.local.sessions).toEqual([session]);
    expect(baru.local.checkins).toEqual([checkin]);
    expect(baru.local.prs.map((p) => p.id)).toEqual(["p1"]);
    expect(baru.local.program).toBe('{"race":"hm"}');
    const after = await store.readAll();
    for (const p of PART_NAMES) expect(after[p].data, p).toEqual(before[p].data);
  });
});

describe("skenario 2 · data browser terhapus", () => {
  it("dengan sinkron: perangkat yang sama, penyimpanan kosong, data kembali dari server", async () => {
    const store = memorySyncStore();
    await syncOnce(device(store, FULL).io);
    const terhapus = device(store); // localStorage & meta sinkron ikut hilang
    await syncOnce(terhapus.io);
    expect(terhapus.local.log).toHaveLength(2);
    expect(terhapus.local.checkins).toEqual([checkin]);
  });
});

/** Penyimpanan perangkat untuk impor cadangan, memakai gabungan asli (tanpa duplikat). */
function backupDevice(init: { settings?: string; log?: LogEntry[] } = {}) {
  const st = { settings: init.settings ?? "", program: "", theme: "", block: "", log: init.log ?? [], prs: [] as ReturnType<typeof normalizePrs>, sessions: [] as StSession[], checkins: [] as Checkin[] };
  const count = <T>(before: T[], after: T[], incoming: unknown[]) => ({ added: after.length - before.length, skipped: incoming.length - (after.length - before.length) });
  const store: BackupStore = {
    getSettingsRaw: () => st.settings,
    setSettingsRaw: (v) => (st.settings = v),
    getProgramRaw: () => st.program,
    setProgramRaw: (v) => (st.program = v),
    getThemeRaw: () => st.theme,
    setTheme: (v) => (st.theme = v),
    getBlockRaw: () => st.block,
    setBlockEnabled: (v) => (st.block = v ? "1" : "0"),
    setOnboarding: () => {},
    mergeLog: (e) => {
      const before = st.log;
      st.log = mergeLogs(st.log, normalizeLog(e).entries);
      return count(before, st.log, e);
    },
    mergePrs: (e) => {
      const before = st.prs;
      st.prs = mergePrs(st.prs, normalizePrs(e));
      return count(before, st.prs, e);
    },
    mergeSessions: (e) => {
      const before = st.sessions;
      st.sessions = mergeSessions(st.sessions, normalizeSessions(e));
      return count(before, st.sessions, e);
    },
    mergeCheckins: (e) => {
      const before = st.checkins;
      st.checkins = mergeCheckins(st.checkins, normalizeCheckins(e));
      return count(before, st.checkins, e);
    },
  };
  return { st, store };
}

describe("skenario 3 · cadangan lama v2 sampai v6", () => {
  const files: [number, Record<string, unknown>][] = [
    [2, { version: 2, log: [log("a")], settings: { conditions: ["apt"] }, preferences: { theme: "dark" } }],
    [3, { version: 3, kind: "backup", log: [log("a")], settings: { conditions: ["apt"], profile: { name: "Atlet Uji" } } }],
    [4, { version: 4, kind: "backup", log: [log("a")], prs: [pr] }],
    [5, { version: 5, kind: "backup", log: [log("a")], prs: [pr], sessions: [session] }],
    [6, buildBackup({ log: [log("a")], settings: null, program: null, onboarding: null, prs: [pr], sessions: [session], checkins: [checkin], now: "2026-01-06T00:00:00.000Z" }) as unknown as Record<string, unknown>],
  ];

  for (const [v, file] of files) {
    it(`v${v}: ke perangkat kosong lalu ke perangkat berisi, tanpa kehilangan & tanpa duplikat`, () => {
      const parsed = parseBackup(JSON.parse(JSON.stringify(file)))!;
      expect(parsed.version).toBe(v);
      const kosong = backupDevice();
      applyBackup(parsed, kosong.store, baseProfile);
      expect(kosong.st.log.filter(isLive).map((e) => e.id)).toEqual(["a"]);
      if (v >= 4) expect(kosong.st.prs.map((p) => p.id)).toEqual(["p1"]);
      if (v >= 5) expect(kosong.st.sessions.map((s) => s.id)).toEqual(["s1"]);
      if (v >= 6) expect(kosong.st.checkins).toEqual([checkin]);

      const berisi = backupDevice({ log: [log("lokal", "2026-01-04")] });
      applyBackup(parsed, berisi.store, baseProfile);
      applyBackup(parsed, berisi.store, baseProfile); // impor dua kali
      expect(berisi.st.log.filter(isLive).map((e) => e.id).sort()).toEqual(["a", "lokal"]);
    });
  }

  it("kind defaults hanya mengisi yang kosong; pengaturan yang ada tidak ditimpa", () => {
    const mine = JSON.stringify({ ...defaultSettings(baseProfile), conditions: ["shin"], profile: { name: "Pemilik" } });
    const d = backupDevice({ settings: mine });
    applyBackup(parseBackup({ version: 3, kind: "defaults", settings: { conditions: ["apt"], profile: { name: "Lain", age: 30 } } })!, d.store, baseProfile);
    const s = parseSettings(d.st.settings, baseProfile);
    expect(s.conditions).toEqual(["shin"]);
    expect(s.profile.name).toBe("Pemilik");
    expect(s.profile.age).toBe(30);
  });
});

describe("skenario 4 · pulihkan snapshot harian", () => {
  it("entri yang terhapus kembali; keadaan sebelum pulihkan disimpan dan bisa dipakai membatalkan", async () => {
    const store = memorySyncStore();
    const hp = device(store, FULL);
    await syncOnce(hp.io);
    await syncOnce(hp.io); // snapshot harian dibuat saat server sudah berisi
    hp.edit({ log: [tombstone(log("a"), "2026-01-05T06:00:00.000Z"), log("b")] });
    await syncOnce(hp.io);
    expect(hp.local.log.filter(isLive).map((e) => e.id)).toEqual(["b"]);

    const restored = await handleRestore(store, JSON.stringify({ id: "daily-2026-01-05" }), baseProfile, at(5, 14));
    expect(restored.status).toBe(200);
    await syncOnce(hp.io);
    expect(hp.local.log.filter(isLive).map((e) => e.id).sort()).toEqual(["a", "b"]);

    // Batalkan: snapshot "sebelum pulihkan" tersedia di daftar.
    const list = await handleListSnapshots(store);
    const undo = list.snapshots.find((s) => s.id.startsWith("before-restore"));
    expect(undo).toBeDefined();
    await handleRestore(store, JSON.stringify({ id: undo!.id }), baseProfile, at(5, 15));
    await syncOnce(hp.io);
    expect(hp.local.log.filter(isLive).map((e) => e.id)).toEqual(["b"]);
  });
});
