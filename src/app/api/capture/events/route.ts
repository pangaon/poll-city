import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createEventSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  eventType: z.enum(["advance_vote", "election_day", "custom"]).default("election_day"),
  office: z.string().min(1).max(200),
  ward: z.string().max(100).nullish(),
  district: z.string().max(100).nullish(),
  municipality: z.string().min(1).max(200),
  province: z.string().length(2).default("ON"),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  requireDoubleEntry: z.boolean().default(true),
  allowPartialSubmit: z.boolean().default(true),
  lockAfterApproval: z.boolean().default(true),
  allowCorrections: z.boolean().default(true),
  anomalyThreshold: z.number().min(0).max(100).nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    select: { status: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await prisma.captureEvent.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      _count: { select: { locations: true, candidates: true, submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: events });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: data.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const event = await prisma.captureEvent.create({
    data: {
      campaignId: data.campaignId,
      name: data.name,
      eventType: data.eventType,
      office: data.office,
      ward: data.ward ?? null,
      district: data.district ?? null,
      municipality: data.municipality,
      province: data.province,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      requireDoubleEntry: data.requireDoubleEntry,
      allowPartialSubmit: data.allowPartialSubmit,
      lockAfterApproval: data.lockAfterApproval,
      allowCorrections: data.allowCorrections,
      anomalyThreshold: data.anomalyThreshold ?? null,
      createdById: session!.user.id,
    },
  });

  return NextResponse.json({ data: event }, { status: 201 });
}
