import { test } from "node:test";
import assert from "node:assert/strict";
import { interpret, sanitiseIntent, MAX_INTENT } from "./interpret.ts";
import { EXPERIENCE_SPEC_VERSION } from "./spec.ts";

test("families: the five demonstrations resolve to distinct families", () => {
  assert.equal(interpret("Saturn").family, "spatial");
  assert.equal(interpret("Luxury robotics brand").family, "brand");
  assert.equal(interpret("Payroll dashboard").family, "interface");
  assert.equal(interpret("Logo animation for Nova").family, "motion");
  assert.equal(interpret("Sunset over the ocean").family, "image");
});

test("unmatched multi-word intent falls back to abstract, never a false family", () => {
  assert.equal(interpret("the feeling of an unfinished thought").family, "abstract");
});

test("a single unknown word is treated as a name to set in type", () => {
  const s = interpret("Aurel");
  assert.equal(s.family, "brand");
  assert.equal(s.name, "Aurel");
});

test("subject and name extraction", () => {
  assert.equal(interpret("Payroll dashboard").subject, "Payroll");
  assert.equal(interpret("Logo animation for Nova").name, "Nova");
  assert.equal(interpret("Luxury robotics brand").subject, "Robotics");
  assert.equal(interpret("Sunset over the ocean").variant, "sunset");
});

test("qualities steer palette and variant", () => {
  const s = interpret("Luxury robotics brand");
  assert.deepEqual(s.qualities, ["luxury"]);
  assert.equal(s.variant, "serif-identity");
  assert.equal(interpret("Saturn").variant, "ringed-planet");
  assert.equal(interpret("a crystal").variant, "crystal");
  assert.equal(interpret("volcanic island terrain").variant, "terrain");
});

test("deterministic: same words → same spec", () => {
  assert.deepEqual(interpret("A calm mountain"), interpret("A calm mountain"));
});

test("spec is JSON-serializable and versioned outside Studio lineage", () => {
  const s = interpret("Saturn");
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  assert.equal(s.version, EXPERIENCE_SPEC_VERSION);
  assert.ok(!s.version.startsWith("studio.") && s.version.startsWith("studio-marketing."));
});

test("input is sanitised: control chars stripped, whitespace collapsed, length capped", () => {
  assert.equal(sanitiseIntent("  a\u0000b\n\tc  "), "a b c");
  assert.equal(sanitiseIntent("x".repeat(500)).length, MAX_INTENT);
  // Markup is preserved as literal text (rendered via textContent, never HTML).
  assert.equal(interpret("<img src=x onerror=alert(1)>").intent, "<img src=x onerror=alert(1)>");
});

test("one intent can be re-read as every family (possibility layer)", () => {
  for (const f of ["spatial", "brand", "interface", "motion", "image", "abstract"] as const) {
    const s = interpret("Saturn", f);
    assert.equal(s.family, f);
    assert.equal(s.intent, "Saturn");
    assert.ok(s.variant && s.composition, `${f} has a composition`);
  }
  assert.equal(interpret("Saturn", "image").variant, "night");
  assert.equal(interpret("Saturn", "brand").name, "Saturn");
  // Natural interpretation is unchanged by the option.
  assert.equal(interpret("Saturn").family, "spatial");
});
