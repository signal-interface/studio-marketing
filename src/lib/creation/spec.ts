// ─────────────────────────────────────────────────────────────
// ExperienceSpec — PUBLIC-SURFACE-ONLY, NON-NORMATIVE.
//
// This type exists only to drive the marketing site's creation
// demonstration. It is NOT a Studio contract, NOT part of
// faraday-contracts, and must NOT be imported, published or
// packaged for Studio. A passing test here proves the boundary
// functions; it does not make the type normative. Promotion of any
// idea here into Studio requires the Studio authority path.
//
// Versioned independently of any Studio contract lineage.
// ─────────────────────────────────────────────────────────────

export const EXPERIENCE_SPEC_VERSION = "studio-marketing.experience-spec/0.1" as const;

export type Family = "spatial" | "brand" | "interface" | "motion" | "image" | "abstract";

export interface Palette {
  /** Artboard background. */
  ground: string;
  /** Primary ink / form colour. */
  ink: string;
  /** Up to four supporting colours. */
  tones: string[];
}

export interface ExperienceSpec {
  version: typeof EXPERIENCE_SPEC_VERSION;
  family: Family;
  /** The visitor's words, trimmed and length-capped. Display as text only. */
  intent: string;
  /** Words the interpreter recognised (for highlighting). */
  recognised: string[];
  /** Main subject, e.g. "Saturn", "Payroll". */
  subject: string;
  /** A name to set in type (brand/motion/interface). */
  name: string;
  qualities: string[];
  /** Family-specific composition key, e.g. "ringed-planet", "dashboard". */
  variant: string;
  /** Human-readable description of the composition. */
  composition: string;
  palette: Palette;
  /** Deterministic seed derived from the intent. */
  seed: number;
}

export const FAMILY_LABEL: Record<Family, string> = {
  spatial: "Spatial study",
  brand: "Identity study",
  interface: "Interface study",
  motion: "Motion study",
  image: "Image study",
  abstract: "Abstract study",
};
