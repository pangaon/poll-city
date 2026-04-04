import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/** GET /api/campaigns/[id]/customization — public, no auth required */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
