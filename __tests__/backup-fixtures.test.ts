import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSettings } from "@/lib/athlete-settings";
import { applyBackup, backupIsNewer, buildBackup, parseBackup, type BackupStore, type ThemeValue } from "@/lib/backup";
import { mergeCheckins, normalizeCheckins, type Checkin } from "@/lib/checkin";
import { isLive, mergeLogs, normalizeLog } from "@/lib/log-entries";
import type { OnboardingState } from "@/lib/onboarding";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import { mergePrs, normalizePrs, type PrEntry } from "@/lib/prs";
import { mergeSessions, normalizeSessions, type StSession } from "@/lib/st-session";

/**
 * Setiap format cadangan yang pernah diekspor (v1 sampai v7) terimpor benar (1.0, docs/RELEASE-1.0.md #10).
 * Fixture di `__tests__/fixtures/backups/` berisi data fiktif dengan bentuk asli tiap era: log tanpa id (v1–v2),
 * program dengan override geser dan tanpa Hari H (v2–v4), alat tanpa `items` (v2–v3), tombstone (v4+).
 */
const TODAY = "2026-03-02";
const fixture = (v: number): unknown => JSON.parse(readFileSync(`__tests__/fixtures/backups/v${v}.json`, "utf-8"));

/** Perangkat tiruan dengan penggabungan asli (sama seperti penyimpanan di browser). */
function device() {
  const st = {
    settings: "",
    program: "",
    theme: "",
    block: "",
    onboarding: null as OnboardingState | null,
    log: [] as LogEntry[],
    prs: [] as PrEntry[],
    sessions: [] as StSession[],
    checkins: [] as Checkin[],
  };
  const count = <T,>(before: T[], after: T[], input: unknown[]) => ({ added: after.length - before.length, skipped: input.length - (after.length - before.length) });
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

const importInto = (d: ReturnType<typeof device>, data: unknown) => applyBackup(parseBackup(JSON.parse(JSON.stringify(data)), baseProfile, TODAY)!, d.store, baseProfile);

/** Isi yang diharapkan per versi file. */
const EXPECT: Record<number, { live: number; prs: number; sessions: number; checkins: number; profile: boolean; onboarding: boolean; theme: string; hrZones: boolean }> = {
  1: { live: 2, prs: 0, sessions: 0, checkins: 0, profile: false, onboarding: false, theme: "", hrZones: false },
  2: { live: 2, prs: 0, sessions: 0, checkins: 0, profile: false, onboarding: false, theme: "dark", hrZones: false },
  3: { live: 2, prs: 0, sessions: 0, checkins: 0, profile: true, onboarding: true, theme: "dark", hrZones: false },
  4: { live: 1, prs: 1, sessions: 0, checkins: 0, profile: true, onboarding: true, theme: "dark", hrZones: false },
  5: { live: 1, prs: 1, sessions: 1, checkins: 0, profile: true, onboarding: true, theme: "dark", hrZones: false },
  6: { live: 1, prs: 1, sessions: 1, checkins: 1, profile: true, onboarding: true, theme: "dark", hrZones: false },
  7: { live: 1, prs: 1, sessions: 1, checkins: 1, profile: true, onboarding: true, theme: "dark", hrZones: true },
};

describe("fixture cadangan v1 sampai v7", () => {
  for (const v of [1, 2, 3, 4, 5, 6, 7]) {
    describe(`v${v}`, () => {
      const e = EXPECT[v];

      it("terbaca dengan versi aslinya dan terimpor ke perangkat kosong tanpa kehilangan isi", () => {
        const data = fixture(v);
        expect(backupIsNewer(data)).toBe(false);
        expect(parseBackup(data, baseProfile, TODAY)?.version).toBe(v);
        const d = device();
        importInto(d, data);
        expect(d.st.log.filter(isLive)).toHaveLength(e.live);
        expect(d.st.log.every((x) => x.id && x.updatedAt)).toBe(true);
        expect(d.st.prs).toHaveLength(e.prs);
        expect(d.st.sessions).toHaveLength(e.sessions);
        expect(d.st.checkins).toHaveLength(e.checkins);
        expect(d.st.theme).toBe(e.theme);
        expect(d.st.onboarding !== null).toBe(e.onboarding);
        if (v === 1) {
          expect(d.st.settings).toBe("");
          expect(d.st.program).toBe("");
          return;
        }
        const settings = parseSettings(d.st.settings, baseProfile);
        expect(settings.conditions).toEqual(["shin"]);
        expect(settings.equipment.items).toEqual([]);
        expect(settings.profile.name !== undefined).toBe(e.profile);
        expect(settings.hrZones !== undefined).toBe(e.hrZones);
        const program = JSON.parse(d.st.program);
        expect(program.raceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(program.overrides).toHaveLength(1);
        expect(program.overrides.every((o: { action: string; toDate?: string }) => o.action === "skip" && o.toDate === undefined)).toBe(true);
      });

      it("impor dua kali = sama dengan sekali", () => {
        const once = device();
        importInto(once, fixture(v));
        const twice = device();
        importInto(twice, fixture(v));
        const second = importInto(twice, fixture(v));
        expect(twice.st).toEqual(once.st);
        if (e.live) expect(second[0]).toMatch(/^0 entri log baru/);
      });

      it("ekspor ulang (v7) lalu impor ke perangkat baru = isi sama", () => {
        const a = device();
        importInto(a, fixture(v));
        const file = buildBackup({
          log: a.st.log.filter(isLive),
          settings: a.st.settings ? parseSettings(a.st.settings, baseProfile) : null,
          program: a.st.program || null,
          theme: (a.st.theme || "system") as ThemeValue,
          blockEnabled: a.st.block ? a.st.block === "1" : undefined,
          onboarding: a.st.onboarding,
          prs: a.st.prs,
          sessions: a.st.sessions,
          checkins: a.st.checkins,
          now: "2026-03-02T00:00:00.000Z",
        });
        const b = device();
        importInto(b, file);
        expect(b.st.log).toEqual(a.st.log.filter(isLive));
        expect(b.st.prs).toEqual(a.st.prs);
        expect(b.st.sessions).toEqual(a.st.sessions);
        expect(b.st.checkins).toEqual(a.st.checkins);
        expect(b.st.program).toBe(a.st.program);
        expect(b.st.onboarding).toEqual(a.st.onboarding);
        if (a.st.settings) expect(parseSettings(b.st.settings, baseProfile)).toEqual(parseSettings(a.st.settings, baseProfile));
      });
    });
  }

  it("v7 dari versi aplikasi yang lebih baru ditolak utuh", () => {
    const newer = { ...(fixture(7) as Record<string, unknown>), schema: 99 };
    expect(backupIsNewer(newer)).toBe(true);
    expect(parseBackup(newer, baseProfile, TODAY)).toBeNull();
  });

  it("fixture tidak berisi data asli: semua id & nama fiktif", () => {
    for (const v of [1, 2, 3, 4, 5, 6, 7]) {
      const text = readFileSync(`__tests__/fixtures/backups/v${v}.json`, "utf-8");
      expect(text).not.toMatch(/\bi\d{6,}\b/);
      for (const m of text.matchAll(/"(?:id|name)": "([^"]+)"/g)) expect(m[1]).toMatch(/fiktif|Fiktif/);
    }
  });
});
