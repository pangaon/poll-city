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
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL(),
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
