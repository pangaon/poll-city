import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
    const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "intelligence:read");
  if (forbidden) return forbidden;

  const entries = await prisma.opponentIntel.findMany({ where: { campaignId: campaignId! }, orderBy: { createdAt: "desc" } });
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

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "intelligence:write");
  if (forbidden) return forbidden;

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
