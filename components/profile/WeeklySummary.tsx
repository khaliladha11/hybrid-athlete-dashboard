import { Card, Chip, StatRow } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatPaceTag } from "@/components/ui/format";
import { CATEGORY_LABEL, summarizeLast7Days } from "@/lib/intervals/summary";
import { KM_INCREASE_LIMIT, MAX_HARD_RUNS_7D, weekStats } from "@/lib/coach";
import type { Activity, ActivityCategory, FetchResult } from "@/lib/intervals/types";

const DAY_MONTH = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const WEEKDAY_SHORT = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" });
const utc = (d: string) => new Date(`${d}T00:00:00Z`);

export function WeeklySummary({ result, today }: { result: FetchResult<Activity[]>; today: string }) {
  if (!result.ok) {
    return (
      <Card title="7 hari terakhir">
        <ErrorState error={result.error} compact />
      </Card>
    );
  }
  const s = summarizeLast7Days(result.data, today);
  const sessions = Object.entries(s.sessions) as [ActivityCategory, number][];

  return (
    <Card title="7 hari terakhir" action={<span className="t-label">{`${DAY_MONTH.format(utc(s.from))} sampai ${DAY_MONTH.format(utc(s.to))}`}</span>}>
      <StatRow
        items={[
          { label: "Lari", value: s.runKm.toFixed(1), unit: "km" },
          { label: "Pace", value: formatPaceTag(s.avgPaceSecPerKm), unit: "/km", muted: !s.avgPaceSecPerKm },
          { label: "Avg HR", value: s.avgRunHr ? Math.round(s.avgRunHr) : undefined, unit: "bpm" },
          {
            label: "Long run",
            value: s.longestRun ? s.longestRun.km.toFixed(1) : undefined,
            unit: s.longestRun?.date ? `km · ${WEEKDAY_SHORT.format(utc(s.longestRun.date))}` : "km",
          },
          { label: "Load", value: s.totalLoad ? Math.round(s.totalLoad) : undefined, unit: "total" },
          { label: "Sesi", value: s.totalSessions, unit: "aktivitas" },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {sessions.length === 0 ? (
          <span className="text-[13px] text-muted">Belum ada aktivitas.</span>
        ) : (
          sessions.map(([cat, n]) => (
            <Chip key={cat} tone={cat === "run" ? "accent" : "neutral"}>
              {CATEGORY_LABEL[cat]} ×{n}
            </Chip>
          ))
        )}
      </div>
      <IntensityAndTrend activities={result.data} today={today} />
      <WeekLedger activities={result.data} from={s.calendarWeek.from} to={s.calendarWeek.to} totalKm={s.calendarWeek.runKm} />
    </Card>
  );
}

/**
 * Week Ledger: km lari per hari di minggu kalender (Senin sampai Minggu). Total = jumlah mentah;
 * angka per hari dibulatkan 1 desimal, jadi jumlahnya bisa beda sedikit dari total. Itu wajar.
 */
function WeekLedger({ activities, from, to, totalKm }: { activities: Activity[]; from: string; to: string; totalKm: number }) {
  const byDay = new Map<string, number>();
  for (const a of activities) {
    if (a.category !== "run" || !a.date || a.date < from || a.date > to) continue;
    byDay.set(a.date, (byDay.get(a.date) ?? 0) + (a.distanceKm ?? 0));
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="mt-4 border-t border-line pt-4">
      {days.length === 0 ? (
        <>
          <p className="t-label">Minggu ini · km</p>
          <p className="mt-2 text-[13px] text-muted">Belum ada lari minggu ini.</p>
        </>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className="t-label border-b-2 border-line-strong pb-2.5 text-left">
                Minggu ini
              </th>
              <th scope="col" className="t-label border-b-2 border-line-strong pb-2.5 text-right">
                km
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map(([d, km]) => (
              <tr key={d} className="border-b border-line">
                <td className="t-ledger py-3">{WEEKDAY.format(utc(d))}</td>
                <td className="t-ledger-num py-3 text-right">{km.toFixed(1)}</td>
              </tr>
            ))}
            <tr>
              <td className="t-ledger pt-4">Total</td>
              <td className="t-ledger-num pt-4 text-right text-[28px]">{totalKm.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Distribusi easy/berat (acuan 80/20) dan perubahan km vs 7 hari sebelumnya. */
function IntensityAndTrend({ activities, today }: { activities: Activity[]; today: string }) {
  const w = weekStats(activities, today);
  if (!w.runs7) return null;
  const easy = w.runs7 - w.hardRuns7;
  const easyPct = Math.round((easy / w.runs7) * 100);
  const tooHard = w.hardRuns7 >= MAX_HARD_RUNS_7D;
  const tooFast = w.kmChange !== undefined && w.kmChange > KM_INCREASE_LIMIT;
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="t-label">Intensitas · acuan 80/20</span>
          <span className="tabular text-[13px] font-semibold">
            <span className="text-success-ink">{easy} easy</span> · <span className="text-danger-ink">{w.hardRuns7} berat</span>
          </span>
        </div>
        <div className="relative mt-2 flex h-2 overflow-hidden rounded-full bg-danger" aria-hidden>
          <div className="bg-success" style={{ width: `${easyPct}%` }} />
          <div className="absolute inset-y-0 left-[80%] w-px bg-ink/50" />
        </div>
        <p className={`mt-1.5 text-[12px] font-semibold ${tooHard ? "text-danger-ink" : "text-success-ink"}`}>
          {tooHard ? "✕ Terlalu banyak sesi berat. Sesi berikutnya Easy." : "✓ Distribusi aman"}
        </p>
      </div>
      {w.kmChange !== undefined && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] text-muted">Jarak vs 7 hari sebelumnya ({w.runKmPrev7.toFixed(1)} km)</span>
          <span className={`tabular text-[13px] font-semibold ${tooFast ? "text-danger-ink" : "text-success-ink"}`}>
            {tooFast ? "✕ " : "✓ "}
            {w.kmChange >= 0 ? "+" : ""}
            {Math.round(w.kmChange * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
