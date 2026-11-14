import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { helpDisclaimer, helpIntro, helpLinks, helpTopics } from "@/lib/help";
import { WATCH_BRANDS, watchLabel, watchSteps } from "@/lib/intervals/watch";
import { MISC } from "@/lib/i18n/messages/misc";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: MISC[await getLocale()].help.meta };
}

const LINK = "inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline underline-offset-2";

// Bantuan (1.0.0-rc.2): ringkasan statis, dibuka dari Setting › Tentang & versi dan lembar "Apa ini?". Versi panjang
// di docs/GUIDE.md. Langkah per merek jam memakai teks yang sama dengan kartu Kirim ke jam.
export default async function BantuanPage() {
  const locale = await getLocale();
  const m = MISC[locale].help;
  const topics = helpTopics(locale);
  return (
    <div className="space-y-4">
      <Link href="/setting#tentang" className="inline-flex min-h-11 items-center text-body text-muted hover:text-ink">
        {m.back}
      </Link>
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">{m.title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">{helpIntro(locale)}</p>
      </header>
      <nav aria-label={m.topics} className="flex flex-wrap gap-x-4">
        {topics.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-2 hover:underline">
            {t.title}
          </a>
        ))}
      </nav>
      {topics.map((t) => (
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
                    <p className="t-label">{watchLabel(b, locale)}</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px] text-muted">
                      {watchSteps(b, locale).map((s) => (
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
      <Card title={m.more}>
        <ul>
          {helpLinks(locale).map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className={LINK}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-faint">{helpDisclaimer(locale)}</p>
      </Card>
    </div>
  );
}
