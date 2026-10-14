// ─────────────────────────────────────────────────────────────
// Studio marketing — form options + legal copy
// Legal strings remain PLACEHOLDER pending legal review.
// Experience/story copy lives in src/content/experience.ts
// ─────────────────────────────────────────────────────────────

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
