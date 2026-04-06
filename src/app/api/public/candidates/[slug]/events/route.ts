import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const campaign = await prisma.campaign.findUnique({ where: { slug: params.slug }, select: { id: true, isPublic: true } });
  if (!campaign || !campaign.isPublic) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const events = await prisma.event.findMany({
    where: {
      campaignId: campaign.id,
      isPublic: true,
      status: { in: ["scheduled", "live"] },
      eventDate: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      name: true,
      eventDate: true,
      location: true,
      city: true,
      province: true,
      isVirtual: true,
      virtualUrl: true,
      description: true,
      capacity: true,
      _count: { select: { rsvps: true } },
    },
    orderBy: { eventDate: "asc" },
    take: 50,
  });

  return NextResponse.json({ data: events });
}
