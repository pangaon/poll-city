import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { parsePagination, paginate } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { AssignmentType, SignStatus } from "@prisma/client";
import {
  createFieldAssignmentSchema,
  listFieldAssignmentsQuerySchema,
} from "@/lib/validators/field-assignments";

// ─── GET /api/field-assignments?campaignId=X&status=X&type=X ─────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const queryParsed = listFieldAssignmentsQuerySchema.safeParse({
    campaignId: sp.get("campaignId"),
    status: sp.get("status") ?? undefined,
    type: sp.get("type") ?? undefined,
    page: sp.get("page") ?? undefined,
    pageSize: sp.get("pageSize") ?? undefined,
  });
  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: queryParsed.error.flatten() },
      { status: 400 },
    );
  }

  const { campaignId, status, type } = queryParsed.data;

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "canvassing:read",
  );
  if (forbidden) return forbidden;

  const { page, pageSize, skip } = parsePagination(sp);

  const where = {
    campaignId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(type ? { assignmentType: type } : {}),
  };

  const [assignments, total] = await Promise.all([
    prisma.fieldAssignment.findMany({
      where,
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        fieldUnit: { select: { id: true, name: true } },
        _count: { select: { stops: true } },
      },
    }),
    prisma.fieldAssignment.count({ where }),
  ]);

  return NextResponse.json(paginate(assignments, total, page, pageSize));
}

// ─── POST /api/field-assignments ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createFieldAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const {
    campaignId,
    assignmentType,
    name,
    description,
    fieldUnitId,
    scheduledDate,
    notes,
    targetIds,
    assignedUserId,
    assignedVolunteerId,
    assignedGroupId,
    resourcePackage,
  } = parsed.data;

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "canvassing:manage",
  );
  if (forbidden) return forbidden;

  // ── Resolve stop target IDs ───────────────────────────────────────────────

  let resolvedTargetIds: string[] = targetIds ?? [];

  if (resolvedTargetIds.length === 0) {
    // Auto-query from the campaign (optionally scoped to the turf's ward)
    let turfWard: string | null = null;
    if (fieldUnitId) {
      const turf = await prisma.turf.findUnique({
        where: { id: fieldUnitId },
        select: { ward: true, campaignId: true },
      });
      if (!turf || turf.campaignId !== campaignId) {
        return NextResponse.json(
          { error: "Turf not found or not part of this campaign" },
          { status: 404 },
        );
      }
      turfWard = turf.ward ?? null;
    }

    switch (assignmentType) {
      case AssignmentType.canvass: {
        const contacts = await prisma.contact.findMany({
          where: {
            campaignId,
            deletedAt: null,
            ...(turfWard ? { ward: turfWard } : {}),
          },
          select: { id: true },
          take: 500,
        });
        resolvedTargetIds = contacts.map((c) => c.id);
        break;
      }

      case AssignmentType.lit_drop: {
        const households = await prisma.household.findMany({
          where: {
            campaignId,
            ...(turfWard ? { ward: turfWard } : {}),
          },
          select: { id: true },
          take: 500,
        });
        resolvedTargetIds = households.map((h) => h.id);
        break;
      }

      case AssignmentType.sign_install: {
        const signs = await prisma.sign.findMany({
          where: {
            campaignId,
            deletedAt: null,
            status: { in: [SignStatus.requested, SignStatus.scheduled] },
          },
          select: { id: true },
          take: 500,
        });
        resolvedTargetIds = signs.map((s) => s.id);
        break;
      }

      case AssignmentType.sign_remove: {
        const signs = await prisma.sign.findMany({
          where: {
            campaignId,
            deletedAt: null,
            status: SignStatus.installed,
          },
          select: { id: true },
          take: 500,
        });
        resolvedTargetIds = signs.map((s) => s.id);
        break;
      }
    }
  }

  // ── Determine initial status ──────────────────────────────────────────────

  const hasAssignee = assignedUserId || assignedVolunteerId || assignedGroupId;
  const initialStatus = hasAssignee ? "assigned" : "draft";

  // ── Persist in a transaction ──────────────────────────────────────────────

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.fieldAssignment.create({
      data: {
        campaignId,
        assignmentType,
        name,
        description,
        fieldUnitId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        notes,
        status: initialStatus,
        assignedUserId,
        assignedVolunteerId,
        assignedGroupId,
        createdById: session!.user.id,
        stops: {
          create: resolvedTargetIds.map((targetId, index) => {
            const stopField =
              assignmentType === AssignmentType.canvass
                ? { contactId: targetId }
                : assignmentType === AssignmentType.lit_drop
                  ? { householdId: targetId }
                  : { signId: targetId };
            return { ...stopField, order: index + 1, status: "pending" };
          }),
        },
      },
      include: {
        _count: { select: { stops: true } },
        createdBy: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        fieldUnit: { select: { id: true, name: true } },
      },
    });

    if (resourcePackage) {
      await tx.assignmentResourcePackage.create({
        data: {
          assignmentId: created.id,
          scriptPackageId: resourcePackage.scriptPackageId,
          literaturePackageId: resourcePackage.literaturePackageId,
          plannedLiteratureQty: resourcePackage.plannedLiteratureQty,
          signInventoryItemId: resourcePackage.signInventoryItemId,
          signsAllocated: resourcePackage.signsAllocated,
        },
      });
    }

    return created;
  });

  await audit(prisma, "field_assignment.create", {
    campaignId,
    userId: session!.user.id,
    entityId: assignment.id,
    entityType: "FieldAssignment",
    ip: req.headers.get("x-forwarded-for"),
    details: {
      assignmentType,
      stopCount: resolvedTargetIds.length,
    },
  });

  return NextResponse.json({ data: assignment }, { status: 201 });
}
