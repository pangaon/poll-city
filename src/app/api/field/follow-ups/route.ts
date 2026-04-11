import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FollowUpActionType, FollowUpActionStatus, FieldTargetPriority } from "@prisma/client";

// ── GET /api/field/follow-ups?campaignId=X ──────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const statusFilter = req.nextUrl.searchParams.get("status") as FollowUpActionStatus | null;
  const typeFilter = req.nextUrl.searchParams.get("type") as FollowUpActionType | null;
  const assignedToId = req.nextUrl.searchParams.get("assignedToId");

  const validStatuses: FollowUpActionStatus[] = ["pending", "assigned", "in_progress", "completed", "dismissed"];
  const validTypes: FollowUpActionType[] = [
    "revisit", "sign_ops", "donor_referral", "volunteer_referral", "crm_cleanup",
    "bad_data", "lit_missed", "building_retry", "gotv_target", "press_opportunity", "other",
  ];

  const followUps = await prisma.followUpAction.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {}),
      ...(typeFilter && validTypes.includes(typeFilter) ? { followUpType: typeFilter } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, address1: true } },
      fieldAttempt: { select: { id: true, outcome: true, attemptedAt: true } },
      assignedTo: { select: { id: true, name: true } },
      fieldTarget: { select: { id: true, targetType: true } },
    },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    take: 200,
  });

  return NextResponse.json({ data: followUps });
}

// ── POST /api/field/follow-ups ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    fieldAttemptId?: string;
    contactId?: string;
    householdId?: string;
    fieldTargetId?: string;
    followUpType?: FollowUpActionType;
    priority?: FieldTargetPriority;
    dueDate?: string;
    assignedToId?: string;
    notes?: string;
  } | null;

  if (!body?.campaignId || !body?.followUpType) {
    return NextResponse.json({ error: "campaignId and followUpType are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const validTypes: FollowUpActionType[] = [
    "revisit", "sign_ops", "donor_referral", "volunteer_referral", "crm_cleanup",
    "bad_data", "lit_missed", "building_retry", "gotv_target", "press_opportunity", "other",
  ];

  if (!validTypes.includes(body.followUpType)) {
    return NextResponse.json({ error: "Invalid followUpType" }, { status: 400 });
  }

  const followUp = await prisma.followUpAction.create({
    data: {
      campaignId: body.campaignId,
      fieldAttemptId: body.fieldAttemptId ?? null,
      contactId: body.contactId ?? null,
      householdId: body.householdId ?? null,
      fieldTargetId: body.fieldTargetId ?? null,
      followUpType: body.followUpType,
      priority: body.priority ?? "normal",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedToId: body.assignedToId ?? null,
      notes: body.notes?.trim() ?? null,
      status: "pending",
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: followUp }, { status: 201 });
}

// ── PATCH /api/field/follow-ups — update status or assignee ─────────────────

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    followUpId?: string;
    status?: FollowUpActionStatus;
    assignedToId?: string;
    dueDate?: string;
    notes?: string;
    priority?: FieldTargetPriority;
  } | null;

  if (!body?.campaignId || !body?.followUpId) {
    return NextResponse.json({ error: "campaignId and followUpId are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const validStatuses: FollowUpActionStatus[] = ["pending", "assigned", "in_progress", "completed", "dismissed"];

  const existing = await prisma.followUpAction.findFirst({
    where: { id: body.followUpId, campaignId: body.campaignId, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  const isCompleting = body.status === "completed";

  const updated = await prisma.followUpAction.update({
    where: { id: body.followUpId },
    data: {
      ...(body.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
      ...(body.priority ? { priority: body.priority } : {}),
      ...(isCompleting ? { completedAt: new Date(), completedById: session!.user.id } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
