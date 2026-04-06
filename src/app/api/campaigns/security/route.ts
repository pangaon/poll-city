import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET — read campaign security policy
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "security:manage");
  if (permError) return permError;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { require2FA: true, allowedIpRanges: true, sessionTimeoutHours: true },
  });
  return NextResponse.json({ policy: campaign });
}

// PATCH — update campaign security policy (admin/manager only)
export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "security:manage");
  if (permError2) return permError2;

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
  const { campaignId } = body;
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  const allowed = membership && ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role);
  if (!allowed) return NextResponse.json({ error: "Admin only" }, { status: 403 });

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
