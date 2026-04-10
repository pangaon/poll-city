import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError, NOT_FOUND } from "@/lib/api/errors";

interface Params {
  params: Promise<{ accountId: string }>;
}

// POST /api/campaign-calendar/sync/[accountId]/trigger
// Stub: creates a CalendarSyncLog entry and marks the account status.
// Production would call the provider's API and push/pull items.
export async function POST(req: NextRequest, { params }: Params) {
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

    if (account.syncStatus === "pending_auth") {
      return apiError("Cannot sync — account is pending OAuth authorisation", 400);
    }

    if (account.syncStatus === "disconnected") {
      return apiError("Cannot sync — account is disconnected", 400);
    }

    const syncStartedAt = new Date();

    // Stub: no real sync happens yet. Log the attempt.
    const log = await prisma.calendarSyncLog.create({
      data: {
        calendarSyncAccountId: accountId,
        syncStartedAt,
        syncCompletedAt: new Date(),
        itemsPushed: 0,
        itemsPulled: 0,
        itemsConflicted: 0,
        errorMessage: "Calendar sync engine not yet implemented — stub run only",
        success: false,
      },
    });

    await prisma.calendarSyncAccount.update({
      where: { id: accountId },
      data: {
        lastSyncAt: syncStartedAt,
        lastSyncError: "Sync engine not yet implemented",
        syncStatus: "paused",
      },
    });

    return NextResponse.json({
      data: log,
      note: "Sync triggered (stub). Engine not yet wired — no items pushed or pulled.",
    });
  } catch (err) {
    return internalError(err, "POST /api/campaign-calendar/sync/[accountId]/trigger");
  }
}
