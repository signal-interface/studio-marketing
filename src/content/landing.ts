// ─────────────────────────────────────────────────────────────
// Studio marketing — landing page copy
// Every string is a PLACEHOLDER — replace in content port
// ─────────────────────────────────────────────────────────────

export const HERO = {
  badge: "Early Access", // PLACEHOLDER — replace in content port
  heading: "The creative intelligence\noperating system", // PLACEHOLDER — replace in content port
  subheading:
    "Studio gives creative teams a single surface to ideate, compose, and iterate — powered by Faraday's intelligence layer.", // PLACEHOLDER — replace in content port
  primaryCta: "Join the Waitlist", // PLACEHOLDER — replace in content port
  secondaryCta: "How It Works", // PLACEHOLDER — replace in content port
} as const;

export const HOW_IT_WORKS = {
  sectionLabel: "How It Works", // PLACEHOLDER — replace in content port
  heading: "From concept to canvas", // PLACEHOLDER — replace in content port
  steps: [
    {
      step: "Capture", // PLACEHOLDER — replace in content port
      desc: "Bring in references, briefs, and creative assets from any source into a unified workspace.", // PLACEHOLDER — replace in content port
    },
    {
      step: "Compose", // PLACEHOLDER — replace in content port
      desc: "Arrange and layer elements on an infinite canvas with intelligent layout assistance.", // PLACEHOLDER — replace in content port
    },
    {
      step: "Iterate", // PLACEHOLDER — replace in content port
      desc: "Generate variations, explore directions, and refine creative output with AI-assisted tooling.", // PLACEHOLDER — replace in content port
    },
    {
      step: "Deliver", // PLACEHOLDER — replace in content port
      desc: "Export production-ready assets with full provenance tracked through Faraday's governance layer.", // PLACEHOLDER — replace in content port
    },
  ],
} as const;

export const USE_CASES = {
  sectionLabel: "Use Cases", // PLACEHOLDER — replace in content port
  heading: "Built for creative teams", // PLACEHOLDER — replace in content port
  subheading:
    "Studio is designed for creative directors, designers, and brand teams who need a smarter canvas.", // PLACEHOLDER — replace in content port
  cases: [
    {
      title: "Brand Development", // PLACEHOLDER — replace in content port
      desc: "Build and evolve brand systems with intelligent tooling that understands your visual language and keeps assets consistent.", // PLACEHOLDER — replace in content port
    },
    {
      title: "Campaign Creation", // PLACEHOLDER — replace in content port
      desc: "Go from brief to deliverable on a single surface. Compose, iterate, and produce campaign assets without switching tools.", // PLACEHOLDER — replace in content port
    },
    {
      title: "Creative Operations", // PLACEHOLDER — replace in content port
      desc: "Give your creative team a shared operating surface with version history, asset provenance, and governance built in.", // PLACEHOLDER — replace in content port
    },
  ],
} as const;

export const WAITLIST = {
  sectionLabel: "Early Access", // PLACEHOLDER — replace in content port
  heading: "Join the Waitlist", // PLACEHOLDER — replace in content port
  description:
    "Studio is opening to select creative teams. Request early access and we'll reach out when your spot opens.", // PLACEHOLDER — replace in content port
  valueProps: [
    {
      title: "Creative intelligence", // PLACEHOLDER — replace in content port
      desc: "AI-assisted tooling that adapts to your creative process", // PLACEHOLDER — replace in content port
    },
    {
      title: "Governed by Faraday", // PLACEHOLDER — replace in content port
      desc: "Every asset tracked with full provenance", // PLACEHOLDER — replace in content port
    },
    {
      title: "By invitation only", // PLACEHOLDER — replace in content port
      desc: "Limited early-access slots available", // PLACEHOLDER — replace in content port
    },
  ],
  formTitle: "Join the Waitlist", // PLACEHOLDER — replace in content port
  submitLabel: "Join the Waitlist", // PLACEHOLDER — replace in content port
  successTitle: "You're on the list", // PLACEHOLDER — replace in content port
  successDescription:
    "We'll be in touch as we open up early access.", // PLACEHOLDER — replace in content port
  footnote:
    "We'll reach out when your spot opens.", // PLACEHOLDER — replace in content port
} as const;

export const ROLES = [
  { value: "creative-director", label: "Creative Director" }, // PLACEHOLDER — replace in content port
  { value: "founder-ceo", label: "Founder / CEO" }, // PLACEHOLDER — replace in content port
  { value: "head-of-design", label: "Head of Design" }, // PLACEHOLDER — replace in content port
  { value: "marketing-lead", label: "Marketing Lead" }, // PLACEHOLDER — replace in content port
  { value: "brand-manager", label: "Brand Manager" }, // PLACEHOLDER — replace in content port
  { value: "other", label: "Other" }, // PLACEHOLDER — replace in content port
] as const;

export const PRIVACY_COPY = {
  intro:
    "Studio is a product of Faraday Capital Systems. This site collects only the information you voluntarily submit through our waitlist form: your name, email address, company, and role.", // PLACEHOLDER — replace in content port
  usage:
    "We use this information solely to communicate with you about Studio early access. We do not sell or share your information with third parties.", // PLACEHOLDER — replace in content port
  emails:
    "Waitlist notification emails are sent via Resend. No analytics or tracking cookies are used on this site.", // PLACEHOLDER — replace in content port
} as const;

export const TERMS_COPY = {
  intro:
    "This website is operated by Faraday Capital Systems. By using this site, you agree to these terms.", // PLACEHOLDER — replace in content port
  waitlist:
    "The waitlist form collects information for the purpose of communicating about Studio early access. Submitting the form does not guarantee access to the product.", // PLACEHOLDER — replace in content port
  status:
    "Studio is in early access. Product features, availability, and pricing are subject to change without notice.", // PLACEHOLDER — replace in content port
  ip: "All content on this site is the property of Faraday Capital Systems. Unauthorized reproduction is prohibited.", // PLACEHOLDER — replace in content port
} as const;
