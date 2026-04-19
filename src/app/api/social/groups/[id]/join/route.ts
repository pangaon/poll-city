import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/social/groups/[id]/join   — join a group
 * DELETE /api/social/groups/[id]/join — leave a group
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
  const groupId = params.id;

  const group = await prisma.civicInterestGroup.findUnique({
    where: { id: groupId },
    select: { id: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.civicGroupMember.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId },
      update: {},
    }),
    prisma.civicInterestGroup.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ data: { joined: true, groupId } });
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
  const groupId = params.id;

  const existing = await prisma.civicGroupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.civicGroupMember.delete({
        where: { userId_groupId: { userId, groupId } },
      }),
      prisma.civicInterestGroup.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);
  }

  return NextResponse.json({ data: { joined: false, groupId } });
}
