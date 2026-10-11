import { Card, Chip } from "@/components/ui/Card";
import type { AthleteProfile } from "@/lib/profile";

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
