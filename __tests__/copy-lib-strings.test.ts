import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * DESIGN-SYSTEM §7 untuk semua string di `lib/` (0.17, RELEASE-1.0 #8): tanpa em dash; en dash hanya di dalam
 * rentang angka (`6:15–6:30/km`, `3–4`, `${a}–${b}`). Dibaca lewat TypeScript parser, jadi komentar dan regex tidak
 * ikut diperiksa.
 */

/** Pengecualian tercatat: file → teks string yang boleh. */
const ALLOWED: Record<string, string[]> = {
  // `formatPace` di lib tidak diubah (CLAUDE.md); satu-satunya pemanggil UI hanya memanggilnya bila pace ada.
  "lib/intervals/summary.ts": ["—"],
};

function* tsFiles(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* tsFiles(p);
    else if (/\.tsx?$/.test(e)) yield p;
  }
}

function strings(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, "utf-8"), ts.ScriptTarget.Latest, true);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) out.push([n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join("${}"));
    ts.forEachChild(n, visit);
  };
  visit(src);
  return out;
}

/** En dash sah: diapit angka/penanda angka (`5'`, `"`, `%`, `}` template) di kiri dan angka/`$` di kanan. */
function badEnDash(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "–") continue;
    const prev = s.slice(0, i).trimEnd().slice(-1);
    const next = s.slice(i + 1).trimStart()[0] ?? "";
    if (!/[\d'"%}]/.test(prev) || !/[\d$]/.test(next)) return true;
  }
  return false;
}

const FILES = [...tsFiles("lib")].map((f) => f.replace(/\\/g, "/"));

describe("string di lib/ tanpa em dash, en dash hanya di rentang angka", () => {
  it("semua file lib", () => {
    const issues: string[] = [];
    for (const f of FILES) {
      for (const s of strings(f)) {
        if (ALLOWED[f]?.includes(s)) continue;
        if (s.includes("—")) issues.push(`${f}: em dash di "${s.slice(0, 80)}"`);
        else if (badEnDash(s)) issues.push(`${f}: en dash di luar rentang angka "${s.slice(0, 80)}"`);
      }
    }
    expect(issues).toEqual([]);
  });

  it("pemeriksa mengenali rentang yang sah dan yang tidak", () => {
    expect(badEnDash("6:15–6:30/km")).toBe(false);
    expect(badEnDash("RPE 3–4")).toBe(false);
    expect(badEnDash("${}–${}")).toBe(false);
    expect(badEnDash("8'–10'")).toBe(false);
    expect(badEnDash("kiri–kanan")).toBe(true);
    expect(badEnDash("A – B")).toBe(true);
  });

  it("nama coach di teks UI: Gita, bukan coach", () => {
    const ui = [...tsFiles("components"), ...tsFiles("app")].map((f) => f.replace(/\\/g, "/"));
    const hits: string[] = [];
    for (const f of ui) {
      const src = ts.createSourceFile(f, readFileSync(f, "utf-8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (n: ts.Node) => {
        const text = ts.isJsxText(n) ? n.text : ts.isStringLiteral(n) && !ts.isImportDeclaration(n.parent) ? n.text : "";
        if (/\bcoach\b/i.test(text)) hits.push(`${f}: "${text.trim().slice(0, 80)}"`);
        ts.forEachChild(n, visit);
      };
      visit(src);
    }
    expect(hits).toEqual([]);
  });
});
