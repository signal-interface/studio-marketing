// ─────────────────────────────────────────────────────────────
// Deterministic, local intent interpretation for the public
// demonstration. No network, no model, no persistence. The same
// words always produce the same spec.
// Marketing-site-local; not Studio architecture.
// ─────────────────────────────────────────────────────────────

import { EXPERIENCE_SPEC_VERSION, type ExperienceSpec, type Family, type Palette } from "./spec.ts";

export const MAX_INTENT = 80;

/** FNV-1a — stable seed from the intent. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function sanitiseIntent(raw: string): string {
  // Strip control characters, collapse whitespace, cap length. The
  // result is only ever rendered as text (textContent / fillText).
  return raw
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INTENT);
}

type Rule = { family: Exclude<Family, "abstract">; words: Record<string, number> };

// Medium words (what kind of thing) weigh more than subject words.
const RULES: Rule[] = [
  {
    family: "motion",
    words: {
      animation: 4, animated: 4, animate: 4, motion: 4, loop: 3, looping: 3, kinetic: 4,
      intro: 2, reel: 3, video: 3, trailer: 3, sequence: 2, gif: 3, spin: 2, spinning: 2,
    },
  },
  {
    family: "interface",
    words: {
      app: 4, dashboard: 4, website: 4, site: 3, landing: 3, ui: 4, ux: 3, interface: 4,
      screen: 3, portal: 3, checkout: 3, form: 2, payroll: 2, crm: 3, analytics: 2,
      admin: 2, saas: 3, platform: 2, tracker: 2, banking: 2,
    },
  },
  {
    family: "brand",
    words: {
      brand: 4, branding: 4, logo: 4, identity: 4, wordmark: 4, monogram: 4, company: 2,
      startup: 2, agency: 2, label: 2, studio: 1, restaurant: 2, cafe: 2, coffee: 2,
      fashion: 2, luxury: 1, hotel: 2, bakery: 2, boutique: 2,
    },
  },
  {
    family: "spatial",
    words: {
      "3d": 4, sculpture: 4, object: 3, planet: 4, saturn: 4, jupiter: 4, mars: 4,
      earth: 3, moon: 3, neptune: 4, sphere: 4, orb: 3, crystal: 4, gem: 3, diamond: 3,
      torus: 4, donut: 3, ring: 2, rings: 2, mountain: 3, terrain: 4, island: 3,
      volcano: 3, asteroid: 3, form: 1, shape: 2,
    },
  },
  {
    family: "image",
    words: {
      image: 4, picture: 3, photo: 3, painting: 4, poster: 4, illustration: 4, scene: 3,
      landscape: 3, sunset: 3, sunrise: 3, ocean: 3, sea: 3, beach: 3, forest: 3,
      mountains: 3, city: 3, skyline: 3, night: 2, desert: 3, aurora: 3, lake: 3,
      rain: 2, storm: 2, dusk: 3, dawn: 3,
    },
  },
];

const PRIORITY: Exclude<Family, "abstract">[] = ["motion", "interface", "brand", "spatial", "image"];

const STOP = new Set([
  "a", "an", "the", "of", "for", "with", "and", "or", "to", "in", "on", "my", "our", "me",
  "i", "we", "make", "create", "design", "build", "some", "something", "that", "this",
  "please", "want", "like", "new", "about", "at", "by", "from", "is", "it",
  "over", "under", "into", "across", "through", "above", "below", "near", "under", "as",
]);

const QUALITY_WORDS: Record<string, string> = {
  luxury: "luxury", luxurious: "luxury", premium: "luxury", elegant: "elegant",
  minimal: "minimal", minimalist: "minimal", clean: "minimal", bold: "bold",
  playful: "playful", fun: "playful", calm: "calm", serene: "calm", quiet: "calm",
  dark: "dark", moody: "dark", warm: "warm", cozy: "warm", cold: "cool", cool: "cool",
  organic: "organic", natural: "organic", futuristic: "futuristic", modern: "modern",
  retro: "retro", vintage: "retro", vibrant: "vibrant", colorful: "vibrant", colourful: "vibrant",
  golden: "warm", neon: "vibrant",
};

// Palettes keyed by quality; fallback chosen by seed.
const PALETTES: Record<string, Palette> = {
  luxury: { ground: "#0e0d0b", ink: "#e9dcc0", tones: ["#b8995a", "#6d5b3a", "#f5efe2", "#2a2621"] },
  elegant: { ground: "#f3f0ea", ink: "#1b1a18", tones: ["#8c7b62", "#c9bda8", "#3d3a35", "#e6dfd2"] },
  minimal: { ground: "#f6f6f4", ink: "#111111", tones: ["#8a8a8a", "#d6d6d3", "#3a3a3a", "#ffffff"] },
  bold: { ground: "#101010", ink: "#f4f1ea", tones: ["#ff4a1c", "#ffd23f", "#2d2d2d", "#ffffff"] },
  playful: { ground: "#fff6ea", ink: "#1f1b2e", tones: ["#ff6b6b", "#4ecdc4", "#ffd93d", "#6c5ce7"] },
  calm: { ground: "#eef2f3", ink: "#1d2b33", tones: ["#7fa7b5", "#b9d0d6", "#3d5a66", "#f4f7f8"] },
  dark: { ground: "#07080a", ink: "#d9dde3", tones: ["#5a6b7d", "#8e9aab", "#232a33", "#b0463c"] },
  warm: { ground: "#1a0f0a", ink: "#ffd9a8", tones: ["#ff8a3d", "#c2452d", "#ffc15e", "#5c2a1a"] },
  cool: { ground: "#081018", ink: "#d6ecff", tones: ["#4aa3df", "#1f5f8b", "#9fd3f5", "#0f2a40"] },
  organic: { ground: "#f1eee6", ink: "#23301f", tones: ["#6b8f5a", "#a8b88a", "#c98b5b", "#3e5236"] },
  futuristic: { ground: "#05060a", ink: "#e6f0ff", tones: ["#7cf4ff", "#8a7dff", "#1b2340", "#ff5ea8"] },
  modern: { ground: "#f4f4f2", ink: "#121212", tones: ["#3b5bdb", "#e9ecef", "#495057", "#ff6b35"] },
  retro: { ground: "#f2e6cf", ink: "#2b1d14", tones: ["#d9643a", "#e8b04b", "#2f6f6a", "#8c3b2a"] },
  vibrant: { ground: "#0b0b14", ink: "#ffffff", tones: ["#ff3d7f", "#ffb627", "#27d3ff", "#7b61ff"] },
};
const FALLBACK_PALETTES = ["minimal", "calm", "modern", "elegant", "cool", "warm"];

const PLANETS: Record<string, { variant: string; tones: string[] }> = {
  saturn: { variant: "ringed-planet", tones: ["#e3cf9f", "#c9a86a", "#a78652", "#efe2c2"] },
  jupiter: { variant: "banded-planet", tones: ["#d9b38c", "#b5835a", "#e8d6bd", "#9c5b3e"] },
  mars: { variant: "planet", tones: ["#c1583a", "#8e3b26", "#d98a64", "#5e2618"] },
  earth: { variant: "planet", tones: ["#2f6fb0", "#3f8f5a", "#e8eef2", "#1c3f6b"] },
  moon: { variant: "planet", tones: ["#bdbdb8", "#8f8f8a", "#d9d9d4", "#6d6d68"] },
  neptune: { variant: "ringed-planet", tones: ["#3f6fd8", "#2a4fa8", "#7fa3f0", "#1a2f6b"] },
  planet: { variant: "ringed-planet", tones: ["#b9c7d8", "#8196b0", "#dbe4ee", "#4d5f78"] },
};

function titleCase(w: string) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Interpret an intent. `as` re-reads the same words as a specific family —
 * used by the possibility layer to show one idea in many forms.
 */
