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
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-semibold text-on-brand">{initials}</div>
      <div className="min-w-0">
        <h1 className="truncate text-[22px] leading-tight font-semibold">{profile.name}</h1>
        <p className="truncate text-[13px] text-muted">
          {[profile.age ? `${profile.age} th` : null, profile.occupation].filter(Boolean).join(" · ")}
        </p>
        {profile.category && <p className="truncate text-[13px] font-medium text-brand-ink">{profile.category}</p>}
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
        <ul className="mt-3 space-y-1 text-body text-ink">
          {goals.map((g) => (
            <li key={g} className="flex gap-2">
              <span className="text-brand-ink" aria-hidden>
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
            <li key={c} className="rounded-inner border-l-2 border-brand bg-brand-soft py-1.5 pr-2 pl-3 text-body">
              <span className="font-semibold">{head.trim()}</span>
              {rest.length > 0 && <span className="block text-[13px] text-muted">{rest.join("(").replace(/\)$/, "")}</span>}
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
    <Card title="Zona lari" action={<span className="text-[12px] text-muted">dari athlete-profile.json</span>}>
      <dl className="divide-y divide-line">
        {zones.map(([key, z]) => (
          <div key={key} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="text-body font-semibold">{ZONE_LABEL[key] ?? key}</dt>
            <dd className="tabular text-right text-[13px] text-muted">
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
      <div className="mt-3 divide-y divide-line">
        {cats.map((cat) => (
          <details key={cat} className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-body font-semibold">
              {CATEGORY_LABEL[cat]}
              <span className="text-[13px] text-faint transition-transform duration-150 ease group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
                ›
              </span>
            </summary>
            <ul className="details-body space-y-1 pb-3">
              {(lib[cat] ?? []).map((m) => (
                <li key={m.name} className="flex justify-between gap-3 text-[13px]">
                  <span className={m.available === false ? "text-faint line-through" : ""}>{m.name}</span>
                  <span className="tabular shrink-0 text-muted">
                    {m.available === false ? <span className="font-semibold text-danger-ink">✕ belum aktif</span> : m.weight}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-body font-semibold">
            {CATEGORY_LABEL.warmupAndCooldown}
            <span className="text-[13px] text-faint transition-transform duration-150 ease group-open:rotate-90 motion-reduce:transition-none" aria-hidden>
              ›
            </span>
          </summary>
          <p className="details-body pb-3 text-[13px] text-muted">{lib.warmupAndCooldown.join(" · ")}</p>
        </details>
      </div>
    </Card>
  );
}
