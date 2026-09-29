// node --test (native TS type-stripping; no test dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { T, PULL_END, ENTRANCE_END, frameAt, travel, apertureScale } from "./timeline.ts";

test("words reveal sequentially: IMAGINE → TYPE → DRAW", () => {
  assert.ok(T.imagine < T.type && T.type < T.draw);
});

test("pull begins before DRAW finishes resolving (no dead pause)", () => {
  assert.ok(T.pull > T.draw, "pull after DRAW starts");
  assert.ok(T.pull < T.draw + T.wordDur, "pull before DRAW completes");
});

test("singularity is visible when the pull begins", () => {
  assert.ok(frameAt(T.pull).appear > 0.9);
});

test("travel is monotonic and accelerating (controlled → faster → very fast)", () => {
  let prev = -1;
  let prevStep = -1;
  for (let i = 0; i <= 20; i++) {
    const v = travel(i / 20);
    assert.ok(v >= prev);
    if (i > 1) assert.ok(v - prev >= prevStep - 1e-9, `accelerating at ${i}`);
    if (i > 0) prevStep = v - prev;
    prev = v;
  }
  assert.equal(travel(0), 0);
  assert.equal(travel(1), 1);
});

test("aperture growth is non-linear (perspective, not linear scaling)", () => {
  const mid = apertureScale(0.5);
  const end = apertureScale(1);
  assert.ok(mid < end * 0.1, "most growth happens in the final swoosh");
});

test("flash is immediate: white completes at the end of traversal, no extended hold", () => {
  assert.ok(frameAt(PULL_END - T.pullDur * 0.08).white < 1);
  assert.equal(frameAt(PULL_END).white, 1);
  assert.ok(ENTRANCE_END - PULL_END <= 400, "handoff to canvas within 400ms of white");
  assert.equal(frameAt(PULL_END + 1).handoff, 0);
  assert.equal(frameAt(ENTRANCE_END).handoff, 1);
});

test("no white before the traversal (no early page swap)", () => {
  for (let t = 0; t < T.pull + T.pullDur * 0.9; t += 50) {
    assert.equal(frameAt(t).white, 0, `white at ${t}`);
  }
});

test("frame is done exactly at ENTRANCE_END", () => {
  assert.equal(frameAt(ENTRANCE_END - 1).done, false);
  assert.equal(frameAt(ENTRANCE_END).done, true);
});
