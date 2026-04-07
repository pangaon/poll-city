import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

/** GET /api/campaigns/[id]/customization */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "settings:read");
  if (permError) return permError;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id as string, campaignId: params.id } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  const permError = requirePermission(session!.user.role as string, "settings:write");
  if (permError) return permError;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id as string, campaignId: params.id } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
