import { describe, expect, it } from "vitest";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import type { SendErrorCode, SendRequest } from "@/lib/intervals/calendar";
import {
  DEVICE_HELP,
  DEVICE_NOTE,
  HUAWEI_LIMITS,
  applySent,
  batchSummary,
  changedText,
  thresholdPaceText,
  dayLabel,
  demoText,
  dequeue,
  enqueue,
  normalizeQueue,
  normalizeSent,
  queueOrder,
  queuedText,
  removedText,
  retryable,
  sendErrorText,
  sentText,
} from "@/lib/intervals/send-status";
import { exportPlannedSession, externalId, seedFromId } from "@/lib/intervals/workout-export";
import { buildProgram, formatPaceSec, RACES } from "@/lib/program";
import { isRunKind, planSessions } from "@/lib/program/sessions";
import { baseProfile } from "@/lib/profile";

const req = (over: Partial<SendRequest> = {}): SendRequest => ({ action: "upsert", externalId: "ha:g:2026-11-04", date: "2026-11-04", ...over });
const CODES: SendErrorCode[] = ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "RATE_LIMITED", "SERVER_ERROR", "NETWORK", "UNKNOWN", "LOCKED", "INVALID"];

describe("teks kirim ke jam", () => {
  it("status berhasil menyebut tanggal tujuan", () => {
    expect(dayLabel("2026-11-04")).toBe("Rabu 4 Nov");
    expect(sentText("2026-11-04")).toBe("Terkirim ke kalender intervals.icu · Rabu 4 Nov");
  });

  it("setiap kode error punya kalimat dengan langkah berikutnya, tanpa key", () => {
    for (const c of CODES) {
      const t = sendErrorText(c);
      expect(t, c).toMatch(/\.$/);
      expect(t.split(". ").length, c).toBeGreaterThanOrEqual(2);
    }
    expect(sendErrorText("UNAUTHORIZED")).toContain("INTERVALS_API_KEY");
    expect(sendErrorText("FORBIDDEN")).toContain("INTERVALS_ATHLETE_ID");
    expect(sendErrorText("RATE_LIMITED", 120)).toBe("Batas permintaan intervals.icu tercapai. Coba lagi dalam 2 menit.");
    expect(sendErrorText("RATE_LIMITED", 5)).toContain("1 menit");
    expect(sendErrorText("NETWORK")).toContain("saat online");
    expect(retryable("NETWORK") && retryable("RATE_LIMITED") && retryable("SERVER_ERROR")).toBe(true);
    expect(retryable("UNAUTHORIZED") || retryable("INVALID")).toBe(false);
  });

  it("DESIGN-SYSTEM §7: tanpa em/en dash dan tanpa tanda seru", () => {
    const all = [
      sentText("2026-11-04"),
      removedText,
      queuedText("upsert"),
      queuedText("delete"),
      demoText,
      changedText,
      thresholdPaceText,
      DEVICE_NOTE,
      ...HUAWEI_LIMITS,
      ...DEVICE_HELP.flatMap((d) => [d.brand, d.receives, d.setting]),
      ...CODES.map((c) => sendErrorText(c, 60)),
      batchSummary({ sent: 3, failed: 1, queued: 1, skipped: 1 }),
      batchSummary({ sent: 0, failed: 0, queued: 0 }),
    ];
    for (const t of all) {
      expect(t).not.toMatch(/[—–!]/);
    }
  });

  it("ringkasan kirim minggu ini", () => {
    expect(batchSummary({ sent: 3, failed: 1, queued: 0 })).toBe("3 terkirim · 1 gagal");
    expect(batchSummary({ sent: 0, failed: 0, queued: 2 })).toBe("2 menunggu online");
    expect(batchSummary({ sent: 0, failed: 0, queued: 0 })).toBe("Tidak ada sesi lari tersisa minggu ini.");
  });
});

