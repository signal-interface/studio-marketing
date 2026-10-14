// ─────────────────────────────────────────────────────────────
// Waitlist input handling — pure, framework-free, fully tested.
//
// Threat model for a public, unauthenticated form that triggers email:
//  • HTML injection into the internal notification and the auto-reply
//    → every interpolated value is HTML-escaped.
//  • Header / subject injection (CR/LF) → single-line normalisation.
//  • Auto-reply abuse: an attacker types a victim's address and puts a
//    phishing message in "name"/"company" so OUR verified domain mails it
//    → the auto-reply contains NO submitter-controlled text at all, and
//    is limited per recipient address.
//  • Floods → per-IP and per-recipient limits (see rateLimiter.ts),
//    body-size cap, strict content type, same-origin check, honeypot.
// ─────────────────────────────────────────────────────────────

import { ROLES } from "../content/landing.ts";

export const LIMITS = {
  body: 4096,
  name: 100,
  company: 120,
  email: 254,
} as const;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]!);
}

// Control and invisible format characters: C0/C1 controls, zero-width,
// bidi overrides, line/paragraph separators, word joiners, BOM.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u202a-\\u202e\\u2028\\u2029\\u2060-\\u2064\\ufeff]", "g");

/** Remove control/format characters (incl. CR/LF, bidi overrides) and collapse whitespace. */
export function singleLine(value: string): string {
  return value
    .normalize("NFC")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pragmatic address check: one @, no whitespace/controls/brackets/quotes,
// a dotted domain with a 2+ letter TLD. Deliberately rejects exotic-but-valid
// forms (quoted local parts, IP literals) that legitimate signups don't use.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&*+/=?^_{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
// Names/companies are display text: links and markup have no place in them.
const LINKISH = /(https?:|www\.|:\/\/|<|>|\[url|\bhref\b)/i;

const ROLE_VALUES = new Set<string>(ROLES.map((r) => r.value));

export interface WaitlistSubmission {
  name: string;
  email: string;
  company?: string;
  role?: string;
}

export type ValidationResult =
  | { ok: true; data: WaitlistSubmission; spam: boolean }
  | { ok: false; error: "invalid_body" | "name_required" | "invalid_name" | "invalid_email" | "invalid_company" | "invalid_role" };

export function validateSubmission(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  // Honeypot: real visitors never fill it. Accept silently, send nothing.
  const spam = typeof b.website === "string" && b.website.trim().length > 0;

  if (typeof b.name !== "string") return { ok: false, error: "name_required" };
  const name = singleLine(b.name);
  if (!name) return { ok: false, error: "name_required" };
  if (name.length > LIMITS.name || LINKISH.test(name)) return { ok: false, error: "invalid_name" };

  if (typeof b.email !== "string") return { ok: false, error: "invalid_email" };
  const email = b.email.trim().toLowerCase();
  if (email.length > LIMITS.email || /[\s\u0000-\u001f\u007f]/.test(b.email.trim()) || !EMAIL_RE.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  let company: string | undefined;
  if (b.company !== undefined && b.company !== null && b.company !== "") {
    if (typeof b.company !== "string") return { ok: false, error: "invalid_company" };
    company = singleLine(b.company);
    if (company.length > LIMITS.company || LINKISH.test(company)) return { ok: false, error: "invalid_company" };
    if (!company) company = undefined;
  }

  let role: string | undefined;
  if (b.role !== undefined && b.role !== null && b.role !== "") {
    if (typeof b.role !== "string" || !ROLE_VALUES.has(b.role)) return { ok: false, error: "invalid_role" };
    role = b.role;
  }

  return { ok: true, data: { name, email, company, role }, spam };
}

/** Subject lines are single-line, length-capped, and never carry raw input structure. */
export function notificationSubject(d: WaitlistSubmission): string {
  return `New Studio Waitlist: ${singleLine(d.company || d.name).slice(0, 80)}`;
}

/**
 * Same-origin check for browser submissions. A cross-site page cannot make
 * a visitor's browser submit on its behalf; non-browser clients that send no
 * Origin are still bounded by the rate limits.
 */
export function originAllowed(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
