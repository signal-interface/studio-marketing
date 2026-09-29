// ─────────────────────────────────────────────────────────────
// Sampling primitives: turn live-drawn 2D canvases (glyphs, layouts,
// scenes) into particle targets. Marketing-site-local.
// ─────────────────────────────────────────────────────────────

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export interface Samples {
  /** n × 3, CSS px relative to canvas centre, y down, z = 0. */
  pos: Float32Array;
  /** n × 4, rgb 0–1 + alpha. */
  col: Float32Array;
}

export interface SampleOptions {
  /** Colour the canvas was cleared to; contrast against it drives weight. */
  ground?: [number, number, number];
  /** Uniform weight added to every pixel (0 = ink only, 1 = everywhere). */
  base?: number;
  /** Pixel stride in device pixels (performance). */
  stride?: number;
}

/**
 * Weighted random sampling of n points from a canvas. Weight = alpha ×
 * contrast to ground (+ base), so ink attracts particles and empty
 * ground does not.
 */
export function sampleCanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  n: number,
  rnd: Rng,
  opts: SampleOptions = {}
): Samples {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const W = canvas.width;
  const H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H).data;
  const stride = opts.stride ?? Math.max(1, Math.round(W / 700));
  const g = opts.ground;
  const base = opts.base ?? 0;

  const idx: number[] = [];
  const cum: number[] = [];
  let total = 0;
  for (let y = 0; y < H; y += stride) {
    for (let x = 0; x < W; x += stride) {
      const i = (y * W + x) * 4;
      const a = data[i + 3]! / 255;
      if (a <= 0.01 && base <= 0) continue;
      let w: number;
      if (g) {
        const dr = data[i]! / 255 - g[0];
        const dg = data[i + 1]! / 255 - g[1];
        const db = data[i + 2]! / 255 - g[2];
        w = a * Math.min(1, Math.sqrt(dr * dr + dg * dg + db * db) * 1.8) + base;
      } else {
        w = a + base;
      }
      if (w <= 0.002) continue;
      total += w;
      idx.push(i);
      cum.push(total);
    }
  }

  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 4);
  const sx = cssW / W;
  const sy = cssH / H;
  if (!idx.length) return { pos, col };

  for (let k = 0; k < n; k++) {
    const r = rnd() * total;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid]! < r) lo = mid + 1;
      else hi = mid;
    }
    const i = idx[lo]!;
    const p = i / 4;
    const px = (p % W) + rnd() * stride;
    const py = Math.floor(p / W) + rnd() * stride;
    pos[k * 3] = px * sx - cssW / 2;
    pos[k * 3 + 1] = py * sy - cssH / 2;
    pos[k * 3 + 2] = 0;
    col[k * 4] = data[i]! / 255;
    col[k * 4 + 1] = data[i + 1]! / 255;
    col[k * 4 + 2] = data[i + 2]! / 255;
    col[k * 4 + 3] = data[i + 3]! / 255;
  }
  return { pos, col };
}

export function makeCanvas(cssW: number, cssH: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(cssW * dpr));
  c.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(dpr, dpr);
  return { canvas: c, ctx };
}

/** Fit text to a width by shrinking font size. Returns chosen size. */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  maxW: number,
  start: number,
  min = 10
) {
  let size = start;
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = font(size);
  }
  return size;
}
