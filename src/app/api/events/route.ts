import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const events = await prisma.event.findMany({ where: { campaignId }, include: { rsvps: true }, orderBy: { eventDate: "asc" } });
  return NextResponse.json({ data: events });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; name?: string; eventDate?: string; location?: string; capacity?: number; description?: string; isPublic?: boolean;
  } | null;

  if (!body?.campaignId || !body.name?.trim() || !body.eventDate || !body.location?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.event.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      eventDate: new Date(body.eventDate),
      location: body.location.trim(),
      capacity: body.capacity ?? null,
      description: body.description?.trim() || null,
      isPublic: !!body.isPublic,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
