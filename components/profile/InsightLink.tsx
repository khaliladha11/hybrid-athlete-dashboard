import Link from "next/link";

/** Tautan ke Insight (0.15.0): baris teks di akhir kartu, area sentuh 44px. */
export function InsightLink() {
  return (
    <div className="mt-4 border-t border-line pt-1">
      <Link href="/insight" className="pressable inline-flex min-h-11 items-center text-body font-semibold text-brand-ink">
        Lihat tren 6 atau 12 minggu →
      </Link>
    </div>
  );
}
