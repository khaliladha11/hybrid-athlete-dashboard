import { describe, expect, it } from "vitest";
import { auSummary, patternMap, patternSummary, stWork, strengthWeeks } from "@/lib/insight/strength-trends";
import { baseProfile } from "@/lib/profile";
import type { LogEntry } from "@/lib/progression";
import type { StSession } from "@/lib/st-session";

const TODAY = "2026-01-08"; // Kamis, minggu 2026-01-05
const PATTERNS = patternMap(baseProfile.movementLibrary);

const ses = (id: string, date: string, over: Partial<StSession> = {}): StSession => ({
  id,
  date,
  startedAt: `${date}T00:00:00.000Z`,
  type: "lower",
  title: "Lower",
  difficulty: "moderate",
  durationMin: 40,
  rpe: 6,
  setsDone: 6,
  setsPlanned: 6,
  movements: [],
  updatedAt: `${date}T01:00:00.000Z`,
  ...over,
});
const log = (date: string, movement: string, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `${date}-${movement}`,
  date,
  movement,
  value: 10,
  valueUnit: "reps",
  target: { lo: 8, hi: 12 },
  rpe: 6,
  targetRpe: 6,
  deload: false,
  blockIndex: 0,
  ...over,
});

describe("patternMap", () => {
  it("nama gerakan → kategori library", () => {
    expect(PATTERNS.get("Barbell Squat")).toBe("lower");
    expect(PATTERNS.get("Floor Press")).toBe("upperPush");
    expect(PATTERNS.get("Dead Hang")).toBe("upperPull");
    expect(PATTERNS.get("Plank")).toBe("stabilityAndCore");
    expect(PATTERNS.get("Tibialis Wall Raise")).toBe("prehab");
  });
});

describe("stWork", () => {
  it("sesi dengan rincian: setiap set, jenis dari unit & beban", () => {
    const s = ses("a", "2026-01-05", {
      sets: [
        { movement: "Barbell Squat", load: 14, value: 10, unit: "reps" },
        { movement: "DB Farmer's Hold", load: 12, value: 40, unit: "sec" },
        { movement: "Clamshell", band: "Light", value: 15, unit: "reps" },
        { movement: "Glute Bridge", value: 12, unit: "reps" },
      ],
    });
    const w = stWork([s], [log("2026-01-05", "Barbell Squat")]);
    expect(w.map((x) => [x.movement, x.kind, x.load, x.estimated])).toEqual([
      ["Barbell Squat", "load", 14, false],
      ["DB Farmer's Hold", "hold", undefined, false],
      ["Clamshell", "unloaded", undefined, false],
      ["Glute Bridge", "unloaded", undefined, false],
    ]);
  });

  it("sesi lama tanpa rincian: log ★ di tanggalnya + gerakan utama lain sebagai set perkiraan", () => {
    const s = ses("b", "2026-01-06", { movements: ["Barbell Squat", "Reverse Lunge"] });
    const w = stWork([s], [log("2026-01-06", "Barbell Squat", { load: 12 })]);
    expect(w).toHaveLength(2);
    expect(w.every((x) => x.estimated && x.sessionKey === "ses:b")).toBe(true);
    expect(w.find((x) => x.movement === "Reverse Lunge")!.kind).toBe("unknown");
  });

  it("log ★ tanpa sesi (generator) jadi sesi log per tanggal; tombstone diabaikan", () => {
    const w = stWork([ses("x", "2026-01-02", { deletedAt: "2026-01-03T00:00:00.000Z" })], [log("2026-01-02", "Floor Press", { load: 10 }), log("2026-01-03", "Plank", { deletedAt: "z" })]);
    expect(w).toEqual([{ date: "2026-01-02", movement: "Floor Press", kind: "load", load: 10, value: 10, estimated: true, sessionKey: "log:2026-01-02" }]);
    expect(stWork([], [])).toEqual([]);
  });
});

describe("strengthWeeks", () => {
  const sessions = [
    ses("a", "2026-01-05", {
      rpe: 7,
      durationMin: 50,
      sets: [
        { movement: "Barbell Squat", load: 14, value: 10, unit: "reps" },
        { movement: "Barbell Squat", load: 14, value: 8, unit: "reps" },
        { movement: "Side Plank", value: 30, unit: "sec" },
        { movement: "Side Plank", value: 25, unit: "sec" },
        { movement: "Seated Band Hamstring Curl", band: "Medium", value: 12, unit: "reps" },
        { movement: "Push-Up", value: 10, unit: "reps" },
      ],
    }),
    ses("b", "2025-12-30", { rpe: 5, durationMin: 30, movements: ["Floor Press"] }),
  ];
  const work = stWork(sessions, [log("2025-12-30", "Floor Press", { load: 10, value: 12 })]);
  const rows = strengthWeeks(work, sessions, PATTERNS, TODAY, 2);

  it("kg × rep, tahan dalam detik, band & bodyweight tanpa kg, set per pola", () => {
    const cur = rows[1];
    expect(cur.patterns.lower).toEqual({ sets: 3, kg: 14 * 18, sec: 0, reps: 12 });
    expect(cur.patterns.stabilityAndCore).toEqual({ sets: 2, kg: 0, sec: 55, reps: 0 });
    expect(cur.patterns.upperPush).toEqual({ sets: 1, kg: 0, sec: 0, reps: 10 });
    expect(cur.estimated).toBe(false);
  });

  it("minggu data lama ditandai perkiraan", () => {
    expect(rows[0].patterns.upperPush).toEqual({ sets: 1, kg: 120, sec: 0, reps: 0 });
    expect(rows[0].estimated).toBe(true);
  });

  it("AU mingguan dari session-RPE saja", () => {
    expect(rows[1].au).toBe(350);
    expect(rows[0].au).toBe(150);
    expect(strengthWeeks([], [], PATTERNS, TODAY, 2)[0].au).toBeUndefined();
  });

  it("ringkasan pola, AU, dan kondisi kosong", () => {
    expect(patternSummary(rows, "lower").text).toContain("butuh 2 minggu");
    const more = strengthWeeks(stWork([...sessions, ses("c", "2025-12-31", { sets: [{ movement: "Barbell Squat", load: 12, value: 10, unit: "reps" }] })], []), sessions, PATTERNS, TODAY, 2);
    expect(patternSummary(more, "lower")).toEqual({ drawable: true, text: "Lower: rata-rata 1 set per minggu, 120 kg × rep. Minggu bertanda * adalah perkiraan (hanya gerakan ★)." });
    expect(patternSummary(rows, "prehab").text).toBe("Belum ada set Prehab dalam rentang ini.");
    expect(patternSummary(strengthWeeks([], [], PATTERNS, TODAY, 6), "lower").text).toBe("Belum ada sesi ST tercatat di perangkat ini dalam rentang ini.");
    expect(auSummary(rows)).toEqual({ drawable: true, text: "Beban ST rata-rata 150 AU per minggu (RPE sesi × menit), terpisah dari load lari." });
    expect(auSummary(strengthWeeks([], [], PATTERNS, TODAY, 2)).drawable).toBe(false);
  });
});
