import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError } from "@/lib/api/errors";
import { ConflictSeverity } from "@prisma/client";

// GET /api/campaign-calendar/conflicts?severity=&status=
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity") as ConflictSeverity | null;
  const status = searchParams.get("status") ?? "open";

  try {
    const conflicts = await prisma.scheduleConflict.findMany({
      where: {
        campaignId,
        ...(severity ? { severity } : {}),
        status,
      },
      include: {
        sourceItem: {
          select: { id: true, title: true, startAt: true, endAt: true, itemType: true },
        },
        conflictingItem: {
          select: { id: true, title: true, startAt: true, endAt: true, itemType: true },
        },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: [
        { severity: "desc" },
        { detectedAt: "desc" },
      ],
      take: 100,
    });

    return NextResponse.json({ data: conflicts, meta: { total: conflicts.length, status } });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/conflicts");
  }
}
