import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = () => process.env.RESEND_FROM_EMAIL ?? "Poll City <noreply@poll.city>";
const REPLY_TO = () => process.env.RESEND_REPLY_TO ?? "support@poll.city";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /** Display name override — combined with the platform sender domain (e.g. "John Smith for Ward 5 <noreply@poll.city>") */
  fromName?: string;
}

export async function sendEmail({ to, subject, html, replyTo, fromName }: SendEmailOptions) {
  const resend = getResend();

  // Compose from address: preserve verified sending domain, swap display name if provided
  const defaultFrom = FROM_EMAIL(); // e.g. "Poll City <noreply@poll.city>"
  let from = defaultFrom;
  if (fromName) {
    // Extract the email address from the default and wrap with the campaign name
    const match = defaultFrom.match(/<([^>]+)>/);
    const addr = match ? match[1] : defaultFrom;
    from = `${fromName} <${addr}>`;
  }

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    replyTo: replyTo ?? REPLY_TO(),
    subject,
    html,
  });

  if (error) {
    console.error("[email] Send failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
