import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rateLimiter";
import {
  waitlistNotificationHtml,
  waitlistAutoResponseHtml,
} from "@/lib/emails";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { name, email, company, role } = body as {
    name?: unknown;
    email?: unknown;
    company?: unknown;
    role?: unknown;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const companyStr =
    typeof company === "string" && company.length > 0
      ? company.slice(0, 200)
      : undefined;
  const roleStr =
    typeof role === "string" && role.length > 0
      ? role.slice(0, 100)
      : undefined;

  const data = {
    name: name.trim().slice(0, 200),
    email: email.trim().toLowerCase(),
    company: companyStr,
    role: roleStr,
  };

  // Send emails via Resend
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.WAITLIST_NOTIFY_TO;
  const fromAddr = process.env.WAITLIST_FROM;

  if (!apiKey || !notifyTo || !fromAddr) {
    console.error(
      "[waitlist] Missing env vars: RESEND_API_KEY, WAITLIST_NOTIFY_TO, or WAITLIST_FROM"
    );
    // Still return success to the user — we log the failure server-side
    // but don't leak infra details to the client.
    return NextResponse.json({ success: true });
  }

  try {
    const resend = new Resend(apiKey);
    const emailResults = await Promise.allSettled([
      // Internal notification
      resend.emails.send({
        from: fromAddr,
        to: notifyTo,
        subject: `New Studio Waitlist: ${data.company || data.name}`,
        html: waitlistNotificationHtml(data),
      }),
      // Auto-response to submitter
      resend.emails.send({
        from: fromAddr,
        to: data.email,
        subject: "You're on the Studio waitlist",
        html: waitlistAutoResponseHtml(data),
      }),
    ]);

    const emailErrors = emailResults.filter((r) => r.status === "rejected");
    if (emailErrors.length > 0) {
      console.error(
        "[waitlist] email errors:",
        emailErrors.map((r) => (r as PromiseRejectedResult).reason)
      );
    }
  } catch (err) {
    console.error("[waitlist] Resend error:", err);
  }

  return NextResponse.json({ success: true });
}
