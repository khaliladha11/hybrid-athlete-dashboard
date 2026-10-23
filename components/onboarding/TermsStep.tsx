"use client";

import { useId, useState } from "react";
import { BUTTON } from "@/components/ui/Card";

const NOTICE_URL = "https://github.com/khaliladha11/hybrid-athlete-dashboard/blob/main/NOTICE.md";

const POINTS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Bukan saran medis.",
    body: "Aplikasi menyusun latihan dari aturan umum dan katalog kondisi berbasis riset. Konsultasikan dengan tenaga kesehatan bila ada cedera aktif, nyeri yang memburuk, atau kondisi medis.",
  },
  {
    title: "Kamu operator deploy-mu sendiri.",
    body: "Data dibaca dari intervals.icu milikmu ke deploy Vercel milikmu. Pengembang aplikasi tidak menerima datamu.",
  },
  {
    title: "Data ada di perangkat ini, dan di database milikmu bila sinkron aktif.",
    body: "Setting dan log tersimpan di browser ini. Bila kamu memasang Upstash Redis dan sandi aplikasi, data yang sama juga disimpan di database itu, di akun Vercel milikmu, tanpa enkripsi tambahan dari aplikasi. Hapus database untuk menghapus salinannya. Cadangkan lewat Setting › Data & cadangan.",
  },
  {
    title: "Lisensi.",
    body: (
      <>
        Repo ini belum mencantumkan lisensi. Gambar gerakan dari free-exercise-db (Unlicense), atribusinya di{" "}
        <a href={NOTICE_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline underline-offset-2">
          NOTICE.md
        </a>
        .
      </>
    ),
  },
];

/** Disclaimer & lisensi. Dipakai di wizard (langkah 2) dan sebagai layar tunggal dari gate. */
export function TermsStep({ onAccept, acceptLabel = "Setuju dan lanjut" }: { onAccept: () => void; acceptLabel?: string }) {
  const [checked, setChecked] = useState(false);
  const id = useId();
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {POINTS.map((p, i) => (
          <li key={p.title} className="flex gap-3 rounded-inner bg-subtle p-3">
            <span className="t-label mt-0.5 shrink-0">{i + 1}</span>
            <p className="text-[14px] leading-relaxed text-ink">
              <span className="font-semibold">{p.title}</span> <span className="text-muted">{p.body}</span>
            </p>
          </li>
        ))}
      </ol>
      <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-inner border border-line-strong px-3">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--brand)]" />
        <span className="text-body font-semibold">Saya mengerti dan setuju.</span>
      </label>
      <button type="button" disabled={!checked} onClick={onAccept} className={`${BUTTON.base} ${BUTTON.lg} ${BUTTON.primary} w-full`}>
        {acceptLabel}
      </button>
      <p className="text-[12px] text-faint">Teks ini bukan dokumen hukum.</p>
    </div>
  );
}
