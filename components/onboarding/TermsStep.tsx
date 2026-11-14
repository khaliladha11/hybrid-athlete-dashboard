"use client";

import { useId, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { DOCS } from "@/lib/docs-links";
import { useT } from "@/lib/i18n/client";
import { SAFETY } from "@/lib/i18n/messages/safety";

const NOTICE_URL = DOCS.notice;

/** Disclaimer & lisensi. Dipakai di wizard (langkah 2) dan sebagai layar tunggal dari gate. */
export function TermsStep({ onAccept, acceptLabel }: { onAccept: () => void; acceptLabel?: string }) {
  const t = useT(SAFETY).terms;
  const [checked, setChecked] = useState(false);
  const points: { title: string; body: React.ReactNode }[] = [
    ...t.points,
    {
      title: t.licenseTitle,
      body: (
        <>
          {t.licenseBefore}{" "}
          <a href={NOTICE_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline underline-offset-2">
            NOTICE.md
          </a>
          .
        </>
      ),
    },
  ];
  const id = useId();
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {points.map((p, i) => (
          <li key={p.title} className="flex gap-3 rounded-inner bg-subtle p-3">
            <span className="t-label mt-0.5 shrink-0">{i + 1}</span>
            <p className="text-[14px] leading-relaxed text-ink">
              <span className="font-semibold">{p.title}</span> <span className="text-muted">{p.body}</span>
            </p>
          </li>
        ))}
      </ol>
      <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-inner border border-line-strong px-3">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--brand)]" />
        <span className="text-body font-semibold">{t.agree}</span>
      </label>
      <button type="button" disabled={!checked} onClick={onAccept} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
        {acceptLabel ?? t.accept}
      </button>
      <p className="text-[12px] text-faint">{t.notLegal}</p>
    </div>
  );
}
