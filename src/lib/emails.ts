// Waitlist emails. Every interpolated value is HTML-escaped. The
// auto-reply deliberately contains NO submitter-controlled text, so the
// form cannot be used to send attacker-written content from our domain.
import { escapeHtml, type WaitlistSubmission } from "./waitlist.ts";

export function waitlistNotificationHtml(data: WaitlistSubmission, submittedAt = new Date()): string {
  const rows: [string, string][] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Company", data.company || "—"],
    ["Role", data.role || "—"],
    ["Submitted", submittedAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })],
  ];

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #0b0b0c; margin-bottom: 16px;">New Studio Waitlist Request</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eceef2; color: #6b7280; font-size: 14px; width: 120px;">${escapeHtml(label)}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eceef2; color: #0b0b0c; font-size: 14px;">${escapeHtml(value)}</td>
          </tr>`
          )
          .join("")}
      </table>
    </div>
  `;
}

export const AUTO_REPLY_SUBJECT = "You're on the Faraday Studio early-access list";

export function waitlistAutoResponseHtml(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
      <div style="background: #000000; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 500; letter-spacing: 0.12em;">FARADAY STUDIO</h1>
      </div>
      <div style="padding: 32px 24px; border: 1px solid #eceef2; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #0b0b0c; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello,</p>
        <p style="color: #0b0b0c; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Thank you for requesting early access to Faraday Studio. You&rsquo;re on the list, and we&rsquo;ll be in touch as places open.
        </p>
        <p style="color: #0b0b0c; font-size: 16px; line-height: 1.6; margin: 20px 0 0;">
          If you didn&rsquo;t request this, you can ignore this email &mdash; nothing else will be sent.
        </p>
        <hr style="border: none; border-top: 1px solid #eceef2; margin: 28px 0 20px;" />
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
          Faraday Studio &mdash; a Faraday Capital Systems product
        </p>
      </div>
    </div>
  `;
}
