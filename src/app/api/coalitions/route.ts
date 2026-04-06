import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "intelligence:read");
  if (permError) return permError;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coalitions = await prisma.coalition.findMany({ where: { campaignId }, orderBy: { endorsementDate: "desc" } });
  return NextResponse.json({ data: coalitions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "intelligence:write");
  if (permError2) return permError2;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; organizationName?: string; contactName?: string; contactEmail?: string;
    memberCount?: number; endorsementDate?: string; isPublic?: boolean; logoUrl?: string; memberList?: unknown;
  } | null;

  if (!body?.campaignId || !body.organizationName?.trim()) {
    return NextResponse.json({ error: "campaignId and organizationName required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.coalition.create({
    data: {
      campaignId: body.campaignId,
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

  return NextResponse.json({ data: created }, { status: 201 });
}
