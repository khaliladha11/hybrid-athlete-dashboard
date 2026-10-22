"use client";

import Link from "next/link";
import { Card, Chip } from "@/components/ui/Card";
import { useIsClient, useResolvedProfile } from "@/lib/settings-store";

/** Header Profil dari profil efektif di perangkat. Sebelum localStorage terbaca: kerangka, bukan nama default. */
export function ProfileHeader() {
  const profile = useResolvedProfile();
  const ready = useIsClient();
  if (!ready) {
    return (
      <header className="min-w-0 space-y-1.5" aria-busy="true">
        <div className="h-6 w-40 rounded-control bg-subtle" />
        <div className="h-4 w-56 rounded-control bg-subtle" />
      </header>
    );
  }
  return (
    <header className="min-w-0">
      <h1 className="truncate text-[22px] leading-tight font-semibold">{profile.name || "Atlet"}</h1>
      <p className="truncate text-[13px] text-muted">
        {[profile.age ? `${profile.age} th` : null, profile.occupation].filter(Boolean).join(" · ")}
      </p>
      {profile.category && <p className="truncate text-[13px] font-medium text-brand-ink">{profile.category}</p>}
    </header>
  );
}

export function TargetsCard() {
  const profile = useResolvedProfile();
  const ready = useIsClient();
  const goals = profile.targets?.goals ?? [];
  const races = profile.targets?.raceTargets ?? [];
  if (!ready) return null;
  if (!goals.length && !races.length) {
    return (
      <Card title="Target">
        <p className="text-body text-muted">Belum ada target lomba atau tujuan latihan.</p>
        <Link href="/setting#profil" className="mt-2 inline-flex min-h-11 items-center text-body font-semibold text-brand-ink hover:underline">
          Isi target di Setting
        </Link>
      </Card>
    );
  }
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
