import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { bulkAssignCanvassSchema } from "@/lib/validators";

/**
 * POST /api/canvass/assign
 *
 * Bulk-assigns one or more team members to a canvass list.
 * Body: { canvassListId, userIds: string[] }
 *
 * - Skips users already assigned (upsert behaviour via skipDuplicates)
 * - Security: every target user must be an active member of the same campaign
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bulkAssignCanvassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { canvassListId, userIds } = parsed.data;

  // Fetch the canvass list to get the campaign
  const list = await prisma.canvassList.findUnique({
    where: { id: canvassListId },
    select: { campaignId: true },
  });
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Verify the requesting user has access
  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    list.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  // SECURITY: Verify every target user is an active member of this campaign
  const memberships = await prisma.membership.findMany({
    where: {
      campaignId: list.campaignId,
      userId: { in: userIds },
      status: "active",
    },
    select: { userId: true },
  });

  const validUserIds = new Set(memberships.map((m) => m.userId));
  const invalidIds = userIds.filter((id) => !validUserIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "Some users are not active members of this campaign", invalidIds },
      { status: 403 },
    );
  }

  // Bulk upsert assignments — skip duplicates so re-assigning is idempotent
  await prisma.canvassAssignment.createMany({
    data: userIds.map((userId) => ({
      canvassListId,
      userId,
      status: "not_started" as const,
    })),
    skipDuplicates: true,
  });

  // Log the bulk assignment
  await prisma.activityLog.create({
    data: {
      campaignId: list.campaignId,
      userId: session!.user.id,
      action: "canvass_bulk_assigned",
      entityType: "canvass_list",
      entityId: canvassListId,
      details: { targetUserIds: userIds, count: userIds.length },
    },
  });

  return NextResponse.json({ data: { canvassListId, assigned: userIds.length } }, { status: 201 });
}
