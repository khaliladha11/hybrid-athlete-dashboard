import { describe, expect, it, vi } from "vitest";
import { CONDITION_IDS, CONDITIONS } from "@/lib/conditions";
import { generateRunWorkout, generateStrengthWorkout, DIFFICULTIES, DURATIONS, STRENGTH_TYPES } from "@/lib/generator";
import { META } from "@/lib/generator/meta";
import { MEDIA_EN, MUSCLE_EN } from "@/lib/i18n/messages/media-en";
import { SAFETY } from "@/lib/i18n/messages/safety";
import { CONDITIONS_EN, META_CUE_EN, SOURCE_EN, TEXT_ONLY_MOVEMENTS_EN, TEXT_ONLY_MUSCLES_EN } from "@/lib/i18n/messages/safety-en";
import { repsText } from "@/lib/i18n/safety-text";
import { MOVEMENT_MEDIA } from "@/lib/movements/media";
import { TEXT_ONLY_MOVEMENTS, TEXT_ONLY_MUSCLES } from "@/lib/movements/muscle-regions";
import { profile } from "@/lib/profile";

/**
 * Konten keselamatan (1.2.0): setiap kondisi, cue gerakan, catatan kondisi, dan disclaimer punya teks Inggris, dan
 * setiap angka (derajat, menit, detik, skala nyeri, persen, kg) di teks Inggris sama dengan teks Indonesianya.
 */

vi.mock("@/config/athlete-profile.json", async () => ({ default: (await import("./fixtures/example-athlete.json")).default }));

/** Angka dan penanda batas di teks: harus sama persis antara ID dan EN. */
const numbers = (s: string) => [...(s.match(/\d+(?:[.,]\d+)?/g) ?? []), ...(s.match(/[≤≥±°×%]/g) ?? [])].sort();

