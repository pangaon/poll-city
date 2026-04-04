import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { TurfStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

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

  let body: {
    campaignId: string;
    name: string;
    ward?: string;
    pollNumber?: string;
    streets?: string[];
    oddEven?: string;
    contactIds: string[];
    notes?: string;
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

  return NextResponse.json({ data: turf }, { status: 201 });
}
