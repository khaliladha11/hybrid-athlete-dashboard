import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/athlete-settings";
import { initialState, STEPS, type OnboardingState } from "@/lib/onboarding";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { emptyMeta, markDirty, MAX_RETRIES, syncOnce, type ServerParts, type SyncIO, type SyncMeta } from "@/lib/sync/engine";
import { emptyPart, PART_NAMES, type PartData } from "@/lib/sync/parts";
import { memorySyncStore, type SyncStore } from "@/lib/sync/store";

// Data fiktif.
const entry = (id: string, date = "2026-01-05"): LogEntry => ({
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
const d = defaultSettings(baseProfile);
const settingsPart = { conditions: d.conditions, customConditions: d.customConditions, runZones: d.runZones, equipment: d.equipment, movements: d.movements, raceResults: d.raceResults };
const onboarded = (): OnboardingState => ({ ...initialState(), currentStep: "summary", completed: [...STEPS], termsVersion: 1, completedAt: "2026-01-01T00:00:00.000Z" });
const emptyLocal = (): PartData => ({ profile: null, settings: null, program: null, preferences: {}, onboarding: null, log: [], prs: [], sessions: [] });

/** Satu "perangkat": data lokal + meta di memori, berbicara ke store yang sama lewat logika server. */
function device(store: SyncStore, initial: Partial<PartData> = {}, opts: { failGet?: boolean; failPost?: boolean } = {}) {
  let local: PartData = { ...emptyLocal(), ...initial };
  let meta: SyncMeta = emptyMeta();
  let t = 0;
  const posts: unknown[] = [];
  const dev = {
    get local() {
      return local;
    },
    get meta() {
      return meta;
    },
    posts,
    opts,
    /** Pengguna mengubah data di perangkat ini. */
    edit(change: Partial<PartData>) {
      const prev = local;
      local = { ...local, ...change };
      meta = markDirty(meta, prev, local, `2026-01-05T00:00:${String(t++).padStart(2, "0")}.000Z`);
    },
    onPost: undefined as undefined | (() => void),
    io: {
      async get() {
        if (dev.opts.failGet) throw new Error("offline");
        const all = await store.readAll();
        const parts = Object.fromEntries(PART_NAMES.map((p) => [p, { rev: all[p].rev, data: all[p].data ?? emptyPart(p) }])) as ServerParts;
        return { enabled: true as const, parts };
      },
      async post(writes) {
        posts.push(writes);
        if (dev.opts.failPost) throw new Error("offline");
        dev.onPost?.();
        return store.writeMany(writes);
      },
      readLocal: () => local,
      applyLocal: (c) => (local = { ...local, ...c }),
      getMeta: () => meta,
      setMeta: (m) => (meta = m),
      now: () => "2026-01-05T12:00:00.000Z",
    } satisfies SyncIO,
  };
  return dev;
}

describe("aktivasi pertama", () => {
  it("server kosong → data lokal diunggah", async () => {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" }, log: [entry("a")], onboarding: onboarded() });
    const m = await syncOnce(hp.io);
    expect(m.state).toBe("ok");
    const all = await store.readAll();
    expect(all.profile.data).toEqual({ name: "Alex" });
    expect(all.log.data).toEqual([entry("a")]);
    expect(m.parts.profile).toEqual({ rev: 1, dirty: [], gen: 0, epoch: 0 });
    // Perangkat kosong tidak mengunggah bagian kosong.
    expect(all.program).toEqual({ rev: 0, epoch: 0, data: null });
  });

  it("keduanya berisi → server menang untuk profil, log & onboarding digabung", async () => {
    const store = memorySyncStore();
    await syncOnce(device(store, { profile: { name: "Alex" }, settings: { ...settingsPart, conditions: ["shin"] }, log: [entry("a")], onboarding: onboarded() }).io);
    const laptop = device(store, { profile: { name: "Default" }, settings: settingsPart, log: [entry("b", "2026-01-06")] });
    await syncOnce(laptop.io);
    expect(laptop.local.profile).toEqual({ name: "Alex" });
    expect(laptop.local.settings?.conditions).toEqual(["shin"]);
    expect(laptop.local.log.map((e) => e.id)).toEqual(["a", "b"]);
    expect(laptop.local.onboarding?.completedAt).toBeTruthy();
    expect(((await store.readAll()).log.data as LogEntry[]).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("dua perangkat", () => {
  async function pair() {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" }, settings: settingsPart, onboarding: onboarded() });
    await syncOnce(hp.io);
    const laptop = device(store);
    await syncOnce(laptop.io);
    return { store, hp, laptop };
  }

  it("catat sesi di HP → muncul di laptop", async () => {
    const { hp, laptop } = await pair();
    hp.edit({ log: [entry("s1")] });
    expect(hp.meta.state).toBe("pending");
    await syncOnce(hp.io);
    expect(hp.meta.state).toBe("ok");
    await syncOnce(laptop.io);
    expect(laptop.local.log.map((e) => e.id)).toEqual(["s1"]);
  });

  it("hapus entri di laptop sementara HP offline mengubah Setting → keduanya bertahan", async () => {
    const { hp, laptop } = await pair();
    hp.edit({ log: [entry("s1")] });
    await syncOnce(hp.io);
    await syncOnce(laptop.io);
    // HP offline mengubah kondisi.
    hp.opts.failGet = true;
    hp.edit({ settings: { ...settingsPart, conditions: ["lbp"] } });
    expect((await syncOnce(hp.io)).state).toBe("pending");
    expect(hp.local.settings?.conditions).toEqual(["lbp"]); // data lokal utuh
    // Laptop menghapus entri.
    laptop.edit({ log: laptop.local.log.map((e) => ({ ...e, deletedAt: "2026-01-07T00:00:00.000Z", updatedAt: "2026-01-07T00:00:00.000Z" })) });
    await syncOnce(laptop.io);
    // HP kembali online.
    hp.opts.failGet = false;
    expect((await syncOnce(hp.io)).state).toBe("ok");
    await syncOnce(laptop.io);
    for (const dev of [hp, laptop]) {
      expect(dev.local.settings?.conditions).toEqual(["lbp"]);
      expect(dev.local.log.every((e) => e.deletedAt)).toBe(true);
    }
  });

  it("perubahan per kunci di dua perangkat sama-sama bertahan (lewat konflik baseRev)", async () => {
    const { hp, laptop } = await pair();
    hp.edit({ settings: { ...settingsPart, conditions: ["shin"] } });
    laptop.edit({ settings: { ...settingsPart, movements: { "Push-Up": false } } });
    await syncOnce(hp.io);
    await syncOnce(laptop.io); // konflik → gabung → ulang
    await syncOnce(hp.io);
    for (const dev of [hp, laptop]) {
      expect(dev.local.settings?.conditions).toEqual(["shin"]);
      expect(dev.local.settings?.movements).toEqual({ "Push-Up": false });
    }
  });
});

describe("kegagalan", () => {
  it("gagal kirim → status belum terkirim, dirty tetap, data lokal tidak dibuang", async () => {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" } });
    await syncOnce(hp.io);
    hp.edit({ program: '{"race":"10k"}' });
    hp.opts.failPost = true;
    const m = await syncOnce(hp.io);
    expect(m.state).toBe("pending");
    expect(m.pendingSince).toBeTruthy();
    expect(m.parts.program?.dirty).toEqual(["*"]);
    expect(hp.local.program).toBe('{"race":"10k"}');
    hp.opts.failPost = false;
    expect((await syncOnce(hp.io)).state).toBe("ok");
    expect((await store.readAll()).program.data).toBe('{"race":"10k"}');
  });

  it("konflik terus-menerus → ulang maks 3 kali lalu status konflik", async () => {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" } });
    await syncOnce(hp.io);
    hp.edit({ profile: { name: "Alex 2" } });
    const before = hp.posts.length;
    // Perangkat lain selalu menulis tepat sebelum HP mengirim.
    let n = 0;
    hp.onPost = () => {
      const cur = store.raw.get("profile")!;
      store.raw.set("profile", { rev: cur.rev + 1, data: JSON.stringify({ name: `Lain ${n++}` }) });
    };
    const m = await syncOnce(hp.io);
    expect(hp.posts.length - before).toBe(MAX_RETRIES + 1);
    expect(m.state).toBe("conflict");
    expect(hp.local.profile).toEqual({ name: "Alex 2" });
    expect(m.parts.profile?.dirty).toEqual(["*"]);
  });

  it("perubahan selama request tetap dirty dan terkirim berikutnya", async () => {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" } });
    await syncOnce(hp.io);
    hp.edit({ profile: { name: "A1" } });
    hp.onPost = () => {
      hp.onPost = undefined;
      hp.edit({ profile: { name: "A2" } });
    };
    expect((await syncOnce(hp.io)).state).toBe("pending");
    expect(hp.meta.parts.profile?.dirty).toEqual(["*"]);
    expect((await syncOnce(hp.io)).state).toBe("ok");
    expect((await store.readAll()).profile.data).toEqual({ name: "A2" });
  });

  it("server menyatakan tidak aktif → status off, tidak ada yang dikirim", async () => {
    const hp = device(memorySyncStore(), { profile: { name: "Alex" } });
    const io = { ...hp.io, get: async () => ({ enabled: false as const }) };
    expect((await syncOnce(io)).state).toBe("off");
    expect(hp.posts).toHaveLength(0);
  });

  it("perangkat tanpa perubahan & tanpa perbedaan tidak mengirim apa pun", async () => {
    const store = memorySyncStore();
    const hp = device(store, { profile: { name: "Alex" } });
    await syncOnce(hp.io);
    const before = hp.posts.length;
    await syncOnce(hp.io);
    expect(hp.posts.length).toBe(before);
  });
});
