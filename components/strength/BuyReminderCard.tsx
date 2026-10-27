"use client";

import { useMemo } from "react";
import { BUTTON } from "@/components/ui/Card";
import { buyReminders, visibleReminders } from "@/lib/buy-reminder";
import { useAthleteSettings, useIsClient, useResolvedProfile } from "@/lib/settings-store";
import { useTrainingLog } from "@/lib/training-log";

/**
 * Pengingat beli plat per area (0.14.0, STRENGTH-HIDUP §3e). Hanya dari data, tanpa tautan toko. "Tutup" menyimpan
 * tanda tangan syaratnya; pengingat muncul lagi hanya bila syaratnya baru terpenuhi.
 */
export function BuyReminderCard() {
  const [settings, save] = useAthleteSettings();
  const p = useResolvedProfile();
  const log = useTrainingLog();
  const isClient = useIsClient();
  const all = useMemo(() => buyReminders({ lib: p.movementLibrary, eq: p.equipmentModel, active: p.activeConditions, log }), [p, log]);
  if (!isClient) return null;
  const shown = visibleReminders(all, settings.buyReminderDismissed);
  if (!shown.length) return null;
  return (
    <section aria-label="Pengingat beli plat" className="space-y-2 rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="t-label">Saran Gita · alat</p>
      {shown.map((r) => (
        <div key={r.area} className="space-y-2">
          <p className="text-body font-semibold">{r.text}</p>
          <p className="text-[13px] text-muted">Gerakan yang sudah mentok di batas alat: {r.stuck.join(", ")}. Tidak wajib; progresi tetap jalan lewat rep, tempo, atau varian.</p>
          <button
            type="button"
            onClick={() => save({ ...settings, buyReminderDismissed: { ...settings.buyReminderDismissed, [r.area]: r.signature } })}
            className={`${BUTTON.base} ${BUTTON.secondary} w-full`}
          >
            Tutup pengingat
          </button>
        </div>
      ))}
    </section>
  );
}
