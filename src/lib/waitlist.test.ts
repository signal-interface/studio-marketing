import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, singleLine, validateSubmission, notificationSubject, originAllowed, LIMITS } from "./waitlist.ts";
import { waitlistNotificationHtml, waitlistAutoResponseHtml } from "./emails.ts";
import { createLimiter } from "./rateLimiter.ts";

const ok = (b: unknown) => {
  const r = validateSubmission(b);
  assert.ok(r.ok, `expected ok, got ${JSON.stringify(r)}`);
  return r;
};
const err = (b: unknown, e: string) => {
  const r = validateSubmission(b);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, e);
};

test("escapeHtml neutralises every HTML-significant character", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>&'\``), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;&#96;");
});

test("notification email: attribute-breaking punctuation that is accepted stays inert", () => {
  const r = ok({ name: `Eve "the" O'Neil`, email: "eve@example.com", company: `Acme" onmouseover="alert(1)` });
  if (r.ok) {
    const html = waitlistNotificationHtml(r.data, new Date(0));
    assert.ok(!html.includes(`" onmouseover="`), "quotes cannot break out of markup");
    assert.ok(html.includes("Acme&quot; onmouseover=&quot;alert(1)"));
  }
  // Anything carrying angle brackets is refused before it reaches an email.
  err({ name: "Eve", email: "eve@example.com", company: `Acme"><img src=x onerror=alert(1)>` }, "invalid_company");
});

test("markup in name/company is rejected outright", () => {
  err({ name: "<b>Eve</b>", email: "eve@example.com" }, "invalid_name");
  err({ name: "Eve", email: "eve@example.com", company: "<img src=x onerror=alert(1)>" }, "invalid_company");
});

test("links in display fields are rejected (phishing payloads)", () => {
  err({ name: "Claim your prize at https://evil.example", email: "v@example.com" }, "invalid_name");
  err({ name: "visit www.evil.example", email: "v@example.com" }, "invalid_name");
  err({ name: "Eve", email: "v@example.com", company: "javascript://x" }, "invalid_company");
});

test("notification HTML escapes every interpolated value", () => {
  const html = waitlistNotificationHtml({ name: `O'Brien & "Sons"`, email: "a@b.co", company: "R&D", role: "other" }, new Date(0));
  assert.ok(html.includes("O&#39;Brien &amp; &quot;Sons&quot;"));
  assert.ok(html.includes("R&amp;D"));
  assert.ok(!/O'Brien/.test(html));
});

test("auto-reply contains no submitter-controlled content", () => {
  const html = waitlistAutoResponseHtml();
  assert.ok(!html.includes("${"));
  // It takes no input at all — nothing to inject.
  assert.equal(waitlistAutoResponseHtml.length, 0);
});

test("CR/LF and control characters cannot reach headers or subjects", () => {
  const r = ok({ name: "Eve\r\nBcc: victim@example.com", email: "eve@example.com" });
  if (r.ok) {
    assert.ok(!/[\r\n]/.test(r.data.name));
    assert.ok(!/[\r\n]/.test(notificationSubject(r.data)));
  }
  assert.equal(singleLine("a\u0000b‮c d﻿e"), "a b c d e");
  err({ name: "Eve", email: "eve@example.com\r\nBcc: x@y.z" }, "invalid_email");
  err({ name: "Eve", email: "eve\n@example.com" }, "invalid_email");
});

test("email validation", () => {
  ok({ name: "Eve", email: "Eve.Smith+studio@Example.co.uk" });
  for (const bad of ["", "eve", "eve@", "@example.com", "eve@example", "eve@exa mple.com", "eve@@example.com", '"eve"@example.com', "eve@[127.0.0.1]", `${"a".repeat(250)}@example.com`]) {
    err({ name: "Eve", email: bad }, "invalid_email");
  }
  const r = ok({ name: "Eve", email: "  EVE@EXAMPLE.COM " });
  if (r.ok) assert.equal(r.data.email, "eve@example.com");
});

test("length limits and types", () => {
  err({ name: "x".repeat(LIMITS.name + 1), email: "e@example.com" }, "invalid_name");
  err({ name: "Eve", email: "e@example.com", company: "x".repeat(LIMITS.company + 1) }, "invalid_company");
  err({ name: 42, email: "e@example.com" }, "name_required");
  err({ name: "   ", email: "e@example.com" }, "name_required");
  err({ name: "Eve", email: ["e@example.com"] }, "invalid_email");
  err(null, "invalid_body");
  err([], "invalid_body");
  err("string", "invalid_body");
});

test("role must be one of the published options", () => {
  ok({ name: "Eve", email: "e@example.com", role: "creative-director" });
  err({ name: "Eve", email: "e@example.com", role: "admin" }, "invalid_role");
  err({ name: "Eve", email: "e@example.com", role: "<script>" }, "invalid_role");
});

test("honeypot marks spam without revealing it", () => {
  const r = ok({ name: "Bot", email: "bot@example.com", website: "http://spam" });
  if (r.ok) assert.equal(r.spam, true);
  const h = ok({ name: "Human", email: "h@example.com", website: "" });
  if (h.ok) assert.equal(h.spam, false);
});

test("same-origin check", () => {
  assert.equal(originAllowed(null, "studio.faradaycapitalsystems.com"), true);
  assert.equal(originAllowed("https://studio.faradaycapitalsystems.com", "studio.faradaycapitalsystems.com"), true);
  assert.equal(originAllowed("https://evil.example", "studio.faradaycapitalsystems.com"), false);
  assert.equal(originAllowed("https://studio.faradaycapitalsystems.com.evil.example", "studio.faradaycapitalsystems.com"), false);
  assert.equal(originAllowed("null", "studio.faradaycapitalsystems.com"), false);
});

test("limiters: per-key windows and bounded memory", () => {
  const l = createLimiter(2, 1000, 3);
  assert.equal(l.check("a", 0), true);
  assert.equal(l.check("a", 1), true);
  assert.equal(l.check("a", 2), false);
  assert.equal(l.check("a", 1002), true); // new window
  for (let i = 0; i < 100; i++) l.check(`k${i}`, 5); // flood of keys stays bounded
  const one = createLimiter(1, 86_400_000);
  assert.equal(one.check("victim@example.com"), true);
  assert.equal(one.check("victim@example.com"), false); // one auto-reply per address per day
});
