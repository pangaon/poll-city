/**
 * POST /api/newsletters/subscribe — Public newsletter signup.
 * Works for both campaign and official newsletters.
 * CASL-compliant: requires explicit consent.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { newsletterSubscribeSchema } from "@/lib/validators/newsletter";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json();
  const parsed = newsletterSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { email, firstName, lastName, postalCode, campaignId, officialId } = parsed.data;

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  try {
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: email.trim().toLowerCase(),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        postalCode: postalCode?.trim() || null,
        campaignId: campaignId || null,
        officialId: officialId || null,
        source: "web",
        consentGiven: true,
        consentIp: ip,
      },
    });

    return NextResponse.json({ ok: true, id: subscriber.id });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ ok: true, message: "Already subscribed" });
    }
    console.error("[Newsletter Subscribe]", e);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
