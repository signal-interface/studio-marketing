import type { ExperienceSpec } from "../spec.ts";
import type { Rng } from "../sample.ts";

/** Particle kinds understood by the renderer. */
export const KIND = {
  flat: 0, // 2D coloured point
  lit: 1, // lit surface point (normal used)
  ring: 2, // lit ring point, receives planet shadow
  star: 3, // background point: no rotation, no perspective
  cylinder: 4, // form stored as (theta, y, radius); spins in the loop
} as const;

export interface Fonts {
  sans: string;
  mono: string;
  serif: string;
}

export interface BuildContext {
  spec: ExperienceSpec;
  /** Artboard size, CSS px. */
  w: number;
  h: number;
  dpr: number;
  n: number;
  fonts: Fonts;
  rnd: Rng;
}

export interface Build {
  /** n × 3 structure targets (CSS px, artboard-centred, y down, z toward viewer). */
  struct: Float32Array;
  /** n × 3 form targets. */
  form: Float32Array;
  /** n × 3 surface normals (lit kinds). */
  normal: Float32Array;
  /** n × 4: rgb + kind. */
  color: Float32Array;
  /** 0 = ink "over" blending, 1 = additive light. */
  emissive: number;
  /** Per-particle intensity for the form state. */
  gain: number;
  /** Form point diameter, CSS px. */
  pointSize: number;
  interaction: "none" | "rotate";
  /** Planet radius for ring shadow / occlusion (px), 0 if none. */
  occlusion: number;
  /** Initial orientation (radians about x, y). */
  tilt: [number, number];
  /** Angular speed for cylinder loops (rad/s). */
  spin: number;
  /** High-fidelity layer drawn live for 2D families. */
  hiRes?: HTMLCanvasElement;
  ground: string;
  /** Optional live-drawn body under the particles (CSS background) and its radius (px). */
  underlay?: { background: string; radius: number };
  /** Materialization order per particle (0 = first), optional. */
  order?: Float32Array;
  /** Flight-path curvature (px) during materialization. */
  swirl: number;
  /** Alt text for the resolved asset. */
  description: string;
  hint?: string;
}

export function emptyBuild(n: number): Pick<Build, "struct" | "form" | "normal" | "color"> {
  return {
    struct: new Float32Array(n * 3),
    form: new Float32Array(n * 3),
    normal: new Float32Array(n * 3),
    color: new Float32Array(n * 4),
  };
}
