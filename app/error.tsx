"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Sengaja tidak menampilkan error.message / stack ke user.
  return (
    <div role="alert" className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      <p className="font-semibold">Terjadi kesalahan saat memuat halaman.</p>
      <p className="text-sm opacity-90">Coba muat ulang. Jika berulang, cek log server.</p>
      <button type="button" onClick={reset} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">
        Coba lagi
      </button>
    </div>
  );
}
