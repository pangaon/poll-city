import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

async function guardEventManager(userId: string, eventId: string, requireManager = false) {
  const event = await prisma.captureEvent.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { campaignId: true, status: true },
  });
  if (!event) return { campaignId: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return { campaignId: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (requireManager && !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return { campaignId: null, error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { campaignId: event.campaignId, status: event.status, role: membership.role, error: null };
}

const createLocationSchema = z.object({
  name: z.string().min(1).max(300),
  address: z.string().max(500).nullish(),
  municipality: z.string().max(200).nullish(),
  ward: z.string().max(100).nullish(),
  district: z.string().max(100).nullish(),
  pollNumber: z.string().max(50).nullish(),
  expectedTurnout: z.number().int().positive().nullish(),
  notes: z.string().max(1000).nullish(),
});

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId, error: guardError } = await guardEventManager(session!.user.id, params.eventId);
  if (guardError) return guardError;

  const locations = await prisma.captureLocation.findMany({
    where: { eventId: params.eventId },
    include: {
      _count: { select: { submissions: true, assignments: true } },
    },
    orderBy: [{ ward: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: locations });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId, error: guardError } = await guardEventManager(session!.user.id, params.eventId, true);
  if (guardError) return guardError;

  const body = await req.json().catch(() => null);
  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const location = await prisma.captureLocation.create({
    data: {
      eventId: params.eventId,
      campaignId: campaignId!,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      municipality: parsed.data.municipality ?? null,
      ward: parsed.data.ward ?? null,
      district: parsed.data.district ?? null,
      pollNumber: parsed.data.pollNumber ?? null,
      expectedTurnout: parsed.data.expectedTurnout ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ data: location }, { status: 201 });
}
