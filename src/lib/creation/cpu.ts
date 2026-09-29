// CPU projection + lighting of a resolved form (no WebGL).
// Used as the no-WebGL fallback and by the possibility plates.
import { KIND, type Build } from "./families/types.ts";

/**
 * No-WebGL fallback for 3D families: project and light the resolved
 * form once on the CPU. Still live-computed; no stored imagery.
 */
export function drawFormCpu(canvas: HTMLCanvasElement, b: Build, rotX: number, rotY: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  // A canvas that ever held a WebGL context can't give a 2D one.
  const g = canvas.getContext("2d");
  if (!g) return false;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";
  const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
  const rot = (x: number, y: number, z: number): [number, number, number] => {
    const x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
    return [x1, cx * y - sx * z1, sx * y + cx * z1];
  };
  const L = [-0.55, -0.45, 0.7];
  const ll = Math.hypot(L[0]!, L[1]!, L[2]!);
  const n = b.form.length / 3;
  const persp = Math.max(W, H) * 1.6;
  for (let i = 0; i < n; i++) {
    const kind = b.color[i * 4 + 3]!;
    let [x, y, z] = [b.form[i * 3]!, b.form[i * 3 + 1]!, b.form[i * 3 + 2]!];
    if (kind === KIND.cylinder) {
      const th = x;
      const r = z;
      [x, y, z] = [Math.sin(th) * r, y, Math.cos(th) * r];
    }
    let lit = 1;
    if (kind !== KIND.star) {
      [x, y, z] = rot(x, y, z);
      if (kind === KIND.cylinder) {
        const facing = z / b.form[i * 3 + 2]!;
        if (facing < 0.05) continue;
        lit = Math.pow(facing, 1.4);
      }
      if (kind === KIND.lit || kind === KIND.ring) {
        const [nx, ny, nz] = rot(b.normal[i * 3]!, b.normal[i * 3 + 1]!, b.normal[i * 3 + 2]!);
        if (kind === KIND.lit && nz < -0.05) continue;
        const d = (nx * L[0]! + ny * L[1]! + nz * L[2]!) / ll;
        lit = kind === KIND.lit ? 0.05 + 0.95 * Math.max(d, 0) : 0.3 + 0.7 * Math.abs(d);
        if (kind === KIND.ring && z < 0 && Math.hypot(x, y) < b.occlusion) continue;
      }
    }
    const s = persp / Math.max(persp - z, 1);
    const r = Math.round(b.color[i * 4]! * lit * 255 * b.gain);
    const gg = Math.round(b.color[i * 4 + 1]! * lit * 255 * b.gain);
    const bb = Math.round(b.color[i * 4 + 2]! * lit * 255 * b.gain);
    g.fillStyle = `rgb(${r},${gg},${bb})`;
    const px = W / 2 + x * s, py = H / 2 + y * s;
    g.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
  }
  g.globalCompositeOperation = "source-over";
  return true;
}
