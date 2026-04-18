import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

async function guardEvent(userId: string, eventId: string, requireManager = false) {
  const event = await prisma.captureEvent.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { campaignId: true, status: true },
  });
  if (!event) return { event: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return { event: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (requireManager && !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return { event: null, error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { event: { ...event, memberRole: membership.role }, error: null };
}

const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  eventType: z.enum(["advance_vote", "election_day", "custom"]).optional(),
  status: z.enum(["setup", "active", "locked", "archived"]).optional(),
  office: z.string().min(1).max(200).optional(),
  ward: z.string().max(100).nullish(),
  district: z.string().max(100).nullish(),
  municipality: z.string().min(1).max(200).optional(),
  province: z.string().length(2).optional(),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  requireDoubleEntry: z.boolean().optional(),
  allowPartialSubmit: z.boolean().optional(),
  lockAfterApproval: z.boolean().optional(),
  allowCorrections: z.boolean().optional(),
  anomalyThreshold: z.number().min(0).max(100).nullish(),
});

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { event, error: guardError } = await guardEvent(session!.user.id, params.eventId);
  if (guardError) return guardError;

  const full = await prisma.captureEvent.findUnique({
    where: { id: params.eventId },
    include: {
      candidates: { orderBy: { ballotOrder: "asc" } },
      locations: { orderBy: { name: "asc" } },
      _count: { select: { submissions: true, assignments: true } },
    },
  });

  return NextResponse.json({ data: full });
}

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { event, error: guardError } = await guardEvent(session!.user.id, params.eventId, true);
  if (guardError) return guardError;

  const body = await req.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.captureEvent.update({
    where: { id: params.eventId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.eventType !== undefined && { eventType: parsed.data.eventType }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.office !== undefined && { office: parsed.data.office }),
      ...(parsed.data.ward !== undefined && { ward: parsed.data.ward ?? null }),
      ...(parsed.data.district !== undefined && { district: parsed.data.district ?? null }),
      ...(parsed.data.municipality !== undefined && { municipality: parsed.data.municipality }),
      ...(parsed.data.province !== undefined && { province: parsed.data.province }),
      ...(parsed.data.startDate !== undefined && { startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null }),
      ...(parsed.data.endDate !== undefined && { endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null }),
      ...(parsed.data.requireDoubleEntry !== undefined && { requireDoubleEntry: parsed.data.requireDoubleEntry }),
      ...(parsed.data.allowPartialSubmit !== undefined && { allowPartialSubmit: parsed.data.allowPartialSubmit }),
      ...(parsed.data.lockAfterApproval !== undefined && { lockAfterApproval: parsed.data.lockAfterApproval }),
      ...(parsed.data.allowCorrections !== undefined && { allowCorrections: parsed.data.allowCorrections }),
      ...(parsed.data.anomalyThreshold !== undefined && { anomalyThreshold: parsed.data.anomalyThreshold ?? null }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { event, error: guardError } = await guardEvent(session!.user.id, params.eventId, true);
  if (guardError) return guardError;

  if (event!.status === "active" || event!.status === "locked") {
    return NextResponse.json({ error: "Cannot delete an active or locked event" }, { status: 409 });
  }

  await prisma.captureEvent.update({
    where: { id: params.eventId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
