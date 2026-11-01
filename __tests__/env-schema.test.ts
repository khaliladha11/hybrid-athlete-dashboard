import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIN_SECRET_BYTES } from "@/lib/auth/config";
import { ENV_ALIASES, ENV_VARS, REQUIRED_ENV, deployButtonUrl } from "@/lib/env-schema";
// @ts-expect-error skrip .mjs tanpa deklarasi tipe
import { sessionSecret } from "../scripts/session-secret.mjs";

function* files(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.tsx?$/.test(e)) yield p;
  }
}

/** Env yang hanya untuk build/CI/dev, bukan isian pengguna. */
const INTERNAL = new Set(["NODE_ENV", "VERCEL_GIT_COMMIT_SHA", "NEXT_PUBLIC_BUILD_ID"]);

describe("skema env (0.17)", () => {
  it("tombol Deploy mewajibkan key intervals.icu dan sandi aplikasi", () => {
    expect(REQUIRED_ENV).toEqual(["INTERVALS_API_KEY", "APP_PASSCODE", "SESSION_SECRET"]);
  });

  it("URL tombol: env persis key wajib, tanpa nilai dan tanpa envDefaults", () => {
    const u = new URL(deployButtonUrl());
    expect(u.origin + u.pathname).toBe("https://vercel.com/new/clone");
    expect(u.searchParams.get("env")?.split(",")).toEqual(REQUIRED_ENV);
    expect(u.searchParams.get("repository-url")).toBe("https://github.com/khaliladha11/hybrid-athlete-dashboard");
    expect(u.searchParams.get("envLink")).toBe("https://github.com/khaliladha11/hybrid-athlete-dashboard#variabel-lingkungan");
    expect(u.searchParams.has("envDefaults")).toBe(false);
    expect(u.searchParams.has("stores")).toBe(false);
    for (const k of u.searchParams.keys()) expect(["repository-url", "project-name", "repository-name", "env", "envDescription", "envLink"]).toContain(k);
  });

  it("setiap env yang dibaca kode ada di skema (atau aliasnya)", () => {
    const known = new Set([...ENV_VARS.map((e) => e.name), ...Object.keys(ENV_ALIASES), ...INTERNAL]);
    const used = new Set<string>();
    for (const dir of ["lib", "app"]) {
      for (const f of files(dir)) {
        const src = readFileSync(f, "utf-8");
        for (const m of src.matchAll(/\b(?:process\.env|env)\.([A-Z][A-Z0-9_]+)/g)) used.add(m[1]);
      }
    }
    for (const f of ["proxy.ts", "next.config.ts"]) for (const m of readFileSync(f, "utf-8").matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) used.add(m[1]);
    expect([...used].filter((n) => !known.has(n))).toEqual([]);
  });

  it(".env.example memuat semua env skema tanpa nilai rahasia", () => {
    const ex = readFileSync(".env.example", "utf-8");
    for (const e of ENV_VARS) {
      const line = ex.split(/\r?\n/).find((l) => l.replace(/^#\s*/, "").startsWith(`${e.name}=`));
      expect(line, e.name).toBeTruthy();
      if (e.secret) expect(line!.split("=")[1].trim(), e.name).toBe("");
    }
  });

  it("deskripsi tanpa em dash dan tanpa tanda seru", () => {
    for (const e of ENV_VARS) for (const t of [e.description, e.where]) expect(t).not.toMatch(/[—!]/);
  });

  it("npm run secret: acak, cukup panjang untuk SESSION_SECRET", () => {
    const a = sessionSecret();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(new TextEncoder().encode(a).length).toBeGreaterThanOrEqual(MIN_SECRET_BYTES);
    expect(sessionSecret()).not.toBe(a);
  });
});
