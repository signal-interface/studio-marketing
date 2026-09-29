// ─────────────────────────────────────────────────────────────
// Creation choreography: INTENT → INTERPRETATION → STRUCTURE →
// MATERIALIZATION → ASSET. Pure; one clock drives particles and DOM.
// Marketing-site-local.
// ─────────────────────────────────────────────────────────────

export const STAGES = ["Intent", "Interpretation", "Structure", "Materialization", "Asset"] as const;
export type Stage = (typeof STAGES)[number];

/** Stage start times (ms). */
export const C = {
  intent: 0,
  interpretation: 650,
  structure: 2050,
  materialization: 3500,
  asset: 5100,
  end: 5900,
  /** Interpretation rows reveal cadence. */
  rowStep: 240,
  /** Artboard frame drawn in during structure. */
  frameIn: 2250,
  /** Artboard ground fills during materialization. */
  groundIn: 3500,
  groundDur: 1100,
  /** High-fidelity layer resolves over the particles. */
  resolveIn: 4800,
  resolveDur: 700,
} as const;

/** Reduced motion: same stages, no movement, opacity only. */
export const C_REDUCED = { step: 260, end: 5 * 260 + 300 } as const;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function stageAt(t: number): Stage {
  if (t >= C.asset) return "Asset";
  if (t >= C.materialization) return "Materialization";
  if (t >= C.structure) return "Structure";
  if (t >= C.interpretation) return "Interpretation";
  return "Intent";
}

export interface CreationFrame {
  t: number;
  stage: Stage;
  /** 0→1 glyph dissipation + migration to structure. */
  a: number;
  /** 0→1 structure → form (materialization). */
  b: number;
  /** 0→1 artboard frame. */
  frame: number;
  /** 0→1 artboard ground fill. */
  ground: number;
  /** 0→1 high-fidelity resolve. */
  resolve: number;
  done: boolean;
}

export function creationAt(t: number): CreationFrame {
  return {
    t,
    stage: stageAt(t),
    a: clamp01((t - C.structure) / (C.materialization - C.structure)),
    b: clamp01((t - C.materialization) / (C.asset - C.materialization)),
    frame: clamp01((t - C.frameIn) / 600),
    ground: clamp01((t - C.groundIn) / C.groundDur),
    resolve: clamp01((t - C.resolveIn) / C.resolveDur),
    done: t >= C.end,
  };
}
