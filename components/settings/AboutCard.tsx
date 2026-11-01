"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ABOUT_LINKS, formatReleaseDate, isNewer, newVersionText, RELEASE_DATE, releaseUrl, UPDATE_HINT } from "@/lib/app-info";

const LINK = "inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline underline-offset-2";

/** Setting › Tentang & versi (1.0): versi terpasang, tautan, dan "Ada versi baru" bila rilis upstream lebih baru. */
export function AboutCard({ version }: { version: string }) {
  const [latest, setLatest] = useState<string | undefined>();

  useEffect(() => {
    const ctrl = new AbortController();
    // Gagal (offline, tanpa rilis, batas API) = diam: tidak ada baris versi baru.
    fetch("/api/app/latest", { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ latest?: unknown }>) : {}))
      .then((b) => typeof (b as { latest?: unknown }).latest === "string" && setLatest((b as { latest: string }).latest))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  return (
    <Card title="Tentang & versi">
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
        <dt className="t-label">Versi</dt>
        <dd className="font-mono text-sm" data-testid="app-version">
          {version}
        </dd>
        <dt className="t-label">Dirilis</dt>
        <dd className="text-sm">{formatReleaseDate(RELEASE_DATE)}</dd>
      </dl>
      {isNewer(latest, version) && (
        <div role="status" className="mt-3 rounded-card bg-subtle px-3 py-2">
          <a href={releaseUrl(latest!)} target="_blank" rel="noreferrer" className={LINK}>
            {newVersionText(latest!)}
          </a>
          <p className="text-[13px] text-muted">{UPDATE_HINT}</p>
        </div>
      )}
      <ul className="mt-3 border-t border-line pt-2">
        {ABOUT_LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer" className={LINK}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
