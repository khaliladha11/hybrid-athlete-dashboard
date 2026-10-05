import type { IntervalsError } from "@/lib/intervals/types";

export function ErrorState({ error, compact }: { error: IntervalsError; compact?: boolean }) {
  return (
    <div role="alert" className={`rounded-card border border-danger/30 bg-danger-soft text-danger ${compact ? "p-3" : "p-4"}`}>
      <p className="text-body font-semibold">{error.title}</p>
      <p className="mt-0.5 text-[13px] opacity-90">{error.message}</p>
    </div>
  );
}
