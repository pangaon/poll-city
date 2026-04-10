import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError, NOT_FOUND } from "@/lib/api/errors";

interface Params {
  params: Promise<{ accountId: string }>;
}

// GET /api/campaign-calendar/sync/[accountId]
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const userId = session!.user.id as string;
  const { accountId } = await params;

  try {
    const account = await prisma.calendarSyncAccount.findFirst({
      where: { id: accountId, campaignId, userId },
      include: {
        syncLogs: {
          orderBy: { syncStartedAt: "desc" },
          take: 10,
        },
      },
    });

    if (!account) return NOT_FOUND;
    return NextResponse.json({ data: account });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/sync/[accountId]");
  }
}

// DELETE /api/campaign-calendar/sync/[accountId] — disconnect / revoke
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const userId = session!.user.id as string;
  const { accountId } = await params;

  try {
    const account = await prisma.calendarSyncAccount.findFirst({
      where: { id: accountId, campaignId, userId },
    });
    if (!account) return NOT_FOUND;

    // Mark disconnected first (would also revoke OAuth token in production)
    await prisma.calendarSyncAccount.update({
      where: { id: accountId },
      data: {
        syncStatus: "disconnected",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        syncToken: null,
      },
    });

    await prisma.calendarSyncAccount.delete({ where: { id: accountId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(err, "DELETE /api/campaign-calendar/sync/[accountId]");
  }
}
