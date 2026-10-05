import type { Metadata } from "next";
import { LogView } from "@/components/log/LogView";

export const metadata: Metadata = { title: "Log Latihan · Hybrid Athlete" };

export default function LogPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-semibold">Log Latihan</h1>
        <p className="mt-0.5 text-[13px] text-muted">Riwayat gerakan utama ★ — dasar progresi beban otomatis.</p>
      </header>
      <LogView />
    </div>
  );
}
