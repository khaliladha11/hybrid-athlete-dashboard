import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultSettings, parseSettings } from "@/lib/athlete-settings";
import { applyBackup, buildBackup, parseBackup, type BackupStore, type ThemeValue } from "@/lib/backup";
import { advance, initialState, type OnboardingState } from "@/lib/onboarding";
import { baseProfile } from "@/lib/profile";

const NOW = "2026-10-22T03:00:00.000Z";
const entry = (id: string) => ({ id, date: "2026-01-05", movement: "Glute Bridge", kind: "reps", value: 12, sets: 3, target: { lo: 8, hi: 12 }, rpe: 6, targetRpe: 7 });

/** Penyimpanan di memori dengan perilaku log yang sama seperti `trainingLog.merge`. */
function memStore(init: Partial<{ settings: string; program: string; theme: string; block: string; log: { id: string }[] }> = {}) {
  const st = { settings: "", program: "", theme: "", block: "", log: [] as { id: string }[], prs: [] as unknown[], sessions: [] as unknown[], onboarding: null as OnboardingState | null, ...init };
  const store: BackupStore = {
    getSettingsRaw: () => st.settings,
    setSettingsRaw: (v) => (st.settings = v),
    getProgramRaw: () => st.program,
    setProgramRaw: (v) => (st.program = v),
    getThemeRaw: () => st.theme,
    setTheme: (v: ThemeValue) => (st.theme = v),
    getBlockRaw: () => st.block,
    setBlockEnabled: (v) => (st.block = v ? "1" : "0"),
    setOnboarding: (v) => (st.onboarding = v),
    mergeLog: (list) => {
      const valid = list.filter((e): e is { id: string } => !!e && typeof (e as { id?: unknown }).id === "string");
      const have = new Set(st.log.map((e) => e.id));
      const fresh = valid.filter((e) => !have.has(e.id));
      st.log = [...st.log, ...fresh];
      return { added: fresh.length, skipped: list.length - fresh.length };
    },
    mergePrs: (list) => {
      st.prs = [...st.prs, ...list];
      return { added: list.length, skipped: 0 };
    },
    mergeSessions: (list) => {
      st.sessions = [...st.sessions, ...list];
      return { added: list.length, skipped: 0 };
    },
  };
  return { st, store };
}

describe("ekspor v5", () => {
  it("berisi profil dasar dan status onboarding, lalu bisa dibaca kembali", () => {
    const settings = { ...defaultSettings(baseProfile), profile: { name: "Atlet Contoh", blockStart: "2026-01-05" } };
    const onboarding = advance(initialState(), {}, NOW);
    const file = buildBackup({ log: [entry("a")], settings, program: "{}", theme: "dark", blockEnabled: true, onboarding, now: NOW });
    expect(file).toMatchObject({ app: "hybrid-athlete", version: 5, kind: "backup" });
    const parsed = parseBackup(JSON.parse(JSON.stringify(file)))!;
    expect(parsed.version).toBe(5);
    expect(parsed.settings?.profile).toEqual({ name: "Atlet Contoh", blockStart: "2026-01-05" });
    expect(parsed.onboarding).toEqual(onboarding);
  });
});

describe("PR kemampuan di cadangan v4 (0.14.0)", () => {
  const pr = { id: "p1", movement: "Floor Press", loadKg: 10, date: "2026-10-25", source: "manual", updatedAt: "2026-10-25T00:00:00.000Z" };
  it("ekspor v4 membawa PR; impor v4 menggabungkan PR, juga untuk kind defaults", () => {
    const file = buildBackup({ log: [], settings: null, program: null, onboarding: null, prs: [pr], now: NOW });
    expect(file.prs).toEqual([pr]);
    const { st, store } = memStore();
    const parts = applyBackup(parseBackup({ app: "hybrid-athlete", version: 4, kind: "defaults", prs: [pr] })!, store, baseProfile);
    expect(st.prs).toEqual([pr]);
    expect(parts[0]).toBe("1 PR baru, 0 dilewati");
  });

  it("v2 & v3 tanpa PR tetap terbaca dan tidak menyentuh PR; prs di file v3 diabaikan", () => {
    const { st, store } = memStore();
    applyBackup(parseBackup({ version: 3, kind: "backup", settings: { conditions: ["apt"] }, prs: [pr] })!, store, baseProfile);
    applyBackup(parseBackup({ version: 2, log: [entry("a")] })!, store, baseProfile);
    expect(st.prs).toEqual([]);
  });
});

