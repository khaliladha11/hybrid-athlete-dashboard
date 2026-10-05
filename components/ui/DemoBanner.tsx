export function DemoBanner() {
  return (
    <div className="border-b border-brand/25 bg-brand-soft px-4 py-2 text-center text-[13px] text-ink">
      <strong className="font-semibold">Demo Mode</strong> — memakai data dummy. Isi <code className="font-mono">INTERVALS_API_KEY</code> di{" "}
      <code className="font-mono">.env.local</code> untuk data asli.
    </div>
  );
}
