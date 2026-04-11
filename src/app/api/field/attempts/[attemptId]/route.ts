import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/attempts/[attemptId] ─────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { attemptId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const attempt = await prisma.fieldAttempt.findFirst({
    where: { id: params.attemptId, campaignId, deletedAt: null },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, address1: true, supportLevel: true } },
      household: { select: { id: true, address1: true } },
      attemptedBy: { select: { id: true, name: true } },
      fieldTarget: { select: { id: true, targetType: true, status: true } },
      followUps: { select: { id: true, followUpType: true, status: true, dueDate: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  return NextResponse.json({ data: attempt });
}

// ── PATCH /api/field/attempts/[attemptId] — correct a logged outcome ─────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { attemptId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    outcomeNotes?: string;
    proofPhotoUrl?: string;
    isOfflineSynced?: boolean;
  } | null;

  const campaignId = body?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.fieldAttempt.findFirst({
    where: { id: params.attemptId, campaignId, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const updated = await prisma.fieldAttempt.update({
    where: { id: params.attemptId },
    data: {
      ...(body?.outcomeNotes !== undefined ? { outcomeNotes: body.outcomeNotes?.trim() ?? null } : {}),
      ...(body?.proofPhotoUrl !== undefined ? { proofPhotoUrl: body.proofPhotoUrl } : {}),
      ...(body?.isOfflineSynced !== undefined ? { isOfflineSynced: body.isOfflineSynced } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
