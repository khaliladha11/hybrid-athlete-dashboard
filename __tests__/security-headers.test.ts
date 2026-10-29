import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, contentSecurityPolicy, newNonce } from "@/lib/security/headers";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(name + " "));

describe("Content-Security-Policy", () => {
  const csp = contentSecurityPolicy("abc123==");

  it("script hanya dengan nonce + strict-dynamic, tanpa unsafe-inline/eval di produksi", () => {
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'nonce-abc123==' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(directive(csp, "script-src")).not.toContain("unsafe-inline");
  });

  it("tidak bisa dibingkai, tanpa plugin, sumber lain hanya situs sendiri", () => {
    for (const d of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "connect-src 'self'", "font-src 'self'", "worker-src 'self'", "manifest-src 'self'"]) {
      expect(csp.split("; ")).toContain(d);
    }
    expect(directive(csp, "img-src")).toBe("img-src 'self' data: blob:");
    // Style memakai unsafe-inline (atribut style React, next/font) dan tanpa nonce supaya unsafe-inline berlaku.
    expect(directive(csp, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
  });

  it("mode pengembangan: unsafe-eval & websocket HMR", () => {
    const dev = contentSecurityPolicy("n", true);
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toBe("connect-src 'self' ws: wss:");
  });

  it("nonce acak base64 128 bit, berbeda tiap request", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(a);
  });
});

describe("header statis", () => {
  it("nosniff, referrer, frame, permissions", () => {
    const h = Object.fromEntries(SECURITY_HEADERS.map((x) => [x.key, x.value]));
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["Permissions-Policy"]).toContain("geolocation=()");
  });
});
