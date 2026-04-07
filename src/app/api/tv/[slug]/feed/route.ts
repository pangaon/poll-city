import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const revalidate = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { id: true, tvEnabled: true, tvToken: true },
  });
  if (!campaign || !campaign.tvEnabled || campaign.tvToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activities = await prisma.activityLog.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: activities });
}
