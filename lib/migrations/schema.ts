/**
 * Migrasi data berversi (1.0, docs/ARCHITECTURE.md "Migrasi data"; murni, tanpa I/O).
 *
 * Satu nomor skema untuk data perangkat, data sinkron (server), dan file cadangan. Data dibawa dalam bentuk
 * bagian sinkron (`PartName` → nilai JSON mentah), jadi satu migrasi berlaku untuk ketiganya:
 * - perangkat: `lib/migrations/device.ts` (snapshot `hybrid-athlete.pre-migration` dulu);
 * - server: `lib/sync/server.ts` (snapshot server `before-migrate-*` dulu);
 * - cadangan: `lib/backup.ts` (file v1–v7 dinaikkan berurutan, lalu dimigrasi).
 *
 * Aturan setiap migrasi:
 * - `up` idempoten: dijalankan dua kali atau pada data yang sudah baru, hasilnya sama;
 * - nilai yang tidak lolos validasi dibiarkan apa adanya (tidak pernah dihapus); field asing di dalam objek yang valid
 *   dibuang, sama seperti parser yang dipakai sinkron dan impor;
 * - bagian yang tidak ada tetap tidak ada;
 * - urutan `to` 1, 2, 3, … tanpa lubang (dijaga test), dan setiap perubahan bentuk data menambah migrasi + fixture.
 */
import type { AthleteProfile } from "@/lib/profile";
import { parseProgramSettings, serializeProgramSettings } from "@/lib/program/settings";
import { PART_NAMES, validatePart, type PartName } from "@/lib/sync/parts";

/** Versi skema data sekarang. Naik satu setiap ada migrasi baru. */
export const DATA_SCHEMA_VERSION = 1;

/** Bagian data mentah (bentuk sama dengan payload sinkron). Kunci tidak ada = bagian tidak ada. */
export type DataParts = Partial<Record<PartName, unknown>>;

export interface MigrationContext {
  base: AthleteProfile;
  /** YYYY-MM-DD (WIB), untuk parser yang butuh tanggal (program). */
  today: string;
}

export interface Migration {
  /** Versi skema setelah migrasi ini. */
  to: number;
  /** Versi aplikasi yang memperkenalkannya. */
  since: string;
  title: string;
  up(parts: DataParts, ctx: MigrationContext): DataParts;
}

const programUp = (v: unknown, today: string): unknown => {
  if (typeof v !== "string" || !v) return v;
  try {
    const o = JSON.parse(v) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return v;
  } catch {
    return v;
  }
  return serializeProgramSettings(parseProgramSettings(v, today));
};

export const MIGRATIONS: readonly Migration[] = [
  {
    to: 1,
    since: "1.0.0-rc.1",
    title:
      "Bentuk kanonis sampai 0.17: id & updatedAt log (0.12.1), Hari H program (0.13.3), alat `items` (0.14.0), override geser dibuang (0.14.3), field asing dibuang",
    up(parts, { base, today }) {
      const out: DataParts = { ...parts };
      for (const name of PART_NAMES) {
        if (!(name in parts)) continue;
        const v = parts[name];
        if (v === null || v === undefined) continue;
        if (name === "program") {
          out.program = programUp(v, today);
          continue;
        }
        const clean = validatePart(name, v, base);
        if (clean !== undefined) out[name] = clean;
      }
      return out;
    },
  },
];

export interface MigrateResult {
  parts: DataParts;
  from: number;
  to: number;
  /** Judul migrasi yang dijalankan, berurutan. */
  applied: string[];
  /** Data berasal dari versi aplikasi yang lebih baru: tidak disentuh. */
  newer: boolean;
}

/** Versi skema tersimpan → bilangan bulat ≥ 0 (kosong/rusak = 0, data sebelum 1.0). */
export function parseSchemaVersion(v: unknown): number {
  const n = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : 0;
}

/** Jalankan migrasi setelah `from` secara berurutan. */
export function migrate(parts: DataParts, from: number, ctx: MigrationContext, migrations: readonly Migration[] = MIGRATIONS): MigrateResult {
  const target = migrations.length ? migrations[migrations.length - 1].to : 0;
  if (from > target) return { parts, from, to: from, applied: [], newer: true };
  let cur = parts;
  const applied: string[] = [];
  for (const m of migrations) {
    if (m.to <= from) continue;
    cur = m.up(cur, ctx);
    applied.push(m.title);
  }
  return { parts: cur, from, to: Math.max(from, target), applied, newer: false };
}