export function interpret(raw: string, as?: Family): ExperienceSpec {
  const intent = sanitiseIntent(raw);
  const seed = hashString(intent.toLowerCase());
  const tokens: string[] = intent.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

  // ── Family: weighted keyword score, ties broken by priority ──
  const scores = new Map<Family, number>();
  const recognised = new Set<string>();
  for (const rule of RULES) {
    for (const t of tokens) {
      const w = rule.words[t];
      if (w) {
        scores.set(rule.family, (scores.get(rule.family) ?? 0) + w);
        recognised.add(t);
      }
    }
  }
  let family: Family = "abstract";
  let best = 0;
  for (const f of PRIORITY) {
    const s = scores.get(f) ?? 0;
    if (s > best) {
      best = s;
      family = f;
    }
  }
  // A single short word with no rule match is treated as a name/subject
  // to be set in type as an identity study rather than forced elsewhere.
  if (family === "abstract" && tokens.length === 1 && tokens[0]!.length <= 14) family = "brand";
  if (as) family = as;

  // ── Qualities ──
  const qualities: string[] = [];
  for (const t of tokens) {
    const q = QUALITY_WORDS[t];
    if (q && !qualities.includes(q)) {
      qualities.push(q);
      recognised.add(t);
    }
  }

  // ── Subject + name ──
  const allRuleWords = new Set(RULES.flatMap((r) => Object.keys(r.words)));
  const mediumWords = new Set(
    RULES.flatMap((r) => Object.entries(r.words).filter(([, w]) => w >= 4).map(([k]) => k))
  );
  const content = tokens.filter((t) => !STOP.has(t) && !QUALITY_WORDS[t] && !mediumWords.has(t));
  const subjectWord = content.find((t) => !allRuleWords.has(t)) ?? content[0] ?? tokens[0] ?? "untitled";
  // Proper noun from the visitor's own casing, e.g. "logo animation for Nova".
  const proper = (intent.match(/\b[A-Z][\p{L}\p{N}]{1,20}\b/gu) ?? []).find(
    (w, i) => i > 0 || !allRuleWords.has(w.toLowerCase())
  );
  const subject = titleCase(subjectWord);
  const name = proper ?? subject;

  // ── Palette ──
  let palette: Palette =
    PALETTES[qualities[0] ?? ""] ?? PALETTES[FALLBACK_PALETTES[seed % FALLBACK_PALETTES.length]!]!;

  // ── Variant / composition per family ──
  let variant = "study";
  let composition = "";
  switch (family) {
    case "spatial": {
      const planetKey = tokens.find((t) => PLANETS[t]);
      if (planetKey) {
        const p = PLANETS[planetKey]!;
        variant = tokens.includes("ring") || tokens.includes("rings") ? "ringed-planet" : p.variant;
        palette = { ground: "#040507", ink: p.tones[0]!, tones: p.tones };
        composition =
          variant === "ringed-planet" ? "sphere · ring system · single light" : variant === "banded-planet" ? "banded sphere · single light" : "sphere · single light";
      } else if (tokens.some((t) => ["crystal", "gem", "diamond"].includes(t))) {
        variant = "crystal";
        composition = "faceted solid · hard light";
      } else if (tokens.some((t) => ["mountain", "terrain", "island", "volcano"].includes(t))) {
        variant = "terrain";
        composition = "height field · low sun";
      } else if (tokens.some((t) => ["torus", "donut", "ring", "rings"].includes(t))) {
        variant = "torus";
        composition = "torus · soft light";
      } else {
        variant = "sculpture";
        composition = "parametric sculpture · soft light";
      }
      if (variant !== "ringed-planet" && variant !== "banded-planet" && variant !== "planet") {
        palette = { ...palette, ground: qualities.length ? palette.ground : "#060709" };
      }
      break;
    }
    case "brand":
      variant = qualities.includes("luxury") || qualities.includes("elegant") ? "serif-identity" : "grotesk-identity";
      composition = "mark · wordmark · palette · type";
      break;
    case "interface":
      variant = tokens.some((t) => ["dashboard", "analytics", "admin", "crm", "payroll", "tracker"].includes(t))
        ? "dashboard"
        : tokens.includes("app")
          ? "mobile-app"
          : "landing-page";
      composition =
        variant === "dashboard" ? "navigation · metrics · chart · records" : variant === "mobile-app" ? "device · header · cards · tab bar" : "hero · sections · call to action";
      break;
    case "motion":
      variant = "kinetic-type";
      composition = "type on a rotating cylinder · 4s loop";
      if (!qualities.length) palette = PALETTES.futuristic!;
      break;
    case "image": {
      const scenes = ["sunset", "sunrise", "dusk", "dawn", "ocean", "sea", "beach", "forest", "mountains", "city", "skyline", "night", "desert", "aurora", "lake"];
      // Re-read as an image without a scene word: celestial subjects become
      // night skies; anything else gets a seeded scene.
      const pool = ["sunset", "ocean", "forest", "mountains", "city", "night", "desert", "aurora"];
      const fallback = !as ? "sunset" : tokens.some((t) => PLANETS[t]) ? "night" : pool[seed % pool.length]!;
      const scene = tokens.find((t) => scenes.includes(t)) ?? fallback;
      const norm: Record<string, string> = { sunrise: "sunset", dusk: "sunset", dawn: "sunset", sea: "ocean", beach: "ocean", lake: "ocean", skyline: "city" };
      variant = norm[scene] ?? scene;
      composition = `${variant} · layered depth · atmospheric light`;
      break;
    }
    case "abstract":
      variant = "flow-field";
      composition = "flow field · palette from your words";
      break;
  }

  return {
    version: EXPERIENCE_SPEC_VERSION,
    family,
    intent,
    recognised: [...recognised],
    subject,
    name,
    qualities,
    variant,
    composition,
    palette,
    seed,
  };
}
