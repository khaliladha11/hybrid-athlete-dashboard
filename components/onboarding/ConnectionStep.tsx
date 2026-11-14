"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { DOCS } from "@/lib/docs-links";
import { isConnectionStatus, type ConnectionResult } from "@/lib/intervals/connection";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locale";
import { ONBOARDING } from "@/lib/i18n/messages/onboarding";

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

function messages(l: Locale): Record<Exclude<ConnectionResult["status"], "ok">, { title: string; body: React.ReactNode }> {
  const t = ONBOARDING[l].connection;
  const mismatch = { title: t.mismatch, body: <>{t.mismatchA}<Code>0</Code>{t.mismatchB}</> };
  return {
    missing: {
      title: t.missing,
      body: (
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            {t.missing1A}<span className="font-semibold">Settings › Developer Settings</span>{t.missing1B}
          </li>
          <li>
            {t.missing2A}<span className="font-semibold">Project › Settings › Environment Variables</span>{t.missing2B}<Code>INTERVALS_API_KEY</Code>{t.missing2C}
            <Code>INTERVALS_ATHLETE_ID</Code>{t.missing2D}<Code>0</Code>{t.missing2E}
          </li>
          <li>
            <span className="font-semibold">Deployments › ⋯ › Redeploy</span>{t.missing3}
          </li>
          <li className="list-none">
            <a href={DOCS.env} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brand-ink underline underline-offset-2">
              {t.readme}
            </a>
          </li>
        </ol>
      ),
    },
    unauthorized: { title: t.unauthorized, body: t.unauthorizedBody },
    forbidden: mismatch,
    not_found: mismatch,
    network: { title: t.network, body: t.networkBody },
  };
}

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
  const locale = useLocale();
  const t = useT(ONBOARDING).connection;

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
  const msg = result && result.status !== "ok" ? messages(locale)[result.status] : null;

  return (
    <div className="space-y-3">
      <div role="status" aria-live="polite" className="rounded-inner bg-subtle p-3 text-[14px] leading-relaxed">
        {checking && !result && <p className="text-muted">{t.checking}</p>}
        {ok && (
          <p className="font-semibold text-success-ink">
            ✓ {result.athleteName ? t.connectedAs(result.athleteName) : t.connected}
          </p>
        )}
        {msg && (
          <>
            <p className="font-semibold text-danger-ink">✕ {msg.title}</p>
            <div className="mt-1 text-muted">{msg.body}</div>
            <p className="mt-3 border-t border-line pt-2 text-[13px] font-semibold text-ink">{t.redeploy}</p>
          </>
        )}
      </div>

      {mode === "wizard" && ok && (
        <button type="button" onClick={onContinue} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
          {t.next}
        </button>
      )}
      {!ok && (
        <button type="button" onClick={() => void check()} disabled={checking} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.secondary} w-full`}>
          {checking ? t.checkingShort : t.checkAgain}
        </button>
      )}
      {mode === "wizard" && !ok && result && (
        <button type="button" onClick={onSkip} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.ghost} w-full`}>
          {t.demo}
        </button>
      )}
    </div>
  );
}
