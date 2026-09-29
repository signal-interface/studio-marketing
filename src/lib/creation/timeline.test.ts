import { test } from "node:test";
import assert from "node:assert/strict";
import { C, STAGES, creationAt, stageAt } from "./timeline.ts";

test("stages run in the approved order: Intent → Interpretation → Structure → Materialization → Asset", () => {
  assert.deepEqual([...STAGES], ["Intent", "Interpretation", "Structure", "Materialization", "Asset"]);
  const seen: string[] = [];
  for (let t = 0; t <= C.end; t += 25) {
    const s = stageAt(t);
    if (seen[seen.length - 1] !== s) seen.push(s);
  }
  assert.deepEqual(seen, [...STAGES]);
});

test("transformation is continuous: structure completes exactly as materialization begins", () => {
  assert.equal(creationAt(C.materialization).a, 1);
  assert.equal(creationAt(C.materialization).b, 0);
  assert.equal(creationAt(C.asset).b, 1);
});

test("the asset is never swapped in before materialization has progressed", () => {
  for (let t = 0; t < C.resolveIn; t += 25) assert.equal(creationAt(t).resolve, 0, `resolve at ${t}`);
  assert.ok(creationAt(C.resolveIn).b > 0.7, "high-fidelity layer only once form is mostly condensed");
});

test("the whole creation completes in a few seconds", () => {
  assert.ok(C.end <= 6500);
  assert.equal(creationAt(C.end).done, true);
});
