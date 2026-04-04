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

  const entries = await prisma.opponentIntel.findMany({ where: { campaignId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: entries });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; type?: "sign" | "event" | "media" | "note"; title?: string; details?: string;
    lat?: number; lng?: number; eventDate?: string;
  } | null;

  if (!body?.campaignId || !body.type || !body.title?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.opponentIntel.create({
    data: {
      campaignId: body.campaignId,
      type: body.type,
      title: body.title.trim(),
      details: body.details?.trim() || null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      eventDate: body.eventDate ? new Date(body.eventDate) : null,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
