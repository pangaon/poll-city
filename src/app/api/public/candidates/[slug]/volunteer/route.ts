import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateVolunteerSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { sendEmail } from "@/lib/email";

interface RouteParams {
  params: { slug: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = await rateLimit(request, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 16_000) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const captchaToken = typeof body === "object" && body !== null
    ? (body as { captchaToken?: string }).captchaToken
    : undefined;
  const captchaValid = await verifyTurnstileToken(request, captchaToken);
  if (!captchaValid) {
    return NextResponse.json(
      {
        error: isTurnstileEnabled()
          ? "Captcha verification failed"
          : "Captcha token missing",
      },
      { status: 400 }
    );
  }

  const parsed = publicCandidateVolunteerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      candidateName: true,
      candidateEmail: true,
      websiteUrl: true,
      primaryColor: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  try {
    let contact = await prisma.contact.findFirst({
      where: {
        campaignId: campaign.id,
        email: parsed.data.email.trim(),
      },
    });

    if (contact) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          phone: parsed.data.phone?.trim(),
          notes: parsed.data.message?.trim(),
          volunteerInterest: true,
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          campaignId: campaign.id,
          firstName: parsed.data.name.split(" ")[0] || "",
          lastName: parsed.data.name.split(" ").slice(1).join(" ") || "",
          email: parsed.data.email.trim(),
          phone: parsed.data.phone?.trim(),
          notes: parsed.data.message?.trim(),
          volunteerInterest: true,
        },
      });
    }

    // Send confirmation email to the volunteer (fire-and-forget — never fail the signup)
    const firstName = parsed.data.name.split(" ")[0] || "there";
    const campaignName = campaign.candidateName ?? campaign.name;
    const accentColor = campaign.primaryColor ?? "#0A2342";

    sendEmail({
      to: parsed.data.email.trim(),
      subject: `Thanks for volunteering with ${campaignName}!`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: ${accentColor}; padding: 24px 28px;">
      <p style="margin: 0; color: white; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em;">Volunteer Confirmation</p>
      <h1 style="margin: 6px 0 0; color: white; font-size: 22px;">${campaignName}</h1>
    </div>

    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Hi ${firstName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">
        Thank you for signing up to volunteer with <strong>${campaignName}</strong>!
        Your support makes a real difference in this campaign.
      </p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">
        A member of our team will be in touch soon with more information about how you can help.
        We appreciate you taking the time to get involved.
      </p>

      ${parsed.data.message ? `
      <div style="background: #f8fafc; border-left: 3px solid ${accentColor}; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 24px;">
        <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Your message</p>
        <p style="color: #374151; font-size: 14px; margin: 0;">${parsed.data.message}</p>
      </div>
      ` : ""}

      ${campaign.websiteUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${campaign.websiteUrl}" style="background: ${accentColor}; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
          Visit Our Campaign
        </a>
      </div>
      ` : ""}

      <p style="color: #374151; font-size: 15px; margin: 0;">
        With gratitude,<br><strong>${campaignName}</strong>
      </p>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding: 16px 28px;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        You're receiving this because you signed up to volunteer at ${campaign.websiteUrl ?? "our campaign website"}.
        Powered by <a href="https://poll.city" style="color: #94a3b8;">Poll City</a>.
      </p>
    </div>
  </div>
</body>
</html>`,
    }).catch((e) => console.error("[volunteer] Confirmation email failed:", e));

    return NextResponse.json({ success: true, contactId: contact.id });
  } catch (error) {
    console.error("Volunteer submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
