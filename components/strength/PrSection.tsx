"use client";

import { useMemo, useState } from "react";
import { BUTTON, Card, Chip } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { InsightLink } from "@/components/profile/InsightLink";
import { formatDateId, todayWib } from "@/lib/date";
import { prStore, usePrs } from "@/lib/pr-store";
import { allMovementNames, baseProfile } from "@/lib/profile";
import { bestPr, prHistory, type PrEntry } from "@/lib/prs";

const INPUT = "min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink tabular focus:border-brand";
const kg = (v: number) => v.toLocaleString("id-ID");
const detail = (p: PrEntry) => `${kg(p.loadKg)} kg${p.sets && p.reps ? ` · ${p.sets} × ${p.reps}` : p.reps ? ` · ${p.reps} rep` : ""}`;

interface Draft {
  id?: string;
  movement: string;
  load: string;
  sets: string;
  reps: string;
  date: string;
}

/**
 * PR kemampuan (0.14.0, STRENGTH-HIDUP §3b): PR terbaik per gerakan, riwayat, tambah/ubah/hapus.
 * PR dari log terdeteksi otomatis setelah sesi dicatat. Gerakan hanya dari library.
 */
export function PrSection() {
  const prs = usePrs();
  const names = useMemo(() => [...allMovementNames(baseProfile.movementLibrary)].sort((a, b) => a.localeCompare(b)), []);
  const today = todayWib();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const movements = [...new Set(prs.map((p) => p.movement))].sort((a, b) => a.localeCompare(b));

  const startNew = () => setDraft({ movement: names[0] ?? "", load: "", sets: "", reps: "", date: today });
  const startEdit = (p: PrEntry) => setDraft({ id: p.id, movement: p.movement, load: String(p.loadKg), sets: p.sets ? String(p.sets) : "", reps: p.reps ? String(p.reps) : "", date: p.date });
  const save = () => {
    if (!draft) return;
    const load = Number(draft.load.replace(",", "."));
    const sets = draft.sets ? Number(draft.sets) : undefined;
    const reps = draft.reps ? Number(draft.reps) : undefined;
    if (!(load > 0) || draft.date > today) return setError("Isi beban lebih dari 0 dan tanggal tidak setelah hari ini.");
    const prev = draft.id ? prs.find((p) => p.id === draft.id) : undefined;
    const ok = prStore.upsert({ id: draft.id, movement: draft.movement, loadKg: load, sets, reps, date: draft.date, source: prev?.source ?? "manual" });
    if (!ok) return setError("PR tidak tersimpan. Cek isiannya: set 1–20 dan rep 1–100.");
    setError(null);
    setDraft(null);
  };

  return (
    <Card title="PR kemampuan" action={!draft && <button type="button" onClick={startNew} className={`${BUTTON.base} ${BUTTON.secondary} min-h-9 px-3 text-[13px]`}>Tambah PR</button>}>
      <p className="text-[13px] text-muted">Beban terberat yang sudah kamu kuasai per gerakan. PR dari sesi yang dicatat terdeteksi otomatis, dan PR terbaru jadi titik awal gerakan yang belum punya log.</p>

      {draft && (
        <div className="mt-3 space-y-3 rounded-inner border border-line-strong p-3">
          <label className="block text-[12px] text-muted">
            Gerakan
            <select value={draft.movement} disabled={!!draft.id} onChange={(e) => setDraft({ ...draft, movement: e.target.value })} className={`${INPUT} mt-1`}>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-[12px] text-muted">
              Beban (kg)
              <input inputMode="decimal" value={draft.load} onChange={(e) => setDraft({ ...draft, load: e.target.value })} className={`${INPUT} mt-1`} />
            </label>
            <label className="block text-[12px] text-muted">
              Set
              <input inputMode="numeric" value={draft.sets} placeholder="·" onChange={(e) => setDraft({ ...draft, sets: e.target.value.replace(/\D/g, "") })} className={`${INPUT} mt-1`} />
            </label>
            <label className="block text-[12px] text-muted">
              Rep
              <input inputMode="numeric" value={draft.reps} placeholder="·" onChange={(e) => setDraft({ ...draft, reps: e.target.value.replace(/\D/g, "") })} className={`${INPUT} mt-1`} />
            </label>
          </div>
          <label className="block text-[12px] text-muted">
            Tanggal
            <input type="date" value={draft.date} max={today} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={`${INPUT} mt-1`} />
          </label>
          <p className="text-[12px] text-faint">Set dan rep boleh dikosongkan bila tidak ingat.</p>
          {error && <p className="text-[13px] font-semibold text-danger-ink">✕ {error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => (setDraft(null), setError(null))} className={`${BUTTON.base} ${BUTTON.secondary}`}>
              Batal
            </button>
            <button type="button" onClick={save} className={`${BUTTON.base} ${BUTTON.primary}`}>
              {draft.id ? "Simpan perubahan" : "Simpan PR"}
            </button>
          </div>
        </div>
      )}

      {movements.length === 0 && !draft && <p className="mt-3 text-[13px] text-faint">Belum ada PR. Tambah manual atau impor lewat Setting › Data & cadangan.</p>}
      <ul className="mt-3 divide-y divide-line">
        {movements.map((m) => {
          const best = bestPr(prs, m)!;
          const history = prHistory(prs, m);
          const isOpen = open === m;
          return (
            <li key={m} className="py-1">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m)} className="pressable flex min-h-11 w-full items-center gap-2 text-left">
                <span className="min-w-0 flex-1 text-body font-semibold">{m}</span>
                <span className="tabular text-[14px] font-semibold">{detail(best)}</span>
                <span aria-hidden className={`text-[13px] text-faint ${isOpen ? "rotate-90" : ""}`}>
                  ›
                </span>
              </button>
              {isOpen && (
                <ul className="mb-2 space-y-1">
                  {history.map((p) => (
                    <li key={p.id} className="flex min-h-11 flex-wrap items-center gap-2 rounded-inner bg-subtle px-3 py-1">
                      <span className="tabular text-[14px]">{detail(p)}</span>
                      <span className="text-[13px] text-muted">{formatDateId(p.date)}</span>
                      <Chip tone={p.source === "log" ? "accent" : "neutral"}>{p.source === "log" ? "Dari log" : "Manual"}</Chip>
                      <span className="ml-auto flex items-center gap-1">
                        <button type="button" onClick={() => startEdit(p)} className="pressable min-h-9 rounded-control px-3 text-[13px] font-semibold text-muted hover:bg-subtle hover:text-ink">
                          Ubah
                        </button>
                        <ConfirmButton label="Hapus" confirmLabel="Tap lagi" onConfirm={() => prStore.remove(p.id)} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <InsightLink />
    </Card>
  );
}