describe("impor", () => {
  it("v1 (array log) dan v2 tetap diterima", () => {
    expect(parseBackup([entry("a")])).toMatchObject({ version: 1, log: [entry("a")] });
    const v2 = parseBackup({ app: "hybrid-athlete", version: 2, log: [], settings: { conditions: ["apt"] }, preferences: { theme: "light", blockEnabled: false } })!;
    expect(v2).toMatchObject({ version: 2, kind: "backup", theme: "light", blockEnabled: false });
    const { st, store } = memStore();
    applyBackup(v2, store, baseProfile);
    expect(parseSettings(st.settings, baseProfile).conditions).toEqual(["apt"]);
    expect(st.theme).toBe("light");
    expect(st.block).toBe("0");
    expect(parseBackup({ halo: 1 })).toBeNull();
    expect(parseBackup("teks")).toBeNull();
  });

  it("impor tanpa log TIDAK menghapus log yang ada", () => {
    const { st, store } = memStore({ log: [entry("a"), entry("b")] });
    applyBackup(parseBackup({ version: 3, kind: "backup", settings: { profile: { name: "X" } } })!, store, baseProfile);
    expect(st.log.map((e) => e.id)).toEqual(["a", "b"]);
    applyBackup(parseBackup({ version: 3, kind: "defaults", settings: { profile: { name: "Y" } } })!, store, baseProfile);
    expect(st.log.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("log digabung tanpa duplikat", () => {
    const { st, store } = memStore({ log: [entry("a")] });
    const parts = applyBackup(parseBackup({ version: 3, log: [entry("a"), entry("c")] })!, store, baseProfile);
    expect(st.log.map((e) => e.id)).toEqual(["a", "c"]);
    expect(parts[0]).toBe("1 entri log baru, 1 dilewati");
  });

  it('kind "backup" menimpa pengaturan perangkat', () => {
    const device = JSON.stringify({ ...defaultSettings(baseProfile), conditions: ["shin"], profile: { name: "Lama" } });
    const { st, store } = memStore({ settings: device, program: "lama" });
    applyBackup(parseBackup({ version: 3, kind: "backup", settings: { conditions: ["apt"], profile: { name: "Baru" } }, program: "baru" })!, store, baseProfile);
    const s = parseSettings(st.settings, baseProfile);
    expect(s.conditions).toEqual(["apt"]);
    expect(s.profile.name).toBe("Baru");
    expect(st.program).toBe("baru");
  });

  it('kind "defaults" hanya mengisi yang kosong, kustomisasi perangkat tetap', () => {
    const device = parseSettings(
      { conditions: ["pfp"], equipment: { dumbbell: { enabled: true, handles: 1 }, barbell: { enabled: false }, plates: [], bands: [], pullUpBar: false, bench: false, bandAnchor: false, other: [] }, runZones: { easy: "7:00–7:30/km" }, profile: { age: 40 } },
      baseProfile,
    );
    const { st, store } = memStore({ settings: JSON.stringify(device), block: "0", theme: "light" });
    const defaults = parseBackup({
      app: "hybrid-athlete",
      version: 3,
      kind: "defaults",
      settings: {
        profile: { name: "Atlet Contoh", age: 23, raceTargets: ["Sub-30m 5K"], blockStart: "2026-01-05" },
        conditions: ["apt", "shin"],
        equipment: { dumbbell: { enabled: true, handles: 2 }, barbell: { enabled: true }, plates: [{ kg: 2, count: 4 }], bands: ["Light"], pullUpBar: true, bench: true, bandAnchor: true, other: [] },
        runZones: { easy: "8:00–8:50/km", tempo: "6:15–6:30/km" },
        movements: { "Negative Pull-Up": false },
      },
      preferences: { blockEnabled: true, theme: "dark" },
    })!;
    expect(defaults.kind).toBe("defaults");
    applyBackup(defaults, store, baseProfile);
    const s = parseSettings(st.settings, baseProfile);
    expect(s.profile).toEqual({ name: "Atlet Contoh", age: 40, raceTargets: ["Sub-30m 5K"], blockStart: "2026-01-05" });
    expect(s.conditions).toEqual(["pfp"]);
    expect(s.equipment.dumbbell.handles).toBe(1);
    expect(s.runZones).toEqual({ easy: "7:00–7:30/km", tempo: "6:15–6:30/km" });
    expect(s.movements).toEqual({ "Negative Pull-Up": false });
    expect(st.block).toBe("0");
    expect(st.theme).toBe("light");
  });

  it('kind "defaults": hasil lomba digabung, hasil di perangkat menang untuk jarak & tanggal yang sama (0.13.2)', () => {
    const device = parseSettings({ raceResults: [{ distance: "5k", seconds: 1500, date: "2026-02-01" }] }, baseProfile);
    const { st, store } = memStore({ settings: JSON.stringify(device) });
    const file = { version: 3, kind: "defaults", settings: { raceResults: [{ distance: "5k", seconds: 1600, date: "2026-02-01" }, { distance: "10k", seconds: 3300, date: "2026-01-10" }] } };
    applyBackup(parseBackup(file)!, store, baseProfile);
    expect(parseSettings(st.settings, baseProfile).raceResults).toEqual([
      { distance: "5k", seconds: 1500, date: "2026-02-01" },
      { distance: "10k", seconds: 3300, date: "2026-01-10" },
    ]);
  });

  it('kind "defaults" di perangkat kosong mengisi semuanya', () => {
    const { st, store } = memStore();
    applyBackup(parseBackup({ version: 3, kind: "defaults", settings: { conditions: ["apt"], profile: { name: "Atlet Contoh" } }, preferences: { blockEnabled: true } })!, store, baseProfile);
    const s = parseSettings(st.settings, baseProfile);
    expect(s.conditions).toEqual(["apt"]);
    expect(s.profile.name).toBe("Atlet Contoh");
    expect(st.block).toBe("1");
  });

  it("file migrasi buatan scripts/make-owner-settings.mjs terbaca sebagai defaults tanpa log", () => {
    // Bentuk file sama dengan keluaran script, memakai profil contoh (bukan data pribadi).
    const shape = JSON.parse(readFileSync("__tests__/fixtures/example-athlete.json", "utf8"));
    const file = {
      app: "hybrid-athlete",
      version: 3,
      kind: "defaults",
      settings: { version: 1, profile: { name: shape.name, goals: shape.targets.goals, raceTargets: shape.targets.raceTargets, blockStart: shape.training.blockStart }, conditions: shape.conditions, customConditions: [], runZones: { easy: shape.runZones.easy.pace }, equipment: shape.equipment, movements: {} },
      preferences: { blockEnabled: true },
    };
    const parsed = parseBackup(file)!;
    expect(parsed.kind).toBe("defaults");
    expect(parsed.log).toBeUndefined();
  });
});

describe("sesi ST di cadangan v5 (0.14.1)", () => {
  const s = { id: "s1", date: "2026-03-02", startedAt: "2026-03-02T00:00:00.000Z", type: "lower", title: "Lower", difficulty: "moderate", durationMin: 45, rpe: 6, setsDone: 12, setsPlanned: 12, movements: [], updatedAt: "2026-03-02T01:00:00.000Z" };
  it("ekspor v5 membawa sesi; impor v5 menggabungkan sesi", () => {
    const file = buildBackup({ log: [], settings: null, program: null, onboarding: null, sessions: [s], now: NOW });
    expect(file.sessions).toEqual([s]);
    const { st, store } = memStore();
    const parts = applyBackup(parseBackup({ app: "hybrid-athlete", version: 5, kind: "backup", sessions: [s] })!, store, baseProfile);
    expect(st.sessions).toEqual([s]);
    expect(parts[0]).toBe("1 sesi ST baru, 0 dilewati");
  });

  it("v4 tetap terbaca (PR ikut) dan sessions di file v4 diabaikan", () => {
    const { st, store } = memStore();
    applyBackup(parseBackup({ version: 4, kind: "backup", prs: [], sessions: [s] })!, store, baseProfile);
    expect(st.sessions).toEqual([]);
  });
});
