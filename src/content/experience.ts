// ─────────────────────────────────────────────────────────────
// Public experience copy.
//
// Truth boundary: early access only. No copy may claim Studio is
// live, generating, or reachable from this site. "Build this in
// Studio" is reserved until a real product handoff exists.
// ─────────────────────────────────────────────────────────────

export const CANVAS = {
  brand: "Faraday Studio",
  navCta: "Early access",
  heading: "What do you want to create?",
  sub: "Imagine. Type. Draw.",
  cta: "Get early access",
  footnote: "Faraday Studio is in early access.",
} as const;

export const CREATION = {
  formLabel: "Describe something to create",
  placeholder: "Try “Saturn”",
  stageLabel: "Creation demonstration",
  examples: [
    "Saturn",
    "Luxury robotics brand",
    "Payroll dashboard",
    "Logo animation for Nova",
    "Sunset over the ocean",
  ],
  panelTitle: "Interpretation preview",
  panelNote: "Deterministic · in your browser",
  truth: "Public demonstration, rendered live in your browser — not Studio output",
  again: "Create another",
  cta: "Get early access",
} as const;

// ── Slice 3: story, possibility, conversion ──
// Positioning is a statement of what Studio is being built to do.
// Nothing here claims an unfinished capability is live.

export const BRIDGE = {
  line: "One idea is only the beginning.",
  action: "See where it could go",
} as const;

export const POSSIBILITY = {
  eyebrow: "One intent · many forms",
  heading: "One idea. Every form it could take.",
  body: "The same words can become an identity, an image, a motion piece, an object, an interface — and, in time, film. Studio is being built to move between them with you.",
  showing: "Showing",
  tryOwn: "Try your own",
  note: "Each form is drawn live in your browser from your words — a demonstration of the idea, not Studio output.",
  plates: [
    { kind: "design", n: "01", title: "Design", line: "Identity, marks, type, palette" },
    { kind: "image", n: "02", title: "Image", line: "Scenes, posters, illustration" },
    { kind: "motion", n: "03", title: "Motion", line: "Kinetic type, loops, titles" },
    { kind: "spatial", n: "04", title: "Spatial", line: "Objects, worlds, form" },
    { kind: "interface", n: "05", title: "Interface", line: "Screens, products, flows" },
    { kind: "video", n: "06", title: "Video", line: "In development — not yet available" },
  ],
  yours: "Your creation",
} as const;

export const POSITIONING = {
  eyebrow: "What we're building",
  lead: "Start with an idea.",
  follow: "Studio finds the path from intent to creation.",
  points: [
    { title: "You bring the intent.", body: "Describe it. Sketch it. Point at something you love." },
    { title: "Studio carries the complexity.", body: "The tools, the steps, the machinery — kept behind the work, not in front of you." },
    { title: "You stay with the idea.", body: "Refine it, redirect it, and take it somewhere new." },
  ],
} as const;

export const ACCESS = {
  lead: "Imagine what you could create.",
  heading: "Create with Faraday Studio.",
  body: "Studio is opening to a small group of creators and teams first. Request early access and we'll reach out as places open.",
  submit: "Request early access",
  submitting: "Sending…",
  successTitle: "You're on the list.",
  successBody: "We'll be in touch as early access opens.",
  privacy: "We only use this to contact you about early access.",
  noscript: "Requesting early access needs JavaScript. Please enable it and reload this page.",
  errors: {
    rate: "Too many requests. Please try again later.",
    generic: "Something went wrong. Please try again.",
    network: "Network error. Please check your connection and try again.",
    name: "Please enter your name (no links).",
    email: "Please enter a valid email address.",
    company: "Please check the company name (no links).",
  },
} as const;

export const FOOTER = {
  brand: "Faraday Studio",
  line: "A Faraday Capital Systems product",
  status: "In early access",
} as const;

export const DRAW = {
  toggle: "Draw instead",
  hint: "Draw something — a planet, a horizon, a shape",
  surfaceLabel: "Drawing surface",
  help: "Draw with a mouse, finger or stylus. Drawing needs a pointer; you can also type instead.",
  clear: "Clear",
  type: "Type instead",
  create: "Create",
  readingRow: "Reading",
} as const;

export const EXPAND = {
  action: "See where it can go",
  heading: "One idea, every form it could take",
  continue: "Continue",
  back: "Back to your creation",
  note: "Drawn live in your browser from your idea — a demonstration, not Studio output.",
} as const;
