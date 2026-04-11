import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// POST — canvasser updates their GPS location
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: { campaignId: string; lat: number; lng: number; accuracy?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { campaignId, lat, lng, accuracy } = body;
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "campaignId, lat, lng required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const location = await prisma.canvasserLocation.upsert({
    where: { userId: session!.user.id },
    create: { userId: session!.user.id, campaignId, lat, lng, accuracy: accuracy ?? null },
    update: { lat, lng, accuracy: accuracy ?? null, campaignId },
  });

  return NextResponse.json({ data: location });
}

// GET — campaign manager fetches all canvasser locations
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden2) return forbidden2;

  const locations = await prisma.canvasserLocation.findMany({
    where: { campaignId: campaignId! },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Only return locations updated in the last 2 hours (active canvassers)
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const active = locations.filter((l) => l.updatedAt > cutoff);

  return NextResponse.json({ data: active });
}
