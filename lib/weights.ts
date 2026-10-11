/** Batas beban hasil parsing string "weight" di movement library. */
export type WeightSpec =
  | { kind: "load"; min: number; max: number; unit: "kg"; perHand: boolean }
  | { kind: "bodyweight" }
  | { kind: "band"; options: string[] };

export function parseWeight(weight: string): WeightSpec {
  const w = weight.trim();
  if (/band/i.test(w)) {
    const options = w
      .replace(/band/i, "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    return { kind: "band", options: options.length ? options : ["Light"] };
  }
  const nums = w.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || /bodyweight/i.test(w)) return { kind: "bodyweight" };
  const values = nums.map((n) => Number(n.replace(",", ".")));
  return {
    kind: "load",
    min: Math.min(...values),
    max: Math.max(...values),
    unit: "kg",
    perHand: /tangan/i.test(w),
  };
}
