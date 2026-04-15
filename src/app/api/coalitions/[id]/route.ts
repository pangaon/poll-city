import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const coalition = await prisma.coalition.findUnique({ where: { id: params.id } });
  if (!coalition) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, coalition.campaignId, "intelligence:write");
  if (forbidden) return forbidden;

  await prisma.coalition.delete({ where: { id: params.id } });

  await prisma.activityLog.create({
    data: {
      campaignId: coalition.campaignId,
      userId: session!.user.id,
      action: "coalition_deleted",
      entityType: "Coalition",
      entityId: params.id,
      details: { organizationName: coalition.organizationName },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const coalition = await prisma.coalition.findUnique({ where: { id: params.id } });
  if (!coalition) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, coalition.campaignId, "intelligence:write");
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => ({})) as {
    organizationName?: string; contactName?: string; contactEmail?: string;
    memberCount?: number; endorsementDate?: string; isPublic?: boolean; logoUrl?: string;
  };

  const updated = await prisma.coalition.update({
    where: { id: params.id },
    data: {
      ...(body.organizationName !== undefined && { organizationName: body.organizationName }),
      ...(body.contactName !== undefined && { contactName: body.contactName || null }),
      ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail || null }),
      ...(body.memberCount !== undefined && { memberCount: body.memberCount }),
      ...(body.endorsementDate !== undefined && { endorsementDate: body.endorsementDate ? new Date(body.endorsementDate) : null }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
    },
  });

  return NextResponse.json({ data: updated });
}
