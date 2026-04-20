/**
 * POST /api/campaigns/switch/clear
 * SUPER_ADMIN only. Clears activeCampaignId — returns founder to /ops context.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;

  await prisma.user.update({
    where: { id: session!.user.id },
    data: { activeCampaignId: null },
  });

  return NextResponse.json({ data: { activeCampaignId: null } });
}
