"use client";

import { useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { CHECKIN_LABEL, checkinOn, hasValues, moodNote, type CheckinField } from "@/lib/checkin";
import { checkinStore, useCheckins } from "@/lib/checkin-store";
import { useIsClient } from "@/lib/settings-store";

type Values = Partial<Record<CheckinField, number>>;

const SCALE5 = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));

/**
 * Check-in harian (0.15.2): sekali per hari, opsional, di bawah 10 detik. Nyeri & pegal lewat slider 0–10, tidur & mood
 * lewat pilihan 1–5. "Lewati hari ini" menyimpan entri kosong supaya tidak ditanya lagi (juga di perangkat lain).
 * Setelah disimpan tampil ringkas dan bisa diubah hari itu. Saran hanya menurunkan (lib/checkin.ts).
 */
export function CheckinCard({ today }: { today: string }) {
  const client = useIsClient();
  const list = useCheckins();
  const entry = checkinOn(list, today);
  const [editing, setEditing] = useState(false);
  if (!client) return null;
  if (entry && !hasValues(entry) && !editing) return null;
  if (entry && hasValues(entry) && !editing) {
    const parts = [
      entry.shin !== undefined ? `shin ${entry.shin}/10` : null,
      entry.soreness !== undefined ? `pegal ${entry.soreness}/10` : null,
      entry.sleep !== undefined ? `tidur ${entry.sleep}/5` : null,
      entry.mood !== undefined ? `mood ${entry.mood}/5` : null,
    ].filter(Boolean);
    return (
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-2 shadow-card">
        <span className="min-w-0 flex-1">
          <span className="t-label block text-ink">Check-in hari ini</span>
          <span className="tabular block text-[13px] text-muted">{parts.join(" · ")}</span>
          {moodNote(entry) && <span className="block text-[13px] text-muted">{moodNote(entry)}</span>}
        </span>
        <button type="button" onClick={() => setEditing(true)} className={`${BUTTON.base} ${BUTTON.ghost} text-[13px]`}>
          Ubah
        </button>
      </div>
    );
  }
  return <CheckinForm today={today} initial={entry && hasValues(entry) ? entry : {}} onDone={() => setEditing(false)} />;
}

function CheckinForm({ today, initial, onDone }: { today: string; initial: Values; onDone: () => void }) {
  const [v, setV] = useState<Values>({ shin: initial.shin ?? 0, soreness: initial.soreness ?? 0, sleep: initial.sleep, mood: initial.mood });
  const set = (f: CheckinField, n: number) => setV((cur) => ({ ...cur, [f]: n }));
  const save = () => {
    checkinStore.save(today, v);
    onDone();
  };
  const skip = () => {
    checkinStore.skip(today);
    onDone();
  };
  return (
    <Card title="Check-in hari ini">
      <p className="-mt-2 mb-4 text-[13px] text-muted">Opsional. Nyeri shin, pegal, dan tidur buruk hanya bisa menurunkan saran hari ini.</p>
      <div className="space-y-4">
        <Slider field="shin" value={v.shin ?? 0} onChange={(n) => set("shin", n)} low="tidak nyeri" high="sangat nyeri" />
        <Slider field="soreness" value={v.soreness ?? 0} onChange={(n) => set("soreness", n)} low="tidak pegal" high="sangat pegal" />
        <div>
          <Segmented label={`${CHECKIN_LABEL.sleep} (1 buruk, 5 sangat baik)`} value={v.sleep ?? 0} options={SCALE5} onChange={(n) => set("sleep", n)} />
        </div>
        <div>
          <Segmented label={`${CHECKIN_LABEL.mood} (1 buruk, 5 sangat baik)`} value={v.mood ?? 0} options={SCALE5} onChange={(n) => set("mood", n)} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={skip} className={`${BUTTON.base} ${BUTTON.secondary}`}>
          Lewati hari ini
        </button>
        <button type="button" onClick={save} className={`${BUTTON.base} ${BUTTON.primary}`}>
          Simpan
        </button>
      </div>
    </Card>
  );
}

function Slider({ field, value, onChange, low, high }: { field: CheckinField; value: number; onChange: (n: number) => void; low: string; high: string }) {
  const id = `checkin-${field}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={id} className="t-label">
          {CHECKIN_LABEL[field]}
        </label>
        <span className="font-mono text-base font-semibold tabular-nums text-ink">{value}/10</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} dari 10`}
        className="block h-11 w-full accent-[var(--brand)]"
      />
      <div className="flex justify-between text-[12px] text-muted">
        <span>0 {low}</span>
        <span>10 {high}</span>
      </div>
    </div>
  );
}
