export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200">
      <strong className="font-semibold">Demo Mode</strong> — memakai data dummy. Isi <code className="font-mono">INTERVALS_API_KEY</code> di{" "}
      <code className="font-mono">.env.local</code> untuk data asli.
    </div>
  );
}
