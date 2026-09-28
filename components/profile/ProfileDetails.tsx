import { Card, Chip } from "@/components/ui/Card";
import type { AthleteProfile, MovementCategory } from "@/lib/profile";

const ZONE_LABEL: Record<string, string> = {
  easy: "Easy",
  tempo: "Tempo",
  miniInterval: "Mini Interval",
  norwegian4x4: "Norwegian 4×4",
};

const FIELD_LABEL: Record<string, string> = { pace: "Pace", maxHr: "HR maks", hr: "HR", rpe: "RPE" };

const CATEGORY_LABEL: Record<MovementCategory | "warmupAndCooldown", string> = {
  upperPush: "Upper Push",
  upperPull: "Upper Pull",
  lower: "Lower",
  stabilityAndCore: "Stabilitas & Core",
  prehab: "Prehab",
  warmupAndCooldown: "Pemanasan & Pendinginan",
};

export function ProfileHeader({ profile }: { profile: AthleteProfile }) {
  const initials = profile.name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="flex items-center gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-600 text-lg font-semibold text-white">{initials}</div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{profile.name}</h1>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {[profile.age ? `${profile.age} th` : null, profile.occupation].filter(Boolean).join(" · ")}
        </p>
        {profile.category && <p className="truncate text-xs font-medium text-accent-700 dark:text-accent-400">{profile.category}</p>}
      </div>
    </header>
  );
}

export function TargetsCard({ profile }: { profile: AthleteProfile }) {
  const goals = profile.targets?.goals ?? [];
  const races = profile.targets?.raceTargets ?? [];
  return (
    <Card title="Target">
      <div className="flex flex-wrap gap-1.5">
        {races.map((r) => (
          <Chip key={r} tone="accent">
            {r}
          </Chip>
        ))}
      </div>
      {goals.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {goals.map((g) => (
            <li key={g} className="flex gap-2">
              <span className="text-accent-600 dark:text-accent-400" aria-hidden>
                ✓
              </span>
              {g}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ConditionsCard({ profile }: { profile: AthleteProfile }) {
  const conditions = profile.conditions ?? [];
  if (!conditions.length) return null;
  return (
    <Card title="Kondisi & batasan">
      <ul className="space-y-2">
        {conditions.map((c) => {
          const [head, ...rest] = c.split("(");
          return (
            <li key={c} className="rounded-lg border-l-2 border-amber-400 bg-amber-50/60 py-1.5 pr-2 pl-3 text-sm dark:bg-amber-950/30">
              <span className="font-medium">{head.trim()}</span>
              {rest.length > 0 && <span className="block text-xs text-zinc-600 dark:text-zinc-400">{rest.join("(").replace(/\)$/, "")}</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function RunZonesCard({ profile }: { profile: AthleteProfile }) {
  const zones = Object.entries(profile.runZones ?? {});
  return (
    <Card title="Zona lari" action={<span className="text-[11px] text-zinc-500">dari athlete-profile.json</span>}>
      <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {zones.map(([key, z]) => (
          <div key={key} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="text-sm font-medium">{ZONE_LABEL[key] ?? key}</dt>
            <dd className="tabular text-right text-xs text-zinc-600 dark:text-zinc-400">
              {Object.entries(z)
                .map(([f, v]) => `${FIELD_LABEL[f] ?? f} ${v}`)
                .join(" · ")}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function EquipmentLibraryCard({ profile }: { profile: AthleteProfile }) {
  const lib = profile.movementLibrary;
  const cats = ["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"] as const;
  return (
    <Card title="Alat & movement library">
      <ul className="flex flex-wrap gap-1.5">
        {(profile.equipment ?? []).map((e) => (
          <Chip key={e}>{e}</Chip>
        ))}
      </ul>
      <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
        {cats.map((cat) => (
          <details key={cat} className="group py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              {CATEGORY_LABEL[cat]}
              <span className="text-xs text-zinc-400 transition-transform group-open:rotate-90" aria-hidden>
                ›
              </span>
            </summary>
            <ul className="mt-2 space-y-1">
              {(lib[cat] ?? []).map((m) => (
                <li key={m.name} className="flex justify-between gap-3 text-xs">
                  <span className={m.available === false ? "text-zinc-400 line-through" : ""}>{m.name}</span>
                  <span className="tabular shrink-0 text-zinc-500 dark:text-zinc-400">
                    {m.available === false ? "belum aktif" : m.weight}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <details className="group py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
            {CATEGORY_LABEL.warmupAndCooldown}
            <span className="text-xs text-zinc-400 transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
          </summary>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{lib.warmupAndCooldown.join(" · ")}</p>
        </details>
      </div>
    </Card>
  );
}
