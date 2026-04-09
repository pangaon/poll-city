import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateSupportSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { autoTagContact, autoCreateTask, logWebInteraction, updateEngagement } from "@/lib/automation/inbound-engine";

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

  const parsed = publicCandidateSupportSchema.safeParse(body);
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
    let contact = await prisma.contact.findFirst({
      where: {
        campaignId: campaign.id,
        deletedAt: null,
        email: parsed.data.email.trim(),
      },
    });

    if (contact) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          supportLevel: "strong_support",
          notes: `Household size: ${parsed.data.householdCount ?? "unknown"}`,
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          campaignId: campaign.id,
          firstName: parsed.data.name.split(" ")[0] || "",
          lastName: parsed.data.name.split(" ").slice(1).join(" ") || "",
          email: parsed.data.email.trim(),
          supportLevel: "strong_support",
          notes: `Household size: ${parsed.data.householdCount ?? "unknown"}`,
        },
      });
    }

    // Inbound automation — fire-and-forget, never blocks the response
    try {
      await prisma.contact.update({ where: { id: contact.id }, data: { source: contact.source || "website-support" } }).catch(() => {});
      await autoTagContact(campaign.id, contact.id, "website-supporter", "#16A34A");
      await logWebInteraction(campaign.id, contact.id, "note", "Signed up as supporter via campaign website");
      await updateEngagement(contact.id, "website-support");
      await autoCreateTask({ campaignId: campaign.id, contactId: contact.id, title: `Welcome new supporter: ${parsed.data.name}`, description: "New supporter signed up on campaign website. Send welcome message.", priority: "low" });
    } catch (automationError) {
      console.error("Support automation error (non-blocking):", automationError);
    }

    return NextResponse.json({ success: true, contactId: contact.id });
  } catch (error) {
    console.error("Support submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}