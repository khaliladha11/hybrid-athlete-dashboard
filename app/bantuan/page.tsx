import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HELP_DISCLAIMER, HELP_INTRO, HELP_LINKS, HELP_TOPICS } from "@/lib/help";
import { WATCH_BRANDS, WATCH_LABEL, WATCH_STEPS } from "@/lib/intervals/watch";

export const metadata: Metadata = { title: "Bantuan · Hybrid Athlete" };

const LINK = "inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline underline-offset-2";

// Bantuan (1.0.0-rc.2): ringkasan statis, dibuka dari Setting › Tentang & versi dan lembar "Apa ini?". Versi panjang
// di docs/GUIDE.md. Langkah per merek jam memakai teks yang sama dengan kartu Kirim ke jam.
export default function BantuanPage() {
  return (
    <div className="space-y-4">
      <Link href="/setting#tentang" className="inline-flex min-h-11 items-center text-body text-muted hover:text-ink">
        ← Setting
      </Link>
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">Bantuan</h1>
        <p className="mt-0.5 text-[13px] text-muted">{HELP_INTRO}</p>
      </header>
      <nav aria-label="Topik bantuan" className="flex flex-wrap gap-x-4">
        {HELP_TOPICS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-2 hover:underline">
            {t.title}
          </a>
        ))}
      </nav>
      {HELP_TOPICS.map((t) => (
        <section key={t.id} id={t.id} className="scroll-mt-20" aria-labelledby={`${t.id}-title`}>
          <Card title={<span id={`${t.id}-title`}>{t.title}</span>}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {t.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {t.id === "jam" && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                {WATCH_BRANDS.map((b) => (
                  <div key={b}>
                    <p className="t-label">{WATCH_LABEL[b]}</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px] text-muted">
                      {WATCH_STEPS[b].map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      ))}
      <Card title="Selengkapnya">
        <ul>
          {HELP_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className={LINK}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-faint">{HELP_DISCLAIMER}</p>
      </Card>
    </div>
  );
}
