import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { publicCandidateSignRequestSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";

interface RouteParams {
  params: { slug: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = rateLimit(request, "form");
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

    return NextResponse.json({ success: true, signRequestId: signRequest.id });
  } catch (error) {
    console.error("Sign request submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}