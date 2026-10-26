import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/athlete-settings";
import { tombstone } from "@/lib/log-entries";
import { initialState, STEPS, type OnboardingState } from "@/lib/onboarding";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { changedKeys, mergeOnboarding, mergePart, WHOLE } from "@/lib/sync/merge";
import { emptyPart, hasData, localFromParts, partsFromLocal, validatePart, type PartData, type SettingsPart } from "@/lib/sync/parts";

// Data fiktif.
const entry = (id: string, date = "2026-01-05", extra: Partial<LogEntry> = {}): LogEntry => ({
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
  ...extra,
});
const d = defaultSettings(baseProfile);
const settings = (patch: Partial<SettingsPart> = {}): SettingsPart => ({
  conditions: d.conditions,
  customConditions: d.customConditions,
  runZones: d.runZones,
  equipment: d.equipment,
  movements: d.movements,
  raceResults: d.raceResults,
  ...patch,
});
const done = (patch: Partial<OnboardingState> = {}): OnboardingState => ({
  ...initialState(),
  currentStep: "summary",
  completed: [...STEPS],
  termsVersion: 1,
  termsAcceptedAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

describe("bagian data ↔ localStorage", () => {
  it("bolak-balik tanpa kehilangan isi", () => {
    const parts: PartData = {
      profile: { name: "Alex", age: 30 },
      settings: settings({ conditions: ["shin"], movements: { "Push-Up": true } }),
      program: '{"race":"10k"}',
      preferences: { theme: "dark", blockEnabled: false },
      onboarding: done(),
      log: [entry("a")],
    };
    const raw = localFromParts(parts, baseProfile);
    expect(partsFromLocal(raw, parts.log, baseProfile)).toEqual(parts);
  });

  it("perangkat kosong → bagian kosong; tema sistem & blok default tidak disimpan", () => {
    const empty = partsFromLocal({ settings: null, program: null, theme: null, blockEnabled: null, onboarding: null }, [], baseProfile);
    expect(empty).toEqual({ profile: null, settings: null, program: null, preferences: {}, onboarding: null, log: [] });
    expect(localFromParts(empty, baseProfile)).toEqual({ settings: null, program: null, theme: null, blockEnabled: null, onboarding: null });
    for (const n of ["profile", "settings", "program", "preferences", "onboarding", "log"] as const) expect(hasData(n, emptyPart(n))).toBe(false);
  });

  it("validasi menolak payload rusak dan membersihkan field asing", () => {
    expect(validatePart("profile", "x", baseProfile)).toBeUndefined();
    expect(validatePart("profile", { name: "Alex", hack: "<script>" }, baseProfile)).toEqual({ name: "Alex" });
    expect(validatePart("settings", [], baseProfile)).toBeUndefined();
    expect(validatePart("settings", { conditions: ["shin", "bukan-kondisi"] }, baseProfile)?.conditions).toEqual(["shin"]);
    expect(validatePart("program", 42, baseProfile)).toBeUndefined();
    expect(validatePart("program", "x".repeat(70_000), baseProfile)).toBeUndefined();
    expect(validatePart("preferences", { theme: "neon", blockEnabled: "ya" }, baseProfile)).toEqual({});
    expect(validatePart("onboarding", { version: 9 }, baseProfile)).toBeUndefined();
    expect(validatePart("log", "x", baseProfile)).toBeUndefined();
    expect(validatePart("log", Array.from({ length: 5001 }, (_, i) => entry(`e${i}`)), baseProfile)).toBeUndefined();
    expect(validatePart("log", [entry("a"), { rusak: 1 }], baseProfile)).toEqual([entry("a")]);
  });
});

describe("kunci yang berubah", () => {
  it("settings & preferences per kunci; bagian lain utuh", () => {
    expect(changedKeys("settings", settings(), settings({ conditions: ["shin"] }))).toEqual(["conditions"]);
    expect(changedKeys("preferences", { theme: "dark" }, {})).toEqual(["theme"]);
    expect(changedKeys("profile", { name: "A" }, { name: "B" })).toEqual([WHOLE]);
    expect(changedKeys("settings", settings(), null)).toEqual([WHOLE]);
    expect(changedKeys("log", [entry("a")], [entry("a")])).toEqual([]);
  });
});

describe("merge per bagian", () => {
  it("profile & program: lokal menang hanya bila dirty", () => {
    expect(mergePart("profile", { name: "Server" }, { name: "Lokal" }, [WHOLE])).toEqual({ name: "Lokal" });
    expect(mergePart("profile", { name: "Server" }, { name: "Lokal" }, [])).toEqual({ name: "Server" });
    expect(mergePart("program", "s", "l", [])).toBe("s");
  });

  it("settings per sub-bagian: perubahan berbeda di dua perangkat sama-sama bertahan", () => {
    const server = settings({ conditions: ["shin"] }); // perangkat A mengubah kondisi
    const local = settings({ movements: { "Push-Up": false } }); // perangkat B mengubah gerakan
    const m = mergePart("settings", server, local, ["movements"]);
    expect(m?.conditions).toEqual(["shin"]);
    expect(m?.movements).toEqual({ "Push-Up": false });
  });

  it("reset pengaturan (lokal null & dirty) menghapus di server; null tanpa dirty mengambil server", () => {
    expect(mergePart("settings", settings(), null, [WHOLE])).toBeNull();
    expect(mergePart("settings", settings(), null, [])).toEqual(settings());
  });

  it("preferences per kunci; kembali ke tema sistem ikut tersinkron", () => {
    expect(mergePart("preferences", { theme: "dark", blockEnabled: true }, { blockEnabled: true }, ["theme"])).toEqual({ blockEnabled: true });
    expect(mergePart("preferences", { theme: "dark" }, { blockEnabled: false }, ["blockEnabled"])).toEqual({ theme: "dark", blockEnabled: false });
  });

  it("hapus entri di satu perangkat sementara perangkat lain (offline) mengubah Setting: keduanya bertahan", () => {
    // Laptop menghapus entri "a" dan sudah sinkron; HP offline mengubah kondisi lalu kembali online.
    const serverLog = [tombstone(entry("a"), "2026-01-06T00:00:00.000Z"), entry("b", "2026-01-06")];
    const hpLog = [entry("a"), entry("b", "2026-01-06")];
    expect(mergePart("log", serverLog, hpLog, []).map((e) => [e.id, !!e.deletedAt])).toEqual([["a", true], ["b", false]]);
    const s = mergePart("settings", settings(), settings({ conditions: ["lbp"] }), ["conditions"]);
    expect(s?.conditions).toEqual(["lbp"]);
  });

  it("hasil lomba & tawaran zona yang ditolak ikut sinkron per kunci (0.13.2)", () => {
    const race = { distance: "10k" as const, seconds: 3300, date: "2026-02-01" };
    const server = settings({ conditions: ["shin"] });
    const local = settings({ raceResults: [race], zoneOfferDismissedVdot: 33.4 });
    const m = mergePart("settings", server, local, ["raceResults", "zoneOfferDismissedVdot"]);
    expect(m).toMatchObject({ conditions: ["shin"], raceResults: [race], zoneOfferDismissedVdot: 33.4 });
    // Tolak dibatalkan di perangkat lain (kunci dihapus) ikut terhapus.
    expect(mergePart("settings", m, settings({ raceResults: [race] }), ["zoneOfferDismissedVdot"])).not.toHaveProperty("zoneOfferDismissedVdot");
    expect(validatePart("settings", { ...local, raceResults: [race, { distance: "10k", seconds: 60, date: "2026-02-02" }] }, baseProfile)?.raceResults).toEqual([race]);
  });

  it("idempoten: merge hasil merge dengan server yang sama tidak berubah", () => {
    const server = settings({ conditions: ["shin"] });
    const once = mergePart("settings", server, settings({ movements: { "Push-Up": false } }), ["movements"]);
    expect(mergePart("settings", server, once, ["movements"])).toEqual(once);
  });
});

describe("onboarding gabungan", () => {
  const a = done({ completed: ["welcome", "terms", "profile"], currentStep: "conditions", completedAt: undefined, skipped: ["connection"] });
  const b = done({ termsVersion: 2, termsAcceptedAt: "2026-02-01T00:00:00.000Z", protectionConfirmedAt: "2026-02-02T00:00:00.000Z", skipped: [] });

  it("kemajuan di perangkat mana pun tidak hilang; versi disclaimer tertinggi", () => {
    const m = mergeOnboarding(a, b)!;
    expect(m.completed).toEqual([...STEPS]);
    expect(m.skipped).toEqual([]);
    expect(m.termsVersion).toBe(2);
    expect(m.termsAcceptedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(m.protectionConfirmedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(m.currentStep).toBe("summary");
  });

  it("komutatif & idempoten", () => {
    expect(mergeOnboarding(a, b)).toEqual(mergeOnboarding(b, a));
    const m = mergeOnboarding(a, b);
    expect(mergeOnboarding(m, b)).toEqual(m);
    expect(mergeOnboarding(null, a)).toBe(a);
  });
});

describe("aktivasi pertama", () => {
  it("keduanya berisi: server menang untuk profil & kunci yang ada, lokal mengisi yang kosong, log digabung", () => {
    expect(mergePart("profile", { name: "Perangkat 1" }, { name: "Default perangkat 2" }, [WHOLE], true)).toEqual({ name: "Perangkat 1" });
    expect(mergePart("preferences", { blockEnabled: true }, { theme: "dark", blockEnabled: false }, [], true)).toEqual({ blockEnabled: true, theme: "dark" });
    expect(mergePart("log", [entry("a")], [entry("b", "2026-01-06")], [], true).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("server kosong: lokal dipakai apa adanya", () => {
    expect(mergePart("profile", null, { name: "Alex" }, [], true)).toEqual({ name: "Alex" });
    expect(mergePart("settings", null, settings({ conditions: ["shin"] }), [], true)?.conditions).toEqual(["shin"]);
    expect(mergePart("program", null, "p", [], true)).toBe("p");
  });
});

describe("program: override digabung per sesi (0.13)", () => {
  const ov = (sessionId: string, decidedAt: string, action: "move" | "skip" = "skip", toDate?: string) => ({ sessionId, action, decidedAt, ...(toDate ? { toDate } : {}) });
  const prog = (goal: string, overrides: unknown[] = []) => JSON.stringify({ race: "hm", goal, startDate: "2026-01-05", runsPerWeek: 3, ...(overrides.length ? { overrides } : {}) });
  const parsed = (s: string | null) => JSON.parse(s ?? "null");

  it("kunci berubah dipisah: pengaturan vs override", () => {
    expect(changedKeys("program", prog("2:30:00"), prog("2:20:00"))).toEqual(["settings"]);
    expect(changedKeys("program", prog("2:30:00"), prog("2:30:00", [ov("s1", "2026-01-06T00:00:00Z")]))).toEqual(["overrides"]);
    // Urutan kunci JSON tidak dianggap perubahan.
    expect(changedKeys("program", prog("2:30:00"), JSON.stringify({ runsPerWeek: 3, startDate: "2026-01-05", goal: "2:30:00", race: "hm" }))).toEqual([]);
  });

  it("override dari dua perangkat sama-sama bertahan; pengaturan mengikuti aturan dirty", () => {
    const server = prog("2:20:00", [ov("s1", "2026-01-06T00:00:00Z")]); // HP: target baru + lewati s1
    const local = prog("2:30:00", [ov("s2", "2026-01-07T00:00:00Z", "move", "2026-01-09")]); // laptop: geser s2
    const m = parsed(mergePart("program", server, local, ["overrides"]));
    expect(m.goal).toBe("2:20:00");
    expect(m.overrides.map((o: { sessionId: string }) => o.sessionId)).toEqual(["s1", "s2"]);
    expect(parsed(mergePart("program", server, local, ["settings", "overrides"])).goal).toBe("2:30:00");
  });

  it("program arsip (0.13.3): digabung per id dua sisi, override perangkat lama masuk ke arsipnya", () => {
    const arch = (id: string, overrides: unknown[] = []) => ({ id, race: "hm", goal: "2:00:00", startDate: "2026-01-05", raceDate: "2026-03-29", runsPerWeek: 3, overrides, endedAt: "2026-02-04" });
    const withArch = (goal: string, archived: unknown[], overrides: unknown[] = []) =>
      JSON.stringify({ race: "hm", goal, startDate: "2026-02-02", raceDate: "2026-05-10", runsPerWeek: 3, id: "hm-2026-02-02-2026-05-10", ...(overrides.length ? { overrides } : {}), archived });
    expect(changedKeys("program", withArch("2:00:00", [arch("a")]), withArch("2:00:00", [arch("a"), arch("b")]))).toEqual(["archived"]);
    // HP membuat program baru (arsip "hm-2026-01-05"); laptop offline masih melewati sesi program lama.
    const hp = withArch("2:00:00", [arch("hm-2026-01-05", [ov("hm-2026-01-05:4:selasa:quality", "2026-02-03T00:00:00Z")])]);
    const laptop = prog("2:00:00", [ov("hm-2026-01-05:5:selasa:quality", "2026-02-05T00:00:00Z")]);
    const m = parsed(mergePart("program", hp, laptop, ["overrides"]));
    expect(m.id).toBe("hm-2026-02-02-2026-05-10");
    expect(m.overrides).toBeUndefined();
    expect(m.archived[0].overrides.map((o: { sessionId: string }) => o.sessionId)).toEqual(["hm-2026-01-05:4:selasa:quality", "hm-2026-01-05:5:selasa:quality"]);
    // Dua perangkat mengarsipkan program berbeda: keduanya bertahan, komutatif & idempoten.
    const x = withArch("2:00:00", [arch("a")]);
    const y = withArch("2:00:00", [arch("b")]);
    const xy = mergePart("program", x, y, ["archived"]);
    expect(parsed(xy).archived.map((a: { id: string }) => a.id)).toEqual(["a", "b"]);
    expect(parsed(mergePart("program", y, x, ["archived"])).archived).toEqual(parsed(xy).archived);
    expect(mergePart("program", xy, xy, ["archived"])).toBe(xy);
  });

  it("keputusan terbaru untuk sesi yang sama menang; komutatif & idempoten", () => {
    const a = prog("2:30:00", [ov("s1", "2026-01-06T00:00:00Z")]);
    const b = prog("2:30:00", [ov("s1", "2026-01-08T00:00:00Z", "move", "2026-01-09")]);
    const ab = mergePart("program", a, b, ["overrides"]);
    expect(parsed(ab).overrides).toEqual([ov("s1", "2026-01-08T00:00:00Z", "move", "2026-01-09")]);
    expect(parsed(mergePart("program", b, a, ["overrides"])).overrides).toEqual(parsed(ab).overrides);
    expect(mergePart("program", ab, ab, ["overrides"])).toBe(ab);
  });

  it("aktivasi pertama: pengaturan server menang, override tetap digabung; reset lokal menghapus", () => {
    const server = prog("2:20:00", [ov("s1", "2026-01-06T00:00:00Z")]);
    const local = prog("2:30:00", [ov("s2", "2026-01-07T00:00:00Z")]);
    const m = parsed(mergePart("program", server, local, [], true));
    expect(m.goal).toBe("2:20:00");
    expect(m.overrides).toHaveLength(2);
    expect(mergePart("program", server, null, [WHOLE])).toBeNull();
  });
});
