/**
 * Status koneksi intervals.icu untuk onboarding langkah 3 (murni, tanpa `server-only`, bisa diuji).
 * Route `/api/connection` menyambungkannya ke `client.ts`. Browser hanya menerima `{ status, athleteName? }`:
 * tidak pernah key, athlete ID, atau data mentah.
 */
import type { FetchResult } from "./types";

export const CONNECTION_STATUSES = ["ok", "missing", "unauthorized", "forbidden", "not_found", "network"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export interface ConnectionResult {
  status: ConnectionStatus;
  /** Nama atlet di intervals.icu, hanya bila `ok`. */
  athleteName?: string;
}

const MAX_NAME = 80;

function nameOf(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const r = data as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = text(r.name) || [text(r.firstname), text(r.lastname)].filter(Boolean).join(" ");
  return name ? name.slice(0, MAX_NAME) : undefined;
}

/** Hasil `intervalsGet("/athlete/{id}")` → status. 5xx, timeout, jaringan, dan error lain → "network". */
export function connectionFromResult(res: FetchResult<unknown>): ConnectionResult {
  if (res.ok) {
    const athleteName = nameOf(res.data);
    return athleteName ? { status: "ok", athleteName } : { status: "ok" };
  }
  switch (res.error.code) {
    case "UNAUTHORIZED":
      return { status: "unauthorized" };
    case "FORBIDDEN":
      return { status: "forbidden" };
    case "NOT_FOUND":
      return { status: "not_found" };
    default:
      return { status: "network" };
  }
}

/** Tanpa key → "missing" tanpa memanggil intervals.icu. */
export async function resolveConnection(deps: { hasKey: boolean; fetchAthlete: () => Promise<FetchResult<unknown>> }): Promise<ConnectionResult> {
  if (!deps.hasKey) return { status: "missing" };
  return connectionFromResult(await deps.fetchAthlete());
}

export const isConnectionStatus = (x: unknown): x is ConnectionStatus =>
  typeof x === "string" && (CONNECTION_STATUSES as readonly string[]).includes(x);
