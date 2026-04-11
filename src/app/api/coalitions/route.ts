import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "intelligence:read");
  if (forbidden) return forbidden;

  const coalitions = await prisma.coalition.findMany({ where: { campaignId: campaignId! }, orderBy: { endorsementDate: "desc" } });
  return NextResponse.json({ data: coalitions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; organizationName?: string; contactName?: string; contactEmail?: string;
    memberCount?: number; endorsementDate?: string; isPublic?: boolean; logoUrl?: string; memberList?: unknown;
  } | null;

  if (!body?.organizationName?.trim()) {
    return NextResponse.json({ error: "campaignId and organizationName required" }, { status: 400 });
  }

  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, body?.campaignId, "intelligence:write");
  if (forbidden2) return forbidden2;

  const created = await prisma.coalition.create({
    data: {
      campaignId: body.campaignId!,
      organizationName: body.organizationName.trim(),
      contactName: body.contactName?.trim() || null,
      contactEmail: body.contactEmail?.trim() || null,
      memberCount: body.memberCount ?? null,
      endorsementDate: body.endorsementDate ? new Date(body.endorsementDate) : null,
      isPublic: !!body.isPublic,
      logoUrl: body.logoUrl?.trim() || null,
      memberList: body.memberList === undefined ? undefined : (body.memberList ?? Prisma.JsonNull),
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId!,
      userId: session!.user.id,
      action: "coalition_created",
      entityType: "Coalition",
      entityId: created.id,
      details: { organizationName: body.organizationName, memberCount: body.memberCount, isPublic: body.isPublic },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
