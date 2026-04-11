import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET — read campaign security policy
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "security:manage");
  if (forbidden) return forbidden;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId! },
    select: { require2FA: true, allowedIpRanges: true, sessionTimeoutHours: true },
  });
  return NextResponse.json({ policy: campaign });
}

// PATCH — update campaign security policy (admin/manager only)
export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: {
    campaignId?: string;
    require2FA?: boolean;
    allowedIpRanges?: string[];
    sessionTimeoutHours?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { campaignId: patchCampaignId } = body;
  const { resolved: resolved2, forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, patchCampaignId, "security:manage");
  if (forbidden2) return forbidden2;
  if (!["admin", "campaign-manager", "super-admin"].includes(resolved2.roleSlug)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const campaignId = patchCampaignId!;

  const patch: Record<string, unknown> = {};
  if (typeof body.require2FA === "boolean") patch.require2FA = body.require2FA;
  if (Array.isArray(body.allowedIpRanges)) {
    patch.allowedIpRanges = body.allowedIpRanges.filter(
      (r) => typeof r === "string" && /^[\d.]+\/\d{1,2}$/.test(r),
    );
  }
  if (typeof body.sessionTimeoutHours === "number") {
    const v = Math.max(1, Math.min(168, Math.floor(body.sessionTimeoutHours)));
    patch.sessionTimeoutHours = v;
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: patch,
    select: { require2FA: true, allowedIpRanges: true, sessionTimeoutHours: true },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "security_policy_updated",
      entityType: "Campaign",
      entityId: campaignId,
      details: patch as object,
    },
  });

  return NextResponse.json({ policy: updated });
}
