import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateSignRequestSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { findOrCreateContact, autoTagContact, autoCreateTask, logWebInteraction, updateEngagement } from "@/lib/automation/inbound-engine";

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

  const parsed = publicCandidateSignRequestSchema.safeParse(body);
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
    const signRequest = await prisma.signRequest.create({
      data: {
        campaignId: campaign.id,
        address: parsed.data.address.trim(),
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim(),
      },
    });

    // Inbound automation — fire-and-forget, never blocks the response
    try {
      const contact = await findOrCreateContact({
        campaignId: campaign.id,
        email: parsed.data.email.trim(),
        firstName: parsed.data.name.split(" ")[0] || "",
        lastName: parsed.data.name.split(" ").slice(1).join(" ") || "",
        address: parsed.data.address.trim(),
        source: "website-sign-request",
      });

      if (contact) {
        await prisma.contact.update({ where: { id: contact.id }, data: { signRequested: true } });
        await autoTagContact(campaign.id, contact.id, "sign-requested", "#059669");
        await logWebInteraction(campaign.id, contact.id, "note", `Lawn sign requested at ${parsed.data.address}`);
        await updateEngagement(contact.id, "website-sign-request");
        await autoCreateTask({ campaignId: campaign.id, contactId: contact.id, title: `Deploy lawn sign for ${parsed.data.name}`, description: `Address: ${parsed.data.address}`, priority: "medium" });
      }
    } catch (automationError) {
      console.error("Sign request automation error (non-blocking):", automationError);
    }

    return NextResponse.json({ success: true, signRequestId: signRequest.id });
  } catch (error) {
    console.error("Sign request submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}