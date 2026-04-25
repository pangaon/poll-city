import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth as apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { audit } from "@/lib/audit";
import { AssignmentStatus } from "@prisma/client";
import { patchFieldAssignmentSchema } from "@/lib/validators/field-assignments";

// ── Shared stop include ──────────────────────────────────────────────────────

const STOP_INCLUDE = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address1: true,
      city: true,
      postalCode: true,
      phone: true,
      supportLevel: true,
    },
  },
  household: {
    select: {
      id: true,
      address1: true,
      city: true,
      postalCode: true,
      lat: true,
      lng: true,
    },
  },
  sign: {
    select: {
      id: true,
      address1: true,
      city: true,
      postalCode: true,
      status: true,
      lat: true,
      lng: true,
    },
  },
  completedBy: { select: { id: true, name: true } },
};

// ─── GET /api/field-assignments/[id] ─────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const assignment = await prisma.fieldAssignment.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedVolunteer: {
        select: {
          id: true,
          user: { select: { id: true, name: true } },
        },
      },
      assignedGroup: { select: { id: true, name: true } },
      fieldUnit: { select: { id: true, name: true, ward: true } },
      stops: {
        orderBy: { order: "asc" },
        include: STOP_INCLUDE,
      },
      resourcePackage: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    assignment.campaignId,
    "canvassing:read",
  );
  if (forbidden) return forbidden;

  return NextResponse.json({ data: assignment });
}

// ─── PATCH /api/field-assignments/[id] ───────────────────────────────────────

// Valid status transitions per action
const ALLOWED_FROM: Record<string, AssignmentStatus[]> = {
  publish: [AssignmentStatus.draft],
  assign: [AssignmentStatus.draft, AssignmentStatus.published],
  start: [AssignmentStatus.assigned, AssignmentStatus.published],
  complete: [AssignmentStatus.in_progress],
  cancel: [
    AssignmentStatus.draft,
    AssignmentStatus.published,
    AssignmentStatus.assigned,
    AssignmentStatus.in_progress,
  ],
};

// Actions that require canvassing:manage (vs canvassing:write for field actors)
const MANAGEMENT_ACTIONS = new Set(["publish", "assign", "cancel", "update"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const assignment = await prisma.fieldAssignment.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { id: true, campaignId: true, status: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchFieldAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { action } = parsed.data;

  // ── Permission check ────────────────────────────────────────────────────────
  const requiredPerm = MANAGEMENT_ACTIONS.has(action)
    ? "canvassing:manage"
    : "canvassing:write";

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    assignment.campaignId,
    requiredPerm,
  );
  if (forbidden) return forbidden;

  // ── Status transition guard ─────────────────────────────────────────────────
  if (action !== "update") {
    const allowedFrom = ALLOWED_FROM[action] ?? [];
    if (!allowedFrom.includes(assignment.status)) {
      return NextResponse.json(
        {
          error: `Cannot ${action} an assignment with status "${assignment.status}"`,
        },
        { status: 409 },
      );
    }
  }

  // ── Build update payload ────────────────────────────────────────────────────
  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "publish":
      updateData.status = AssignmentStatus.published;
      break;

    case "assign": {
      const { assignedUserId, assignedVolunteerId, assignedGroupId } =
        parsed.data;
      if (!assignedUserId && !assignedVolunteerId && !assignedGroupId) {
        return NextResponse.json(
          {
            error:
              "At least one of assignedUserId, assignedVolunteerId, or assignedGroupId is required",
          },
          { status: 422 },
        );
      }
      updateData = {
        status: AssignmentStatus.assigned,
        assignedUserId: assignedUserId ?? null,
        assignedVolunteerId: assignedVolunteerId ?? null,
        assignedGroupId: assignedGroupId ?? null,
      };
      break;
    }

    case "start":
      updateData = {
        status: AssignmentStatus.in_progress,
        startedAt: new Date(),
      };
      break;

    case "complete":
      updateData = {
        status: AssignmentStatus.completed,
        completedAt: new Date(),
      };
      break;

    case "cancel":
      updateData.status = AssignmentStatus.cancelled;
      break;

    case "update": {
      const { name, description, notes, scheduledDate, fieldUnitId, printPacketUrl } =
        parsed.data;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (notes !== undefined) updateData.notes = notes;
      if (scheduledDate !== undefined)
        updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
      if (fieldUnitId !== undefined) updateData.fieldUnitId = fieldUnitId;
      if (printPacketUrl !== undefined) updateData.printPacketUrl = printPacketUrl;
      break;
    }
  }

  const updated = await prisma.fieldAssignment.update({
    where: { id: params.id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      fieldUnit: { select: { id: true, name: true } },
      _count: { select: { stops: true } },
      resourcePackage: true,
    },
  });

  await audit(prisma, `field_assignment.${action}`, {
    campaignId: assignment.campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: "FieldAssignment",
    ip: req.headers.get("x-forwarded-for"),
    before: { status: assignment.status },
    after: { status: updated.status },
  });

  return NextResponse.json({ data: updated });
}
