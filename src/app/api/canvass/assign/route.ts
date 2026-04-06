import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { assignCanvassSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:manage");
  if (permError) return permError;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = assignCanvassSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  // Verify the canvass list exists and get its campaign
  const list = await prisma.canvassList.findUnique({
    where: { id: parsed.data.canvassListId },
    select: { campaignId: true },
  });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // Verify the requesting user is a member of this campaign
  const requestingMembership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: list.campaignId } },
  });
  if (!requestingMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // SECURITY: Verify the target user is also a member of this same campaign
  // Prevents assigning users from other campaigns or arbitrary userIds
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: parsed.data.userId, campaignId: list.campaignId } },
  });
  if (!targetMembership) {
    return NextResponse.json({ error: "Target user is not a member of this campaign" }, { status: 403 });
  }

  const assignment = await prisma.canvassAssignment.create({
    data: {
      canvassListId: parsed.data.canvassListId,
      userId: parsed.data.userId,
      status: "not_started",
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: list.campaignId,
      userId: session!.user.id,
      action: "canvass_assigned",
      entityType: "canvass_assignment",
      entityId: assignment.id,
      details: { targetUserId: parsed.data.userId, listId: parsed.data.canvassListId },
    },
  });

  return NextResponse.json({ data: assignment }, { status: 201 });
}
