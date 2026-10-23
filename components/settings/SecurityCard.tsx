"use client";

import { useState } from "react";
import { BUTTON, Card } from "@/components/ui/Card";

/** Keamanan (0.12.0): hanya tampil bila sandi aplikasi aktif. Cookie sesi httpOnly, jadi dihapus lewat server. */
export function SecurityCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lock = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", { method: "POST", cache: "no-store" });
      if (!res.ok && res.status !== 401) throw new Error(String(res.status));
      window.location.replace("/unlock");
    } catch {
      setError("Gagal mengunci. Periksa koneksi lalu coba lagi.");
      setBusy(false);
    }
  };

  return (
    <Card title="Keamanan">
      <p className="text-[13px] text-muted">Sandi aplikasi aktif. Perangkat ini tetap terbuka 90 hari sejak sandi dimasukkan.</p>
      <button type="button" onClick={lock} disabled={busy} className={`${BUTTON.base} ${BUTTON.secondary} mt-3 w-full`}>
        Kunci perangkat ini
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-danger-ink">
          {error}
        </p>
      )}
    </Card>
  );
}
