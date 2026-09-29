import type { Metadata } from "next";
import { LogView } from "@/components/log/LogView";

export const metadata: Metadata = { title: "Log Latihan · Hybrid Athlete" };

export default function LogPage() {
  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Log Latihan</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Riwayat gerakan utama ★ — dasar progresi beban otomatis.</p>
      </header>
      <LogView />
    </div>
  );
}
