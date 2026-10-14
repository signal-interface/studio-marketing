import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsp, isHttps } from "./csp.ts";

test("production over HTTPS: strict policy including upgrade-insecure-requests", () => {
  const p = buildCsp("n0nce", { dev: false, https: true });
  assert.ok(p.includes("script-src 'self' 'nonce-n0nce' 'strict-dynamic'"));
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(p), "no unsafe-inline for scripts");
  assert.ok(!p.includes("unsafe-eval"));
  for (const d of ["object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'", "upgrade-insecure-requests"]) {
    assert.ok(p.includes(d), d);
  }
});

test("production over plain HTTP: no upgrade (assets must load from the same http origin)", () => {
  const p = buildCsp("n0nce", { dev: false, https: false });
  assert.ok(!p.includes("upgrade-insecure-requests"));
  assert.ok(p.includes("'strict-dynamic'"), "script policy unchanged");
});

test("dev adds only what HMR needs", () => {
  const p = buildCsp("n", { dev: true, https: false });
  assert.ok(p.includes("'unsafe-eval'") && p.includes("ws:"));
  assert.ok(!p.includes("upgrade-insecure-requests"));
});

test("https detection: direct and behind a proxy", () => {
  assert.equal(isHttps("https:", null), true);
  assert.equal(isHttps("http:", null), false);
  assert.equal(isHttps("http:", "https"), true); // TLS terminated at the edge (Vercel)
  assert.equal(isHttps("http:", "https, http"), true);
  assert.equal(isHttps("https:", "http"), false);
});
