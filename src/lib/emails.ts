interface WaitlistData {
  name: string;
  email: string;
  company?: string;
  role?: string;
}

export function waitlistNotificationHtml(data: WaitlistData): string {
  const rows: [string, string][] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Company", data.company || "\u2014"],
    ["Role", data.role || "\u2014"],
    [
      "Submitted",
      new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
    ],
  ];

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #1a1625; margin-bottom: 16px;">New Studio Waitlist Request</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eceef2; color: #6b7280; font-size: 14px; width: 120px;">${label}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eceef2; color: #1c1c2e; font-size: 14px;">${value}</td>
          </tr>`
          )
          .join("")}
      </table>
    </div>
  `;
}

export function waitlistAutoResponseHtml(data: WaitlistData): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
      <div style="background: #1a1625; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 600;">Studio</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">Creative Intelligence</p>
      </div>
      <div style="padding: 32px 24px; border: 1px solid #eceef2; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #1c1c2e; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hi ${data.name},
        </p>
        <p style="color: #1c1c2e; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Thank you for requesting early access to Studio. We&rsquo;ve added you to the waitlist and will be in touch as we open up access.
        </p>
        <p style="color: #1c1c2e; font-size: 16px; line-height: 1.6; margin: 20px 0 0;">
          In the meantime, if you have questions, reply directly to this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eceef2; margin: 28px 0 20px;" />
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
          Studio &mdash; Creative Intelligence<br/>
          A Faraday Capital Systems product
        </p>
      </div>
    </div>
  `;
}
