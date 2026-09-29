// 2D families — identity, interface, image, abstract.
//
// Each composition is drawn LIVE in the browser twice from one routine:
//   "structure" → construction geometry as ink linework
//   "asset"     → the finished piece
// Particles are sampled from both, so what the visitor watches condense
// is exactly what the high-fidelity layer resolves to. No stored images.
import { fitText, hexToRgb, makeCanvas, mulberry32, sampleCanvas, type Rng } from "../sample.ts";
import { FAMILY_LABEL } from "../spec.ts";
import { KIND, type Build, type BuildContext } from "./types.ts";

type Mode = "asset" | "structure";
type G = CanvasRenderingContext2D;

const STRUCT_INK = "rgba(18,18,20,0.9)";

function setSpacing(g: G, px: number) {
  // Canvas letterSpacing is widely supported; ignore where it is not.
  (g as G & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Box: filled in asset mode, outlined in structure mode. */
function box(g: G, mode: Mode, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  rr(g, x, y, w, h, r);
  if (mode === "asset") {
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1;
      g.stroke();
    }
  } else {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    g.stroke();
  }
}

/** Text in asset mode; a skeleton bar of the same extent in structure mode. */
function text(g: G, mode: Mode, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") {
  g.font = font;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  if (mode === "asset") {
    g.fillStyle = color;
    g.fillText(s, x, y);
    return;
  }
  const m = g.measureText(s);
  const h = Math.max(2, (m.actualBoundingBoxAscent || 8) * 0.55);
  const x0 = align === "center" ? x - m.width / 2 : align === "right" ? x - m.width : x;
  g.fillStyle = STRUCT_INK;
  g.fillRect(x0, y - h, m.width, 1);
  g.fillRect(x0, y, m.width, 1);
}

function strongestTone(tones: string[], ground: string) {
  const [gr, gg, gb] = hexToRgb(ground);
  let best = tones[0] ?? "#3b5bdb";
  let score = -1;
  for (const t of tones) {
    const [r, g, b] = hexToRgb(t);
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const con = Math.abs(r - gr) + Math.abs(g - gg) + Math.abs(b - gb);
    if (sat + con * 0.5 > score) {
      score = sat + con * 0.5;
      best = t;
    }
  }
  return best;
}

// ── Identity ─────────────────────────────────────────────────
function drawBrand(g: G, mode: Mode, c: BuildContext) {
  const { w, h, spec, fonts } = c;
  const serif = spec.variant === "serif-identity";
  const display = serif ? fonts.serif : fonts.sans;
  const ink = spec.palette.ink;
  const tones = spec.palette.tones;
  const accent = tones[0] ?? ink;
  const r = Math.min(w, h) * 0.2;
  const cx = w * 0.29;
  const cy = h * 0.44;
  const container = spec.seed % 3; // 0 circle, 1 square, 2 open

  if (mode === "structure") {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    g.strokeRect(24, 24, w - 48, h - 48);
    for (let k = 1; k < 12; k++) {
      const x = 24 + ((w - 48) * k) / 12;
      g.globalAlpha = 0.35;
      g.beginPath();
      g.moveTo(x, 24);
      g.lineTo(x, h - 24);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.beginPath();
    g.moveTo(24, cy);
    g.lineTo(w - 24, cy);
    g.moveTo(cx, 24);
    g.lineTo(cx, h - 24);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, r * 1.22, 0, Math.PI * 2);
    g.stroke();
  }

  // Mark
  if (container === 0) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.strokeStyle = mode === "asset" ? ink : STRUCT_INK;
    g.lineWidth = mode === "asset" ? Math.max(1.5, r * 0.03) : 1;
    g.stroke();
  } else if (container === 1) {
    g.strokeStyle = mode === "asset" ? ink : STRUCT_INK;
    g.lineWidth = mode === "asset" ? Math.max(1.5, r * 0.03) : 1;
    g.strokeRect(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8);
  }
  const initial = (spec.name[0] ?? "S").toUpperCase();
  g.font = `${serif ? 400 : 600} ${Math.round(r * 1.3)}px ${display}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (mode === "asset") {
    g.fillStyle = ink;
    g.fillText(initial, cx, cy + r * 0.06);
    // The cut: a single accent stroke through the letterform.
    g.strokeStyle = spec.palette.ground;
    g.lineWidth = Math.max(2, r * 0.07);
    g.beginPath();
    g.moveTo(cx - r * 0.62, cy + r * 0.5);
    g.lineTo(cx + r * 0.62, cy - r * 0.5);
    g.stroke();
    g.strokeStyle = accent;
    g.lineWidth = Math.max(1, r * 0.018);
    g.stroke();
  } else {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    g.strokeText(initial, cx, cy + r * 0.06);
  }

  // Wordmark
  const wx = w * 0.56;
  const word = spec.name.toUpperCase();
  g.textBaseline = "alphabetic";
  // Spacing is proportional to size, so fit with it applied.
  const spacing = serif ? 0.14 : 0.06;
  let size = Math.round(h * 0.12);
  for (; size > 14; size--) {
    g.font = `${serif ? 400 : 600} ${size}px ${display}`;
    setSpacing(g, size * spacing);
    if (g.measureText(word).width <= w * 0.38) break;
  }
  setSpacing(g, size * spacing);
  text(g, mode, word, wx, h * 0.44, `${serif ? 400 : 600} ${size}px ${display}`, ink);
  setSpacing(g, 3);
  const descriptor = (spec.qualities.length ? `${spec.qualities.join(" ")} ${spec.subject}` : spec.name === spec.subject ? "identity study" : spec.subject).toUpperCase();
  text(g, mode, descriptor, wx, h * 0.44 + 30, `500 10px ${fonts.sans}`, tones[1] ?? ink);
  setSpacing(g, 0);
  if (mode === "asset") {
    g.fillStyle = accent;
    g.fillRect(wx, h * 0.44 + 12, Math.min(w * 0.3, 120), 1);
  }

  // Palette
  const sw = [spec.palette.ground, ink, ...tones].slice(0, 5);
  const sr = Math.max(9, r * 0.14);
  sw.forEach((hex, i) => {
    const x = wx + sr + i * sr * 3.1;
    const y = h * 0.74;
    g.beginPath();
    g.arc(x, y, sr, 0, Math.PI * 2);
    if (mode === "asset") {
      g.fillStyle = hex;
      g.fill();
      g.strokeStyle = "rgba(128,128,128,.35)";
      g.lineWidth = 1;
      g.stroke();
    } else {
      g.strokeStyle = STRUCT_INK;
      g.stroke();
    }
    // Labels only where they have room; small artboards show swatches alone.
    if (sr * 3.1 >= 60) text(g, mode, hex.toUpperCase(), x, y + sr + 14, `9px ${fonts.mono}`, tones[1] ?? ink, "center");
  });

  // Type specimen
  text(g, mode, "Aa", w * 0.1, h * 0.86, `${serif ? 400 : 600} ${Math.round(r * 0.62)}px ${display}`, ink);
  setSpacing(g, 2);
  text(g, mode, serif ? "DISPLAY · SERIF" : "DISPLAY · GROTESK", w * 0.1 + r * 0.95, h * 0.86, `9px ${fonts.mono}`, tones[1] ?? ink);
  setSpacing(g, 0);
}

// ── Interface ────────────────────────────────────────────────
const METRICS: Record<string, [string, string][]> = {
  Payroll: [["Total payroll", "$482,190"], ["Headcount", "146"], ["Next run", "Oct 31"]],
  Analytics: [["Sessions", "84,210"], ["Conversion", "3.8%"], ["Avg. time", "2m 41s"]],
  Crm: [["Open deals", "62"], ["Pipeline", "$1.24M"], ["Win rate", "31%"]],
  Banking: [["Balance", "$12,480"], ["Spending", "$2,106"], ["Saved", "$640"]],
};

function series(rnd: Rng, n: number) {
  const out: number[] = [];
  let v = 0.45;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.42) * 0.12;
    v = Math.max(0.12, Math.min(0.92, v));
    out.push(v);
  }
  return out;
}

function drawInterface(g: G, mode: Mode, c: BuildContext) {
  const { w, h, spec, fonts } = c;
  const rnd = mulberry32(spec.seed);
  const accent = strongestTone(spec.palette.tones, "#f5f5f3");
  const ink = "#121214";
  const muted = "#8b8b90";
  const sans = fonts.sans;
  box(g, mode, 0, 0, w, h, 0, "#f5f5f3");

  // Narrow artboards compose any interface as a device layout.
  if (spec.variant === "mobile-app" || (w < 520 && h > w * 0.8)) {
    const m = METRICS[spec.subject];
    const ph = h * 0.92, pw = Math.min(w < 520 ? w * 0.72 : w * 0.42, ph / 1.85);
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2;
    box(g, mode, px, py, pw, ph, pw * 0.14, "#0f0f11");
    const ix = px + 8, iy = py + 8, iw = pw - 16, ih = ph - 16;
    box(g, mode, ix, iy, iw, ih, pw * 0.11, "#fbfbfa");
    text(g, mode, spec.name, ix + 16, iy + 44, `600 17px ${sans}`, ink);
    text(g, mode, "Today", ix + 16, iy + 62, `11px ${sans}`, muted);
    box(g, mode, ix + 12, iy + 78, iw - 24, ih * 0.26, 14, accent);
    text(g, mode, m ? m[0]![0] : "Balance", ix + 26, iy + 102, `11px ${sans}`, "rgba(255,255,255,.8)");
    text(g, mode, m ? m[0]![1] : "$12,480", ix + 26, iy + 132, `600 24px ${sans}`, "#ffffff");
    const rowY = iy + 90 + ih * 0.26;
    // Only as many rows as fit above the tab bar.
    const rowsFit = Math.max(1, Math.min(4, Math.floor((iy + ih - 56 - rowY) / 42)));
    for (let k = 0; k < rowsFit; k++) {
      const y = rowY + k * 42;
      box(g, mode, ix + 12, y, iw - 24, 34, 10, "#ffffff", "#ececea");
      box(g, mode, ix + 20, y + 8, 18, 18, 9, spec.palette.tones[k % 4] ?? accent);
      const labels = m ? ["Engineering", "Design", "Ops", "Sales"] : ["Studio", "Groceries", "Transit", "Transfer"];
      const values = m ? ["$212k", "$96k", "$88k", "$86k"] : ["-$48", "-$62", "-$3", "+$400"];
      text(g, mode, labels[k]!, ix + 46, y + 22, `11px ${sans}`, ink);
      text(g, mode, values[k]!, ix + iw - 22, y + 22, `11px ${sans}`, ink, "right");
    }
    box(g, mode, ix, iy + ih - 46, iw, 46, 0, "#ffffff");
    for (let k = 0; k < 4; k++) box(g, mode, ix + iw * (0.14 + k * 0.24) - 7, iy + ih - 30, 14, 14, 7, k === 0 ? ink : "#d4d4d2");
    return;
  }

  if (spec.variant === "landing-page") {
    box(g, mode, 16, 16, w - 32, h - 32, 12, "#ffffff", "#e6e6e3");
    const x0 = 40, y0 = 16;
    text(g, mode, spec.name, x0, y0 + 36, `600 13px ${sans}`, ink);
    ["Product", "Pricing", "About"].forEach((s, i) => text(g, mode, s, w - 220 + i * 62, y0 + 36, `11px ${sans}`, muted));
    const hs = fitText(g, spec.name, (s) => `600 ${s}px ${sans}`, w * 0.46, Math.round(h * 0.13), 18);
    text(g, mode, spec.name, x0, h * 0.36, `600 ${hs}px ${sans}`, ink);
    text(g, mode, `A clearer way to work with ${spec.subject.toLowerCase()}.`, x0, h * 0.36 + 28, `13px ${sans}`, muted);
    box(g, mode, x0, h * 0.36 + 46, 118, 34, 17, ink);
    text(g, mode, "Get started", x0 + 59, h * 0.36 + 68, `500 12px ${sans}`, "#ffffff", "center");
    const vx = w * 0.56, vy = h * 0.16, vw = w * 0.36, vh = h * 0.38;
    if (mode === "asset") {
      const grd = g.createLinearGradient(vx, vy, vx + vw, vy + vh);
      spec.palette.tones.forEach((t, i) => grd.addColorStop(i / Math.max(1, spec.palette.tones.length - 1), t));
      rr(g, vx, vy, vw, vh, 14);
      g.fillStyle = grd;
      g.fill();
    } else box(g, mode, vx, vy, vw, vh, 14, "");
    for (let k = 0; k < 3; k++) {
      const fx = x0 + k * ((w - 80) / 3), fy = h * 0.66, fw = (w - 80) / 3 - 14;
      box(g, mode, fx, fy, fw, h * 0.22, 12, "#f7f7f5");
      box(g, mode, fx + 14, fy + 14, 22, 22, 11, spec.palette.tones[k] ?? accent);
      text(g, mode, ["Fast", "Clear", "Secure"][k]!, fx + 14, fy + 58, `600 12px ${sans}`, ink);
      text(g, mode, "Built for teams.", fx + 14, fy + 76, `11px ${sans}`, muted);
    }
    return;
  }

  // Dashboard
  const sw = Math.max(120, w * 0.19);
  box(g, mode, 0, 0, sw, h, 0, "#ededea");
  box(g, mode, 18, 22, 14, 14, 7, accent);
  text(g, mode, spec.name, 40, 34, `600 12px ${sans}`, ink);
  ["Overview", "People", "Reports", "Settings"].forEach((s, i) => {
    const y = 70 + i * 30;
    if (i === 0) box(g, mode, 12, y - 16, sw - 24, 24, 7, "#ffffff");
    text(g, mode, s, 22, y, `${i === 0 ? 600 : 400} 11px ${sans}`, i === 0 ? ink : muted);
  });
  const mx = sw + 20, mw = w - sw - 40;
  text(g, mode, spec.subject, mx, 40, `600 18px ${sans}`, ink);
  text(g, mode, "Overview · this month", mx, 58, `11px ${sans}`, muted);
  box(g, mode, w - 48, 24, 26, 26, 13, spec.palette.tones[1] ?? "#d0d0cc");
  const metrics = METRICS[spec.subject] ?? [[`${spec.subject} volume`, "12,408"], ["Active", "1,284"], ["Growth", "+8.2%"]];
  const cw = (mw - 24) / 3;
  metrics.forEach(([label, value], i) => {
    const x = mx + i * (cw + 12), y = 74;
    box(g, mode, x, y, cw, 64, 10, "#ffffff", "#e7e7e4");
    text(g, mode, label, x + 14, y + 24, `11px ${sans}`, muted);
    text(g, mode, value, x + 14, y + 50, `600 ${Math.min(20, cw / 6)}px ${sans}`, ink);
  });
  const chY = 152, chH = h - chY - 20, chW = mw * 0.62;
  box(g, mode, mx, chY, chW, chH, 10, "#ffffff", "#e7e7e4");
  text(g, mode, "Trend", mx + 14, chY + 22, `600 11px ${sans}`, ink);
  const data = series(rnd, 24);
  const gx = mx + 14, gy = chY + 36, gw = chW - 28, gh = chH - 52;
  g.beginPath();
  data.forEach((v, i) => {
    const x = gx + (i / (data.length - 1)) * gw, y = gy + gh * (1 - v);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  if (mode === "asset") {
    g.strokeStyle = accent;
    g.lineWidth = 2;
    g.stroke();
    g.lineTo(gx + gw, gy + gh);
    g.lineTo(gx, gy + gh);
    g.closePath();
    const grd = g.createLinearGradient(0, gy, 0, gy + gh);
    grd.addColorStop(0, accent + "55");
    grd.addColorStop(1, accent + "00");
    g.fillStyle = grd;
    g.fill();
  } else {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    g.stroke();
    g.beginPath();
    g.moveTo(gx, gy);
    g.lineTo(gx, gy + gh);
    g.lineTo(gx + gw, gy + gh);
    g.stroke();
  }
  const tx = mx + chW + 12, tw = mw - chW - 12;
  box(g, mode, tx, chY, tw, chH, 10, "#ffffff", "#e7e7e4");
  text(g, mode, "Breakdown", tx + 14, chY + 22, `600 11px ${sans}`, ink);
  ["Engineering", "Design", "Operations", "Sales"].forEach((s, i) => {
    const y = chY + 48 + i * ((chH - 60) / 4);
    text(g, mode, s, tx + 14, y, `10px ${sans}`, muted);
    const bw = (tw - 28) * (0.35 + rnd() * 0.6);
    box(g, mode, tx + 14, y + 6, bw, 5, 3, i === 0 ? accent : "#d9d9d6");
  });
}

// ── Image ────────────────────────────────────────────────────
function ridgeLine(rnd: Rng, w: number, base: number, amp: number, freq: number) {
  const ph = [rnd() * 10, rnd() * 10, rnd() * 10];
  const pts: [number, number][] = [];
  for (let x = -4; x <= w + 4; x += 4) {
    const t = x / w;
    const y =
      base -
      amp *
        (0.55 * Math.sin(t * freq + ph[0]!) +
          0.3 * Math.sin(t * freq * 2.3 + ph[1]!) +
          0.15 * Math.sin(t * freq * 5.1 + ph[2]!));
    pts.push([x, y]);
  }
  return pts;
}
function fillRidge(g: G, mode: Mode, pts: [number, number][], bottom: number, color: string) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  if (mode === "asset") {
    g.lineTo(pts[pts.length - 1]![0], bottom);
    g.lineTo(pts[0]![0], bottom);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  } else {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    g.stroke();
  }
}
function lerpHex(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round((v + (B[i]! - v) * t) * 255));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function skyGradient(g: G, w: number, h: number, stops: [number, string][]) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of stops) grd.addColorStop(o, c);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}
function glow(g: G, x: number, y: number, r: number, color: string, alpha: number) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  const [cr, cg, cb] = hexToRgb(color).map((v) => Math.round(v * 255));
  grd.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
  grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawImage(g: G, mode: Mode, c: BuildContext) {
  const { w, h, spec } = c;
  const rnd = mulberry32(spec.seed ^ 0x9e3779b9);
  const scene = spec.variant;
  const horizon = h * (scene === "city" ? 0.7 : 0.62);

  if (mode === "structure") {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    g.globalAlpha = 0.4;
    for (const f of [1 / 3, 2 / 3]) {
      g.beginPath();
      g.moveTo(w * f, 0);
      g.lineTo(w * f, h);
      g.moveTo(0, h * f);
      g.lineTo(w, h * f);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.beginPath();
    g.moveTo(0, horizon);
    g.lineTo(w, horizon);
    g.stroke();
  }

  const night = scene === "night" || scene === "aurora";
  // Sky
  if (mode === "asset") {
    const skies: Record<string, [number, string][]> = {
      sunset: [[0, "#1d1633"], [0.38, "#6b2f55"], [0.62, "#e0703f"], [0.72, "#f7b15a"], [1, "#f7c37a"]],
      ocean: [[0, "#6fa8d6"], [0.55, "#bcd9ee"], [0.62, "#e8f1f7"], [1, "#e8f1f7"]],
      forest: [[0, "#b9c8bf"], [0.6, "#dfe6dc"], [1, "#dfe6dc"]],
      mountains: [[0, "#8fb3d1"], [0.55, "#e3c9a6"], [0.7, "#f3dcb8"], [1, "#f3dcb8"]],
      city: [[0, "#0f1733"], [0.45, "#3d2f63"], [0.7, "#c56a5a"], [1, "#c56a5a"]],
      night: [[0, "#03050b"], [0.7, "#101a33"], [1, "#101a33"]],
      desert: [[0, "#f0b07a"], [0.5, "#f7d2a0"], [1, "#f7d2a0"]],
      aurora: [[0, "#02040a"], [0.7, "#0b1a2a"], [1, "#0b1a2a"]],
    };
    skyGradient(g, w, h, skies[scene] ?? skies.sunset!);
    if (night) {
      for (let i = 0; i < 260; i++) {
        const m = Math.pow(rnd(), 6);
        g.fillStyle = `rgba(255,255,255,${0.15 + m * 0.85})`;
        g.fillRect(rnd() * w, rnd() * horizon, 0.6 + m * 1.4, 0.6 + m * 1.4);
      }
    }
  }

  // Light source
  const sunX = w * (scene === "ocean" ? 0.72 : 0.62);
  const sunY = scene === "ocean" ? h * 0.2 : scene === "night" ? h * 0.24 : horizon - h * 0.04;
  const sunR = h * (scene === "night" ? 0.05 : 0.07);
  if (scene !== "forest" && scene !== "aurora" && scene !== "city") {
    if (mode === "asset") {
      const col = scene === "night" ? "#dfe6f2" : scene === "ocean" ? "#ffffff" : "#ffe3a3";
      glow(g, sunX, sunY, sunR * 7, col, scene === "night" ? 0.18 : 0.45);
      g.beginPath();
      g.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
    } else {
      g.beginPath();
      g.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      g.stroke();
    }
  }

  if (scene === "aurora" && mode === "asset") {
    for (let i = 0; i < 520; i++) {
      const x = rnd() * w;
      const band = Math.sin((x / w) * 5.2 + 1.3) * h * 0.08 + h * 0.3;
      const len = h * (0.12 + rnd() * 0.18);
      const grd = g.createLinearGradient(0, band - len, 0, band + 10);
      const hue = rnd() < 0.7 ? "96,255,170" : "170,110,255";
      grd.addColorStop(0, `rgba(${hue},0)`);
      grd.addColorStop(1, `rgba(${hue},${0.05 + rnd() * 0.08})`);
      g.fillStyle = grd;
      g.fillRect(x, band - len, 1.4, len + 10);
    }
  }

  // Layers
  const layers: Record<string, string[]> = {
    sunset: ["#7a3a4f", "#4a2238", "#24121f"],
    ocean: ["#8fb0c4", "#5f8aa6"],
    forest: ["#8fa597", "#667f6f", "#3f584a", "#20332a"],
    mountains: ["#a9b7c9", "#7d8fa6", "#56677f", "#2f3b4d"],
    night: ["#141d33", "#0b1222"],
    desert: ["#e9a86e", "#d98b52", "#b86b3c"],
    aurora: ["#0a1320", "#050a12"],
    city: [],
  };
  const cols = layers[scene] ?? layers.sunset!;
  cols.forEach((col, i) => {
    const t = (i + 1) / (cols.length + 1);
    const base = horizon - h * (0.14 - t * 0.12) + (scene === "forest" || scene === "mountains" ? h * t * 0.22 : 0);
    const amp = h * (scene === "desert" ? 0.04 : scene === "mountains" ? 0.12 : 0.06) * (1 - t * 0.4);
    const pts = ridgeLine(rnd, w, base, amp, scene === "desert" ? 3 : 6 + i * 2);
    if (scene === "forest" && mode === "asset") {
      // Conifer silhouettes along the ridge.
      fillRidge(g, mode, pts, h, col);
      g.fillStyle = col;
      for (let x = 0; x < w; x += 6 + rnd() * 8) {
        const y = base - amp * 0.3 + (rnd() - 0.5) * amp;
        const th = h * (0.04 + rnd() * 0.05) * (0.6 + t);
        g.beginPath();
        g.moveTo(x, y - th);
        g.lineTo(x - th * 0.22, y + 2);
        g.lineTo(x + th * 0.22, y + 2);
        g.closePath();
        g.fill();
      }
    } else fillRidge(g, mode, pts, scene === "ocean" || scene === "sunset" || scene === "aurora" ? horizon : h, col);
  });

  if (scene === "city") {
    let x = -10;
    while (x < w) {
      const bw = 18 + rnd() * 46;
      const bh = h * (0.12 + Math.pow(rnd(), 1.6) * 0.42);
      if (mode === "asset") {
        g.fillStyle = lerpHex("#1a1830", "#0c0b18", rnd());
        g.fillRect(x, horizon - bh, bw, bh);
        for (let wy = horizon - bh + 8; wy < horizon - 6; wy += 9) {
          for (let wx = x + 5; wx < x + bw - 5; wx += 8) {
            if (rnd() < 0.36) {
              g.fillStyle = rnd() < 0.8 ? "rgba(255,210,140,.85)" : "rgba(180,220,255,.7)";
              g.fillRect(wx, wy, 3, 4);
            }
          }
        }
      } else g.strokeRect(x, horizon - bh, bw, bh);
      x += bw + 2;
    }
  }

  // Water with reflection
  const water = scene === "sunset" || scene === "ocean" || scene === "city" || scene === "aurora";
  if (water) {
    if (mode === "asset") {
      const top = scene === "ocean" ? "#3d6f95" : scene === "city" ? "#161629" : scene === "aurora" ? "#07101a" : "#3a1f3a";
      const bot = scene === "ocean" ? "#173a57" : scene === "city" ? "#07070f" : scene === "aurora" ? "#02050a" : "#120b16";
      const grd = g.createLinearGradient(0, horizon, 0, h);
      grd.addColorStop(0, top);
      grd.addColorStop(1, bot);
      g.fillStyle = grd;
      g.fillRect(0, horizon, w, h - horizon);
      const refl = scene === "city" ? "255,200,140" : scene === "aurora" ? "110,255,180" : scene === "ocean" ? "255,255,255" : "255,196,120";
      for (let i = 0; i < 380; i++) {
        const y = horizon + Math.pow(rnd(), 1.4) * (h - horizon);
        const spread = (y - horizon) * 0.5 + 8;
        const xc = scene === "city" || scene === "aurora" ? rnd() * w : sunX + (rnd() - 0.5) * spread * 2;
        const len = 4 + rnd() * 22;
        g.fillStyle = `rgba(${refl},${(0.08 + rnd() * 0.3) * (1 - (y - horizon) / (h - horizon) * 0.6)})`;
        g.fillRect(xc - len / 2, y, len, 1);
      }
    } else {
      for (let k = 1; k < 6; k++) {
        const y = horizon + (h - horizon) * Math.pow(k / 6, 1.5);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.globalAlpha = 0.45;
        g.stroke();
        g.globalAlpha = 1;
      }
    }
  }

  if (mode === "asset") {
    // Atmospheric film: faint grain + vignette.
    const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,.28)");
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
  }
}

// ── Abstract ─────────────────────────────────────────────────
function drawAbstract(g: G, mode: Mode, c: BuildContext) {
  const { w, h, spec } = c;
  const rnd = mulberry32(spec.seed);
  const f = 0.004 + (spec.seed % 7) * 0.0006;
  const ph = rnd() * 100;
  const field = (x: number, y: number) =>
    (Math.sin(x * f + ph) + Math.cos(y * f * 1.3 - ph * 0.7) + Math.sin((x + y) * f * 0.6)) * 1.4;
  const cx = w * (0.4 + rnd() * 0.2), cy = h * (0.4 + rnd() * 0.2), cr = Math.min(w, h) * 0.26;

  if (mode === "structure") {
    g.strokeStyle = STRUCT_INK;
    g.lineWidth = 1;
    for (let y = 20; y < h; y += 26) {
      for (let x = 20; x < w; x += 26) {
        const a = field(x, y);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
        g.stroke();
      }
    }
    g.beginPath();
    g.arc(cx, cy, cr, 0, Math.PI * 2);
    g.stroke();
    return;
  }
  const tones = spec.palette.tones;
  glow(g, cx, cy, cr * 1.6, tones[0] ?? "#888888", 0.35);
  g.lineCap = "round";
  for (let k = 0; k < 900; k++) {
    let x = rnd() * w, y = rnd() * h;
    const inside = Math.hypot(x - cx, y - cy) < cr;
    g.strokeStyle = tones[(k + (inside ? 1 : 0)) % tones.length] ?? spec.palette.ink;
    g.globalAlpha = inside ? 0.7 : 0.35;
    g.lineWidth = inside ? 1.6 : 1;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 34; s++) {
      const a = field(x, y);
      x += Math.cos(a) * 3.2;
      y += Math.sin(a) * 3.2;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}

// ── Assembly ─────────────────────────────────────────────────
const DRAW = { brand: drawBrand, interface: drawInterface, image: drawImage, abstract: drawAbstract } as const;

function groundFor(c: BuildContext): string {
  if (c.spec.family === "interface") return "#f5f5f3";
  if (c.spec.family === "image") return "#0c0c10";
  return c.spec.palette.ground;
}

export function buildFlat(c: BuildContext, family: keyof typeof DRAW): Build {
  const { w, h, dpr, n, rnd, spec } = c;
  const ground = groundFor(c);
  const draw = DRAW[family];

  // High-fidelity asset, drawn live.
  const asset = makeCanvas(w, h, dpr);
  asset.ctx.fillStyle = ground;
  asset.ctx.fillRect(0, 0, w, h);
  draw(asset.ctx, "asset", c);

  // Construction geometry.
  const struct = makeCanvas(w, h, 1);
  draw(struct.ctx, "structure", c);

  const fullBleed = family === "image" || family === "abstract";
  const form = sampleCanvas(asset.canvas, w, h, n, rnd, {
    ground: hexToRgb(ground),
    base: fullBleed ? 0.55 : 0.015,
  });
  const st = sampleCanvas(struct.canvas, w, h, n, rnd);

  // Pair each structure point with a nearby form point (Z-order), so
  // materialization reads as the construction filling in — not a
  // scramble across the artboard.
  const morton = (x: number, y: number) => {
    let qx = Math.max(0, Math.min(1023, Math.floor((x / w + 0.5) * 1023)));
    let qy = Math.max(0, Math.min(1023, Math.floor((y / h + 0.5) * 1023)));
    let z = 0;
    for (let bit = 0; bit < 10; bit++) {
      z |= ((qx & 1) << (2 * bit)) | ((qy & 1) << (2 * bit + 1));
      qx >>= 1;
      qy >>= 1;
    }
    return z;
  };
  const byKey = (pos: Float32Array) => {
    const keys = new Float64Array(n);
    for (let i = 0; i < n; i++) keys[i] = morton(pos[i * 3]!, pos[i * 3 + 1]!);
    return Array.from({ length: n }, (_, i) => i).sort((a, b) => keys[a]! - keys[b]!);
  };
  const sIdx = byKey(st.pos);
  const fIdx = byKey(form.pos);
  const formPos = new Float32Array(n * 3);
  const color = new Float32Array(n * 4);
  const order = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const i = sIdx[k]!;
    const j = fIdx[k]!;
    formPos.set(form.pos.subarray(j * 3, j * 3 + 3), i * 3);
    color[i * 4] = form.col[j * 4]!;
    color[i * 4 + 1] = form.col[j * 4 + 1]!;
    color[i * 4 + 2] = form.col[j * 4 + 2]!;
    color[i * 4 + 3] = KIND.flat;
    // Resolve as a top→bottom sweep with a little grain.
    order[i] = (form.pos[j * 3 + 1]! / h + 0.5) * 0.82 + rnd() * 0.18;
  }

  const describe: Record<string, string> = {
    brand: `${FAMILY_LABEL.brand} for ${spec.name}: monogram, wordmark, palette and type specimen`,
    interface: `${FAMILY_LABEL.interface}: ${spec.subject} ${spec.variant.replace("-", " ")}`,
    image: `${FAMILY_LABEL.image}: ${spec.variant} with layered depth and atmospheric light`,
    abstract: `${FAMILY_LABEL.abstract}: a flow field in a palette drawn from your words`,
  };

  return {
    struct: st.pos,
    form: formPos,
    order,
    swirl: 8,
    normal: new Float32Array(n * 3),
    color,
    emissive: 0,
    gain: fullBleed ? 1 : 0.9,
    pointSize: fullBleed ? 2.6 : 1.6,
    interaction: "none",
    occlusion: 0,
    tilt: [0, 0],
    spin: 0,
    hiRes: asset.canvas,
    ground,
    description: describe[family]!,
  };
}

/** Draw a finished 2D composition directly (no particles). */
export function drawFlatAsset(g: G, c: BuildContext, family: keyof typeof DRAW) {
  g.fillStyle = groundFor(c);
  g.fillRect(0, 0, c.w, c.h);
  DRAW[family](g, "asset", c);
}
