/**
 * POST /api/newsletters/subscribe — Public newsletter signup.
 * Works for both campaign and official newsletters.
 * CASL-compliant: requires explicit consent.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json();
  const { email, firstName, lastName, postalCode, campaignId, officialId, consent } = body;

  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!consent) return NextResponse.json({ error: "Consent is required (CASL compliance)" }, { status: 400 });
  if (!campaignId && !officialId) return NextResponse.json({ error: "campaignId or officialId required" }, { status: 400 });

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
