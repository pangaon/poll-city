import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { TurfStatus } from "@prisma/client";

// ── GET /api/field/turf?campaignId=X&status=Y&assignedUserId=Z ───────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const statusFilter = sp.get("status") as TurfStatus | null;
  const assignedUserId = sp.get("assignedUserId");
  const pollNumber = sp.get("pollNumber");
  const ward = sp.get("ward");

  const turfs = await prisma.turf.findMany({
    where: {
      campaignId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(assignedUserId ? { assignedUserId } : {}),
      ...(pollNumber ? { pollNumber } : {}),
      ...(ward ? { ward } : {}),
    },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedVolunteer: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      assignedGroup: { select: { id: true, name: true } },
      _count: { select: { stops: true, routes: true, fieldShifts: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: turfs });
}

// ── POST /api/field/turf ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    ward?: string;
    pollNumber?: string;
    streets?: string[];
    oddEven?: string;
    contactIds?: string[];
    notes?: string;
    boundary?: unknown;
    centroid?: { lat: number; lng: number };
    assignedUserId?: string | null;
    assignedVolunteerId?: string | null;
    assignedGroupId?: string | null;
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const contactIds = body.contactIds ?? [];

  // Validate contacts belong to this campaign
  const validContacts = contactIds.length
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, campaignId: body.campaignId, deletedAt: null },
        select: { id: true },
      })
    : [];
  const validIds = validContacts.map((c) => c.id);

  // Determine initial status
  let initialStatus: TurfStatus = TurfStatus.draft;
  if (body.assignedUserId || body.assignedVolunteerId || body.assignedGroupId) {
    initialStatus = TurfStatus.assigned;
  }

  const validOddEven = ["all", "odd", "even"];

  const turf = await prisma.turf.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      ward: body.ward?.trim() ?? null,
      pollNumber: body.pollNumber?.trim() ?? null,
      streets: body.streets ?? [],
      oddEven: validOddEven.includes(body.oddEven ?? "") ? body.oddEven! : "all",
      notes: body.notes?.trim() ?? null,
      boundary: (body.boundary as object) ?? undefined,
      centroid: (body.centroid as object) ?? undefined,
      assignedUserId: body.assignedUserId ?? null,
      assignedVolunteerId: body.assignedVolunteerId ?? null,
      assignedGroupId: body.assignedGroupId ?? null,
      status: initialStatus,
      totalStops: validIds.length,
      stops: validIds.length
        ? {
            create: validIds.map((id, idx) => ({
              contactId: id,
              order: idx,
            })),
          }
        : undefined,
    },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedVolunteer: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      assignedGroup: { select: { id: true, name: true } },
      _count: { select: { stops: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      action: "created_turf",
      entityType: "turf",
      entityId: turf.id,
      details: {
        name: turf.name,
        totalStops: validIds.length,
        ward: turf.ward ?? null,
        pollNumber: turf.pollNumber ?? null,
        source: "field_ops",
      },
    },
  });

  return NextResponse.json({ data: turf }, { status: 201 });
}
