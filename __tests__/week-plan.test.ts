import { describe, expect, it } from "vitest";
import { suggestFor, weeklyAdvice } from "@/lib/coach";
import type { Activity } from "@/lib/intervals/types";
import { evaluateCompliance } from "@/lib/program/compliance";
import type { PlannedSession } from "@/lib/program/sessions";
import { planToday } from "@/lib/program/to-generator";
import { canSkip, recommendToday, weekEndNote, weekSessions } from "@/lib/program/week-plan";
import type { StSession } from "@/lib/st-session";

// Minggu fiktif: Senin 2026-01-05 (minggu 1) s.d. Minggu 2026-01-11; minggu 2 mulai 2026-01-12.
const P = "hm-2026-01-05";
const sess = (day: string, date: string, kind: PlannedSession["kind"], extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `${P}:${extra.week ?? 1}:${day}:${kind}`,
  week: 1,
  day,
  plannedDate: date,
  date,
  kind,
  title: kind === "quality" ? "Tempo 2×10'" : kind === "long" ? "Long run 14 km" : kind.startsWith("st-") ? "ST" : "Easy run 40'",
  intensity: kind === "quality" ? "moderate" : "easy",
  ...(kind === "long" ? { km: 14 } : kind === "quality" ? { km: 7, minutes: 45 } : { minutes: 40 }),
  ...extra,
});
const week1 = [
  sess("senin", "2026-01-05", "st-lower"),
  sess("selasa", "2026-01-06", "quality"),
  sess("rabu", "2026-01-07", "st-upper"),
  sess("kamis", "2026-01-08", "easy"),
  sess("minggu", "2026-01-11", "long"),
];
const run = (date: string, over: Partial<Activity> = {}): Activity => ({ id: `${date}-${over.name ?? "easy"}`, name: "Easy", type: "Run", category: "run", date, distanceKm: 6, movingTimeSec: 2400, avgHr: 138, ...over });
const ctx = (today: string, activities: Activity[] = [], stSessions: StSession[] = []) => ({ today, weekEnd: "2026-01-11", activities, stSessions });
const kinds = (xs: PlannedSession[]) => xs.map((s) => s.kind);

describe("sesi minggu ini", () => {
  it("sisa sesi = belum dikerjakan dan tidak dilewati, hanya minggu kalender ini", () => {
    const r = evaluateCompliance(week1, [run("2026-01-06", { name: "Tempo", avgHr: 160, distanceKm: 7, movingTimeSec: 2700 })], [], "2026-01-08");
    const w = weekSessions([...week1, sess("senin", "2026-01-12", "st-lower", { week: 2 })], r, "2026-01-08");
    expect([w.start, w.end]).toEqual(["2026-01-05", "2026-01-11"]);
    expect(kinds(w.remaining)).toEqual(["st-lower", "st-upper", "easy", "long"]);
  });

  it("lewati: hanya sesi minggu ini yang belum, bukan lomba atau minggu lalu", () => {
    const r = evaluateCompliance(week1, [], [], "2026-01-08");
    expect(canSkip(week1[1], r.get(week1[1].id), "2026-01-08")).toBe(true);
    expect(canSkip(week1[1], r.get(week1[1].id), "2026-01-13")).toBe(false);
    const race = sess("minggu", "2026-01-11", "race");
    expect(canSkip(race, { status: "belum", activityIds: [] }, "2026-01-08")).toBe(false);
  });
});

