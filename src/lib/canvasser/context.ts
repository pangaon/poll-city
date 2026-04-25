import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import type { Permission } from "@/lib/permissions/types";

export interface CanvasserContext {
  userId: string;
  role: Role;
  campaignId: string;
  membershipId: string;
}

export async function resolveCanvasserContext(
  req: NextRequest,
  campaignIdInput: string | null | undefined,
  requiredPermission: Permission,
): Promise<{ ctx?: CanvasserContext; error?: NextResponse }> {
  const { session, error } = await mobileApiAuth(req);
  if (error || !session?.user) {
    return { error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const campaignId = (campaignIdInput ?? session.user.activeCampaignId ?? "").trim();
  if (!campaignId) {
    return { error: NextResponse.json({ error: "campaignId required" }, { status: 400 }) };
  }

  const { forbidden } = await guardCampaignRoute(session.user.id, campaignId, requiredPermission);
  if (forbidden) return { error: forbidden };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { id: true },
  });
  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    ctx: {
      userId: session.user.id,
      role: session.user.role,
      campaignId,
      membershipId: membership.id,
    },
  };
}

export function isManagerRole(role: Role): boolean {
  return [Role.CAMPAIGN_MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.VOLUNTEER_LEADER].includes(role);
}
