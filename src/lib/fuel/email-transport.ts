/**
 * FuelOps email transport adapter.
 * Wraps src/lib/email.ts (Resend). Swap out the implementation here if the
 * outreach email provider ever changes — callers don't need to know.
 *
 * STUB: In dev/test, emails are logged but not actually sent to real vendors.
 */
import { sendEmail } from "@/lib/email";

export interface OutreachEmailOptions {
  to: string;
  vendorName: string;
  subject: string;
  html: string;
  campaignName: string;
}

export async function sendOutreachEmail(opts: OutreachEmailOptions): Promise<{ messageId: string | null }> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[FuelOps/email-transport] STUB — would send to ${opts.to}: "${opts.subject}"`);
    return { messageId: `stub-${Date.now()}` };
  }

  const result = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    fromName: opts.campaignName,
  });

  return { messageId: result?.id ?? null };
}
