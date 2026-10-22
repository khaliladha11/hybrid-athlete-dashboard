import { describe, expect, it } from "vitest";
import {
  AUTO_SKIPPED,
  STEPS,
  TERMS_VERSION,
  acceptTerms,
  advance,
  back,
  canContinue,
  chooseConditions,
  gateDecision,
  goTo,
  initialState,
  migratedState,
  nextStep,
  parseOnboardingState,
  prevStep,
  skip,
  stepNumber,
  type OnboardingState,
  type StepContext,
} from "@/lib/onboarding";

const NOW = "2026-10-22T03:00:00.000Z";
/** Konteks yang memenuhi semua syarat. */
const OK: StepContext = { termsChecked: true, name: "Atlet Contoh", conditionsChoice: "none", conditionsCount: 0, zonePath: "estimate" };

function walk(ctx: StepContext = OK) {
  const visited: string[] = [];
  let s = initialState();
  for (let i = 0; i < 20 && !s.completedAt; i++) {
    visited.push(s.currentStep);
    s = advance(s, ctx, NOW);
  }
  return { s, visited };
}

describe("urutan langkah (0.11.0)", () => {
  it("10 langkah, label x/10", () => {
    expect(STEPS).toHaveLength(10);
    expect(stepNumber("welcome")).toBe(1);
    expect(stepNumber("summary")).toBe(10);
  });

  it("langkah 3, 4, 9 dilewati otomatis dan ditandai skipped", () => {
    expect(AUTO_SKIPPED).toEqual(["connection", "protect", "install"]);
    const { s, visited } = walk();
    expect(visited).toEqual(["welcome", "terms", "profile", "conditions", "zones", "equipment", "summary"]);
    expect(s.skipped).toEqual(["connection", "protect", "install"]);
    expect(s.completedAt).toBe(NOW);
    expect(s.termsVersion).toBe(TERMS_VERSION);
    expect(s.conditionsChoice).toBe("none");
    expect(s.zonePath).toBe("estimate");
  });

  it("maju & mundur melompati langkah otomatis; tidak ada Kembali di langkah 1", () => {
    expect(nextStep("terms")).toBe("profile");
    expect(prevStep("profile")).toBe("terms");
    expect(prevStep("welcome")).toBeNull();
    expect(nextStep("summary")).toBeNull();
    const atProfile = goTo(initialState(), "profile");
    expect(back(atProfile).currentStep).toBe("terms");
    expect(back(initialState()).currentStep).toBe("welcome");
  });
});

describe("syarat lanjut", () => {
  it("langkah wajib memblokir sampai syaratnya terpenuhi", () => {
    expect(canContinue("terms", {})).toBe(false);
    expect(canContinue("profile", { name: "   " })).toBe(false);
    expect(canContinue("conditions", { conditionsCount: 0 })).toBe(false);
    expect(canContinue("zones", {})).toBe(false);
    const atTerms = goTo(initialState(), "terms");
    expect(advance(atTerms, {}, NOW)).toBe(atTerms);
  });

  it("langkah opsional bisa dilewati, langkah wajib tidak", () => {
    const atEquipment = goTo(initialState(), "equipment");
    const skipped = skip(atEquipment);
    expect(skipped.currentStep).toBe("summary");
    expect(skipped.skipped).toContain("equipment");
    const atProfile = goTo(initialState(), "profile");
    expect(skip(atProfile)).toBe(atProfile);
  });

  it('"Tidak ada kondisi" saling eksklusif dengan kondisi lain', () => {
    expect(chooseConditions({ type: "none" }, ["apt", "shin"])).toEqual({ choice: "none", conditions: [] });
    expect(chooseConditions({ type: "toggle", id: "apt", on: true }, [])).toEqual({ choice: "selected", conditions: ["apt"] });
    expect(chooseConditions({ type: "toggle", id: "apt", on: false }, ["apt"])).toEqual({ choice: undefined, conditions: [] });
    expect(canContinue("conditions", { conditionsChoice: "none", conditionsCount: 2 })).toBe(false);
    expect(canContinue("conditions", { conditionsChoice: "selected", conditionsCount: 1 })).toBe(true);
  });
});

describe("penyimpanan", () => {
  it("lanjut dari langkah tersimpan", () => {
    let s = initialState();
    for (let i = 0; i < 3; i++) s = advance(s, OK, NOW);
    const restored = parseOnboardingState(JSON.stringify(s))!;
    expect(restored).toEqual(s);
    expect(restored.currentStep).toBe("conditions");
  });

  it("state rusak atau versi tidak dikenal → null (mulai ulang dengan aman)", () => {
    expect(parseOnboardingState("")).toBeNull();
    expect(parseOnboardingState("{rusak")).toBeNull();
    expect(parseOnboardingState({ version: 2, currentStep: "welcome" })).toBeNull();
    expect(parseOnboardingState({ version: 1, currentStep: "langkah-x" })).toBeNull();
    const cleaned = parseOnboardingState({ version: 1, currentStep: "zones", completed: ["welcome", "x"], termsAcceptedAt: "kemarin", zonePath: "?" });
    expect(cleaned).toEqual({ version: 1, currentStep: "zones", completed: ["welcome"], skipped: [] });
  });
});

describe("gate", () => {
  it("tanpa state: pengguna baru → onboarding, pengguna lama → migrasi", () => {
    expect(gateDecision(null, false)).toBe("onboarding");
    expect(gateDecision(null, true)).toBe("migrate");
  });

  it("pengguna lama hanya melihat disclaimer sekali, tanpa mengulang wizard", () => {
    const m = migratedState(NOW);
    expect(m.migrated).toBe(true);
    expect(m.completedAt).toBe(NOW);
    expect(gateDecision(m, true)).toBe("terms");
    const accepted = acceptTerms(m, NOW);
    expect(gateDecision(accepted, true)).toBe("ok");
    expect(accepted.completed).toContain("terms");
  });

  it("onboarding belum selesai → lanjut onboarding", () => {
    expect(gateDecision(goTo(initialState(), "zones"), false)).toBe("onboarding");
  });

  it("versi disclaimer naik → disclaimer saja", () => {
    const done: OnboardingState = walk().s;
    expect(gateDecision(done, false)).toBe("ok");
    expect(gateDecision(done, false, TERMS_VERSION + 1)).toBe("terms");
  });
});
