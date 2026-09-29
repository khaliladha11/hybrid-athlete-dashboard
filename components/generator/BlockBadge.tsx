import type { BlockContext } from "@/lib/generator/block";

/** Posisi di blok periodisasi: Blok n · Minggu x/y, disorot saat minggu deload. */
export function BlockBadge({ block }: { block: BlockContext }) {
  return (
    <div
      className={`shrink-0 rounded-xl px-2.5 py-1.5 text-right ${
        block.deload
          ? "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">Blok {block.index + 1}</p>
      <p className="tabular text-xs font-semibold">
        {block.deload ? "Deload" : `Minggu ${block.week}/${block.weeks}`}
      </p>
    </div>
  );
}
