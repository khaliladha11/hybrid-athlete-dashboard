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
  confirmProtection,
  gateDecision,
  goTo,
  initialState,
  markCompleted,
  migratedState,
  nextStep,
  parseOnboardingState,
  pendingReminders,
  prevStep,
  skip,
  stepNumber,
  type OnboardingState,
  type StepContext,
} from "@/lib/onboarding";

const NOW = "2026-10-22T03:00:00.000Z";
/** Konteks yang memenuhi semua syarat. */
const OK: StepContext = { termsChecked: true, name: "Atlet Contoh", conditionsChoice: "none", conditionsCount: 0, zonePath: "estimate" };

function walk(ctx: StepContext = OK, env?: { standalone?: boolean }) {
  const visited: string[] = [];
  let s = initialState();
  for (let i = 0; i < 20 && !s.completedAt; i++) {
    visited.push(s.currentStep);
    s = advance(s, ctx, NOW, env);
  }
  return { s, visited };
}

describe("urutan langkah", () => {
  it("10 langkah, label x/10", () => {
    expect(STEPS).toHaveLength(10);
    expect(stepNumber("welcome")).toBe(1);
    expect(stepNumber("summary")).toBe(10);
  });

  it("sejak 0.11.1 semua langkah tampil; tidak ada yang dilewati otomatis", () => {
    expect(AUTO_SKIPPED).toEqual([]);
    const { s, visited } = walk();
    expect(visited).toEqual([...STEPS]);
    expect(s.skipped).toEqual([]);
    expect(s.completedAt).toBe(NOW);
    expect(s.termsVersion).toBe(TERMS_VERSION);
    expect(s.conditionsChoice).toBe("none");
    expect(s.zonePath).toBe("estimate");
  });

  it("aplikasi sudah terpasang (standalone): langkah pasang selesai sendiri, maju maupun mundur", () => {
    const env = { standalone: true };
    const { s, visited } = walk(OK, env);
    expect(visited).not.toContain("install");
    expect(s.completed).toContain("install");
    expect(nextStep("equipment", env)).toBe("summary");
    expect(prevStep("summary", env)).toBe("equipment");
    expect(back(goTo(initialState(), "summary"), env).currentStep).toBe("equipment");
    expect(nextStep("equipment")).toBe("install");
  });

  it("maju & mundur; tidak ada Kembali di langkah 1", () => {
    expect(nextStep("terms")).toBe("connection");
    expect(prevStep("profile")).toBe("protect");
    expect(prevStep("welcome")).toBeNull();
    expect(nextStep("summary")).toBeNull();
    expect(back(goTo(initialState(), "profile")).currentStep).toBe("protect");
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
    expect(skipped.currentStep).toBe("install");
    expect(skipped.skipped).toContain("equipment");
    // Koneksi ("Lanjut dengan Demo Mode"), proteksi ("Nanti saja"), dan pasang bisa dilewati.
    const atConnection = goTo(initialState(), "connection");
    expect(skip(atConnection)).toMatchObject({ currentStep: "protect", skipped: ["connection"] });
    expect(skip(goTo(initialState(), "protect")).currentStep).toBe("profile");
    expect(skip(goTo(initialState(), "install"))).toMatchObject({ currentStep: "summary", skipped: ["install"] });
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
    expect(restored.currentStep).toBe("protect");
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

describe("proteksi & pengingat (0.11.1)", () => {
  const done = (patch: Partial<OnboardingState> = {}): OnboardingState => ({ ...walk().s, ...patch });

  it("konfirmasi proteksi menyimpan waktu dan menandai langkah selesai", () => {
    const s = confirmProtection(skip(goTo(initialState(), "protect")), NOW);
    expect(s.protectionConfirmedAt).toBe(NOW);
    expect(s.completed).toContain("protect");
    expect(s.skipped).not.toContain("protect");
  });

  it("onboarding belum selesai → belum ada pengingat", () => {
    expect(pendingReminders({ state: goTo(initialState(), "zones"), standalone: false, zonesOverridden: false })).toEqual([]);
    expect(pendingReminders({ state: null, standalone: false, zonesOverridden: false })).toEqual([]);
  });

  it("state 0.11.0 yang selesai (3, 4, 9 dilewati otomatis) memunculkan pengingatnya", () => {
    const old = done({ skipped: ["connection", "protect", "install"], protectionConfirmedAt: undefined, zonePath: "vdot" });
    expect(pendingReminders({ state: old, standalone: false, zonesOverridden: false })).toEqual(["connection", "protect", "install"]);
  });

  it("pengguna lama (migrasi) diingatkan soal proteksi saja", () => {
    const m = acceptTerms(migratedState(NOW), NOW);
    expect(pendingReminders({ state: m, standalone: false, zonesOverridden: true })).toEqual(["protect"]);
  });

  it("pengingat hilang setelah diselesaikan", () => {
    const s = done({ skipped: ["connection", "install"], zonePath: "estimate" });
    expect(pendingReminders({ state: s, standalone: false, zonesOverridden: false })).toEqual(["connection", "protect", "zones", "install"]);
    const fixed = confirmProtection(markCompleted(s, "connection"), NOW);
    expect(pendingReminders({ state: fixed, standalone: true, zonesOverridden: true })).toEqual([]);
  });
});
