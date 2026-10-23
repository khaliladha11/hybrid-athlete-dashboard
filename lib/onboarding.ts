/**
 * Onboarding (docs/ONBOARDING.md): state machine murni, tanpa I/O. Disimpan di localStorage
 * lewat `onboarding-store.ts`. Status hanya ada di perangkat, jadi gate berjalan di client.
 */

export const STEPS = [
  "welcome",
  "terms",
  "connection",
  "protect",
  "profile",
  "conditions",
  "zones",
  "equipment",
  "install",
  "summary",
] as const;
export type OnboardingStep = (typeof STEPS)[number];

/**
 * Naikkan bila teks disclaimer berubah: hanya langkah disclaimer yang tampil ulang.
 * 2 (0.12.2): poin 3 menyebut salinan data di database milik pengguna bila sinkron aktif.
 */
export const TERMS_VERSION = 2;

/**
 * Langkah yang dilewati otomatis tanpa ditampilkan. Kosong sejak 0.11.1 (langkah 3, 4, 9 sudah ada).
 * Di 0.11.0 isinya koneksi, amankan deploy, dan pasang; state lama itu tetap valid (`skipped`).
 */
export const AUTO_SKIPPED: readonly OnboardingStep[] = [];

/** Kondisi perangkat yang memengaruhi alur. `standalone` = aplikasi sudah dipasang → langkah 9 selesai sendiri. */
export interface StepEnv {
  standalone?: boolean;
}

const isAuto = (s: OnboardingStep, env?: StepEnv) => AUTO_SKIPPED.includes(s) || (s === "install" && env?.standalone === true);

/** Langkah yang tidak bisa dilewati. Syarat lanjutnya ada di `canContinue`. */
export const REQUIRED: readonly OnboardingStep[] = ["terms", "profile", "conditions", "zones"];

/** Langkah yang boleh dilewati (muncul lagi sebagai pengingat di Setting, 0.11.1). */
export const OPTIONAL: readonly OnboardingStep[] = ["connection", "protect", "equipment", "install"];

export type ConditionsChoice = "none" | "selected";
export type ZonePath = "vdot" | "manual" | "estimate";

export interface OnboardingState {
  version: 1;
  currentStep: OnboardingStep;
  completed: OnboardingStep[];
  skipped: OnboardingStep[];
  termsVersion?: number;
  /** ISO, UTC. */
  termsAcceptedAt?: string;
  protectionConfirmedAt?: string;
  completedAt?: string;
  tourCompletedAt?: string;
  /** Pengguna lama (sudah punya data sebelum 0.11) yang dilewatkan otomatis. */
  migrated?: boolean;
  /** "none" = pengguna memilih "Tidak ada kondisi" secara eksplisit. */
  conditionsChoice?: ConditionsChoice;
  zonePath?: ZonePath;
}

export const isStep = (x: unknown): x is OnboardingStep => typeof x === "string" && (STEPS as readonly string[]).includes(x);
const isIso = (x: unknown): x is string => typeof x === "string" && !Number.isNaN(Date.parse(x));

export function initialState(): OnboardingState {
  return { version: 1, currentStep: "welcome", completed: [], skipped: [] };
}

