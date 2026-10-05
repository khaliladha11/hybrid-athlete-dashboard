"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Sengaja tidak menampilkan error.message / stack ke user.
  return (
    <div role="alert" className="space-y-3 rounded-sm border border-danger/30 bg-danger-soft p-4 text-danger">
      <p className="font-semibold">Terjadi kesalahan saat memuat halaman.</p>
      <p className="text-body opacity-90">Coba muat ulang. Jika berulang, cek log server.</p>
      <button type="button" onClick={reset} className="pressable min-h-11 rounded-sm bg-inverse px-4 text-base font-semibold text-on-inverse">
        Coba lagi
      </button>
    </div>
  );
}
