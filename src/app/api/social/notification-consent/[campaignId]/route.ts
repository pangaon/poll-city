import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * DELETE /api/social/notification-consent/[campaignId]
 *
 * Revokes a voter's push notification opt-in for a campaign.
 * - Sets ConsentLog.revokedAt to preserve audit trail
 * - Deletes PushSubscription so they stop receiving notifications
 *   (if they are also a campaign staff member the subscription is kept)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId } = params;
  const userId = session!.user.id;

  const consent = await prisma.consentLog.findUnique({
    where: {
      unique_active_consent: {
        userId,
        campaignId,
        signalType: "notification_opt_in",
      },
    },
  });

  if (!consent) {
    return NextResponse.json({ error: "No active opt-in found" }, { status: 404 });
  }

  if (consent.revokedAt !== null) {
    return NextResponse.json({ data: { revoked: false, reason: "already_revoked" } });
  }

  await prisma.consentLog.update({
    where: { id: consent.id },
    data: { revokedAt: new Date() },
  });

  // Only remove the push subscription if the user is not a campaign staff member —
  // staff members subscribe via the notifications panel and we must not remove that.
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });

  if (!membership) {
    await prisma.pushSubscription.deleteMany({
      where: { userId, campaignId },
    });
  }

  return NextResponse.json({ data: { revoked: true } });
}
