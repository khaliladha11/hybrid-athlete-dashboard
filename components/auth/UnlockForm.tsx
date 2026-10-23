"use client";

import Link from "next/link";
import { useState } from "react";
import { BUTTON } from "@/components/ui/Card";

type State = "off" | "misconfigured" | "on";

const INPUT = "mt-1 block min-h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink focus:border-brand";

const MISCONFIGURED =
  "Konfigurasi sandi belum lengkap. Pemilik deploy perlu mengisi APP_PASSCODE (minimal 8 karakter) dan SESSION_SECRET (minimal 32 karakter) di Vercel, lalu redeploy.";

/** Form sandi aplikasi. Sandi hanya dikirim ke /api/unlock; tidak disimpan di perangkat. */
export function UnlockForm({ state, next }: { state: State; next: string }) {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(state === "misconfigured" ? MISCONFIGURED : null);

  if (state === "off") {
    return (
      <div className="space-y-4">
        <h1 className="text-[22px] leading-tight font-semibold">Sandi aplikasi tidak aktif</h1>
        <Link href="/" className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
          Buka aplikasi
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
      if (body.error === "wrong") setError(`Sandi salah. Sisa ${body.remaining ?? 0} percobaan.`);
      else if (body.error === "rate_limited") setError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil((body.retryAfterSec ?? 900) / 60))} menit.`);
      else if (body.error === "misconfigured") setError(MISCONFIGURED);
      else setError("Gagal membuka. Coba lagi.");
    } catch {
      setError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setPasscode("");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <p className="t-label">Terkunci</p>
        <h1 className="mt-1 text-[22px] leading-tight font-semibold">Masukkan sandi aplikasi</h1>
        <p className="mt-1 text-body text-muted">Aplikasi ini dikunci oleh pemilik deploy. Perangkat ini tetap terbuka 90 hari setelah sandi benar.</p>
      </div>
      <label className="block text-[12px] text-muted">
        Sandi aplikasi
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
        {busy ? "Membuka" : "Buka"}
      </button>
    </form>
  );
}
