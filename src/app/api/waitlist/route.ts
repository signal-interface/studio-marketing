import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { ipLimiter, recipientLimiter } from "@/lib/rateLimiter";
import { LIMITS, notificationSubject, originAllowed, validateSubmission } from "@/lib/waitlist";
import { AUTO_REPLY_SUBJECT, waitlistAutoResponseHtml, waitlistNotificationHtml } from "@/lib/emails";

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  // Same-origin browser submissions only (cross-site pages are rejected).
  if (!originAllowed(request.headers.get("origin"), request.headers.get("host"))) {
    return json({ error: "forbidden" }, 403);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!ipLimiter.check(ip)) return json({ error: "rate_limited" }, 429);

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "unsupported_media_type" }, 415);
  }

  // Bounded body read (never parse unbounded input).
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > LIMITS.body) return json({ error: "payload_too_large" }, 413);
  const raw = await request.text();
  if (raw.length > LIMITS.body) return json({ error: "payload_too_large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const result = validateSubmission(body);
  if (!result.ok) return json({ error: result.error }, 400);
  // Honeypot hit: indistinguishable success, nothing sent.
  if (result.spam) return json({ success: true });
  const data = result.data;

  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.WAITLIST_NOTIFY_TO;
  const fromAddr = process.env.WAITLIST_FROM;
  if (!apiKey || !notifyTo || !fromAddr) {
    console.error("[waitlist] Missing env vars: RESEND_API_KEY, WAITLIST_NOTIFY_TO, or WAITLIST_FROM");
    // Don't leak infrastructure details to the client.
    return json({ success: true });
  }

  try {
    const resend = new Resend(apiKey);
    const sends = [
      resend.emails.send({
        from: fromAddr,
        to: notifyTo,
        subject: notificationSubject(data),
        html: waitlistNotificationHtml(data),
      }),
    ];
    // One auto-reply per address per day; contains no submitter text.
    if (recipientLimiter.check(data.email)) {
      sends.push(
        resend.emails.send({
          from: fromAddr,
          to: data.email,
          subject: AUTO_REPLY_SUBJECT,
          html: waitlistAutoResponseHtml(),
        })
      );
    }
    const results = await Promise.allSettled(sends);
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length) console.error("[waitlist] email errors:", failures.length);
  } catch {
    console.error("[waitlist] Resend error");
  }

  return json({ success: true });
}
