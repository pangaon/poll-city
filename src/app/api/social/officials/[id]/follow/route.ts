import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/social/officials/[id]/follow   — follow an official
 * DELETE /api/social/officials/[id]/follow — unfollow an official
 *
 * On follow: if the official has active campaigns, a soft consent bridge fires
 * automatically (signalType "general_support", consentScope "campaign_awareness").
 * This creates a minimal Contact record + ConsentLog in each linked campaign's CRM.
 * The bridge is idempotent — re-following a previously consented campaign is a no-op.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const officialId = params.id;

  const official = await prisma.official.findUnique({
    where: { id: officialId, isActive: true },
    select: {
      id: true,
      name: true,
      campaigns: {
        where: { isActive: true },
        select: { id: true, slug: true },
        take: 3,
      },
    },
  });
  if (!official) {
    return NextResponse.json({ error: "Official not found" }, { status: 404 });
  }

  await prisma.officialFollow.upsert({
    where: { userId_officialId: { userId, officialId } },
    create: { userId, officialId },
    update: {},
  });

  // ── Consent bridge ─────────────────────────────────────────────────────────
  // For each active campaign linked to this official, fire a soft lead signal.
  // Bridge is best-effort — failure does NOT fail the follow response.

  let bridgeFired = false;
  let campaignsLinked = 0;

  if (official.campaigns.length > 0) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { ward: true, riding: true, postalCode: true },
      });

      const externalBridgeId = `social_user_${userId}`;

      for (const campaign of official.campaigns) {
        // Idempotency: skip if an active ConsentLog already exists for this campaign
        const existing = await prisma.consentLog.findUnique({
          where: {
            unique_active_consent: {
              userId,
              campaignId: campaign.id,
              signalType: "general_support",
            },
          },
          select: { id: true, revokedAt: true },
        });
        if (existing && !existing.revokedAt) {
          // Already bridged — still count this campaign as linked
          campaignsLinked++;
          continue;
        }

        // Find or create Contact in campaign CRM (bridge-originated contacts only)
        let contactId: string;
        const existingContact = await prisma.contact.findFirst({
          where: { campaignId: campaign.id, deletedAt: null, externalId: externalBridgeId },
          select: { id: true },
        });

        if (existingContact) {
          await prisma.contact.update({
            where: { id: existingContact.id },
            data: { source: "social_consent_bridge", lastContactedAt: new Date() },
          });
          contactId = existingContact.id;
        } else {
          const created = await prisma.contact.create({
            data: {
              campaignId: campaign.id,
              firstName: "Social",
              lastName: "Follower",
              source: "social_consent_bridge",
              externalId: externalBridgeId,
              lastContactedAt: new Date(),
              ...(user?.postalCode ? { postalCode: user.postalCode } : {}),
              ...(user?.ward ? { ward: user.ward } : {}),
              ...(user?.riding ? { riding: user.riding } : {}),
            },
            select: { id: true },
          });
          contactId = created.id;
        }

        // SupportSignal — public aggregate record
        const signal = await prisma.supportSignal.create({
          data: {
            userId,
            officialId,
            campaignSlug: campaign.slug,
            type: "general_support",
            isPublic: true,
            ...(user?.postalCode ? { postalCode: user.postalCode } : {}),
            ...(user?.ward ? { ward: user.ward } : {}),
            ...(user?.riding ? { riding: user.riding } : {}),
          },
          select: { id: true },
        });

        // ActivityLog — written to campaign audit trail
        const activityLog = await prisma.activityLog.create({
          data: {
            campaignId: campaign.id,
            userId,
            action: "consent_bridge_transfer",
            entityType: "contact",
            entityId: contactId,
            details: {
              signalType: "general_support",
              consentScope: "campaign_awareness",
              fieldsTransferred: ["source"],
              signalId: signal.id,
              externalBridgeId,
              source: "social_follow",
            },
          },
          select: { id: true },
        });

        // ConsentLog — idempotent upsert (re-consent sets revokedAt = null)
        await prisma.consentLog.upsert({
          where: {
            unique_active_consent: {
              userId,
              campaignId: campaign.id,
              signalType: "general_support",
            },
          },
          create: {
            userId,
            campaignId: campaign.id,
            signalType: "general_support",
            consentScope: "campaign_awareness",
            fieldsXferred: ["source"],
            activityLogId: activityLog.id,
            contactId,
            revokedAt: null,
          },
          update: {
            revokedAt: null,
            consentScope: "campaign_awareness",
            fieldsXferred: ["source"],
            activityLogId: activityLog.id,
            contactId,
          },
        });

        bridgeFired = true;
        campaignsLinked++;
      }
    } catch {
      // Bridge failure is non-fatal — follow succeeds, bridge is silent
    }
  }

  return NextResponse.json({
    data: { following: true, officialId, bridgeFired, campaignsLinked },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const officialId = params.id;

  await prisma.officialFollow.deleteMany({
    where: { userId, officialId },
  });

  return NextResponse.json({ data: { following: false, officialId } });
}
