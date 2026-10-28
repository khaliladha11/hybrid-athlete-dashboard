"use client";

import { useEffect, useRef, useState } from "react";

/** Lebar elemen dari ResizeObserver; `fallback` dipakai saat SSR dan render pertama (pola SegmentSkyline). */
export function useWidth<T extends HTMLElement>(fallback = 303, min = 160) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(min, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, width] as const;
}
