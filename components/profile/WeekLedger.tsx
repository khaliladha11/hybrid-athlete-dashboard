"use client";

import { useMemo } from "react";
import { weekStats } from "@/lib/coach";
import type { Activity } from "@/lib/intervals/types";
import { useStSessions } from "@/lib/st-session-store";
import { ledgerDays } from "@/lib/week-ledger";

const WEEKDAY = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });
const utc = (d: string) => new Date(`${d}T00:00:00Z`);

/**
 * Week Ledger: km lari per hari di minggu kalender (Senin sampai Minggu) dan, sejak 0.14.1, baris ST per sesi
 * (sesi mode latihan di perangkat + aktivitas strength intervals.icu tanpa hitung dobel). Total = km lari mentah;
 * angka per hari dibulatkan 1 desimal, jadi jumlahnya bisa beda sedikit dari total. Itu wajar.
 */
export function WeekLedger({ activities, from, to, totalKm }: { activities: Activity[]; from: string; to: string; totalKm: number }) {
  const sessions = useStSessions();
  const days = useMemo(() => ledgerDays(activities, sessions, from, to), [activities, sessions, from, to]);
  const rows = days.flatMap((d) => [
    ...(d.runKm !== undefined ? [{ key: `${d.date}-run`, label: WEEKDAY.format(utc(d.date)), value: d.runKm.toFixed(1) }] : []),
    ...d.st.map((s, i) => ({ key: `${d.date}-st-${i}`, label: `${WEEKDAY.format(utc(d.date))} · ${s.label}`, value: s.minutes ? `${s.minutes}'` : "·" })),
  ]);

  return (
    <div className="mt-4 border-t border-line pt-4">
      {rows.length === 0 ? (
        <>
          <p className="t-label">Minggu ini · km</p>
          <p className="mt-2 text-[13px] text-muted">Belum ada lari atau ST minggu ini.</p>
        </>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className="t-label border-b-2 border-line-strong pb-2.5 text-left">
                Minggu ini
              </th>
              <th scope="col" className="t-label border-b-2 border-line-strong pb-2.5 text-right">
                km · menit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line">
                <td className="t-ledger py-3">{r.label}</td>
                <td className={`t-ledger-num py-3 text-right ${r.value === "·" ? "text-faint" : ""}`}>{r.value}</td>
              </tr>
            ))}
            <tr>
              <td className="t-ledger pt-4">Total lari</td>
              <td className="t-ledger-num pt-4 text-right text-[28px]">{totalKm.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

/** ST 7 hari: jumlah sesi, menit, dan beban session-RPE (AU). Beban lari tidak dijumlahkan ke sini. */
export function StLoad7({ activities, today }: { activities: Activity[]; today: string }) {
  const sessions = useStSessions();
  const s = useMemo(() => weekStats(activities, today, sessions), [activities, today, sessions]);
  if (!s.st7) return null;
  return (
    <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-line pt-4">
      <span className="text-[13px] text-muted">ST 7 hari · beban RPE × menit</span>
      <span className="tabular text-right text-[13px] font-semibold">
        {s.st7} sesi · {s.stMin7}&apos; · {s.stLoad7 ? `beban ${s.stLoad7}` : <span className="text-faint">·</span>}
        {s.stNoRpe7 > 0 && <span className="block text-[12px] font-normal text-muted">{s.stNoRpe7} sesi tanpa RPE (intervals.icu)</span>}
      </span>
    </div>
  );
}
