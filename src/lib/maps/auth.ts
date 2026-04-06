import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { hasPermission } from "@/lib/auth/helpers";

export async function ensureCampaignMapAccess(userId: string, campaignId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { id: true, role: true },
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const canViewMap = hasPermission(membership.role, "canvassing:viewMap") || hasPermission(membership.role, "canvassing:read");
  if (!canViewMap) {
    return { error: NextResponse.json({ error: "Missing map permission" }, { status: 403 }) };
  }

  return { membership };
}
