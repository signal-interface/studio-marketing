import { test } from "node:test";
import assert from "node:assert/strict";
import { readSketch, type Stroke } from "./sketch.ts";

// Synthetic, slightly wobbly hand-drawn shapes (deterministic wobble).
const wob = (i: number, a = 1.5) => Math.sin(i * 1.7) * a;
const circle = (cx: number, cy: number, r: number, n = 90): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(t) * (r + wob(i)), y: cy + Math.sin(t) * (r + wob(i)) };
  });
const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 90): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry + wob(i, 1) };
  });
const poly = (pts: [number, number][], per = 20): Stroke => {
  const out: Stroke = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k]!, [x1, y1] = pts[k + 1]!;
    for (let i = 0; i < per; i++) out.push({ x: x0 + ((x1 - x0) * i) / per + wob(i + k, 0.6), y: y0 + ((y1 - y0) * i) / per + wob(i + k * 3, 0.6) });
  }
  const [lx, ly] = pts[pts.length - 1]!;
  out.push({ x: lx, y: ly });
  return out;
};

test("a round closed shape reads as a sphere", () => {
  const r = readSketch([circle(200, 150, 80)]);
  assert.equal(r.family, "spatial");
  assert.equal(r.descriptor, "moon");
});

test("a circle crossed by a wide ellipse reads as a ringed planet", () => {
  const r = readSketch([circle(200, 150, 60), ellipse(200, 150, 160, 30)]);
  assert.equal(r.family, "spatial");
  assert.equal(r.descriptor, "Saturn");
});

test("a horizontal zigzag reads as mountains", () => {
  const r = readSketch([poly([[0, 200], [70, 80], [130, 170], [200, 40], [270, 160], [340, 90], [420, 200]])]);
  assert.equal(r.descriptor, "mountain terrain");
});

test("a long gentle horizontal line reads as a horizon", () => {
  const s: Stroke = Array.from({ length: 120 }, (_, i) => ({ x: i * 4, y: 150 + Math.sin(i / 14) * 6 }));
  assert.equal(readSketch([s]).family, "image");
});

test("rectangles read as an interface", () => {
  const r = readSketch([
    poly([[20, 20], [380, 20], [380, 260], [20, 260], [20, 20]]),
    poly([[20, 70], [380, 70]]),
    poly([[120, 70], [120, 260]]),
  ]);
  assert.equal(r.family, "interface");
});

test("a triangle reads as a faceted form", () => {
  const r = readSketch([poly([[200, 20], [330, 240], [70, 240], [200, 20]], 30)]);
  assert.equal(r.descriptor, "crystal");
});

test("a spiral reads as abstract movement", () => {
  const s: Stroke = Array.from({ length: 300 }, (_, i) => {
    const t = i / 300 * Math.PI * 7;
    return { x: 200 + Math.cos(t) * (10 + t * 9), y: 150 + Math.sin(t) * (10 + t * 9) };
  });
  assert.equal(readSketch([s]).family, "abstract");
});

test("deterministic, scale-invariant, and safe on empty input", () => {
  const a = readSketch([circle(200, 150, 80)]);
  const b = readSketch([circle(2000, 1500, 800, 90).map((p) => ({ x: p.x, y: p.y }))]);
  assert.equal(a.descriptor, b.descriptor);
  assert.deepEqual(readSketch([circle(200, 150, 80)]), a);
  assert.equal(readSketch([]).family, "abstract");
  assert.equal(readSketch([[{ x: 1, y: 1 }]]).family, "abstract");
});
