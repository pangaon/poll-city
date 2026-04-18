import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

async function guardEventManager(userId: string, eventId: string, requireManager = false) {
  const event = await prisma.captureEvent.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { campaignId: true },
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

  return { campaignId: event.campaignId, error: null };
}

const createCandidateSchema = z.object({
  name: z.string().min(1).max(200),
  party: z.string().max(100).nullish(),
  ballotOrder: z.number().int().min(0).default(0),
  isWriteIn: z.boolean().default(false),
});

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardEventManager(session!.user.id, params.eventId);
  if (guardError) return guardError;

  const candidates = await prisma.captureCandidate.findMany({
    where: { eventId: params.eventId },
    orderBy: { ballotOrder: "asc" },
  });

  return NextResponse.json({ data: candidates });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardEventManager(session!.user.id, params.eventId, true);
  if (guardError) return guardError;

  const body = await req.json().catch(() => null);
  const parsed = createCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const candidate = await prisma.captureCandidate.create({
    data: {
      eventId: params.eventId,
      name: parsed.data.name,
      party: parsed.data.party ?? null,
      ballotOrder: parsed.data.ballotOrder,
      isWriteIn: parsed.data.isWriteIn,
    },
  });

  return NextResponse.json({ data: candidate }, { status: 201 });
}
