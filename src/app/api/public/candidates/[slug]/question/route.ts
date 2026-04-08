import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateQuestionSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { findOrCreateContact, autoTagContact, autoCreateTask, logWebInteraction, classifyInbound, updateEngagement, notifyCampaignTeam } from "@/lib/automation/inbound-engine";

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

    return NextResponse.json({ success: true, questionId: questionRecord.id });
  } catch (error) {
    console.error("Question submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}