import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rateLimitResponse = rateLimit(_req);
  if (rateLimitResponse) return rateLimitResponse;

  const official = await prisma.official.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      title: true,
      district: true,
      level: true,
      party: true,
      bio: true,
      email: true,
      phone: true,
      website: true,
      photoUrl: true,
      subscriptionStatus: true,
      isActive: true,
      _count: { select: { follows: true, questions: true } },
      // Linked campaigns — public fields only. Used by disclosure UI.
      // campaignSlug is needed to route a consent bridge signal.
      campaigns: {
        where:  { isActive: true },
        select: { id: true, name: true, slug: true, candidateName: true, candidateTitle: true },
        take: 5, // safety cap — an official is unlikely to have more than a few campaigns
      },
    },
  });

  if (!official || !official.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: official });
}
