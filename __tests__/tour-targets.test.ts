import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOUR_STEPS } from "@/lib/tour";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.tsx$/.test(f) ? [p] : [];
  });
}
const SOURCE = ["app", "components"].flatMap((d) => sourceFiles(path.join(process.cwd(), d))).map((f) => readFileSync(f, "utf-8")).join("\n");

describe("target tur di komponen", () => {
  it("setiap target data-tour benar-benar dipasang", () => {
    for (const s of TOUR_STEPS) for (const t of s.targets) expect(SOURCE, t).toMatch(new RegExp(`tour="${t}"|data-tour="${t}"`));
  });
});
