// ─────────────────────────────────────────────────────────────
// Entrance choreography — the single source of timing truth.
//
// Marketing-site-local. NOT Studio OS architecture. Nothing in
// src/lib/experience/ is normative or importable by Studio.
//
// Pure functions only: every frame of the entrance is a function
// of elapsed time, so the renderer, the DOM word layer, tests and
// the dev scrub parameter all agree on the same state.
// ─────────────────────────────────────────────────────────────

/** Milliseconds from entrance start. */
export const T = {
  /** Universe exposure rises out of black. */
  universeIn: 0,
  universeInDur: 1100,

  /** Whole-word reveals — sequential, one visual line. */
  imagine: 420,
  type: 1120,
  draw: 1820,
  wordDur: 760,

  /**
   * Gravitational pull begins while DRAW is still resolving
   * (~73% through its reveal) so there is no dead black pause.
   */
  pull: 2380,
  pullDur: 2320,

  /** Words are drawn into the aperture shortly after pull begins. */
  wordsPulledDelay: 140,
  wordsPulledDur: 1050,

  /** Overexposure flash is fully white; overlay then dissolves onto the canvas. */
  whiteHold: 50,
  handoffDur: 260,
} as const;

export const PULL_END = T.pull + T.pullDur;
export const ENTRANCE_END = PULL_END + T.whiteHold + T.handoffDur;

/** Reduced-motion path: static composition, opacity only. */
export const REDUCED = {
  wordsIn: 150,
  wordsDur: 600,
  hold: 1500,
  crossfade: 520,
} as const;
export const REDUCED_END = REDUCED.wordsIn + REDUCED.wordsDur + REDUCED.hold + REDUCED.crossfade;

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/**
 * Normalised camera travel toward the aperture over pull progress u∈[0,1].
 * Cubic term = controlled start, 8th-power term = the final "very fast"
 * swoosh. Monotonic, s(0)=0, s(1)=1.
 */
export const travel = (u: number) => {
  const x = clamp01(u);
  return 0.34 * x * x * x + 0.66 * Math.pow(x, 8);
};

/** d travel / du — drives streak length (shutter-time motion blur). */
export const travelVelocity = (u: number) => {
  const x = clamp01(u);
  return 1.02 * x * x + 5.28 * Math.pow(x, 7);
};

/**
 * Angular growth of the aperture from camera approach. Perspective:
 * apparent size ∝ 1 / distance, so growth is non-linear — it reads as
 * the camera moving, not an object scaling.
 */
export const APPROACH_GAIN = 62;
export const apertureScale = (u: number) => 1 + APPROACH_GAIN * travel(u);

export interface EntranceFrame {
  /** Elapsed ms. */
  t: number;
  /** 0→1 universe fade-in from black. */
  universe: number;
  /** 0→1 singularity visibility (it emerges as the words land). */
  appear: number;
  /** 0→1 pull progress. 0 before pull starts. */
  u: number;
  /** Normalised travel toward the aperture. */
  travel: number;
  /** Instantaneous travel velocity (for streaks). */
  velocity: number;
  /** Apparent aperture scale (1 = resting size). */
  aperture: number;
  /** Tone-mapping exposure multiplier; climbs into overexposure at the end. */
  exposure: number;
  /** 0→1 mix to canvas white. 1 = flash complete. */
  white: number;
  /** 0→1 overlay dissolve onto the DOM canvas. */
  handoff: number;
  /** Camera roll (radians) — part of the swoosh. */
  roll: number;
  done: boolean;
}

export function frameAt(t: number): EntranceFrame {
  const universe = smoothstep(T.universeIn, T.universeIn + T.universeInDur, t);
  const appear = smoothstep(T.type, T.draw + T.wordDur * 0.6, t);
  const u = clamp01((t - T.pull) / T.pullDur);
  const tr = travel(u);

  // Overexposure: negligible until the camera is nearly through, then the
  // aperture's light floods the sensor. This IS the white flash.
  const flood = smoothstep(0.84, 1.0, u);
  const exposure = (0.35 + 0.65 * universe) * (1 + 14 * flood * flood);
  const white = smoothstep(0.93, 1.0, u);

  const handoff = clamp01((t - PULL_END - T.whiteHold) / T.handoffDur);

  return {
    t,
    universe,
    appear,
    u,
    travel: tr,
    velocity: travelVelocity(u),
    aperture: apertureScale(u),
    exposure,
    white,
    handoff,
    roll: 0.11 * u * u * u,
    done: t >= ENTRANCE_END,
  };
}
