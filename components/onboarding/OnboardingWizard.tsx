"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConditionsSettings } from "@/components/settings/ConditionsSettings";
import { EquipmentSettings } from "@/components/settings/EquipmentSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { RunZonesSettings } from "@/components/settings/RunZonesSettings";
import { BUTTON, Chip } from "@/components/ui/Card";
import { importBackupFile } from "@/lib/backup-store";
import { CONDITIONS, type ConditionId } from "@/lib/conditions";
import { generateStrengthWorkout, STRENGTH_TYPE_LABEL, STRENGTH_TYPES } from "@/lib/generator";
import {
  advance,
  back,
  canContinue,
  completeTour,
  chooseConditions,
  confirmProtection,
  gateDecision,
  goTo,
  initialState,
  parseOnboardingState,
  skip,
  STEPS,
  stepNumber,
  TERMS_VERSION,
  type ConditionsChoice,
  type OnboardingState,
  type OnboardingStep,
  type ZonePath,
} from "@/lib/onboarding";
import { useOnboardingState } from "@/lib/onboarding-store";
import { useInstallState } from "@/lib/install-prompt";
import { PREF_KEYS } from "@/lib/preference-keys";
import { readStored } from "@/lib/preferences";
import { useAthleteSettings, useIsClient, useResolvedProfile } from "@/lib/settings-store";
import { ConnectionStep } from "./ConnectionStep";
import { InstallStep } from "./InstallStep";
import { ProtectStep } from "./ProtectStep";
import { TermsStep } from "./TermsStep";
import { useTour } from "./Tour";

const TITLE: Record<OnboardingStep, string> = {
  welcome: "Selamat datang",
  terms: "Sebelum mulai",
  connection: "Koneksi intervals.icu",
  protect: "Amankan deploy",
  profile: "Profil dasar",
  conditions: "Kondisi & batasan",
  zones: "Zona lari",
  equipment: "Alat",
  install: "Pasang ke layar utama",
  summary: "Siap latihan",
};

const ZONE_PATHS: { value: ZonePath; label: string; desc: string }[] = [
  { value: "vdot", label: "Dari hasil lomba (VDOT)", desc: "Isi jarak dan waktu lomba atau time trial terbaru." },
  { value: "manual", label: "Manual", desc: "Isi sendiri pace tiap zona." },
  { value: "estimate", label: "Belum tahu", desc: "Pakai zona perkiraan untuk pemula. Bisa diubah kapan saja di Setting." },
];

const now = () => new Date().toISOString();

