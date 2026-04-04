import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null) as {
    volunteerProfileIds?: string[];
    remove?: boolean;
  } | null;

  if (!body?.volunteerProfileIds?.length) {
    return NextResponse.json({ error: "volunteerProfileIds is required" }, { status: 400 });
  }

  const group = await prisma.volunteerGroup.findUnique({ where: { id: params.id }, select: { id: true, campaignId: true } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: group.campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.remove) {
    await prisma.volunteerGroupMember.deleteMany({
      where: { groupId: group.id, volunteerProfileId: { in: body.volunteerProfileIds } },
    });
  } else {
    await prisma.volunteerGroupMember.createMany({
      data: body.volunteerProfileIds.map((volunteerProfileId) => ({ groupId: group.id, volunteerProfileId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ data: { success: true } });
}
