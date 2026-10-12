import { mediaFor } from "@/lib/movements/media";

/** Placeholder netral untuk gerakan tanpa gambar (dumbbell sederhana). */
export function MovementPlaceholderIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10v4m3-6v8m0-4h12m0-4v8m3-6v4" />
    </svg>
  );
}

/** Thumbnail gambar posisi awal; placeholder bila gambar belum tersedia. */
export function MovementThumb({ name, size = "h-14 w-14" }: { name: string; size?: string }) {
  const media = mediaFor(name);
  if (!media?.images) {
    return (
      <span className={`grid ${size} shrink-0 place-items-center rounded-inner bg-subtle-strong text-faint`} title="Gambar belum tersedia">
        <MovementPlaceholderIcon />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- gambar statis kecil di /public; tidak perlu optimisasi next/image.
    <img
      src={media.images[0]}
      alt=""
      loading="lazy"
      decoding="async"
      width={56}
      height={56}
      className={`${size} shrink-0 rounded-inner bg-white object-cover`}
    />
  );
}
