import type { FuelOutreachSequenceStep } from "@prisma/client";

interface SequenceTemplate {
  subject: string;
  html: (params: { vendorName: string; campaignName: string; contactName?: string | null }) => string;
}

const SEQUENCES: Record<FuelOutreachSequenceStep, SequenceTemplate> = {
  initial: {
    subject: "Catering Partnership Inquiry — {{campaignName}}",
    html: ({ vendorName, campaignName, contactName }) => `
<p>Hi ${contactName ?? vendorName},</p>
<p>My name is [Campaign Manager] and I'm reaching out on behalf of <strong>${campaignName}</strong>.</p>
<p>We're looking for reliable catering partners to support our campaign activities throughout the upcoming election cycle — including volunteer meals, phone banks, canvassing crews, and campaign events.</p>
<p>We'd love to learn more about your services and pricing. Are you available for a brief call this week?</p>
<p>Please reply to this email or call us at [PHONE]. Looking forward to connecting.</p>
<p>Best regards,<br/>${campaignName}</p>
    `.trim(),
  },

  follow_up_1: {
    subject: "Following up — Catering Partnership / {{campaignName}}",
    html: ({ vendorName, campaignName, contactName }) => `
<p>Hi ${contactName ?? vendorName},</p>
<p>I wanted to follow up on my previous message regarding catering for <strong>${campaignName}</strong>.</p>
<p>We have several upcoming events and would love to work with a local partner like yourselves. Even if your availability is limited, we'd appreciate knowing your general pricing and lead time requirements.</p>
<p>Happy to accommodate your preferred format — email, phone, or a quick form. Whatever works best for you.</p>
<p>Thanks for your time,<br/>${campaignName}</p>
    `.trim(),
  },

  follow_up_2: {
    subject: "Last check-in — {{campaignName}} Catering",
    html: ({ vendorName, campaignName, contactName }) => `
<p>Hi ${contactName ?? vendorName},</p>
<p>This is our final check-in regarding catering services for <strong>${campaignName}</strong>. We understand you may be very busy — no pressure at all.</p>
<p>If you're interested in being part of our vendor network for future campaigns, please reply at your convenience and we'll keep your information on file.</p>
<p>Thank you for your time,<br/>${campaignName}</p>
    `.trim(),
  },
};

export function buildOutreachEmail(
  step: FuelOutreachSequenceStep,
  params: { vendorName: string; campaignName: string; contactName?: string | null }
): { subject: string; html: string } {
  const template = SEQUENCES[step];
  return {
    subject: template.subject.replace("{{campaignName}}", params.campaignName),
    html: template.html(params),
  };
}
