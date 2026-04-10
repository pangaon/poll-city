import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/crm/households/[id]
 * Rich household profile with contacts, computed stats.
 * Any campaign member can call this.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const household = await prisma.household.findUnique({
    where: { id: params.id },
    include: {
      contacts: {
        where: { deletedAt: null },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          supportLevel: true, funnelStage: true, householdRole: true,
          volunteerInterest: true, doNotContact: true, isDeceased: true,
          signRequested: true, signPlaced: true, lastContactedAt: true,
          followUpNeeded: true, gotvStatus: true,
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, type: true },
          },
          donations: {
            where: { deletedAt: null },
            select: { amount: true, createdAt: true, status: true },
          },
          volunteerProfile: {
            select: { id: true, isActive: true },
          },
          supportProfile: {
            select: {
              supportScore: true, turnoutLikelihood: true,
              flagHighValue: true, flagHighPriority: true, flagHostile: true,
            },
          },
        },
      },
    },
  });

  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: household.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Compute stats
  const supporterMix: Record<string, number> = {};
  let totalDonated = 0;
  let lastDonationDate: Date | null = null;
  let volunteerCount = 0;

  for (const c of household.contacts) {
    supporterMix[c.supportLevel] = (supporterMix[c.supportLevel] ?? 0) + 1;

    for (const d of c.donations) {
      if (d.status === "processed" || d.status === "receipted") {
        totalDonated += d.amount;
        if (!lastDonationDate || d.createdAt > lastDonationDate) {
          lastDonationDate = d.createdAt;
        }
      }
    }

    if (c.volunteerProfile?.isActive === true) {
      volunteerCount++;
    }
  }

  const signRequested = household.contacts.filter(c => c.signRequested).length;
  const signPlaced = household.contacts.filter(c => c.signPlaced).length;

  const enriched = {
    ...household,
    stats: {
      contactCount: household.contacts.length,
      supporterMix,
      donorStats: { totalDonated, lastDonationDate },
      volunteerCount,
      signStatus: { requested: signRequested, placed: signPlaced },
    },
  };

  return NextResponse.json({ data: enriched });
}

/**
 * PATCH /api/crm/households/[id]
 * Update household fields. CAMPAIGN_MANAGER+ only.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const household = await prisma.household.findUnique({
    where: { id: params.id },
    select: { id: true, campaignId: true },
  });
  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: household.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowed = ["address1", "address2", "city", "province", "postalCode", "ward", "riding", "lat", "lng", "totalVoters", "visited", "visitedAt"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }
  if (body.visited === true && !data.visitedAt) data.visitedAt = new Date();
  if (body.visited === false) data.visitedAt = null;

  const updated = await prisma.household.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ data: updated });
}
