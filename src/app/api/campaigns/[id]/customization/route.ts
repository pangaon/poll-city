import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

/** GET /api/campaigns/[id]/customization */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { forbidden } = await guardCampaignRoute(session!.user.id, params.id, "settings:read");
  if (forbidden) return forbidden;

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      customization: true,
      primaryColor: true,
      logoUrl: true,
      pageViews: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: campaign });
}

/** POST /api/campaigns/[id]/customization/view — increment page view */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, params.id, "settings:write");
  if (forbidden2) return forbidden2;

  try {
    await prisma.campaign.update({
      where: { id: params.id },
      data: { pageViews: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
