// ─────────────────────────────────────────────────────────────
// Deterministic sketch reading for the public demonstration.
//
// A drawing is reduced to simple geometric features — closedness,
// roundness, corners, peaks, turning, orientation — which choose a
// creative family and composition. No model, no network. Same strokes,
// same reading. Marketing-site-local; not Studio architecture.
// ─────────────────────────────────────────────────────────────

import type { Family } from "./spec.ts";

export interface Pt {
  x: number;
  y: number;
}
export type Stroke = Pt[];

export interface SketchReading {
  family: Family;
  /** Words handed to the interpreter to compose the result. */
  descriptor: string;
  /** Human label for what was read, e.g. "A ringed planet". */
  label: string;
  /** Observed features, shown in the interpretation panel. */
  features: string[];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function length(s: Stroke) {
  let l = 0;
  for (let i = 1; i < s.length; i++) l += dist(s[i - 1]!, s[i]!);
  return l;
}

function bbox(pts: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Resample to evenly spaced points so features don't depend on pointer speed. */
export function resample(s: Stroke, step: number): Stroke {
  if (s.length < 2) return s.slice();
  const out: Stroke = [s[0]!];
  let carry = 0;
  for (let i = 1; i < s.length; i++) {
    let a = s[i - 1]!;
    const b = s[i]!;
    let d = dist(a, b);
    while (carry + d >= step) {
      const t = (step - carry) / d;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(a);
      d = dist(a, b);
      carry = 0;
    }
    carry += d;
  }
  return out;
}

interface StrokeFeatures {
  len: number;
  closed: boolean;
  /** Radius coefficient of variation around the centroid (0 = perfect circle). */
  roundness: number;
  corners: number;
  /** Total absolute turning, radians. */
  turning: number;
  /** Chord / length (1 = straight line). */
  straightness: number;
  box: ReturnType<typeof bbox>;
  /** Local up-peaks along a mostly horizontal stroke. */
  peaks: number;
  horizontal: boolean;
}

export function strokeFeatures(raw: Stroke, scale: number): StrokeFeatures {
  const s = resample(raw, Math.max(1, scale * 0.012));
  const box = bbox(s);
  const len = length(s);
  const first = s[0]!;
  const last = s[s.length - 1]!;
  const diag = Math.hypot(box.w, box.h) || 1;
  const closed = s.length > 6 && dist(first, last) < Math.max(diag * 0.22, scale * 0.03);

  let cx = 0, cy = 0;
  for (const p of s) {
    cx += p.x;
    cy += p.y;
  }
  cx /= s.length;
  cy /= s.length;
  const radii = s.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const mean = radii.reduce((a, b) => a + b, 0) / radii.length || 1;
  const sd = Math.sqrt(radii.reduce((a, r) => a + (r - mean) ** 2, 0) / radii.length);

  // Direction changes over a short window → corners and total turning.
  let turning = 0;
  let corners = 0;
  const k = Math.max(2, Math.round(s.length / 40));
  let sinceCorner = k;
  // Closed strokes are cyclic: a corner at the start/end point must count.
  const ring = closed ? [...s.slice(-k - 1, -1), ...s, ...s.slice(1, k + 1)] : s;
  for (let i = k; i < ring.length - k; i++) {
    const a = ring[i - k]!, b = ring[i]!, c = ring[i + k]!;
    const a1 = Math.atan2(b.y - a.y, b.x - a.x);
    const a2 = Math.atan2(c.y - b.y, c.x - b.x);
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    turning += Math.abs(d) / k;
    if (Math.abs(d) > 1.0 && sinceCorner >= k * 2) {
      corners++;
      sinceCorner = 0;
    } else sinceCorner++;
  }

  // Peaks: local minima of y (screen y grows downward) with prominence.
  let peaks = 0;
  const prom = Math.max(box.h * 0.18, scale * 0.02);
  for (let i = 2; i < s.length - 2; i++) {
    const y = s[i]!.y;
    if (y < s[i - 1]!.y && y <= s[i + 1]!.y) {
      let left = y, right = y;
      for (let j = i - 1; j >= 0 && j > i - 40; j--) left = Math.max(left, s[j]!.y);
      for (let j = i + 1; j < s.length && j < i + 40; j++) right = Math.max(right, s[j]!.y);
      if (left - y > prom && right - y > prom) peaks++;
    }
  }

  return {
    len,
    closed,
    roundness: sd / mean,
    corners,
    turning,
    straightness: dist(first, last) / (len || 1),
    box,
    peaks,
    horizontal: box.w > box.h * 1.8,
  };
}

export function readSketch(strokes: Stroke[]): SketchReading {
  const usable = strokes.filter((s) => s.length > 1);
  const all = usable.flat();
  if (!all.length) {
    return { family: "abstract", descriptor: "an empty page", label: "An empty page", features: ["no strokes"] };
  }
  const box = bbox(all);
  const scale = Math.max(box.w, box.h) || 1;
  const fs = usable.map((s) => strokeFeatures(s, scale)).sort((a, b) => b.len - a.len);
  const main = fs[0]!;
  const n = fs.length;
  const feat: string[] = [`${n} stroke${n === 1 ? "" : "s"}`];

  const round = fs.find((f) => f.closed && f.roundness < 0.2 && f.corners <= 2);
  if (round) {
    // A wide ellipse sharing the round form's centre reads as a ring system.
    const ring = fs.find(
      (f) =>
        f !== round &&
        f.box.w > round.box.w * 1.3 &&
        f.box.w > f.box.h * 2 &&
        Math.abs(f.box.cx - round.box.cx) < round.box.w * 0.45 &&
        Math.abs(f.box.cy - round.box.cy) < round.box.h * 0.45
    );
    if (ring) {
      feat.push("closed round form", "orbit crossing its centre");
      return { family: "spatial", descriptor: "Saturn", label: "A ringed planet", features: feat };
    }
    feat.push("closed round form");
    return { family: "spatial", descriptor: "moon", label: "A sphere", features: feat };
  }

  if (main.turning > Math.PI * 3.5 && !main.closed) {
    feat.push("continuous spiral");
    return { family: "abstract", descriptor: "a spiral of movement", label: "A spiral", features: feat };
  }

  const straightish = fs.filter((f) => f.straightness > 0.9).length;
  const boxy = fs.filter((f) => f.closed && f.corners >= 3 && f.corners <= 6 && f.roundness >= 0.12).length;
  if ((boxy && fs.some((f) => f.corners === 4)) || (n >= 3 && straightish / n >= 0.6)) {
    feat.push("straight edges", "rectilinear layout");
    const portrait = box.h > box.w * 1.25;
    return portrait
      ? { family: "interface", descriptor: "app", label: "An app screen", features: [...feat, "portrait frame"] }
      : { family: "interface", descriptor: "website", label: "A page layout", features: feat };
  }

  if (main.horizontal && !main.closed) {
    if (main.peaks >= 2 && main.box.h > main.box.w * 0.18) {
      feat.push(`${main.peaks} peaks`, "horizontal ridge");
      return { family: "spatial", descriptor: "mountain terrain", label: "A mountain range", features: feat };
    }
    feat.push("horizontal line", "gentle relief");
    return { family: "image", descriptor: "sunset over the ocean", label: "A horizon", features: feat };
  }

  if (boxy || (main.closed && main.corners >= 3)) {
    feat.push("closed angular form", `${main.corners} corners`);
    return { family: "spatial", descriptor: "crystal", label: "A faceted form", features: feat };
  }

  if (n >= 4 && fs.every((f) => f.len < scale * 1.2)) {
    feat.push("compact marks", "letter-like strokes");
    return { family: "brand", descriptor: "Sketch monogram", label: "A mark", features: feat };
  }

  feat.push("free gesture");
  return { family: "abstract", descriptor: "a free gesture", label: "A gesture", features: feat };
}
