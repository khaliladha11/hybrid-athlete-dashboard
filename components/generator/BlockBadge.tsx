import type { BlockContext } from "@/lib/generator/block";

/** Posisi di blok periodisasi: segmen per minggu, minggu berjalan oranye, deload biru. */
export function BlockBadge({ block }: { block: BlockContext }) {
  return (
    <div className="shrink-0 text-right" aria-label={`Blok ${block.index + 1}, minggu ${block.week} dari ${block.weeks}${block.deload ? ", deload" : ""}`}>
      <p className="text-[12px] text-muted">Blok {block.index + 1}</p>
      <p className={`tabular text-body font-semibold ${block.deload ? "text-info" : "text-ink"}`}>
        {block.deload ? "Deload" : `Minggu ${block.week}/${block.weeks}`}
      </p>
      <div className="mt-1 flex justify-end gap-1" aria-hidden>
        {Array.from({ length: block.weeks }, (_, i) => {
          const w = i + 1;
          const isDeload = w === block.weeks;
          const current = w === block.week;
          return (
            <span
              key={w}
              className={`h-1 w-4 rounded-sm ${
                current ? (isDeload ? "bg-info" : "bg-brand") : w < block.week ? "bg-brand/40" : "bg-subtle-strong"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