describe("catatan terkirim & antrean", () => {
  it("dibuat/diperbarui disimpan, dihapus dibuang, demo/error tidak mengubah", () => {
    const a = applySent({}, req(), { status: "created" }, "h1", "2026-11-01T01:00:00.000Z");
    expect(a).toEqual({ "ha:g:2026-11-04": { date: "2026-11-04", hash: "h1", sentAt: "2026-11-01T01:00:00.000Z" } });
    const b = applySent(a, req(), { status: "updated" }, "h2", "2026-11-01T02:00:00.000Z");
    expect(b["ha:g:2026-11-04"].hash).toBe("h2");
    expect(applySent(b, req(), { status: "demo" }, "h3", "x")).toBe(b);
    expect(applySent(b, req(), { status: "error", code: "NETWORK" }, "h3", "x")).toBe(b);
    expect(applySent(b, req({ action: "delete" }), { status: "deleted" }, undefined, "x")).toEqual({});
    expect(applySent(b, req({ action: "delete" }), { status: "absent" }, undefined, "x")).toEqual({});
  });

  it("aksi terakhir per id menang; dequeue hanya entri yang sama; urutan dari yang lama", () => {
    let q = enqueue({}, req(), "h1", "2026-11-01T01:00:00Z");
    q = enqueue(q, req({ externalId: "ha:g:2026-11-05", date: "2026-11-05" }), "h", "2026-11-01T00:30:00Z");
    q = enqueue(q, req({ action: "delete" }), undefined, "2026-11-01T02:00:00Z");
    expect(Object.keys(q)).toHaveLength(2);
    expect(q["ha:g:2026-11-04"].req.action).toBe("delete");
    expect(queueOrder(q).map((x) => x.req.externalId)).toEqual(["ha:g:2026-11-05", "ha:g:2026-11-04"]);
    expect(dequeue(q, "ha:g:2026-11-04", "2026-11-01T01:00:00Z")).toBe(q); // entri lebih baru tetap
    expect(Object.keys(dequeue(q, "ha:g:2026-11-04", "2026-11-01T02:00:00Z"))).toEqual(["ha:g:2026-11-05"]);
  });

  it("normalisasi membuang isi rusak", () => {
    expect(normalizeSent(null)).toEqual({});
    expect(normalizeSent({ a: { date: "2026-11-04", hash: "h", sentAt: "t" }, b: { date: 1 } })).toEqual({ a: { date: "2026-11-04", hash: "h", sentAt: "t" } });
    expect(normalizeQueue([1])).toEqual({});
    expect(normalizeQueue({ x: { req: { externalId: "y" }, queuedAt: "t" } })).toEqual({});
  });
});

describe("kirim minggu ini: sesi program", () => {
  const p = resolveProfile(baseProfile, defaultSettings(baseProfile));
  const program = buildProgram({ race: "hm", goalSec: RACES.hm.defaultGoalSec, startDate: "2026-01-05", runsPerWeek: 4 });
  const sessions = planSessions(program, "hm-2026-01-05");
  const racePace = formatPaceSec(program.racePaceSec);

  it("setiap sesi lari selain lomba punya event; ST tidak; seed stabil", () => {
    for (const s of sessions) {
      const r = exportPlannedSession(s, { profile: p, racePace });
      if (!isRunKind(s.kind) || s.kind === "race") {
        expect(r.ok, s.title).toBe(false);
        continue;
      }
      expect(r.ok, s.title).toBe(true);
      expect(exportPlannedSession(s, { profile: p, racePace })).toEqual(r);
      expect(externalId.session(s.id)).toBe(`ha:s:${s.id}`);
    }
    expect(seedFromId("a")).toBe(seedFromId("a"));
    expect(seedFromId("a")).not.toBe(seedFromId("b"));
  });
});

describe("sesi yang tidak ada lagi di program", () => {
  it("hanya sesi program, tidak hidup, tanggal belum lewat", async () => {
    const { orphanedSends, orphanText, sendDateFor } = await import("@/lib/intervals/send-status");
    const rec = (date: string) => ({ date, hash: "h", sentAt: "t" });
    const map = {
      "ha:s:p:1:selasa:easy": rec("2026-11-03"),
      "ha:s:p:1:kamis:quality": rec("2026-11-05"),
      "ha:s:p:1:senin:easy": rec("2026-10-30"),
      "ha:g:2026-11-06": rec("2026-11-06"),
    };
    expect(orphanedSends(map, new Set(["p:1:selasa:easy"]), "2026-11-01")).toEqual([{ externalId: "ha:s:p:1:kamis:quality", date: "2026-11-05" }]);
    expect(orphanText(1)).toBe("1 workout di kalender intervals.icu tidak ada lagi di program.");
    expect(orphanText(3)).toMatch(/^3 workout/);
    expect(sendDateFor("2026-10-30", "2026-11-01")).toBe("2026-11-01");
    expect(sendDateFor("2026-11-03", "2026-11-01")).toBe("2026-11-03");
  });
});
