import Link from "next/link";
import { CARD_BLOCK, cardAriaLabel, cardElements, type CardElement, type CardFont, type CardRole, type WeekRunModel } from "@/lib/week-run-card";

/** Peran warna kartu → token tema (layar). Ekspor PNG memakai warna tetap (`lib/share-card.ts`). */
const ROLE: Record<CardRole, string> = {
  ink: "fill-ink",
  dim: "fill-ink opacity-50",
  faint: "fill-ink opacity-30",
  rule: "fill-ink opacity-25",
  brand: "fill-brand",
};

const FONT: Record<CardFont, React.CSSProperties> = {
  display: { fontFamily: "var(--font-sans)", fontStyle: "italic", fontStretch: "75%", fontVariationSettings: "'wdth' 75", fontVariantNumeric: "tabular-nums" },
  sans: { fontFamily: "var(--font-sans)", fontStyle: "normal", fontStretch: "100%", fontVariationSettings: "normal", fontVariantNumeric: "tabular-nums" },
  mono: { fontFamily: "var(--font-mono)", fontStyle: "normal", fontStretch: "100%", fontVariationSettings: "normal" },
};

/** Layout kartu yang sama dengan ekspor PNG, digambar dengan token tema. */
export function WeekCardSvg({ elements, ariaLabel }: { elements: CardElement[]; ariaLabel: string }) {
  const b = CARD_BLOCK;
  return (
    <svg viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
      {elements.map((e) => {
        switch (e.kind) {
          case "rect":
            return <rect key={e.key} x={e.x} y={e.y} width={e.w} height={e.h} rx={e.rx} className={ROLE[e.role]} />;
          case "circle":
            return <circle key={e.key} cx={e.cx} cy={e.cy} r={e.r} className={ROLE[e.role]} />;
          case "line":
            return <rect key={e.key} x={e.x1} y={e.y - e.width / 2} width={e.x2 - e.x1} height={e.width} className={ROLE[e.role]} />;
          case "text":
            return (
              <text
                key={e.key}
                x={e.x}
                y={e.y}
                fontSize={e.size}
                fontWeight={e.weight}
                textAnchor={e.anchor ?? "start"}
                letterSpacing={e.spacing ? e.spacing * e.size : undefined}
                className={ROLE[e.role]}
                style={FONT[e.font]}
              >
                {e.spans.map((s, i) => (
                  <tspan key={i} dx={s.dx} fontSize={s.size} fontWeight={s.weight} className={s.role ? ROLE[s.role] : undefined} style={s.font ? FONT[s.font] : undefined}>
                    {s.text}
                  </tspan>
                ))}
              </text>
            );
        }
      })}
    </svg>
  );
}

/**
 * Kartu "Minggu ini · lari" di Profil (1.1.0), pengganti kartu "7 hari terakhir". Ketuk kartu untuk detail di Tren
 * (pace, HR, long run, load, 80/20, Week Ledger).
 */
export function WeekRunCard({ model }: { model: WeekRunModel }) {
  return (
    <section aria-label="Minggu ini · lari" className="rounded-card border border-line bg-surface shadow-card">
      <Link href="/insight#minggu-ini" className="pressable block rounded-card px-3 pt-4 hover:bg-subtle/60">
        <WeekCardSvg elements={cardElements(model, "id")} ariaLabel={`${cardAriaLabel(model)} Buka detail di Tren.`} />
      </Link>
      <div className="flex items-center justify-between gap-2 px-5 pt-1 pb-4">
        <span className="text-[13px] text-muted">Ketuk kartu untuk detail di Tren</span>
      </div>
    </section>
  );
}