/** Wizard `/onboarding` (docs/ONBOARDING.md §3–4). Langkah 3, 4, 9 dilewati otomatis sampai 0.11.1. */
export function OnboardingWizard() {
  const ready = useIsClient();
  const router = useRouter();
  const tour = useTour();
  const [stored, setState] = useOnboardingState();
  const [settings, saveSettings] = useAthleteSettings();
  const resolved = useResolvedProfile();
  const state = stored ?? initialState();
  const step = state.currentStep;

  const [choiceDraft, setChoiceDraft] = useState<ConditionsChoice | undefined | null>(null);
  const choice = choiceDraft === null ? (state.conditionsChoice ?? (settings.conditions.length ? "selected" : undefined)) : choiceDraft;
  const [zoneDraft, setZoneDraft] = useState<ZonePath | null>(null);
  const zonePath = zoneDraft ?? state.zonePath;
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const ctx = {
    name: settings.profile.name ?? resolved.name,
    conditionsChoice: choice,
    conditionsCount: settings.conditions.length,
    zonePath,
  };

  // Onboarding sudah selesai dan disclaimer terbaru disetujui → tidak perlu di sini.
  useEffect(() => {
    if (ready && stored && gateDecision(stored, false) === "ok") router.replace("/");
  }, [ready, stored, router]);

  // Aplikasi sudah terpasang: langkah pasang selesai sendiri (mis. state tersimpan berhenti di langkah 9).
  const { standalone } = useInstallState();
  const env = { standalone };
  useEffect(() => {
    if (ready && stored?.currentStep === "install" && standalone) setState(advance(stored, {}, now(), { standalone }));
  }, [ready, stored, standalone, setState]);

  // Fokus ke judul tiap pindah langkah (pembaca layar + keyboard).
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (ready) headingRef.current?.focus();
  }, [step, ready]);

  if (!ready) return <WizardSkeleton />;

  const save = (next: OnboardingState) => setState(next);
  const next = () => save(advance(state, ctx, now(), env));
  const later = () => save(skip(state, env));

  const importFile = async (file: File) => {
    const r = await importBackupFile(file);
    setImportMsg(r.message);
    if (!r.ok) return;
    // State hasil impor (bila ada) sudah tertulis; lanjutkan dari situ.
    const after = parseOnboardingState(readStored(PREF_KEYS.onboarding) ?? "") ?? state;
    const termsOk = (after.termsVersion ?? 0) >= TERMS_VERSION;
    save(goTo({ ...after, completedAt: undefined, completed: after.completed.filter((s) => s !== "summary") }, termsOk ? "summary" : "terms", env));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="t-label">
          Langkah {stepNumber(step)}/{STEPS.length}
        </p>
        <p className="sr-only" aria-live="polite">
          Langkah {stepNumber(step)} dari {STEPS.length}: {TITLE[step]}
        </p>
        {step === "welcome" ? (
          <h1 ref={headingRef} tabIndex={-1} className="t-display mt-2 outline-none">
            Hybrid Athlete
          </h1>
        ) : (
          <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-[22px] leading-tight font-semibold outline-none">
            {TITLE[step]}
          </h1>
        )}
      </div>

      {step === "welcome" && (
        <div className="space-y-4">
          <p className="text-body text-muted">Pelatih pribadi untuk lari dan strength di rumah. Kita siapkan profilmu dalam beberapa menit.</p>
          <button type="button" onClick={next} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
            Mulai
          </button>
          <ImportButton onFile={importFile} />
          {importMsg && (
            <p role="status" className={`text-[13px] font-semibold ${importMsg.startsWith("✓") ? "text-success-ink" : "text-danger-ink"}`}>
              {importMsg}
            </p>
          )}
        </div>
      )}

      {step === "terms" && <TermsStep onAccept={() => save(advance(state, { termsChecked: true }, now(), env))} />}

      {step === "connection" && <ConnectionStep onContinue={next} onSkip={later} />}

      {step === "protect" && <ProtectStep onConfirm={() => save(advance(confirmProtection(state, now()), ctx, now(), env))} onLater={later} />}

      {step === "install" && <InstallStep onDone={next} onLater={later} />}

      {step === "profile" && (
        <>
          <p className="text-body text-muted">Cukup nama dulu. Sisanya boleh kosong dan bisa diisi nanti di Setting.</p>
          <ProfileSettings settings={settings} onChange={saveSettings} showGoals={false} />
        </>
      )}

      {step === "conditions" && (
        <>
          <p className="text-body text-muted">
            Pilih kondisi yang sedang kamu alami, atau pilih Tidak ada kondisi. Aturan keselamatan generator bergantung pada langkah ini.
          </p>
          <button
            type="button"
            aria-pressed={choice === "none"}
            onClick={() => {
              const r = chooseConditions({ type: "none" }, settings.conditions);
              saveSettings({ ...settings, conditions: r.conditions as ConditionId[] });
              setChoiceDraft(r.choice);
            }}
            className={`pressable flex min-h-12 w-full items-center justify-between rounded-control border px-4 text-base font-semibold ${
              choice === "none" ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface text-ink hover:bg-subtle"
            }`}
          >
            Tidak ada kondisi
            <span aria-hidden>{choice === "none" ? "✓" : ""}</span>
          </button>
          <ConditionsSettings
            settings={settings}
            warnings={resolved.warnings}
            onChange={(n) => {
              const added = n.conditions.find((c) => !settings.conditions.includes(c));
              const removed = settings.conditions.find((c) => !n.conditions.includes(c));
              saveSettings(n);
              const changed = added ?? removed;
              if (changed) setChoiceDraft(chooseConditions({ type: "toggle", id: changed, on: Boolean(added) }, settings.conditions).choice);
            }}
          />
        </>
      )}

      {step === "zones" && (
        <>
          <p className="text-body text-muted">Pilih cara mengisi pace latihan. Bisa diganti kapan saja di Setting.</p>
          <div role="radiogroup" aria-label="Cara mengisi zona lari" className="space-y-2">
            {ZONE_PATHS.map((o) => {
              const on = zonePath === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setZoneDraft(o.value)}
                  className={`pressable block min-h-12 w-full rounded-control border px-4 py-3 text-left ${
                    on ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:bg-subtle"
                  }`}
                >
                  <span className={`block text-base font-semibold ${on ? "text-brand-ink" : "text-ink"}`}>{o.label}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">{o.desc}</span>
                </button>
              );
            })}
          </div>
          {(zonePath === "vdot" || zonePath === "manual") && (
            <RunZonesSettings key={zonePath} settings={settings} onChange={saveSettings} calculatorOpen={zonePath === "vdot"} />
          )}
          {zonePath === "estimate" && (
            <p className="rounded-inner bg-subtle p-3 text-[13px] text-muted">
              Zona perkiraan dihitung dari VDOT 30 (setara 5K sekitar 30:40). Lebih aman terlalu pelan daripada terlalu cepat.
            </p>
          )}
        </>
      )}

      {step === "equipment" && (
        <>
          <p className="text-body text-muted">Centang alat yang ada di rumah. Lewati bila latihan tanpa alat.</p>
          <EquipmentSettings settings={settings} onChange={saveSettings} />
          <LimitedNote />
          <button type="button" onClick={later} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} w-full`}>
            Lewati, latihan tanpa alat
          </button>
        </>
      )}

      {step === "summary" && <Summary state={state} choice={choice} zonePath={zonePath} standalone={standalone} />}

      {step !== "welcome" && step !== "terms" && (
        <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-bg/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <button type="button" onClick={() => save(back(state, env))} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} shrink-0`}>
            Kembali
          </button>
          {/* Langkah 3, 4, 9 punya tombolnya sendiri (Lanjut / Demo Mode / Nanti saja). */}
          {/* Ringkasan: kedua tombol menyelesaikan onboarding; "Mulai tur" juga membuka tur in-app. */}
          {step === "summary" && (
            <button
              type="button"
              onClick={() => save(completeTour(advance(state, ctx, now(), env), now()))}
              className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} shrink-0 px-3`}
            >
              Lewati tur
            </button>
          )}
          {step !== "connection" && step !== "protect" && step !== "install" && (
            <button
              type="button"
              disabled={!canContinue(step, ctx)}
              onClick={() => {
                next();
                if (step === "summary") tour.start();
              }}
              className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} flex-1`}
            >
              {step === "summary" ? "Mulai tur" : "Simpan dan lanjut"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ImportButton({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} w-full`}>
        Impor cadangan
      </button>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

/** Dampak alat sekarang: jenis sesi ST yang belum bisa disusun penuh (generator menandainya `limited`). */
function LimitedNote() {
  const p = useResolvedProfile();
  const limited = useMemo(
    () =>
      STRENGTH_TYPES.filter((type) => {
        try {
          return generateStrengthWorkout({ type, duration: 45, difficulty: "moderate", seed: 1, free: true }, p).limited;
        } catch {
          return true;
        }
      }),
    [p],
  );
  if (!limited.length) return <p className="text-[13px] text-success-ink">✓ Semua jenis sesi strength bisa disusun lengkap dengan alat ini.</p>;
  return (
    <p className="rounded-inner bg-subtle p-3 text-[13px] text-muted">
      Dengan alat sekarang, sesi {limited.map((t) => STRENGTH_TYPE_LABEL[t]).join(", ")} jadi lebih pendek dari durasi yang dipilih karena gerakannya terbatas.
    </p>
  );
}

function Summary({ state, choice, zonePath, standalone }: { state: OnboardingState; choice?: ConditionsChoice; zonePath?: ZonePath; standalone: boolean }) {
  const p = useResolvedProfile();
  const eq = p.equipmentModel;
  const owned = [
    eq.dumbbell.enabled && "dumbbell",
    eq.barbell.enabled && "barbell",
    eq.bands.length > 0 && "band",
    eq.pullUpBar && "pull-up bar",
    eq.bench && "kursi/bench",
  ].filter(Boolean) as string[];
  const rows: { label: string; value: string; later?: boolean }[] = [
    state.completed.includes("connection")
      ? { label: "Koneksi intervals.icu", value: "Tersambung" }
      : { label: "Koneksi intervals.icu", value: "Demo Mode", later: true },
    state.protectionConfirmedAt
      ? { label: "Amankan deploy", value: "Sudah dikonfirmasi" }
      : { label: "Amankan deploy", value: "Belum dikonfirmasi", later: true },
    { label: "Profil", value: p.name || "·" },
    {
      label: "Kondisi",
      value: choice === "none" ? "Tidak ada kondisi" : p.activeConditions.map((c) => CONDITIONS[c].label.split(" (")[0]).join(", ") || "·",
    },
    { label: "Zona lari", value: ZONE_PATHS.find((z) => z.value === zonePath)?.label ?? "·" },
    { label: "Alat", value: owned.length ? owned.join(", ") : "Tanpa alat (bodyweight)", later: state.skipped.includes("equipment") },
    standalone || state.completed.includes("install")
      ? { label: "Pasang ke layar utama", value: "Terpasang" }
      : { label: "Pasang ke layar utama", value: "Belum dipasang", later: true },
  ];
  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-surface">
      {rows.map((r) => (
        <li key={r.label} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="t-label">{r.label}</p>
            <p className="mt-0.5 text-body text-ink">{r.value}</p>
          </div>
          {r.later && <Chip>Nanti</Chip>}
        </li>
      ))}
    </ul>
  );
}

function WizardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-4 w-24 rounded-control bg-subtle" />
      <div className="h-8 w-48 rounded-control bg-subtle" />
      <div className="h-40 rounded-card bg-subtle" />
    </div>
  );
}
