import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { TurfStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const status = sp.get("status") as TurfStatus | null;

  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const turfs = await prisma.turf.findMany({
    where: { campaignId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedGroup: { select: { id: true, name: true, targetWard: true } },
      _count: { select: { stops: true } },
    },
  });

  return NextResponse.json({ data: turfs });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "canvassing:manage");
  if (permError2) return permError2;

  let body: {
    campaignId: string;
    name: string;
    ward?: string;
    pollNumber?: string;
    streets?: string[];
    oddEven?: string;
    contactIds: string[];
    notes?: string;
    boundary?: unknown;
    centroid?: { lat: number; lng: number };
    assignedUserId?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, name, contactIds } = body;
  if (!campaignId || !name || !contactIds?.length) {
    return NextResponse.json({ error: "campaignId, name, and contactIds are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify contacts belong to this campaign
  const validContacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, campaignId },
    select: { id: true },
  });
  const validIds = validContacts.map((c) => c.id);

  const turf = await prisma.turf.create({
    data: {
      campaignId,
      name,
      ward: body.ward ?? null,
      pollNumber: body.pollNumber ?? null,
      streets: body.streets ?? [],
      oddEven: body.oddEven ?? "all",
      notes: body.notes ?? null,
      boundary: body.boundary ?? undefined,
      centroid: body.centroid ?? undefined,
      assignedUserId: body.assignedUserId ?? null,
      status: body.assignedUserId ? TurfStatus.assigned : TurfStatus.draft,
      totalStops: validIds.length,
      stops: {
        create: validIds.map((id, idx) => ({
          contactId: id,
          order: idx,
        })),
      },
    },
    include: {
      stops: { include: { contact: { select: { id: true, firstName: true, lastName: true, address1: true } } } },
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "created_turf",
      entityType: "turf",
      entityId: turf.id,
      details: {
        name,
        totalStops: validIds.length,
        ward: body.ward ?? null,
        pollNumber: body.pollNumber ?? null,
      },
    },
  });

  return NextResponse.json({ data: turf }, { status: 201 });
}
