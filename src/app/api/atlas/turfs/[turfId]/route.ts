import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { turfId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  const turf = await prisma.turf.findUnique({
    where: { id: params.turfId },
    select: { campaignId: true },
  });

  if (!turf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (turf.campaignId !== campaignId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.turf.delete({ where: { id: params.turfId } });
  return NextResponse.json({ success: true });
}
