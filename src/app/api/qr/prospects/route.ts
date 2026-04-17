/**
 * GET /api/qr/prospects?campaignId=xxx — list QR prospects / opportunity center
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import type { QrProspectType, QrProspectStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const typeFilter = sp.get("type") as QrProspectType | null;
  const statusFilter = sp.get("status") as QrProspectStatus | null;
  const signOnly = sp.get("signOnly") === "true";
  const volunteerOnly = sp.get("volunteerOnly") === "true";
  const locked = sp.get("locked");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "25", 10));
  const skip = (page - 1) * limit;

  const where = {
    campaignId,
    ...(typeFilter ? { prospectType: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(signOnly ? { signRequested: true } : {}),
    ...(volunteerOnly ? { volunteerInterest: true } : {}),
    ...(locked === "true" ? { isLocked: true } : {}),
    ...(locked === "false" ? { isLocked: false } : {}),
  };

  const [total, prospects] = await Promise.all([
    prisma.qrProspect.count({ where }),
    prisma.qrProspect.findMany({
      where,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        qrCodeId: true,
        prospectType: true,
        status: true,
        intent: true,
        name: true,
        email: true,
        phone: true,
        signRequested: true,
        volunteerInterest: true,
        score: true,
        isLocked: true,
        unlockEligible: true,
        locationCluster: true,
        followUpStatus: true,
        createdAt: true,
        qrCode: { select: { label: true, type: true, locationName: true } },
        signOpps: {
          where: { status: "requested" },
          select: { id: true, approximateAddress: true, status: true },
        },
      },
    }),
  ]);

  // For locked prospects: mask identity fields
  const responseProspects = prospects.map((p) => ({
    ...p,
    name: p.isLocked ? null : p.name,
    email: p.isLocked ? null : p.email,
    phone: p.isLocked ? null : p.phone,
    qrLabel: p.qrCode?.label ?? null,
  }));

  // Teaser stats for locked prospects
  const lockedCount = await prisma.qrProspect.count({
    where: { campaignId, isLocked: true },
  });
  const lockedSignRequests = await prisma.qrProspect.count({
    where: { campaignId, isLocked: true, signRequested: true },
  });
  const lockedVolunteerLeads = await prisma.qrProspect.count({
    where: { campaignId, isLocked: true, volunteerInterest: true },
  });

  return NextResponse.json({
    prospects: responseProspects,
    total,
    page,
    limit,
    teaserStats: {
      lockedTotal: lockedCount,
      lockedSignRequests,
      lockedVolunteerLeads,
    },
  });
}
