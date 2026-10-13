// Render sketch strokes (pressure-aware) to a canvas.
import type { Stroke } from "./sketch.ts";

export function renderStrokes(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  pressures: number[][],
  opts: { width: number; height: number; scale?: number; color?: string; dpr?: number }
) {
  const dpr = opts.dpr ?? Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(opts.width * dpr);
  canvas.height = Math.round(opts.height * dpr);
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, opts.width, opts.height);
  g.strokeStyle = opts.color ?? "#0b0b0c";
  g.fillStyle = opts.color ?? "#0b0b0c";
  g.lineCap = "round";
  g.lineJoin = "round";
  const sc = opts.scale ?? 1;
  strokes.forEach((s, si) => {
    const pr = pressures[si] ?? [];
    if (s.length === 1) {
      g.beginPath();
      g.arc(s[0]!.x * sc, s[0]!.y * sc, 1.6 * sc, 0, Math.PI * 2);
      g.fill();
      return;
    }
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1]!, b = s[i]!;
      // Pressure-sensitive width for pens; steady width for mouse/touch.
      g.lineWidth = (1.4 + 2.6 * (pr[i] ?? 0.5)) * sc;
      g.beginPath();
      g.moveTo(a.x * sc, a.y * sc);
      g.lineTo(b.x * sc, b.y * sc);
      g.stroke();
    }
  });
}
