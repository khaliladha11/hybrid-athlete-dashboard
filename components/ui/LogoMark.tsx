/**
 * Logo "Forward H": tiang kiri padat = strength, palang oranye = hybrid,
 * tiga lajur yang menikung = lintasan lari. Huruf condong ke depan = gerak maju.
 *
 * Warna: tiang & lajur ikut `currentColor` (atur dengan text-ink / text-on-brand),
 * palang memakai token `--brand` lewat `fill-brand`. Di ukuran ≤ 24 px tiga lajur
 * dilebur jadi satu jalur tebal supaya tidak kabur.
 * Sumber geometri: docs/brand/mark.svg (grid 120, viewBox 10 15 100 100).
 */
const LANES = [
  "M75 21 L75 78 A30 30 0 0 0 105 108 L110 108",
  "M84 21 L84 78 A21 21 0 0 0 105 99 L110 99",
  "M93 21 L93 78 A12 12 0 0 0 105 90 L110 90",
] as const;

export function LogoMark({
  size = 24,
  title,
  className = "",
  barClassName = "fill-brand",
}: {
  size?: number;
  /** Isi bila logo berdiri sendiri (tanpa teks di sebelahnya); kosong = dekoratif. */
  title?: string;
  className?: string;
  /** Warna palang; default oranye brand. Di atas latar oranye pakai "fill-on-brand" atau warna terang. */
  barClassName?: string;
}) {
  const simple = size <= 24;
  return (
    <svg
      viewBox="10 15 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <g transform="translate(13 0) skewX(-12)">
        <rect x="22" y="18" width="24" height="84" rx="3" fill="currentColor" />
        <rect x="46" y="53" width="26" height="14" className={barClassName} />
        {simple ? (
          <path d="M84 18 L84 78 A21 21 0 0 0 105 99 L112 99" fill="none" stroke="currentColor" strokeWidth={24} />
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round">
            {LANES.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
