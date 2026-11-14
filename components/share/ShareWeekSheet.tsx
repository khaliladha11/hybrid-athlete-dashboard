"use client";

import { useEffect, useRef, useState } from "react";
import { BUTTON } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { PREF_KEYS } from "@/lib/preference-keys";
import { EXPORT_SIZES, cardSvg, parseShareOptions, shareFileName, type ShareOptions } from "@/lib/share-card";
import { embeddedFontCss, renderPng } from "@/lib/share-export";
import type { WeekRunModel } from "@/lib/week-run-card";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locale";
import { SHARE } from "@/lib/i18n/messages/share";

/** Tombol "Bagikan" di kartu mingguan: membuka sheet ekspor PNG. */
export function ShareWeekButton({ model }: { model: WeekRunModel }) {
  const [open, setOpen] = useState(false);
  const t = useT(SHARE);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${BUTTON.base} ${BUTTON.secondary} min-h-11 px-3 text-[14px]`}>
        <ShareIcon />
        {t.share}
      </button>
      {open && <ShareWeekSheet model={model} onClose={() => setOpen(false)} />}
    </>
  );
}

function readOptions(lang: Locale): ShareOptions {
  try {
    return parseShareOptions(localStorage.getItem(PREF_KEYS.shareCard), lang);
  } catch {
    return parseShareOptions(null, lang);
  }
}

/** Simpan pilihan sheet. Bahasa kartu hanya disimpan bila pernah dipilih sendiri, supaya bawaannya tetap mengikuti app. */
function storeOptions(next: ShareOptions, patch: Partial<ShareOptions>) {
  try {
    const prev = JSON.parse(localStorage.getItem(PREF_KEYS.shareCard) ?? "{}") as Partial<ShareOptions>;
    const { lang, ...rest } = next;
    localStorage.setItem(PREF_KEYS.shareCard, JSON.stringify({ ...rest, ...("lang" in patch || prev.lang ? { lang } : {}) }));
  } catch {}
}

/** Bisa membagikan file PNG lewat Web Share API? */
function canShareFiles(): boolean {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File(["x"], "x.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

/**
 * Sheet ekspor kartu "Minggu ini · lari" (1.1.0): PNG transparan story 1080×1920 atau feed 1080×1350, tinta terang/gelap,
 * bahasa kartu EN/ID, watermark opsional. Pratinjau memakai SVG yang sama dengan PNG.
 */
export function ShareWeekSheet({ model, onClose }: { model: WeekRunModel; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const locale = useLocale();
  const t = useT(SHARE);
  const [opts, setOpts] = useState<ShareOptions>(() => readOptions(locale));
  const [fonts, setFonts] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareable] = useState(canShareFiles);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let live = true;
    embeddedFontCss().then((css) => live && setFonts(css));
    return () => {
      live = false;
    };
  }, []);

  const update = (patch: Partial<ShareOptions>) => {
    const next = { ...opts, ...patch };
    setOpts(next);
    storeOptions(next, patch);
  };

  const svg = fonts === null ? null : cardSvg(model, opts, fonts);
  const size = EXPORT_SIZES[opts.format];
  const name = shareFileName(model.to);

  const makeFile = async () => {
    const blob = await renderPng(cardSvg(model, opts, fonts ?? ""), size.w, size.h);
    return new File([blob], name, { type: "image/png" });
  };

  const run = async (action: "share" | "download") => {
    setBusy(true);
    setError(null);
    try {
      const file = await makeFile();
      if (action === "share") {
        try {
          await navigator.share({ files: [file] });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e;
        }
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch {
      setError(action === "share" ? t.shareFailed : t.pngFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="share-week-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="movement-sheet"
    >
      <div className="max-h-[88dvh] overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" />
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 id="share-week-title" className="text-[18px] leading-tight font-semibold">
              {t.title}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">{t.intro}</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t.close}
            className="pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-[20px] text-muted hover:bg-subtle hover:text-ink"
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="mt-3 flex justify-center">
          <div
            className={`checkerboard relative overflow-hidden rounded-inner border border-line ${opts.format === "story" ? "aspect-[9/16] w-[46%]" : "aspect-[4/5] w-[58%]"}`}
          >
            {svg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={t.preview(size.w, size.h)} className="absolute inset-0 h-full w-full" />
            )}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <Segmented
            label={t.format}
            value={opts.format}
            options={[
              { value: "story", label: "Story 9:16" },
              { value: "feed", label: "Feed 4:5" },
            ]}
            onChange={(format) => update({ format })}
          />
          <Segmented
            label={t.ink}
            value={opts.ink}
            options={[
              { value: "light", label: t.light },
              { value: "dark", label: t.dark },
            ]}
            onChange={(ink) => update({ ink })}
          />
          <Segmented
            label={t.lang}
            value={opts.lang}
            options={[
              { value: "en", label: "EN" },
              { value: "id", label: "ID" },
            ]}
            onChange={(lang) => update({ lang })}
          />
          <Switch checked={opts.watermark} onChange={(watermark) => update({ watermark })} label='Watermark "HYBRID ATHLETE"' />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-danger-ink">
            {error}
          </p>
        )}
        <div className={`mt-4 grid gap-2 ${shareable ? "grid-cols-2" : "grid-cols-1"}`}>
          {shareable && (
            <button type="button" disabled={busy || svg === null} onClick={() => run("share")} className={`${BUTTON.base} ${BUTTON.primary} ${BUTTON.lg}`}>
              {t.share}
            </button>
          )}
          <button
            type="button"
            disabled={busy || svg === null}
            onClick={() => run("download")}
            className={`${BUTTON.base} ${shareable ? BUTTON.secondary : BUTTON.primary} ${BUTTON.lg}`}
          >
            {t.download}
          </button>
        </div>
        <p className="mt-2 text-center text-[12px] text-faint">{name}</p>
      </div>
    </dialog>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12m0-12 4 4m-4-4-4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
