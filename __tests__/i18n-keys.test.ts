import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isDict, type Dict } from "@/lib/i18n/dict";
import { SYNC_STATUS } from "@/components/sync/syncStatus";

/**
 * Kamus ID/EN (1.2.0): setiap kunci ada di kedua bahasa dengan bentuk yang sama, tanpa string kosong, dan teks
 * Inggris mengikuti aturan copy (DESIGN-SYSTEM §7): tanpa em dash, tanpa en dash kecuali di rentang angka, tanpa "!".
 * `tsc` sudah menolak kunci yang hilang; test ini menjaga kamus yang dirangkai di luar tipe (mis. `Record<string, …>`).
 */

const DIR = join(process.cwd(), "lib/i18n/messages");

async function allDicts(): Promise<[string, Dict<unknown>][]> {
  const out: [string, Dict<unknown>][] = [["components/sync/syncStatus.SYNC_STATUS", SYNC_STATUS as Dict<unknown>]];
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".ts"))) {
    const mod = (await import(`@/lib/i18n/messages/${file.replace(/\.ts$/, "")}`)) as Record<string, unknown>;
    for (const [name, v] of Object.entries(mod)) if (isDict(v)) out.push([`${file}.${name}`, v]);
  }
  return out;
}

/** Argumen contoh untuk memanggil pesan berparameter: angka 1 dan 3 (tunggal & jamak), teks contoh. */
function samples(fn: (...a: unknown[]) => unknown): unknown[][] {
  const n = Math.max(fn.length, 1);
  return [Array(n).fill(1), Array(n).fill(3), Array(n).fill("Contoh"), Array(n).fill(true)];
}

/** Semua string yang bisa dihasilkan sebuah nilai kamus (string, array, fungsi dengan argumen contoh). */
function texts(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(texts);
  if (typeof v === "function") {
    return samples(v as (...a: unknown[]) => unknown).flatMap((args) => {
      try {
        const r = (v as (...a: unknown[]) => unknown)(...args);
        return typeof r === "string" ? [r] : [];
      } catch {
        return [];
      }
    });
  }
  if (v && typeof v === "object") return Object.values(v).flatMap(texts);
  return [];
}

/** Bentuk struktur: jenis tiap kunci, panjang array, dan jumlah parameter fungsi. */
function shape(v: unknown, path = ""): string[] {
  if (typeof v === "string") return [`${path}:string`];
  if (typeof v === "function") return [`${path}:fn`];
  if (Array.isArray(v)) return [`${path}:array(${v.length})`, ...v.flatMap((x, i) => shape(x, `${path}[${i}]`))];
  if (v && typeof v === "object")
    return Object.keys(v)
      .sort()
      .flatMap((k) => shape((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
  return [`${path}:${typeof v}`];
}

/** En dash hanya boleh di antara dua angka/waktu, mis. 6:15–6:30/km atau 2:30–15:00/km. */
const badEnDash = (s: string) => /–/.test(s.replace(/Contoh|true|false/g, "1").replace(/[\d:'"]+\s?–\s?[\d:'"]+/g, ""));

describe("kamus ID/EN", () => {
  it("ada kamus untuk setiap area", async () => {
    const names = (await allDicts()).map(([n]) => n);
    for (const ns of ["chrome", "profile", "insight", "generator", "program", "settings", "onboarding", "workout", "strength", "intervals", "misc", "share"])
      expect(names.some((n) => n.startsWith(`${ns}.ts.`)), ns).toBe(true);
  });

  it("kunci, array, dan fungsi sama di kedua bahasa", async () => {
    for (const [name, d] of await allDicts()) expect(shape(d.en), name).toEqual(shape(d.id));
  });

  it("tanpa string kosong", async () => {
    for (const [name, d] of await allDicts())
      for (const l of ["id", "en"] as const) for (const t of texts(d[l])) expect(t.trim().length, `${name} ${l}: "${t}"`).toBeGreaterThan(0);
  });

  it("teks Inggris: tanpa em dash, en dash hanya di rentang angka, tanpa tanda seru", async () => {
    for (const [name, d] of await allDicts())
      for (const t of texts(d.en)) {
        expect(t.includes("—"), `${name}: ${t}`).toBe(false);
        expect(badEnDash(t), `${name}: ${t}`).toBe(false);
        expect(t.includes("!"), `${name}: ${t}`).toBe(false);
      }
  });

  it("teks Indonesia: tanpa em dash, en dash hanya di rentang angka", async () => {
    for (const [name, d] of await allDicts())
      for (const t of texts(d.id)) {
        expect(t.includes("—"), `${name}: ${t}`).toBe(false);
        expect(badEnDash(t), `${name}: ${t}`).toBe(false);
      }
  });

  it("nama Gita tetap Gita di Inggris", async () => {
    for (const [name, d] of await allDicts()) {
      const id = texts(d.id).filter((t) => t.includes("Gita")).length;
      const en = texts(d.en).filter((t) => t.includes("Gita")).length;
      expect(en, name).toBe(id);
    }
  });

  it("teks Inggris tidak menyisakan kata Indonesia yang umum", async () => {
    const ID_WORDS = /\b(yang|dan|untuk|belum|sudah|tidak|minggu|hari ini|sesi|latihan|simpan|hapus|lewati)\b/i;
    for (const [name, d] of await allDicts()) for (const t of texts(d.en)) expect(ID_WORDS.test(t), `${name}: ${t}`).toBe(false);
  });
});