const ID_WORDS = /\b(yang|dan|untuk|belum|sudah|tidak|jangan|hentikan|nyeri|lutut|punggung|kaki|tangan|dengan|sampai|turun|detik|sisi|perlahan|bila)\b/i;
const badEnDash = (s: string) => /–/.test(s.replace(/[\d:'"]+\s?–\s?[\d:'"]+/g, ""));

function expectEnglish(en: string, label: string) {
  expect(en.trim().length, label).toBeGreaterThan(0);
  expect(en.includes("—"), `${label}: ${en}`).toBe(false);
  expect(badEnDash(en), `${label}: ${en}`).toBe(false);
  expect(en.includes("!"), `${label}: ${en}`).toBe(false);
  expect(ID_WORDS.test(en), `${label}: ${en}`).toBe(false);
}

function expectPair(id: string, en: string | undefined, label: string) {
  expect(en, `${label} belum diterjemahkan: ${id}`).toBeDefined();
  expectEnglish(en!, label);
  expect(numbers(en!), `${label}\nID: ${id}\nEN: ${en}`).toEqual(numbers(id));
}

describe("katalog kondisi", () => {
  it("label, efek, dan catatan setiap kondisi", () => {
    for (const id of CONDITION_IDS) {
      const c = CONDITIONS[id];
      const en = CONDITIONS_EN[id];
      expectPair(c.label, en.label, `${id}.label`);
      expectPair(c.effect, en.effect, `${id}.effect`);
      expect(en.strengthNotes?.length ?? 0, `${id}.strengthNotes`).toBe(c.rules.strengthNotes?.length ?? 0);
      expect(en.runNotes?.length ?? 0, `${id}.runNotes`).toBe(c.rules.runNotes?.length ?? 0);
      c.rules.strengthNotes?.forEach((n, i) => expectPair(n, en.strengthNotes?.[i], `${id}.strengthNotes[${i}]`));
      c.rules.runNotes?.forEach((n, i) => expectPair(n, en.runNotes?.[i], `${id}.runNotes[${i}]`));
    }
  });

  it("label sumber yang diterjemahkan memang ada di katalog", () => {
    const labels = new Set(CONDITION_IDS.flatMap((id) => CONDITIONS[id].sources.map((s) => s.label)));
    for (const [idLabel, en] of Object.entries(SOURCE_EN)) {
      expect(labels.has(idLabel), idLabel).toBe(true);
      expect(numbers(en)).toEqual(numbers(idLabel));
    }
  });
});

describe("info teknik gerakan", () => {
  it("cue, catatan gambar, dan catatan kondisi setiap gerakan", () => {
    for (const [name, m] of Object.entries(MOVEMENT_MEDIA)) {
      const en = MEDIA_EN[name];
      expect(en, `${name} belum diterjemahkan`).toBeDefined();
      expect(en.cues.length, `${name}.cues`).toBe(m.cues.length);
      m.cues.forEach((c, i) => expectPair(c, en.cues[i], `${name}.cues[${i}]`));
      expect(en.imageNote === undefined, `${name}.imageNote`).toBe(m.imageNote === undefined);
      if (m.imageNote) expectPair(m.imageNote, en.imageNote, `${name}.imageNote`);
      expect(Object.keys(en.conditionNotes ?? {}).sort(), `${name}.conditionNotes`).toEqual(Object.keys(m.conditionNotes ?? {}).sort());
      for (const [id, n] of Object.entries(m.conditionNotes ?? {})) expectPair(n!, en.conditionNotes?.[id as keyof typeof en.conditionNotes], `${name}.${id}`);
    }
    expect(Object.keys(MEDIA_EN).filter((n) => !MOVEMENT_MEDIA[n]), "EN tanpa gerakan").toEqual([]);
  });

  it("setiap nama otot punya padanan Inggris", () => {
    const muscles = new Set(Object.values(MOVEMENT_MEDIA).flatMap((m) => [...m.primaryMuscles, ...m.secondaryMuscles]));
    for (const m of muscles) expect(MUSCLE_EN[m], m).toBeDefined();
  });

  it("catatan otot & gerakan tanpa gambar", () => {
    for (const [k, v] of Object.entries(TEXT_ONLY_MUSCLES)) expectPair(v, TEXT_ONLY_MUSCLES_EN[k], k);
    for (const [k, v] of Object.entries(TEXT_ONLY_MOVEMENTS)) expectPair(v, TEXT_ONLY_MOVEMENTS_EN[k], k);
  });

  it("cue preskripsi dan satuan reps generator", () => {
    for (const [name, meta] of Object.entries(META)) {
      if (meta.cue) expectPair(meta.cue, META_CUE_EN[name], `META ${name}.cue`);
      const reps = typeof meta.reps === "string" ? [meta.reps] : Object.values(meta.reps ?? {});
      for (const r of reps) expectPair(r, repsText(r, "en"), `META ${name}.reps`);
    }
  });
});

describe("disclaimer", () => {
  it("poin disclaimer sama banyak dan angka sama", () => {
    const id = SAFETY.id.terms;
    const en = SAFETY.en.terms;
    expect(en.points.length).toBe(id.points.length);
    id.points.forEach((p, i) => {
      expectPair(p.title, en.points[i].title, `terms[${i}].title`);
      expectPair(p.body, en.points[i].body, `terms[${i}].body`);
    });
  });
});

describe("generator Inggris dengan semua kondisi aktif", () => {
  it("catatan dan cue tidak menyisakan bahasa Indonesia", () => {
    const p = { ...profile, activeConditions: [...CONDITION_IDS] };
    for (const duration of DURATIONS)
      for (const difficulty of DIFFICULTIES) {
        const run = generateRunWorkout({ duration, difficulty, seed: 1, locale: "en" });
        for (const n of run.notes) expectEnglish(n, `run ${duration} ${difficulty}`);
        for (const type of STRENGTH_TYPES) {
          const st = generateStrengthWorkout({ type, duration, difficulty, seed: 1, locale: "en" }, p);
          for (const n of st.notes) expectEnglish(n, `st ${type} ${duration} ${difficulty}`);
          for (const it of st.items) {
            if (it.cue) expectEnglish(it.cue, `${it.movement} cue`);
            if (it.reps) expectEnglish(it.reps, `${it.movement} reps`);
          }
        }
      }
  });
});
