import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const b = body as Record<string, unknown>;
  const activityLogId = typeof b.activityLogId === "string" ? b.activityLogId : null;
  const campaignId = typeof b.campaignId === "string" ? b.campaignId : null;

  if (!activityLogId || !campaignId) {
    return NextResponse.json({ error: "activityLogId and campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Only ADMIN+ can revert
  if (!["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Only campaign admins can revert changes" }, { status: 403 });
  }

  const log = await prisma.activityLog.findUnique({
    where: { id: activityLogId },
    select: { campaignId: true, entityType: true, entityId: true, action: true, details: true },
  });

  if (!log || log.campaignId !== campaignId) {
    return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
  }

  const details = log.details as Record<string, unknown> | null;
  const before = details?.before as Record<string, unknown> | undefined;

  if (!before) {
    return NextResponse.json({ error: "No previous version available for this entry" }, { status: 400 });
  }

  // Only support Contact reverts for now — extend as needed
  if (log.entityType === "Contact") {
    // Strip system fields that should not be reverted
    const { id: _id, campaignId: _c, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...revertData } = before as Record<string, unknown> & {
      id?: unknown;
      campaignId?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
      deletedAt?: unknown;
    };

    const reverted = await prisma.contact.update({
      where: { id: log.entityId },
      data: revertData as Parameters<typeof prisma.contact.update>[0]["data"],
    });

    await audit(prisma, "contact.reverted", {
      campaignId,
      userId: session!.user.id,
      entityId: log.entityId,
      entityType: "Contact",
      ip: req.headers.get("x-forwarded-for"),
      details: { revertedFromLogId: activityLogId, action: log.action },
    });

    return NextResponse.json({ data: reverted, message: "Contact reverted to previous version" });
  }

  return NextResponse.json({ error: `Revert not yet supported for ${log.entityType}` }, { status: 400 });
}
