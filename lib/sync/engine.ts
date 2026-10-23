/**
 * Mesin sinkron klien (murni; I/O disuntikkan, docs/SYNC.md §4 "Kapan sinkron" & "Konkurensi").
 * Satu putaran: ambil semua bagian → gabungkan dengan lokal → terapkan ke perangkat → kirim bagian
 * yang berubah dengan `baseRev` → bila konflik, gabungkan lagi dan ulang (maks 3 kali).
 * Gagal kirim tidak pernah membuang data lokal: kunci dirty tetap dan dicoba lagi nanti.
 */
import { changedKeys, mergePart } from "./merge";
import { hasData, PART_NAMES, type PartData, type PartName } from "./parts";

export const MAX_RETRIES = 3;

export interface PartMeta {
  /** Rev server yang terakhir diketahui; null = perangkat ini belum pernah sinkron (aktivasi pertama). */
  rev: number | null;
  /** Kunci yang diubah di perangkat ini sejak `rev`. */
  dirty: string[];
  /** Naik setiap ada perubahan lokal; dirty hanya dibersihkan bila tidak berubah selama request. */
  gen: number;
}

export type SyncState = "off" | "ok" | "pending" | "conflict";

export interface SyncMeta {
  parts: Partial<Record<PartName, PartMeta>>;
  state: SyncState;
  lastSyncAt?: string;
  /** Sejak kapan ada perubahan yang belum terkirim. */
  pendingSince?: string;
}

export const emptyMeta = (): SyncMeta => ({ parts: {}, state: "ok" });
const partMeta = (m: SyncMeta, p: PartName): PartMeta => m.parts[p] ?? { rev: null, dirty: [], gen: 0 };

export type ServerParts = Record<PartName, { rev: number; data: unknown }>;
export type GetResponse = { enabled: true; parts: ServerParts } | { enabled: false };
export type PostResult = { part: PartName; ok: true; rev: number } | { part: PartName; ok: false; rev: number; data: unknown };

export interface SyncIO {
  get(): Promise<GetResponse>;
  post(writes: { part: PartName; baseRev: number; data: unknown }[]): Promise<PostResult[]>;
  readLocal(): PartData;
  /** Terapkan hasil gabungan ke perangkat tanpa menandainya sebagai perubahan lokal. */
  applyLocal(changes: Partial<PartData>): void;
  getMeta(): SyncMeta;
  setMeta(m: SyncMeta): void;
  now(): string;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const anyDirty = (m: SyncMeta) => PART_NAMES.some((p) => partMeta(m, p).dirty.length > 0);

/** Perubahan lokal (dari `prev` ke `next`) → tandai kunci dirty & naikkan gen. */
export function markDirty(meta: SyncMeta, prev: PartData, next: PartData, now: string): SyncMeta {
  const parts = { ...meta.parts };
  let changed = false;
  for (const p of PART_NAMES) {
    const keys = changedKeys(p, prev[p] as never, next[p] as never);
    if (!keys.length) continue;
    const m = partMeta(meta, p);
    parts[p] = { ...m, dirty: [...new Set([...m.dirty, ...keys])], gen: m.gen + 1 };
    changed = true;
  }
  if (!changed) return meta;
  return { ...meta, parts, pendingSince: meta.pendingSince ?? now, state: meta.state === "off" ? "off" : "pending" };
}

/** Satu putaran sinkron. Mengembalikan meta akhir (juga sudah disimpan lewat `io.setMeta`). */
export async function syncOnce(io: SyncIO): Promise<SyncMeta> {
  let res: GetResponse;
  try {
    res = await io.get();
  } catch {
    return fail(io);
  }
  if (!res.enabled) {
    const m = { ...io.getMeta(), state: "off" as const };
    io.setMeta(m);
    return m;
  }
  const server: ServerParts = { ...res.parts };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Baca → gabung → terapkan berjalan sinkron (tanpa await), jadi tidak ada perubahan lokal di tengahnya.
    const local = io.readLocal();
    let meta = io.getMeta();
    const apply: Partial<PartData> = {};
    const writes: { part: PartName; baseRev: number; data: unknown }[] = [];
    const sentGen: Partial<Record<PartName, number>> = {};
    const parts = { ...meta.parts };

    for (const p of PART_NAMES) {
      const m = partMeta(meta, p);
      const s = server[p];
      const first = m.rev === null;
      let value: unknown = local[p];
      let send: boolean;
      if (first) {
        value = s.rev === 0 ? local[p] : mergePart(p, s.data as never, local[p] as never, [], true);
        send = hasData(p, value) && !same(value, s.data);
      } else if (s.rev !== m.rev) {
        value = mergePart(p, s.data as never, local[p] as never, m.dirty);
        send = m.dirty.length > 0 && !same(value, s.data);
      } else {
        send = m.dirty.length > 0 && !same(value, s.data);
      }
      if (!same(value, local[p])) (apply as Record<string, unknown>)[p] = value;
      if (send) {
        writes.push({ part: p, baseRev: s.rev, data: value });
        sentGen[p] = m.gen;
        parts[p] = { ...m, rev: m.rev };
      } else {
        parts[p] = { ...m, rev: s.rev, dirty: [] };
      }
    }
    if (Object.keys(apply).length) io.applyLocal(apply);
    meta = { ...meta, parts };
    io.setMeta(meta);
    if (!writes.length) return succeed(io);

    let results: PostResult[];
    try {
      results = await io.post(writes);
    } catch {
      return fail(io);
    }
    // Meta terbaru: perubahan lokal selama request sudah menaikkan gen lewat `markDirty`.
    meta = io.getMeta();
    const after = { ...meta.parts };
    let conflict = false;
    for (const r of results) {
      const m = partMeta(meta, r.part);
      if (r.ok) {
        const unchanged = m.gen === sentGen[r.part];
        after[r.part] = { ...m, rev: r.rev, dirty: unchanged ? [] : m.dirty };
        server[r.part] = { rev: r.rev, data: writes.find((w) => w.part === r.part)!.data };
      } else {
        conflict = true;
        server[r.part] = { rev: r.rev, data: r.data };
      }
    }
    io.setMeta({ ...meta, parts: after });
    if (!conflict) return anyDirty(io.getMeta()) ? pending(io) : succeed(io);
  }
  const m = { ...io.getMeta(), state: "conflict" as const };
  io.setMeta(m);
  return m;
}

function succeed(io: SyncIO): SyncMeta {
  const meta = io.getMeta();
  const m: SyncMeta = { ...meta, state: anyDirty(meta) ? "pending" : "ok", lastSyncAt: io.now() };
  if (m.state === "ok") delete m.pendingSince;
  io.setMeta(m);
  return m;
}

function pending(io: SyncIO): SyncMeta {
  const meta = io.getMeta();
  const m: SyncMeta = { ...meta, state: "pending", lastSyncAt: io.now(), pendingSince: meta.pendingSince ?? io.now() };
  io.setMeta(m);
  return m;
}

/** Gagal (offline, server error, sesi habis): data & dirty tetap; status hanya berubah bila ada yang belum terkirim. */
function fail(io: SyncIO): SyncMeta {
  const meta = io.getMeta();
  const m: SyncMeta = anyDirty(meta) ? { ...meta, state: "pending", pendingSince: meta.pendingSince ?? io.now() } : meta;
  io.setMeta(m);
  return m;
}
