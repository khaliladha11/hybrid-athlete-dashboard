import { describe, expect, it } from "vitest";
import { defaultSettings, resolveProfile } from "@/lib/athlete-settings";
import { generateRunWorkout, runTargets, type Difficulty, type Duration, type RunPattern, type RunWorkout } from "@/lib/generator";
import {
  EXTERNAL_ID_RE,
  cueText,
  durationToken,
  eventHash,
  exportProgramCard,
  exportRun,
  exportStNote,
  externalId,
  paceTarget,
  type ExportedEvent,
} from "@/lib/intervals/workout-export";
import { buildProgram, formatPaceSec, RACES, type RaceTarget } from "@/lib/program";
import { planSessions, type PlannedSession } from "@/lib/program/sessions";
import { toGenerator } from "@/lib/program/to-generator";
import { baseProfile } from "@/lib/profile";

const p = resolveProfile(baseProfile, defaultSettings(baseProfile));
const easyPace = runTargets(p).easy.pace;
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 3);

/** 13 pola generator dengan cara memancingnya (level, durasi, pola, pengenal judul). */
const PATTERNS: { name: string; difficulty: Difficulty; durations: Duration[]; pattern?: RunPattern; title: RegExp }[] = [
  { name: "Easy continuous", difficulty: "easy", durations: [30, 45, 60], pattern: "continuous", title: /^Easy Z2 Continuous/ },
  { name: "Run-walk", difficulty: "easy", durations: [30, 45, 60], pattern: "runWalk", title: /^Easy Run-Walk/ },
  { name: "Cadence drill", difficulty: "easy", durations: [30, 45, 60], pattern: "cadenceDrill", title: /Cadence Drill/ },
  { name: "Tempo continuous", difficulty: "moderate", durations: [30], pattern: "tempo", title: /^Tempo Continuous/ },
  { name: "Tempo n×", difficulty: "moderate", durations: [30, 45, 60], pattern: "tempo", title: /^Tempo \d+×/ },
  { name: "Cruise", difficulty: "moderate", durations: [30, 45, 60], pattern: "cruise", title: /^Cruise Interval/ },
  { name: "Progression", difficulty: "moderate", durations: [30, 45, 60], pattern: "progression", title: /^Progression Run/ },
  { name: "Mini 1'/1'", difficulty: "high", durations: [30], title: /^Mini Interval \d+×1'/ },
  { name: "Mini 2'/2'", difficulty: "high", durations: [30], title: /^Mini Interval \d+×2'/ },
  { name: "Mini 3'/2'", difficulty: "high", durations: [30], title: /^Mini Interval \d+×3'/ },
  { name: "Mini 30\"/30\"", difficulty: "high", durations: [30], title: /^Mini Interval \d+×30"/ },
  { name: "Norwegian 4×4", difficulty: "high", durations: [45, 60], pattern: "4x4", title: /^Norwegian 4×4/ },
  { name: "15/15", difficulty: "high", durations: [45, 60], pattern: "15/15", title: /^15\/15/ },
];

function examples(def: (typeof PATTERNS)[number]): RunWorkout[] {
  const out: RunWorkout[] = [];
  for (const duration of def.durations) {
    for (const seed of SEEDS) {
      const w = generateRunWorkout({ duration, difficulty: def.difficulty, seed, pattern: def.pattern, free: true }, p);
      if (def.title.test(w.title)) {
        out.push(w);
        break;
      }
    }
  }
  return out;
}

const stepLines = (d: string) => d.split("\n").filter((l) => l.startsWith("- "));
const repeatLines = (d: string) => d.split("\n").filter((l) => /\d+x$/.test(l));

/** Durasi total langkah (dengan ulangan) dalam detik, dibaca balik dari teks. */
function parsedSeconds(d: string): number {
  const lines = d.split("\n");
  let total = 0;
  let reps = 1;
  for (const l of lines) {
    if (l === "") reps = 1;
    const r = l.match(/(\d+)x$/);
    if (r) reps = Number(r[1]);
    const m = l.match(/^- .*?(?:^|\s)(?:(\d+)m)?(?:(\d+)s)?\s+\d+:\d\d/);
    const t = l.match(/\s(\d+m\d+s|\d+m|\d+s)\s/);
    if (l.startsWith("- ") && m && t) {
      const [, mm = "0", ss = "0"] = t[1].match(/(?:(\d+)m)?(?:(\d+)s)?/)!;
      total += reps * (Number(mm) * 60 + Number(ss));
    }
  }
  return total;
}

function checkRules(e: ExportedEvent, where: string) {
  const steps = stepLines(e.description);
  expect(steps.length, where).toBeGreaterThan(0);
  // Setiap langkah punya target pace absolut.
  for (const s of steps) expect(s, where).toMatch(/ \d{1,2}:\d\d(-\d{1,2}:\d\d)?\/km Pace( intensity=rest)?$/);
  expect(e.description, where).not.toMatch(/ramp/i);
  expect(e.description, where).not.toMatch(/[—–]/);
  expect(e.name, where).not.toMatch(/[—–]/);
  expect(e.description, where).not.toMatch(/\n{3,}/);
  // Ulangan: selalu ≥ 2 langkah, dipisah baris kosong, tanpa ulangan bersarang.
  const lines = e.description.split("\n");
  lines.forEach((l, i) => {
    if (!/\d+x$/.test(l)) return;
    expect(lines[i - 1] ?? "", `${where}: baris kosong sebelum ulangan`).toBe("");
    let n = 0;
    for (let j = i + 1; j < lines.length && lines[j].startsWith("- "); j++) n++;
    expect(n, `${where}: ulangan ${l}`).toBeGreaterThanOrEqual(2);
    expect(lines[i + 1 + n] ?? "", `${where}: baris kosong sesudah ulangan`).toBe("");
  });
  // Cue tidak mengandung angka (tidak terbaca sebagai durasi).
  for (const s of steps) {
    const cue = s.slice(2).split(/ (?=\d+m|\d+s|\d+(\.\d+)?km)/)[0];
    expect(cue, where).not.toMatch(/\d/);
  }
}

describe("ekspor workout generator (13 pola)", () => {
  it("setiap pola punya contoh dan lolos aturan ekspor", () => {
    for (const def of PATTERNS) {
      const ws = examples(def);
      expect(ws.length, def.name).toBe(def.durations.length);
      for (const w of ws) {
        const r = exportRun(w, { easyPace });
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        const where = `${def.name} ${w.duration}'`;
        checkRules(r.event, where);
        expect(r.event.category).toBe("WORKOUT");
        expect(r.event.name).toBe(w.title);
        // Durasi total = durasi rencana, di moving_time dan di teks.
        expect(Math.abs(r.event.movingTimeSec - w.duration * 60), where).toBeLessThanOrEqual(120);
        expect(parsedSeconds(r.event.description), where).toBe(r.event.movingTimeSec);
        expect(r.event.description, where).toMatch(/^(Acuan HR: .*\.\n\n)?Warmup\n- /);
        expect(r.event.description, where).toMatch(/\nCooldown\n- [^\n]+$/);
      }
    }
  });

  it("ulangan dengan langkah pemulihan memakai intensity=rest; ulangan satu langkah diurai", () => {
    const four = examples(PATTERNS[11])[0];
    const d = exportRun(four, { easyPace }).ok && (exportRun(four, { easyPace }) as { event: ExportedEvent }).event.description;
    expect(d).toContain("\nNorwegian 4x\n- Interval 4m ");
    expect(d).toMatch(/- Recovery jog 3m \d+:\d\d-\d+:\d\d\/km Pace intensity=rest/);
    // Ulangan satu langkah (fiktif) jadi tiga langkah biasa.
    const w: RunWorkout = { ...four, blocks: [{ phase: "main", title: "Blok Tempo", repeat: 3, steps: [{ kind: "run", label: "Tempo", durationMin: 5, pace: "6:15–6:30/km" }] }] };
    const r = exportRun(w, { easyPace });
    expect(r.ok && repeatLines(r.event.description)).toEqual([]);
    expect(r.ok && stepLines(r.event.description)).toEqual(Array(3).fill("- Tempo 5m 6:30-6:15/km Pace"));
  });

  it("15/15 tiga set: tiga blok 20x dipisah jog, tanpa nesting", () => {
    const w = examples(PATTERNS[12]).find((x) => x.duration === 60)!;
    const r = exportRun(w, { easyPace });
    expect(r.ok && repeatLines(r.event.description)).toEqual(["Set 20x", "Set 20x", "Set 20x"]);
    expect(r.ok && r.event.description).toMatch(/- Cepat 15s \d+:\d\d-\d+:\d\d\/km Pace\n- Jog lambat 15s .* intensity=rest/);
  });

  it("jalan dan jog punya pace sendiri; HR hanya catatan", () => {
    const w = examples(PATTERNS[1])[0];
    const r = exportRun(w, { easyPace: "8:00–8:50/km" });
    expect(r.ok && r.event.description).toContain("- Jalan 1m 13:00-10:00/km Pace intensity=rest");
    expect(r.ok && r.event.description).toMatch(/^Acuan HR: < 140\.\n/);
    expect(r.ok && r.event.description).not.toMatch(/\bHR\b(?!:)/);
  });
});

describe("format token", () => {
  it("durasi, pace, cue", () => {
    expect(durationToken(10)).toBe("10m");
    expect(durationToken(0.25)).toBe("15s");
    expect(durationToken(1.5)).toBe("1m30s");
    expect(paceTarget({ fast: 375, slow: 390 })).toBe("6:30-6:15/km Pace");
    expect(paceTarget({ fast: 350, slow: 350 })).toBe("5:50/km Pace");
    expect(cueText("Easy jog Z2 (2 menit terakhir naik bertahap)")).toBe("Easy jog");
    expect(cueText("Fokus cadence 180 SPM (langkah pendek)")).toBe("Fokus cadence");
    expect(cueText('Cepat 15"')).toBe("Cepat");
    expect(cueText("Jog/jalan santai")).toBe("Jog jalan santai");
    expect(cueText("Norwegian 4×4")).toBe("Norwegian");
    expect(cueText("Z2 normal")).toBe("Normal");
    expect(cueText("Jalan cepat + dynamic drill ringan").length).toBeLessThanOrEqual(40);
  });
});

describe("ekspor sesi program", () => {
  const RACES_ALL: RaceTarget[] = ["5k", "10k", "hm", "fm"];
  const sessionsOf = (race: RaceTarget) => {
    const program = buildProgram({ race, goalSec: RACES[race].defaultGoalSec, startDate: "2026-01-05", runsPerWeek: 4 });
    return { program, sessions: planSessions(program, `${race}-2026-01-05`) };
  };

  it("kartu long run, race pace, sharpener terkirim; lomba dan kartu lain tidak", () => {
    const seen = new Set<string>();
    for (const race of RACES_ALL) {
      const { program, sessions } = sessionsOf(race);
      const racePace = formatPaceSec(program.racePaceSec);
      for (const s of sessions.filter((x) => toGenerator(x).to === "card")) {
        const r = exportProgramCard(s, { easyPace, racePace });
        const where = `${race}/${s.title}`;
        if (s.kind === "race") {
          expect(r.ok, where).toBe(false);
          continue;
        }
        expect(r.ok, where).toBe(true);
        if (!r.ok) continue;
        checkRules(r.event, where);
        seen.add(s.kind === "long" ? (s.intensity === "moderate" ? "long-progresif" : "long") : s.title.split(" ")[0]);
        if (s.kind === "long") expect(r.event.description, where).toContain(`- Long run ${s.intensity === "moderate" ? (s.km! - 3) : s.km}km `);
      }
    }
    expect([...seen].sort()).toEqual(["Race", "Sharpener", "long", "long-progresif"]);
  });

  it("long run memakai km yang dipendekkan saran", () => {
    const s: PlannedSession = { id: "x:1:minggu:long", week: 1, day: "Minggu", plannedDate: "2026-01-11", date: "2026-01-11", kind: "long", title: "Long run 14 km", intensity: "easy", km: 14 };
    const r = exportProgramCard(s, { easyPace: "8:00–8:50/km", racePace: "6:00/km", km: 10 });
    expect(r.ok && r.event.description).toBe("Warmup\n- Jalan 5m 13:00-10:00/km Pace\n\n- Long run 10km 8:50-8:00/km Pace\n\nCooldown\n- Jalan 5m 13:00-10:00/km Pace");
    expect(r.ok && r.event.movingTimeSec).toBe(10 * 505 + 600);
  });

  it("race pace 3×2 km: ulangan dengan jog istirahat", () => {
    const s: PlannedSession = { id: "x:5:kamis:quality", week: 5, day: "Kamis", plannedDate: "2026-02-05", date: "2026-02-05", kind: "quality", title: "Race pace 3×2 km", intensity: "moderate", km: 9 };
    const r = exportProgramCard(s, { easyPace: "8:00–8:50/km", racePace: "6:00/km" });
    expect(r.ok && r.event.description).toContain("\nRace pace 3x\n- Race pace 2km 6:00/km Pace\n- Jog 3m 9:50-8:50/km Pace intensity=rest\n");
  });

  it("quality tak dikenal tidak dipaksa", () => {
    const s: PlannedSession = { id: "x:5:kamis:quality", week: 5, day: "Kamis", plannedDate: "2026-02-05", date: "2026-02-05", kind: "quality", title: "Bukit 6×1'", intensity: "high" };
    expect(exportProgramCard(s, { easyPace, racePace: "6:00/km" }).ok).toBe(false);
  });
});

describe("id luar & hash", () => {
  it("stabil, lolos pola rute", () => {
    const { sessions } = { sessions: planSessions(buildProgram({ race: "hm", goalSec: RACES.hm.defaultGoalSec, startDate: "2026-01-05", runsPerWeek: 4 }), "hm-2026-01-05") };
    for (const s of sessions) {
      expect(externalId.session(s.id)).toMatch(EXTERNAL_ID_RE);
      expect(externalId.session(s.id)).toBe(`ha:s:${s.id}`);
    }
    expect(externalId.generator("2026-11-02")).toMatch(EXTERNAL_ID_RE);
    expect(externalId.stNote("2026-11-02")).toMatch(EXTERNAL_ID_RE);
    expect("ha:x:1").not.toMatch(EXTERNAL_ID_RE);
    expect("ha:g:<script>").not.toMatch(EXTERNAL_ID_RE);
  });

  it("hash berubah bila isi atau tanggal berubah", () => {
    const e = exportStNote("ST Lower", 45);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    expect(e.event.category).toBe("NOTE");
    expect(e.event.name).toBe("ST Lower 45 menit");
    expect(eventHash(e.event, "2026-11-02")).toBe(eventHash({ ...e.event }, "2026-11-02"));
    expect(eventHash(e.event, "2026-11-02")).not.toBe(eventHash(e.event, "2026-11-03"));
    expect(eventHash(e.event, "2026-11-02")).not.toBe(eventHash({ ...e.event, description: "x" }, "2026-11-02"));
  });
});
