// In-memory fixed-window rate limiting for the waitlist endpoint.
// NOTE: per-process — on serverless each cold start resets the windows, so
// this is soft protection. Move to a shared store (e.g. Upstash Redis) if
// real abuse traffic appears.

export interface Limiter {
  check(key: string, now?: number): boolean;
}

/** Bounded fixed-window limiter: memory is capped even under a key flood. */
export function createLimiter(max: number, windowMs: number, maxKeys = 10_000): Limiter {
  const hits = new Map<string, { count: number; start: number }>();
  return {
    check(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || now - entry.start > windowMs) {
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
          // Still full of live windows: drop the oldest insertion.
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value!);
        }
        hits.set(key, { count: 1, start: now });
        return true;
      }
      if (entry.count >= max) return false;
      entry.count += 1;
      return true;
    },
  };
}

/** Submissions per client IP. */
export const ipLimiter = createLimiter(5, 60 * 60 * 1000);
/** Auto-replies per recipient address — stops the form being used to mail-bomb someone. */
export const recipientLimiter = createLimiter(1, 24 * 60 * 60 * 1000);
