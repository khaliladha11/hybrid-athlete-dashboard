"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatDateId, todayWib } from "@/lib/date";
import { historyFor, type LogEntry } from "@/lib/progression";
import { trainingLog, useTrainingLog } from "@/lib/training-log";

function valueLabel(e: LogEntry) {
  const load = e.load !== undefined ? `${e.load} kg` : e.band ? `${e.band} Band` : "BW";
  const value = e.valueUnit === "sec" ? `${e.value} dtk` : `${e.value} rep`;
  return `${load} × ${value}`;
}

/** Tombol hapus dua langkah: tap pertama minta konfirmasi, tap kedua menghapus. */
function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`pressable min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold ${
        armed ? "bg-red-600 text-white" : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

export function LogView() {
  const entries = useTrainingLog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const movements = [...new Set(entries.map((e) => e.movement))].sort();
  const byDate = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const dates = [...new Set(byDate.map((e) => e.date))];

  const exportFile = () => {
    const blob = new Blob([trainingLog.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hybrid-athlete-log-${todayWib()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const r = trainingLog.merge(JSON.parse(await file.text()));
      setStatus(r.ok ? `Impor selesai: ${r.added} entri baru, ${r.skipped} dilewati.` : "Gagal menyimpan hasil impor.");
    } catch {
      setStatus("File tidak bisa dibaca. Pastikan itu file JSON hasil ekspor.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <Card title="Cadangan" action={<span className="text-[11px] text-zinc-500">tersimpan di perangkat ini</span>}>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Riwayat hanya ada di HP/browser ini. Ekspor berkala supaya tidak hilang saat data aplikasi dihapus atau ganti HP.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={exportFile}
            disabled={!entries.length}
            className="pressable min-h-11 rounded-xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Ekspor JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="pressable min-h-11 rounded-xl bg-zinc-100 text-sm font-semibold dark:bg-zinc-800"
          >
            Impor JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
            }}
          />
        </div>
        {status && (
          <p role="status" className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {status}
          </p>
        )}
      </Card>

      {!entries.length ? (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Belum ada sesi tercatat. Setelah latihan ST, tekan <strong>Catat sesi</strong> di bawah hasil generator untuk mencatat
            gerakan ★ — generator akan menyesuaikan beban berikutnya.
          </p>
        </Card>
      ) : (
        <>
          <Card title="Tren gerakan utama">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {movements.map((m) => {
                const h = historyFor(entries, m).slice(0, 5).reverse();
                return (
                  <li key={m} className="py-2 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium">{m}</p>
                    <p className="tabular text-xs text-zinc-600 dark:text-zinc-400">
                      {h.map((e) => (e.load !== undefined ? `${e.load}` : e.valueUnit === "sec" ? `${e.value}s` : e.band ?? `${e.value}`)).join(" → ")}
                      <span className="text-zinc-400"> · {h.length} sesi terakhir</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Riwayat" flush className="!pb-1">
            {dates.map((d) => (
              <section key={d} className="border-t border-zinc-100 first-of-type:border-0 dark:border-zinc-800">
                <p className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{formatDateId(d)}</p>
                <ul>
                  {byDate
                    .filter((e) => e.date === d)
                    .map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-4 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{e.movement}</p>
                          <p className="tabular text-xs text-zinc-500 dark:text-zinc-400">
                            {valueLabel(e)} · RPE {e.rpe}
                            <span className="text-zinc-400"> (target {e.targetRpe})</span>
                            {e.deload && <span className="text-sky-600 dark:text-sky-400"> · deload</span>}
                          </p>
                        </div>
                        <ConfirmButton label="Hapus" confirmLabel="Yakin?" onConfirm={() => trainingLog.remove(e.id)} />
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </Card>

          <div className="flex justify-center">
            <ConfirmButton label="Hapus semua riwayat" confirmLabel="Tap lagi untuk hapus semua" onConfirm={() => trainingLog.clear()} />
          </div>
        </>
      )}
    </div>
  );
}
