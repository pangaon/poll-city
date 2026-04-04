import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * DELETE /api/social/consent/[id]
 *
 * Revokes a specific consent by setting revokedAt.
 * Does NOT delete the ConsentLog record — it is an immutable audit trail.
 * Does NOT delete the Contact record — campaign staff retain data they received
 * prior to revocation, but must not make new contact in the revoked scope.
 *
 * Security:
 * - Verifies session.user.id owns the ConsentLog — users cannot revoke each other's
 * - The id comes from params (URL) — must be a valid CUID
 * - No campaign data is exposed in response
 *
 * After revocation:
 * - ConsentLog.revokedAt is set to now()
 * - A new ActivityLog entry is written to the campaign's audit trail
 * - The unique constraint is NOT cleared — re-consenting will upsert the record
 *   (see POST /api/social/signal — upsert sets revokedAt = null on re-consent)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sessionUserId = session!.user.id;
  const consentId = params.id;

  // Fetch the consent record — verify ownership before touching it
  const consent = await prisma.consentLog.findUnique({
    where:  { id: consentId },
    select: { id: true, userId: true, campaignId: true, signalType: true, contactId: true, revokedAt: true },
  });

  if (!consent) {
    return NextResponse.json({ error: "Consent record not found" }, { status: 404 });
  }

  // Ownership check — only the consenting user can revoke their own consent
  if (consent.userId !== sessionUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Already revoked — idempotent success
  if (consent.revokedAt !== null) {
    return NextResponse.json({
      data: { revoked: false, reason: "already_revoked", revokedAt: consent.revokedAt },
    }, { status: 200 });
  }

  const now = new Date();

  // Revoke: set revokedAt — record is immutable otherwise
  await prisma.consentLog.update({
    where: { id: consentId },
    data:  { revokedAt: now },
  });

  // Write ActivityLog so the campaign sees the revocation
  // This is the only data that goes to the campaign on revocation —
  // the campaign learns the consent was revoked but gets no other information
  if (consent.campaignId && consent.contactId) {
    await prisma.activityLog.create({
      data: {
        campaignId: consent.campaignId,
        userId:     sessionUserId,
        action:     "consent_revoked",
        entityType: "contact",
        entityId:   consent.contactId,
        details: {
          signalType:    consent.signalType,
          consentLogId:  consentId,
          revokedAt:     now.toISOString(),
          note:          "User revoked consent via Poll City Social profile page.",
        },
      },
    });
  }

  return NextResponse.json({
    data: {
      revoked:    true,
      revokedAt:  now.toISOString(),
      consentId,
    },
  }, { status: 200 });
}
