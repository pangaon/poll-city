/**
 * GET   /api/qr/prospects/[prospectId]?campaignId=xxx — prospect detail
 * PATCH /api/qr/prospects/[prospectId]               — update status / notes / assignment
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import type { QrProspectStatus } from "@prisma/client";

const VALID_STATUSES: QrProspectStatus[] = [
  "new", "contacted", "converted", "deferred", "disqualified", "archived",
];

const patchSchema = z.object({
  campaignId: z.string(),
  status: z.enum(VALID_STATUSES as [QrProspectStatus, ...QrProspectStatus[]]).optional(),
  notes: z.string().max(2000).optional(),
  followUpStatus: z.enum(["pending", "contacted", "done"]).optional(),
  // Unlock a teaser-mode prospect (requires subscription check — enforced here)
  unlock: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { prospectId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const prospect = await prisma.qrProspect.findFirst({
    where: { id: params.prospectId, campaignId },
    include: {
      qrCode: { select: { id: true, label: true, type: true, locationName: true, token: true } },
      signOpps: true,
      scans: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          intent: true,
          conversionStage: true,
          deviceClass: true,
          geoGranted: true,
          lat: true,
          lng: true,
          isRepeat: true,
          createdAt: true,
        },
      },
      followUps: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, status: true, sentAt: true, createdAt: true },
      },
    },
  });

  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(prospect);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { prospectId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
  }

  const { campaignId, status, notes, followUpStatus, unlock } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const existing = await prisma.qrProspect.findFirst({
    where: { id: params.prospectId, campaignId },
    select: { id: true, isLocked: true, unlockEligible: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unlock validation — only unlock if eligible
  if (unlock && !existing.unlockEligible) {
    return NextResponse.json(
      { error: "This prospect requires a subscription upgrade to unlock." },
      { status: 402 },
    );
  }

  const updated = await prisma.qrProspect.update({
    where: { id: params.prospectId },
    data: {
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(followUpStatus ? { followUpStatus } : {}),
      ...(unlock ? { isLocked: false } : {}),
    },
  });

  return NextResponse.json(updated);
}
