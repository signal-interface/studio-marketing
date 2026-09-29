// Motion family — kinetic type: the name, set in particles, wrapped
// around a rotating cylinder. The resolved asset is a live loop.
import { hexToRgb, makeCanvas, sampleCanvas, fitText } from "../sample.ts";
import { FAMILY_LABEL } from "../spec.ts";
import { KIND, emptyBuild, type Build, type BuildContext } from "./types.ts";

export function buildMotion(c: BuildContext): Build {
  const { spec, w, h, n, rnd, fonts } = c;
  const b = emptyBuild(n);
  const word = ` ${spec.name.toUpperCase()} `;

  // Set the word once, flat, then wrap it three times around the cylinder.
  const tw = 900;
  const th = 180;
  const t = makeCanvas(tw, th, 1);
  const size = fitText(t.ctx, word, (s) => `700 ${s}px ${fonts.sans}`, tw * 0.98, 150, 20);
  t.ctx.font = `700 ${size}px ${fonts.sans}`;
  t.ctx.textAlign = "center";
  t.ctx.textBaseline = "middle";
  t.ctx.fillStyle = "#000";
  t.ctx.fillText(word, tw / 2, th / 2);
  const glyphs = sampleCanvas(t.canvas, tw, th, n, rnd);

  const Rc = Math.min(w * 0.3, h * 0.42);
  const bandH = Math.min(h * 0.34, ((2 * Math.PI * Rc) / 3) * (th / tw) * 1.2);
  // Light-emitting type: only tones bright enough to read on the dark ground.
  const bright = [spec.palette.ink, ...spec.palette.tones]
    .map(hexToRgb)
    .filter(([r, g, b]) => r * 0.3 + g * 0.59 + b * 0.11 > 0.35);
  const tones = bright.length ? bright : [[1, 1, 1] as [number, number, number]];
  const copies = 3;

  for (let i = 0; i < n; i++) {
    const gx = glyphs.pos[i * 3]! / tw + 0.5; // 0..1 along the word
    const gy = glyphs.pos[i * 3 + 1]! / th; // -0.5..0.5
    const k = i % copies;
    // Front face is z = +R; increasing theta runs toward +x, so the
    // word reads left-to-right where the viewer can see it.
    const theta = ((gx + k) / copies) * Math.PI * 2;
    b.form.set([theta, gy * bandH, Rc], i * 3);
    const tone = tones[Math.floor(((gx + k) / copies) * tones.length) % tones.length] ?? [1, 1, 1];
    b.color.set([tone[0], tone[1], tone[2], KIND.cylinder], i * 4);

    // Structure: cylinder wireframe + keyframe ticks
    const r = rnd();
    let sx: number, sy: number, sz: number;
    if (r < 0.5) {
      const a = rnd() * Math.PI * 2;
      const ring = [-0.5, 0.5, -0.16, 0.16][Math.floor(rnd() * 4)]!;
      sx = Math.sin(a) * Rc;
      sy = ring * bandH * 1.4;
      sz = Math.cos(a) * Rc;
    } else {
      const a = (Math.floor(rnd() * 16) / 16) * Math.PI * 2;
      sx = Math.sin(a) * Rc;
      sy = (rnd() - 0.5) * bandH * 1.4;
      sz = Math.cos(a) * Rc;
    }
    b.struct.set([sx, sy, sz], i * 3);
  }

  return {
    ...b,
    emissive: 1,
    gain: 0.9,
    pointSize: 2,
    interaction: "rotate",
    occlusion: 0,
    tilt: [0.22, 0],
    // Negative: type travels right-to-left past the viewer, like reading.
    spin: -0.9,
    swirl: 28,
    ground: spec.palette.ground,
    description: `${FAMILY_LABEL.motion}: “${spec.name}” as kinetic type on a rotating cylinder, looping`,
    hint: "Drag to scrub the loop",
  };
}

/** Sample the visitor's own words, exactly where they sit on screen. */
export function sampleGlyphs(
  text: string,
  font: string,
  box: { x: number; y: number; w: number; h: number },
  letterSpacing: string,
  n: number,
  rnd: () => number
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const t = makeCanvas(box.w, box.h, dpr);
  t.ctx.font = font;
  (t.ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = letterSpacing;
  t.ctx.textAlign = "center";
  t.ctx.textBaseline = "middle";
  t.ctx.fillStyle = "#000";
  t.ctx.fillText(text, box.w / 2, box.h / 2);
  const s = sampleCanvas(t.canvas, box.w, box.h, n, rnd);
  // Offset into artboard space.
  for (let i = 0; i < n; i++) {
    s.pos[i * 3] = s.pos[i * 3]! + box.x;
    s.pos[i * 3 + 1] = s.pos[i * 3 + 1]! + box.y;
  }
  return s.pos;
}
