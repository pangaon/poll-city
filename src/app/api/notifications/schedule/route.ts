import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "notifications:write");
  if (forbidden) return forbidden;

  const data = await prisma.notificationLog.findMany({
    where: { campaignId: campaignId!, status: "scheduled" },
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });

  return NextResponse.json({ data }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    campaignId?: string;
    title?: string;
    body?: string;
    scheduledFor?: string;
    audience?: { type?: "all" | "tags"; tags?: string[] };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!body.title || !body.body || !body.scheduledFor) {
    return NextResponse.json({ error: "campaignId, title, body and scheduledFor are required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { resolved: resolved2, forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, body.campaignId, "notifications:write");
  if (forbidden2) return forbidden2;
  if (!["admin", "campaign-manager"].includes(resolved2.roleSlug)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const scheduledFor = new Date(body.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: "Invalid scheduled date" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (body.body.length > 120) {
    return NextResponse.json({ error: "Message must be 120 characters or less" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const log = await prisma.notificationLog.create({
    data: {
      campaignId: body.campaignId!,
      userId: session!.user.id,
      title: body.title,
      body: body.body,
      audience: body.audience ? JSON.parse(JSON.stringify(body.audience)) : { type: "all" },
      status: "scheduled",
      scheduledFor,
    },
  });

  return NextResponse.json({ data: log }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const existing = await prisma.notificationLog.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });

  const { resolved: resolved3, forbidden: forbidden3 } = await guardCampaignRoute(session!.user.id, existing.campaignId, "notifications:write");
  if (forbidden3) return forbidden3;
  if (!["admin", "campaign-manager"].includes(resolved3.roleSlug)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const cancelled = await prisma.notificationLog.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ data: cancelled }, { headers: NO_STORE_HEADERS });
}
