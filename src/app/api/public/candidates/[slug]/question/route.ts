import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateQuestionSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { findOrCreateContact, autoTagContact, autoCreateTask, logWebInteraction, classifyInbound, updateEngagement, notifyCampaignTeam } from "@/lib/automation/inbound-engine";
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

  const parsed = publicCandidateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, candidateName: true, primaryColor: true, websiteUrl: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  try {
    const questionRecord = await prisma.question.create({
      data: {
        campaignId: campaign.id,
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim(),
        question: parsed.data.question.trim(),
      },
    });

    // Inbound automation — fire-and-forget, never blocks the response
    try {
      const contact = await findOrCreateContact({
        campaignId: campaign.id,
        email: parsed.data.email.trim(),
        firstName: parsed.data.name.split(" ")[0] || "",
        lastName: parsed.data.name.split(" ").slice(1).join(" ") || "",
        source: "website-question",
      });

      if (contact) {
        await autoTagContact(campaign.id, contact.id, "asked-question", "#8B5CF6");
        await logWebInteraction(campaign.id, contact.id, "note", `Question submitted: ${parsed.data.question.trim().slice(0, 200)}`);
        await updateEngagement(contact.id, "website-question");

        const sentiment = classifyInbound(parsed.data.question);
        if (sentiment === "media-inquiry") {
          await autoCreateTask({ campaignId: campaign.id, contactId: contact.id, title: `MEDIA INQUIRY from ${parsed.data.name}`, description: `Possible media inquiry: "${parsed.data.question.slice(0, 300)}"`, priority: "urgent" });
          await notifyCampaignTeam(campaign.id, "Media Inquiry Detected", `${parsed.data.name} may be a journalist. Review their question immediately.`, "high");
        } else if (sentiment === "negative") {
          await autoCreateTask({ campaignId: campaign.id, contactId: contact.id, title: `Review negative message from ${parsed.data.name}`, description: `Negative sentiment detected: "${parsed.data.question.slice(0, 300)}"`, priority: "high" });
        } else {
          await autoCreateTask({ campaignId: campaign.id, contactId: contact.id, title: `Reply to question from ${parsed.data.name}`, description: `"${parsed.data.question.slice(0, 300)}"`, priority: "medium" });
        }
      }
    } catch (automationError) {
      console.error("Question automation error (non-blocking):", automationError);
    }

    // Confirmation email — fire-and-forget
    const firstName = parsed.data.name.split(" ")[0] || "there";
    const campaignName = campaign.candidateName ?? campaign.name;
    const accentColor = campaign.primaryColor ?? "#0A2342";

    sendEmail({
      to: parsed.data.email.trim(),
      subject: `Your question was received — ${campaignName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: ${accentColor}; padding: 24px 28px;">
      <p style="margin: 0; color: white; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em;">Question Received</p>
      <h1 style="margin: 6px 0 0; color: white; font-size: 22px;">${campaignName}</h1>
    </div>
    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Hi ${firstName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">
        Thank you for reaching out to <strong>${campaignName}</strong>. We've received your question and a member of our team will get back to you soon.
      </p>
      <div style="background: #f8fafc; border-left: 3px solid ${accentColor}; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 24px;">
        <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Your question</p>
        <p style="color: #374151; font-size: 14px; margin: 0;">${parsed.data.question.trim()}</p>
      </div>
      ${campaign.websiteUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${campaign.websiteUrl}" style="background: ${accentColor}; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
          Visit Our Campaign
        </a>
      </div>
      ` : ""}
      <p style="color: #374151; font-size: 15px; margin: 0;">
        Thanks,<br><strong>${campaignName}</strong>
      </p>
    </div>
    <div style="border-top: 1px solid #e2e8f0; padding: 16px 28px;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        You're receiving this because you submitted a question on our campaign website.
        Powered by <a href="https://poll.city" style="color: #94a3b8;">Poll City</a>.
      </p>
    </div>
  </div>
</body>
</html>`,
    }).catch((e) => console.error("[question] Confirmation email failed:", e));

    return NextResponse.json({ success: true, questionId: questionRecord.id });
  } catch (error) {
    console.error("Question submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}