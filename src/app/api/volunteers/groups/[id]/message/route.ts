import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as { title?: string; message?: string } | null;
  if (!body?.title?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "title and message are required" }, { status: 400 });
  }

  const group = await prisma.volunteerGroup.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          volunteerProfile: { include: { user: { select: { id: true } } } },
        },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: group.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const recipients = group.members
    .map((m) => m.volunteerProfile.user?.id)
    .filter((id): id is string => !!id);

  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        title: body.title!.trim(),
        body: body.message!.trim(),
        type: "group_message",
        entityType: "volunteer_group",
        entityId: group.id,
      })),
    });
  }

  return NextResponse.json({ data: { notified: recipients.length } });
}