describe("rekomendasi hari ini", () => {
  it("sesi yang disarankan hari ini didahulukan; bila tidak ada, yang tertunda paling awal", () => {
    expect(recommendToday(week1, ctx("2026-01-06")).session?.kind).toBe("quality");
    const rest = week1.filter((s) => s.kind !== "st-lower");
    const r = recommendToday(rest, ctx("2026-01-09"));
    expect(r.session?.kind).toBe("quality");
    expect(r.reasons[0]).toBe("Disarankan Selasa, belum dikerjakan.");
  });

  it("tidak pernah quality atau long run sehari setelah lari berat atau long run", () => {
    const left = week1.filter((s) => s.kind === "quality" || s.kind === "long" || s.kind === "easy");
    const r = recommendToday(left, ctx("2026-01-07", [run("2026-01-06", { name: "Long", distanceKm: 15, movingTimeSec: 5800 })]));
    expect(r.session?.kind).toBe("easy");
    expect(r.notToday).toEqual(["Tempo 2×10' tidak disarankan hari ini karena kemarin long run.", "Long run 14 km tidak disarankan hari ini karena kemarin long run."]);
    // Hanya quality tersisa → tanpa rekomendasi, tetap boleh dipilih (non-blokir).
    const onlyQ = recommendToday([week1[1]], ctx("2026-01-08", [run("2026-01-07", { name: "Interval", avgHr: 165 })]));
    expect(onlyQ.session).toBeNull();
    expect(onlyQ.reasons[0]).toMatch(/^Sesi tersisa sebaiknya tidak hari ini/);
  });

  it("quality tidak disarankan sehari sebelum long run saat minggu tinggal ≤ 2 hari; long run didahulukan", () => {
    const left = [week1[1], week1[4]];
    const r = recommendToday(left, ctx("2026-01-10"));
    expect(r.session?.kind).toBe("long");
    expect(r.reasons[0]).toBe("Long run belum dikerjakan dan minggu ini tinggal 2 hari.");
    expect(r.notToday[0]).toMatch(/supaya tidak sehari sebelum long run/);
    // Masih banyak hari: quality tetap boleh.
    expect(recommendToday(left, ctx("2026-01-07")).session?.kind).toBe("quality");
  });

  it("aturan concurrent: setelah ST kaki tidak ada quality High; setelah lari berat ST Upper didahulukan", () => {
    const highQ = sess("selasa", "2026-01-06", "quality", { intensity: "high" });
    const leg: StSession = { id: "s", date: "2026-01-06", startedAt: "2026-01-06T10:00:00.000Z", type: "lower", title: "Lower", difficulty: "moderate", durationMin: 45, rpe: 6, setsDone: 12, setsPlanned: 12, movements: [], updatedAt: "2026-01-06T11:00:00.000Z" };
    expect(recommendToday([highQ, week1[3]], ctx("2026-01-06", [], [leg])).session?.kind).toBe("easy");
    const st = recommendToday([week1[0], week1[2]], ctx("2026-01-08", [run("2026-01-07", { name: "Tempo", avgHr: 162 })]));
    expect(st.session?.kind).toBe("st-upper");
  });

  it("coach tetap hanya menurunkan sesi yang direkomendasikan (readiness/80-20)", () => {
    const pick = recommendToday([week1[1]], ctx("2026-01-08")).session!;
    const pt = planToday(pick, week1)!;
    const hardRuns = [run("2026-01-03", { name: "Tempo", avgHr: 160 }), run("2026-01-04", { name: "Interval", avgHr: 162 })];
    const s = suggestFor(weeklyAdvice(hardRuns, "2026-01-08"), "run", { difficulty: pt.difficulty, duration: pt.duration ?? 45 }, { plan: pt });
    expect(s.difficulty).toBe("easy");
  });
});

describe("catatan akhir minggu", () => {
  it("spesifik per sesi yang tersisa, lembut; tidak ada catatan bila lengkap atau dilewati", () => {
    const r = evaluateCompliance(week1, [run("2026-01-08")], ["2026-01-05", "2026-01-07"], "2026-01-12");
    const note = weekEndNote(week1, r, "2026-01-12")!;
    expect(note.id).toBe(`${P}:1`);
    expect(note.lines).toEqual([
      "Minggu ini tanpa sesi quality. Wajar sesekali, kalau sering progres pace bisa melambat.",
      "Minggu ini tanpa long run. Wajar sesekali, kalau sering daya tahan untuk jarak lomba bisa tertinggal.",
    ]);
    const skipped = week1.map((s) => (s.kind === "quality" || s.kind === "long" ? { ...s, override: { sessionId: s.id, action: "skip" as const, decidedAt: "2026-01-09T00:00:00Z" } } : s));
    expect(weekEndNote(skipped, evaluateCompliance(skipped, [run("2026-01-08")], ["2026-01-05", "2026-01-07"], "2026-01-12"), "2026-01-12")).toBeNull();
  });

  it("muncul sekali: setelah ditutup tidak tampil lagi; hanya untuk minggu yang baru selesai", () => {
    const r = evaluateCompliance(week1, [], [], "2026-01-12");
    expect(weekEndNote(week1, r, "2026-01-12")?.lines).toContain("Minggu ini tanpa sesi ST. Wajar sesekali, kalau sering kekuatan yang sudah dibangun bisa menurun.");
    expect(weekEndNote(week1, r, "2026-01-12", [`${P}:1`])).toBeNull();
    expect(weekEndNote(week1, r, "2026-01-08")).toBeNull(); // minggu belum selesai
    expect(weekEndNote(week1, r, "2026-01-20")).toBeNull(); // minggu 1 sudah lewat dua minggu
  });
});
