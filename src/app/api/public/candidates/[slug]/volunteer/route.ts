import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateVolunteerSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";

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

    return NextResponse.json({ success: true, contactId: contact.id });
  } catch (error) {
    console.error("Volunteer submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}