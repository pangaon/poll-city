import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldTargetStatus } from "@prisma/client";

const VALID_TARGET_STATUSES: FieldTargetStatus[] = [
  "pending", "in_progress", "contacted", "no_answer", "not_home",
  "refused", "moved", "inaccessible", "revisit", "complete",
];

type Params = { params: Promise<{ routeId: string }> };

// ── GET /api/field/routes/[routeId]/targets ───────────────────────────────────
//
// Returns all field targets for a route, ordered by sortOrder.
// Includes contact/household address data and last attempt outcome.
// Walk list export rules (ROUTING_AND_PACKAGING_RULES.md §7):
//   - Returns address + unit, contact name, prior outcome, support level (leader+)
//   - Strips email, phone, full CRM notes, donor info

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { routeId } = await params;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const statusFilter = req.nextUrl.searchParams.get("status");

  // Verify route belongs to this campaign
  const route = await prisma.route.findFirst({
    where: { id: routeId, campaignId, deletedAt: null },
    select: { id: true },
  });

  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const targets = await prisma.fieldTarget.findMany({
    where: {
      routeId,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter as FieldTargetStatus } : {}),
    },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          address1: true,
          unitApt: true,
          city: true,
          postalCode: true,
          municipalPoll: true,
          ward: true,
          supportLevel: true,
          doNotContact: true,
          accessibilityFlag: true,
          skipHouse: true,
        },
      },
      household: {
        select: {
          id: true,
          address1: true,
          address2: true,
          city: true,
          postalCode: true,
          ward: true,
        },
      },
      attempts: {
        where: {},
        orderBy: { attemptedAt: "desc" },
        take: 1,
        select: {
          id: true,
          outcome: true,
          attemptedAt: true,
          outcomeNotes: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = targets.map((t) => ({
    id: t.id,
    sortOrder: t.sortOrder,
    status: t.status,
    priority: t.priority,
    targetType: t.targetType,
    notes: t.notes,
    resolvedAt: t.resolvedAt,
    contact: t.contact
      ? {
          id: t.contact.id,
          name: [t.contact.firstName, t.contact.lastName].filter(Boolean).join(" ") || null,
          address: t.contact.address1,
          unit: t.contact.unitApt,
          city: t.contact.city,
          postalCode: t.contact.postalCode,
          poll: t.contact.municipalPoll,
          ward: t.contact.ward,
          supportLevel: t.contact.supportLevel,
          doNotContact: t.contact.doNotContact,
          accessibilityFlag: t.contact.accessibilityFlag,
          skipHouse: t.contact.skipHouse,
        }
      : null,
    household: t.household
      ? {
          id: t.household.id,
          address: t.household.address1,
          address2: t.household.address2,
          city: t.household.city,
          postalCode: t.household.postalCode,
          ward: t.household.ward,
        }
      : null,
    lastAttempt: t.attempts[0] ?? null,
  }));

  return NextResponse.json({ data });
}

// ── PATCH /api/field/routes/[routeId]/targets ─────────────────────────────────
// Update the status (and optionally notes) on a single FieldTarget.
// Body: { campaignId, targetId, status?, notes? }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { routeId } = await params;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    targetId?: string;
    status?: FieldTargetStatus;
    notes?: string | null;
  } | null;

  if (!body?.campaignId || !body?.targetId) {
    return NextResponse.json(
      { error: "campaignId and targetId are required" },
      { status: 400 },
    );
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const target = await prisma.fieldTarget.findFirst({
    where: { id: body.targetId, routeId, campaignId: body.campaignId, deletedAt: null },
  });
  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const updated = await prisma.fieldTarget.update({
    where: { id: body.targetId },
    data: {
      ...(body.status && VALID_TARGET_STATUSES.includes(body.status)
        ? {
            status: body.status,
            resolvedAt: body.status !== "pending" ? new Date() : null,
          }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
    },
    select: { id: true, status: true, resolvedAt: true, notes: true },
  });

  return NextResponse.json({ data: updated });
}
