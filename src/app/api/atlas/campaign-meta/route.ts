import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session } = await apiAuth(req);
  if (!session) return NextResponse.json({ data: null });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ data: null });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { jurisdiction: true, primaryColor: true, candidateName: true },
  });

  return NextResponse.json({ data: campaign });
}
