import type { IntervalsError } from "@/lib/intervals/types";

export function ErrorState({ error, compact }: { error: IntervalsError; compact?: boolean }) {
  return (
    <div role="alert" className={`rounded-xl border border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 ${compact ? "p-3" : "p-4"}`}>
      <p className="text-sm font-semibold">{error.title}</p>
      <p className="mt-0.5 text-xs opacity-90">{error.message}</p>
    </div>
  );
}
