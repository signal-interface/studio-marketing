// Spatial family — 3D forms condensed from particles; lit in the
// shader so the resolved object stays live and rotatable.
import { hexToRgb, type Rng } from "../sample.ts";
import { KIND, emptyBuild, type Build, type BuildContext } from "./types.ts";

type V3 = [number, number, number];

function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = (t: number) => t * t * (3 - 2 * t);
  const ux = u(fx), uy = u(fy), uz = u(fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), ux), l(c(0, 1, 0), c(1, 1, 0), ux), uy),
    l(l(c(0, 0, 1), c(1, 0, 1), ux), l(c(0, 1, 1), c(1, 1, 1), ux), uy),
    uz
  );
}
function fbm3(x: number, y: number, z: number, oct = 4) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise3(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}
const mixC = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

function sphereDir(rnd: Rng): V3 {
  const z = rnd() * 2 - 1;
  const p = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(p), z, r * Math.sin(p)];
}

/** Wireframe polyline sampler: every structure particle lies on a line. */
type Line = (t: number) => V3;

function circle(r: number, y: number, plane: "xz" | "xy" | "yz" = "xz"): Line {
  return (t) => {
    const a = t * Math.PI * 2;
    if (plane === "xz") return [Math.cos(a) * r, y, Math.sin(a) * r];
    if (plane === "xy") return [Math.cos(a) * r, Math.sin(a) * r, y];
    return [y, Math.cos(a) * r, Math.sin(a) * r];
  };
}
function meridian(R: number, phi: number): Line {
  return (t) => {
    const a = t * Math.PI * 2;
    return [Math.cos(a) * R * Math.cos(phi), Math.sin(a) * R, Math.cos(a) * R * Math.sin(phi)];
  };
}
function segment(a: V3, b: V3): Line {
  return (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function sphereWire(R: number): Line[] {
  const lines: Line[] = [];
  for (let i = 0; i < 12; i++) lines.push(meridian(R, (i / 12) * Math.PI));
  for (let j = 1; j < 7; j++) {
    const lat = (j / 7) * Math.PI - Math.PI / 2;
    lines.push(circle(R * Math.cos(lat), R * Math.sin(lat)));
  }
  return lines;
}

/** Apply a roll about z (baked axial tilt). */
function roll(v: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

export function buildSpatial(ctx: BuildContext): Build {
  const { spec, w, h, n, rnd } = ctx;
  const b = emptyBuild(n);
  // Rings span ±2.28R: on narrow artboards size from the width.
  const R = Math.min(
    Math.min(w, h) * (spec.variant === "terrain" ? 0.3 : 0.25),
    spec.variant === "ringed-planet" ? w * 0.195 : Infinity
  );
  const tones = spec.palette.tones.map(hexToRgb) as V3[];
  const ink = hexToRgb(spec.palette.ink) as V3;
  const t0 = tones[0] ?? ink, t1 = tones[1] ?? ink, t2 = tones[2] ?? ink, t3 = tones[3] ?? ink;

  const lines: Line[] = [];
  let starShare = 0.1;
  let occlusion = 0;
  let tilt: [number, number] = [0.38, 0.35];
  let axial = 0;

  // Form generator returns [pos, normal, colour, kind] in y-UP space.
  let gen: (i: number) => [V3, V3, V3, number];

  switch (spec.variant) {
    case "ringed-planet":
    case "banded-planet":
    case "planet": {
      const ringed = spec.variant === "ringed-planet";
      const banded = spec.variant !== "planet";
      axial = ringed ? -0.38 : -0.2;
      tilt = ringed ? [0.36, 0.2] : [0.18, 0.3];
      occlusion = R;
      starShare = 0.08;
      const sphereShare = ringed ? 0.6 : 0.92;
      lines.push(...sphereWire(R));
      if (ringed) for (const k of [1.3, 1.62, 1.97, 2.28]) lines.push(circle(R * k, 0));
      gen = (i) => {
        const f = i / n;
        if (f < sphereShare) {
          const d = sphereDir(rnd);
          const lat = d[1];
          const band = banded
            ? fbm3(lat * 7.5 + fbm3(d[0] * 2, d[1] * 2, d[2] * 2) * 0.7, 0.3, 0.7, 3)
            : fbm3(d[0] * 2.4, d[1] * 2.4, d[2] * 2.4, 4);
          let c = mixC(t0, t1, band);
          c = mixC(c, t2, Math.max(0, band - 0.62) * 1.6);
          c = mixC(c, t3, Math.pow(Math.abs(lat), 6) * 0.6);
          return [[d[0] * R, d[1] * R, d[2] * R], d, c, KIND.lit];
        }
        // Rings with density structure and a Cassini-like gap
        let r = 0;
        for (let tries = 0; tries < 12; tries++) {
          const x = 1.3 + rnd() * 0.98;
          const gap = x > 1.93 && x < 2.0 ? 0.04 : 1;
          const inner = x < 1.55 ? 0.35 : 1;
          const fine = 0.62 + 0.38 * Math.sin(x * 57) * Math.sin(x * 23);
          if (rnd() < gap * inner * fine) {
            r = x;
            break;
          }
          r = x;
        }
        const a = rnd() * Math.PI * 2;
        const c = mixC(mixC(t3, t0, (r - 1.3) / 0.98), t1, 0.25 * Math.sin(r * 31) + 0.25);
        return [[Math.cos(a) * r * R, (rnd() - 0.5) * 0.8, Math.sin(a) * r * R], [0, 1, 0], c, KIND.ring];
      };
      break;
    }
    case "crystal": {
      tilt = [0.2, 0.4];
      const sides = 7;
      const top: V3 = [0, R * 1.45, 0];
      const bot: V3 = [0, -R * 1.15, 0];
      const girdle: V3[] = [];
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2 + 0.3;
        const rr = R * (0.92 + 0.14 * hash3(k, 1, 2));
        girdle.push([Math.cos(a) * rr, R * (0.12 + 0.08 * hash3(k, 3, 1)), Math.sin(a) * rr]);
      }
      const tris: [V3, V3, V3][] = [];
      for (let k = 0; k < sides; k++) {
        const g0 = girdle[k]!, g1 = girdle[(k + 1) % sides]!;
        tris.push([top, g0, g1], [bot, g1, g0]);
        lines.push(segment(top, g0), segment(bot, g0), segment(g0, g1));
      }
      const areas = tris.map(([a, b2, c]) => Math.hypot(...cross(sub(b2, a), sub(c, a))) / 2);
      const total = areas.reduce((s, x) => s + x, 0);
      gen = () => {
        let r = rnd() * total, k = 0;
        while (r > areas[k]! && k < areas.length - 1) r -= areas[k++]!;
        const [a, b2, c] = tris[k]!;
        let u = rnd(), v = rnd();
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const p: V3 = [
          a[0] + (b2[0] - a[0]) * u + (c[0] - a[0]) * v,
          a[1] + (b2[1] - a[1]) * u + (c[1] - a[1]) * v,
          a[2] + (b2[2] - a[2]) * u + (c[2] - a[2]) * v,
        ];
        let nrm = norm(cross(sub(b2, a), sub(c, a)));
        if (nrm[0] * p[0] + nrm[1] * p[1] + nrm[2] * p[2] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        const col = mixC(mixC(ink, t0, (p[1] / R + 1.15) / 2.6), t1, k % 3 === 0 ? 0.25 : 0);
        return [p, nrm, col, KIND.lit];
      };
      break;
    }
    case "terrain": {
      tilt = [0.62, 0.5];
      starShare = 0.05;
      const S = R * 1.75;
      const height = (x: number, z: number) => {
        const d = Math.hypot(x, z) / S;
        const fall = Math.max(0, 1 - d * d);
        const n1 = fbm3(x / S * 2.2 + 3, z / S * 2.2, 0.5, 5);
        const ridge = 1 - Math.abs(n1 * 2 - 1);
        return Math.pow(ridge, 2.2) * fall * R * 0.95 + fall * R * 0.05;
      };
      for (let k = -6; k <= 6; k++) {
        const o = (k / 6) * S;
        const half = Math.sqrt(Math.max(0, S * S - o * o));
        lines.push(segment([o, 0, -half], [o, 0, half]), segment([-half, 0, o], [half, 0, o]));
      }
      gen = () => {
        let x = 0, z = 0;
        do {
          x = (rnd() * 2 - 1) * S;
          z = (rnd() * 2 - 1) * S;
        } while (x * x + z * z > S * S);
        const y = height(x, z);
        const e = 2;
        const nrm = norm([height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)]);
        const hn = y / (R * 0.8);
        let c = mixC(t1, t0, Math.min(1, hn * 1.6));
        c = mixC(c, [0.95, 0.95, 0.94], Math.max(0, hn - 0.62) * 2.5 * nrm[1]);
        return [[x, y - R * 0.25, z], nrm, c, KIND.lit];
      };
      break;
    }
    case "torus": {
      tilt = [0.95, 0.3];
      const R0 = R * 1.05, r0 = R * 0.42;
      for (let k = 0; k < 16; k++) {
        const u = (k / 16) * Math.PI * 2;
        lines.push((t) => {
          const v = t * Math.PI * 2;
          return [(R0 + r0 * Math.cos(v)) * Math.cos(u), r0 * Math.sin(v), (R0 + r0 * Math.cos(v)) * Math.sin(u)];
        });
      }
      for (const v of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        lines.push(circle(R0 + r0 * Math.cos(v), r0 * Math.sin(v)));
      }
      gen = () => {
        let u = 0, v = 0;
        do {
          u = rnd() * Math.PI * 2;
          v = rnd() * Math.PI * 2;
        } while (rnd() > (R0 + r0 * Math.cos(v)) / (R0 + r0));
        const p: V3 = [(R0 + r0 * Math.cos(v)) * Math.cos(u), r0 * Math.sin(v), (R0 + r0 * Math.cos(v)) * Math.sin(u)];
        const nrm: V3 = [Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)];
        const c = mixC(mixC(t0, t1, (Math.sin(u * 2) + 1) / 2), t2, (Math.cos(v) + 1) / 4);
        return [p, nrm, c, KIND.lit];
      };
      break;
    }
    default: {
      // Parametric sculpture (supershape) — parameters from the intent's seed.
      tilt = [0.3, 0.4];
      const s = spec.seed;
      const m1 = 2 + (s % 5), m2 = 3 + ((s >> 3) % 4);
      const n1 = 0.6 + ((s >> 6) % 7) * 0.25, n2 = 1.2 + ((s >> 9) % 5) * 0.3;
      const sf = (a: number, m: number, nn1: number, nn2: number) => {
        const t = Math.pow(Math.abs(Math.cos((m * a) / 4)), nn2) + Math.pow(Math.abs(Math.sin((m * a) / 4)), nn2);
        return Math.pow(t, -1 / nn1);
      };
      const surf = (th: number, ph: number): V3 => {
        const r1 = sf(th, m1, n1, n2), r2 = sf(ph, m2, n1 + 0.4, n2);
        const k = R * 0.9;
        return [k * r1 * Math.cos(th) * r2 * Math.cos(ph), k * r2 * Math.sin(ph), k * r1 * Math.sin(th) * r2 * Math.cos(ph)];
      };
      lines.push(...sphereWire(R));
      gen = () => {
        const th = rnd() * Math.PI * 2 - Math.PI;
        const ph = Math.asin(rnd() * 2 - 1);
        const p = surf(th, ph);
        const e = 0.004;
        let nrm = norm(cross(sub(surf(th + e, ph), p), sub(surf(th, ph + e), p)));
        if (nrm[0] * p[0] + nrm[1] * p[1] + nrm[2] * p[2] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
        const c = mixC(mixC(t0, t1, (nrm[1] + 1) / 2), t2, Math.max(0, nrm[0]) * 0.5);
        const scale = Math.min(1.35, (R * 1.35) / Math.max(1, Math.hypot(p[0], p[1], p[2])));
        return [[p[0] * Math.min(1, scale), p[1] * Math.min(1, scale), p[2] * Math.min(1, scale)], nrm, c, KIND.lit];
      };
    }
  }

  const nStars = Math.floor(n * starShare);
  for (let i = 0; i < n; i++) {
    // Structure: a point on a wireframe line (y-up → y-down on write)
    const line = lines[Math.floor(rnd() * lines.length)]!;
    const sp = roll(line(rnd()), axial);
    b.struct.set([sp[0], -sp[1], sp[2]], i * 3);

    if (i >= n - nStars) {
      // Background stars across the artboard, power-law brightness
      const m = Math.pow(rnd(), 5);
      b.form.set([(rnd() - 0.5) * w, (rnd() - 0.5) * h, 0], i * 3);
      b.color.set([0.55 + m, 0.58 + m, 0.62 + m, KIND.star], i * 4);
      continue;
    }
    const [p, nrm, c, kind] = gen(i);
    const rp = roll(p, axial);
    const rn = roll(nrm, axial);
    b.form.set([rp[0], -rp[1], rp[2]], i * 3);
    b.normal.set([rn[0], -rn[1], rn[2]], i * 3);
    b.color.set([c[0], c[1], c[2], kind], i * 4);
  }

  const ground = spec.palette.ground;
  // Planets condense into a solid body: sphere shading is rotation-
  // invariant under a fixed light, so a live-drawn shaded disc fills the
  // volume while the particles carry bands, rings and texture.
  const planet = spec.variant.endsWith("planet");
  const hex = (v: V3) => `rgb(${v.map((x) => Math.round(x * 255)).join(",")})`;
  const underlay = planet
    ? {
        background: `radial-gradient(circle at 33% 30%, ${hex(mixC(t2, [1, 1, 1], 0.1))} 0%, ${hex(t0)} 24%, ${hex(mixC(t1, [0, 0, 0], 0.35))} 58%, rgb(8,7,6) 86%)`,
        radius: R,
      }
    : undefined;
  const label: Record<string, string> = {
    "ringed-planet": `${spec.subject}: a ringed planet with banded atmosphere, lit from one side`,
    "banded-planet": `${spec.subject}: a banded planet lit from one side`,
    planet: `${spec.subject}: a planet lit from one side`,
    crystal: "A faceted crystal under hard light",
    terrain: "A mountainous island height field under a low sun",
    torus: "A lit torus",
    sculpture: "A parametric sculpture derived from your words",
  };
  return {
    ...b,
    emissive: 1,
    gain: spec.variant === "terrain" ? 0.5 : planet ? 0.5 : 0.62,
    pointSize: planet ? 2.6 : 3,
    underlay,
    swirl: 34,
    interaction: "rotate",
    occlusion,
    tilt,
    spin: 0,
    ground,
    description: label[spec.variant] ?? "A spatial study",
    hint: "Drag to rotate",
  };
}