/** State dari localStorage/impor. Kosong, rusak, atau versi tidak dikenal → null (mulai ulang dengan aman). */
export function parseOnboardingState(raw: unknown): OnboardingState | null {
  let x: unknown = raw;
  if (typeof raw === "string") {
    if (!raw) return null;
    try {
      x = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (r.version !== 1 || !isStep(r.currentStep)) return null;
  const steps = (v: unknown) => (Array.isArray(v) ? STEPS.filter((s) => v.includes(s)) : []);
  const out: OnboardingState = { version: 1, currentStep: r.currentStep, completed: steps(r.completed), skipped: steps(r.skipped) };
  if (typeof r.termsVersion === "number" && Number.isInteger(r.termsVersion) && r.termsVersion > 0) out.termsVersion = r.termsVersion;
  for (const k of ["termsAcceptedAt", "protectionConfirmedAt", "completedAt", "tourCompletedAt"] as const) if (isIso(r[k])) out[k] = r[k];
  if (r.migrated === true) out.migrated = true;
  if (r.conditionsChoice === "none" || r.conditionsChoice === "selected") out.conditionsChoice = r.conditionsChoice;
  if (r.zonePath === "vdot" || r.zonePath === "manual" || r.zonePath === "estimate") out.zonePath = r.zonePath;
  return out;
}

/** Nomor langkah 1..10 untuk label `LANGKAH x/10`. */
export const stepNumber = (s: OnboardingStep) => STEPS.indexOf(s) + 1;

export function nextStep(s: OnboardingStep, env?: StepEnv): OnboardingStep | null {
  for (let i = STEPS.indexOf(s) + 1; i < STEPS.length; i++) if (!isAuto(STEPS[i], env)) return STEPS[i];
  return null;
}

export function prevStep(s: OnboardingStep, env?: StepEnv): OnboardingStep | null {
  for (let i = STEPS.indexOf(s) - 1; i >= 0; i--) if (!isAuto(STEPS[i], env)) return STEPS[i];
  return null;
}

/** Data yang dibutuhkan untuk memutuskan apakah langkah sekarang boleh dilanjutkan. */
export interface StepContext {
  termsChecked?: boolean;
  name?: string;
  conditionsChoice?: ConditionsChoice;
  conditionsCount?: number;
  zonePath?: ZonePath;
}

/** "Tidak ada kondisi" hanya sah tanpa kondisi aktif; pilihan "selected" butuh minimal satu kondisi. */
export function conditionsValid(choice: ConditionsChoice | undefined, count: number): boolean {
  return choice === "none" ? count === 0 : count > 0;
}

/** Pilihan kondisi setelah aksi pengguna: "Tidak ada" dan kondisi lain saling eksklusif. */
export function chooseConditions(
  action: { type: "none" } | { type: "toggle"; id: string; on: boolean },
  current: string[],
): { choice: ConditionsChoice | undefined; conditions: string[] } {
  if (action.type === "none") return { choice: "none", conditions: [] };
  const next = action.on ? [...new Set([...current, action.id])] : current.filter((c) => c !== action.id);
  return { choice: next.length ? "selected" : undefined, conditions: next };
}

export function canContinue(step: OnboardingStep, ctx: StepContext = {}): boolean {
  switch (step) {
    case "terms":
      return ctx.termsChecked === true;
    case "profile":
      return !!ctx.name?.trim();
    case "conditions":
      return conditionsValid(ctx.conditionsChoice, ctx.conditionsCount ?? 0);
    case "zones":
      return ctx.zonePath !== undefined;
    default:
      return true;
  }
}

const add = (list: OnboardingStep[], s: OnboardingStep) => (list.includes(s) ? list : STEPS.filter((x) => x === s || list.includes(x)));
const without = (list: OnboardingStep[], s: OnboardingStep) => list.filter((x) => x !== s);

/**
 * Lompat langsung ke langkah tertentu, mis. setelah impor cadangan. Langkah otomatis sebelum tujuan
 * ditandai: `AUTO_SKIPPED` → `skipped`; langkah pasang saat sudah standalone → `completed`.
 */
export function goTo(state: OnboardingState, to: OnboardingStep, env?: StepEnv): OnboardingState {
  let { skipped, completed } = state;
  for (const s of STEPS) {
    if (STEPS.indexOf(s) >= STEPS.indexOf(to)) break;
    if (AUTO_SKIPPED.includes(s)) skipped = add(skipped, s);
    else if (s === "install" && env?.standalone) {
      completed = add(completed, s);
      skipped = without(skipped, s);
    }
  }
  return { ...state, currentStep: to, skipped, completed };
}

/** Selesaikan langkah sekarang lalu pindah ke langkah berikutnya. Tidak bergerak bila syarat belum terpenuhi. */
export function advance(state: OnboardingState, ctx: StepContext, now: string, env?: StepEnv): OnboardingState {
  const step = state.currentStep;
  if (!canContinue(step, ctx)) return state;
  let next: OnboardingState = { ...state, completed: add(state.completed, step), skipped: without(state.skipped, step) };
  if (step === "terms") next = { ...next, termsVersion: TERMS_VERSION, termsAcceptedAt: now };
  if (step === "conditions") next = { ...next, conditionsChoice: ctx.conditionsChoice };
  if (step === "zones") next = { ...next, zonePath: ctx.zonePath };
  const to = nextStep(step, env);
  if (!to) return { ...next, completedAt: next.completedAt ?? now };
  return goTo(next, to, env);
}

/** Lewati langkah opsional. Langkah wajib tidak bisa dilewati. */
export function skip(state: OnboardingState, env?: StepEnv): OnboardingState {
  const step = state.currentStep;
  if (!OPTIONAL.includes(step)) return state;
  const to = nextStep(step, env);
  const next = { ...state, skipped: add(state.skipped, step), completed: without(state.completed, step) };
  return to ? goTo(next, to, env) : next;
}

export function back(state: OnboardingState, env?: StepEnv): OnboardingState {
  const to = prevStep(state.currentStep, env);
  return to ? { ...state, currentStep: to } : state;
}

/** Tandai langkah selesai tanpa pindah langkah (mis. dari pengingat di Setting). */
export function markCompleted(state: OnboardingState, step: OnboardingStep): OnboardingState {
  return { ...state, completed: add(state.completed, step), skipped: without(state.skipped, step) };
}

/** Pengguna mengonfirmasi Vercel Authentication sudah aktif (aplikasi tidak bisa memeriksanya sendiri). */
export function confirmProtection(state: OnboardingState, now: string): OnboardingState {
  return { ...markCompleted(state, "protect"), protectionConfirmedAt: now };
}

export type Reminder = "connection" | "protect" | "zones" | "install";

/**
 * Pengingat di Setting › "Belum selesai" (bukan pop-up), hanya setelah onboarding selesai:
 * - connection: langkah koneksi dilewati;
 * - protect: belum pernah konfirmasi proteksi (termasuk pengguna lama);
 * - zones: memilih "Belum tahu" dan belum ada zona yang diisi sendiri;
 * - install: langkah pasang dilewati dan aplikasi belum dipasang.
 */
export function pendingReminders(input: { state: OnboardingState | null; standalone: boolean; zonesOverridden: boolean }): Reminder[] {
  const { state, standalone, zonesOverridden } = input;
  if (!state?.completedAt) return [];
  const out: Reminder[] = [];
  if (state.skipped.includes("connection")) out.push("connection");
  if (!state.protectionConfirmedAt) out.push("protect");
  if (state.zonePath === "estimate" && !zonesOverridden) out.push("zones");
  if (state.skipped.includes("install") && !standalone) out.push("install");
  return out;
}

/** Tutup onboarding dari ringkasan. */
export function finish(state: OnboardingState, now: string): OnboardingState {
  return { ...state, currentStep: "summary", completed: add(state.completed, "summary"), completedAt: state.completedAt ?? now };
}

/** Tur in-app selesai atau dilewati (keduanya dicatat; tur bisa diulang dari Setting). */
export function completeTour(state: OnboardingState, now: string): OnboardingState {
  return { ...state, tourCompletedAt: now };
}

/** Setujui disclaimer versi sekarang (layar tunggal untuk pengguna lama atau saat versi naik). */
export function acceptTerms(state: OnboardingState, now: string): OnboardingState {
  return { ...state, completed: add(state.completed, "terms"), termsVersion: TERMS_VERSION, termsAcceptedAt: now };
}

/** Pengguna lama: tidak mengulang wizard. Disclaimer tetap harus disetujui sekali (lihat `gateDecision`). */
export function migratedState(now: string): OnboardingState {
  return {
    version: 1,
    currentStep: "summary",
    completed: STEPS.filter((s) => s !== "terms"),
    skipped: [],
    migrated: true,
    completedAt: now,
  };
}

export type ConnectDecision = "no-data" | "terms" | "ok";

/**
 * "Sambungkan perangkat ini" (onboarding langkah 1, 0.12.2): setelah data server diambil,
 * - server belum punya onboarding selesai → "no-data" (mulai dari awal di perangkat ini);
 * - selesai tapi disclaimer versi sekarang belum disetujui → "terms" (gate menampilkan disclaimer saja);
 * - selain itu "ok" (wizard dilewati).
 */
export function connectDecision(state: OnboardingState | null, termsVersion = TERMS_VERSION): ConnectDecision {
  if (!state?.completedAt) return "no-data";
  return (state.termsVersion ?? 0) < termsVersion ? "terms" : "ok";
}

export type GateDecision = "ok" | "onboarding" | "terms" | "migrate";

/**
 * - Belum ada state + ada data lama → "migrate" (buat `migratedState`, lalu disclaimer saja).
 * - Belum ada state + tanpa data → "onboarding".
 * - Onboarding belum selesai → "onboarding" (lanjut dari langkah tersimpan).
 * - Disclaimer belum disetujui untuk versi sekarang → "terms" (layar tunggal).
 */
export function gateDecision(state: OnboardingState | null, hasLegacyData: boolean, termsVersion = TERMS_VERSION): GateDecision {
  if (!state) return hasLegacyData ? "migrate" : "onboarding";
  if (!state.completedAt) return "onboarding";
  if ((state.termsVersion ?? 0) < termsVersion) return "terms";
  return "ok";
}
