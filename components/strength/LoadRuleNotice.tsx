"use client";

import { BUTTON } from "@/components/ui/Card";
import { useAthleteSettings, useIsClient } from "@/lib/settings-store";

/**
 * Layar sekali "Perubahan batas beban" (0.14.0, STRENGTH-HIDUP §2). Sampai pengguna menekan "Saya mengerti, aktifkan",
 * generator dan progresi tetap memakai rentang library sebagai batas. Persetujuan tersimpan di Setting (ikut sinkron).
 */
export function LoadRuleNotice({ inset = false }: { inset?: boolean }) {
  const [settings, save] = useAthleteSettings();
  const isClient = useIsClient();
  if (!isClient || settings.loadRule?.acceptedAt) return null;
  const accept = () => save({ ...settings, loadRule: { ...settings.loadRule, acceptedAt: new Date().toISOString(), limitToLibrary: false } });
  return (
    <section
      aria-label="Perubahan batas beban"
      className={inset ? "rounded-inner border border-line-strong p-3" : "rounded-card border border-line bg-surface p-4 shadow-card"}
    >
      <p className="t-label">Perubahan batas beban</p>
      <p className="mt-2 text-body font-semibold">Rentang beban di library sekarang jadi titik awal, bukan batas atas.</p>
      <ul className="mt-2 space-y-1.5 text-[14px] text-ink">
        {[
          "Beban boleh naik sampai beban terberat yang bisa dirakit dari alatmu di Setting › Alat.",
          "Beberapa gerakan punya batas keamanan saat kondisi tertentu aktif, mis. Barbell Squat 16 kg saat APT.",
          "Kenaikan tetap satu langkah dari log atau PR terakhir, tidak melompat. RPE tetap maksimal 7.",
          "Bisa dikembalikan kapan saja lewat Setting › Alat › Batasi ke rentang awal library.",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="text-info">
              ›
            </span>
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-muted">Sampai kamu menyetujui, generator tetap memakai rentang library sebagai batas.</p>
      <button type="button" onClick={accept} className={`${BUTTON.base} ${BUTTON.primary} mt-3 w-full`}>
        Saya mengerti, aktifkan
      </button>
    </section>
  );
}
