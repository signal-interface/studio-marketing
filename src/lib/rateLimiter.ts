// In-memory rate limiter for the waitlist endpoint.
// Limits submissions per IP to prevent abuse.
// Suitable for single-instance Vercel deployments (serverless resets are acceptable).
// NOTE: This is per-process / in-memory — on serverless each cold start resets
// the map. Upgrade to a shared store (Upstash / Redis) if real traffic arrives.

const submissions = new Map<string, { count: number; windowStart: number }>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

export function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const entry = submissions.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    submissions.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { allowed: false };
  }

  entry.count += 1;
  return { allowed: true };
}
