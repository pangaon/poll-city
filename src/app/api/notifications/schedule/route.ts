import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await prisma.notificationLog.findMany({
    where: { campaignId, status: "scheduled" },
    orderBy: { scheduledFor: "asc" },
    take: 100,
  });

  return NextResponse.json({ data });
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaignId || !body.title || !body.body || !body.scheduledFor) {
    return NextResponse.json({ error: "campaignId, title, body and scheduledFor are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scheduledFor = new Date(body.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: "Invalid scheduled date" }, { status: 400 });
  }

  if (body.body.length > 120) {
    return NextResponse.json({ error: "Message must be 120 characters or less" }, { status: 400 });
  }

  const log = await prisma.notificationLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      title: body.title,
      body: body.body,
      audience: body.audience ? JSON.parse(JSON.stringify(body.audience)) : { type: "all" },
      status: "scheduled",
      scheduledFor,
    },
  });

  return NextResponse.json({ data: log }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.notificationLog.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: existing.campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cancelled = await prisma.notificationLog.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ data: cancelled });
}
