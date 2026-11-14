"use client";

import Link from "next/link";
import { useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { useT } from "@/lib/i18n/client";
import { MISC } from "@/lib/i18n/messages/misc";

type State = "off" | "misconfigured" | "on";

const INPUT = "mt-1 block min-h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand";


/** Form sandi aplikasi. Sandi hanya dikirim ke /api/unlock; tidak disimpan di perangkat. */
export function UnlockForm({ state, next }: { state: State; next: string }) {
  const t = useT(MISC).unlock;
  const MISCONFIGURED = t.misconfigured;
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(state === "misconfigured" ? MISCONFIGURED : null);

  if (state === "off") {
    return (
      <div className="space-y-4">
        <h1 className="text-[22px] leading-tight font-semibold">{t.off}</h1>
        <Link href="/" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
          {t.open}
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !passcode) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
        cache: "no-store",
      });
      if (res.status === 204) {
        window.location.replace(next);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; remaining?: number; retryAfterSec?: number };
      if (body.error === "wrong") setError(t.wrong(body.remaining ?? 0));
      else if (body.error === "rate_limited") setError(t.limited(Math.max(1, Math.ceil((body.retryAfterSec ?? 900) / 60))));
      else if (body.error === "misconfigured") setError(MISCONFIGURED);
      else setError(t.failed);
    } catch {
      setError(t.network);
    } finally {
      setPasscode("");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <p className="t-label">{t.locked}</p>
        <h1 className="mt-1 text-[22px] leading-tight font-semibold">{t.title}</h1>
        <p className="mt-1 text-body text-muted">{t.intro}</p>
      </div>
      <label className="block text-[12px] text-muted">
        {t.label}
        <input
          type="password"
          name="passcode"
          autoComplete="current-password"
          autoFocus
          required
          maxLength={256}
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          disabled={state === "misconfigured"}
          aria-invalid={!!error}
          aria-describedby={error ? "unlock-error" : undefined}
          className={INPUT}
        />
      </label>
      {error && (
        <p id="unlock-error" role="alert" className="text-[13px] font-semibold text-danger-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !passcode || state === "misconfigured"}
        className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}
      >
        {busy ? t.opening : t.submit}
      </button>
    </form>
  );
}
