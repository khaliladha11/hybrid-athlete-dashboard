"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { isConnectionStatus, type ConnectionResult } from "@/lib/intervals/connection";

/** Panggil `/api/connection`. Gagal memanggil server sendiri dianggap "network". */
async function fetchConnection(): Promise<ConnectionResult> {
  try {
    const res = await fetch("/api/connection", { cache: "no-store" });
    const json = (await res.json()) as Record<string, unknown>;
    if (!isConnectionStatus(json.status)) return { status: "network" };
    return { status: json.status, athleteName: typeof json.athleteName === "string" ? json.athleteName : undefined };
  } catch {
    return { status: "network" };
  }
}

const Code = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-subtle-strong px-1 font-mono text-[12px] text-ink">{children}</code>;

const MESSAGES: Record<Exclude<ConnectionResult["status"], "ok">, { title: string; body: React.ReactNode }> = {
  missing: {
    title: "API key belum diisi.",
    body: (
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          Di intervals.icu: <span className="font-semibold">Settings › Developer Settings</span>. Salin API Key dan Athlete ID.
        </li>
        <li>
          Di Vercel: <span className="font-semibold">Project › Settings › Environment Variables</span>. Isi <Code>INTERVALS_API_KEY</Code> dan{" "}
          <Code>INTERVALS_ATHLETE_ID</Code> (atau <Code>0</Code>).
        </li>
        <li>
          <span className="font-semibold">Deployments › ⋯ › Redeploy</span>, lalu buka lagi halaman ini.
        </li>
      </ol>
    ),
  },
  unauthorized: { title: "API key ditolak.", body: "Cek ulang key di intervals.icu, perbarui di Vercel, lalu redeploy." },
  forbidden: { title: "Athlete ID tidak cocok dengan key.", body: <>Cek athlete ID, atau isi <Code>0</Code> untuk pemilik key, lalu redeploy.</> },
  not_found: { title: "Athlete ID tidak cocok dengan key.", body: <>Cek athlete ID, atau isi <Code>0</Code> untuk pemilik key, lalu redeploy.</> },
  network: { title: "intervals.icu tidak bisa dihubungi.", body: "Coba lagi sebentar." },
};

/**
 * Onboarding langkah 3 (dan pengingat di Setting). Browser hanya menerima status, tidak pernah key.
 * - wizard: tombol Lanjut (bila tersambung) atau Cek lagi + Lanjut dengan Demo Mode.
 * - reminder: hanya Cek lagi; `onOk` dipanggil sekali begitu tersambung.
 */
export function ConnectionStep({
  mode = "wizard",
  onContinue,
  onSkip,
  onOk,
}: {
  mode?: "wizard" | "reminder";
  onContinue?: () => void;
  onSkip?: () => void;
  onOk?: () => void;
}) {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [checking, setChecking] = useState(true);
  const okSent = useRef(false);

  const check = useCallback(async () => {
    setChecking(true);
    const r = await fetchConnection();
    setResult(r);
    setChecking(false);
    if (r.status === "ok" && onOk && !okSent.current) {
      okSent.current = true;
      onOk();
    }
  }, [onOk]);

  useEffect(() => {
    void check();
    // Cek sekali saat dibuka; selanjutnya lewat tombol Cek lagi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = result?.status === "ok";
  const msg = result && result.status !== "ok" ? MESSAGES[result.status] : null;

  return (
    <div className="space-y-3">
      <div role="status" aria-live="polite" className="rounded-inner bg-subtle p-3 text-[14px] leading-relaxed">
        {checking && !result && <p className="text-muted">Memeriksa koneksi ke intervals.icu…</p>}
        {ok && (
          <p className="font-semibold text-success-ink">
            ✓ {result.athleteName ? `Tersambung sebagai ${result.athleteName}.` : "Tersambung ke intervals.icu."}
          </p>
        )}
        {msg && (
          <>
            <p className="font-semibold text-danger-ink">✕ {msg.title}</p>
            <div className="mt-1 text-muted">{msg.body}</div>
            <p className="mt-3 border-t border-line pt-2 text-[13px] font-semibold text-ink">Perubahan environment variable baru berlaku setelah redeploy.</p>
          </>
        )}
      </div>

      {mode === "wizard" && ok && (
        <button type="button" onClick={onContinue} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
          Lanjut
        </button>
      )}
      {!ok && (
        <button type="button" onClick={() => void check()} disabled={checking} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} w-full`}>
          {checking ? "Memeriksa…" : "Cek lagi"}
        </button>
      )}
      {mode === "wizard" && !ok && result && (
        <button type="button" onClick={onSkip} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} w-full`}>
          Lanjut dengan Demo Mode
        </button>
      )}
    </div>
  );
}
