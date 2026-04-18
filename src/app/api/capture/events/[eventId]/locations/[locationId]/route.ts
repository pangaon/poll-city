import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

async function guardLocation(userId: string, eventId: string, locationId: string, requireManager = false) {
  const location = await prisma.captureLocation.findFirst({
    where: { id: locationId, eventId },
    select: { id: true, eventId: true, campaignId: true },
  });
  if (!location) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: location.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (requireManager && !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return { error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { location, error: null };
}

const updateLocationSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  address: z.string().max(500).nullish(),
  municipality: z.string().max(200).nullish(),
  ward: z.string().max(100).nullish(),
  district: z.string().max(100).nullish(),
  pollNumber: z.string().max(50).nullish(),
  expectedTurnout: z.number().int().positive().nullish(),
  status: z.enum(["active", "closed", "problem", "completed"]).optional(),
  notes: z.string().max(1000).nullish(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string; locationId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { location, error: guardError } = await guardLocation(session!.user.id, params.eventId, params.locationId);
  if (guardError) return guardError;

  const full = await prisma.captureLocation.findUnique({
    where: { id: params.locationId },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      submissions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  return NextResponse.json({ data: full });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; locationId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardLocation(session!.user.id, params.eventId, params.locationId, true);
  if (guardError) return guardError;

  const body = await req.json().catch(() => null);
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.captureLocation.update({
    where: { id: params.locationId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.address !== undefined && { address: parsed.data.address ?? null }),
      ...(parsed.data.municipality !== undefined && { municipality: parsed.data.municipality ?? null }),
      ...(parsed.data.ward !== undefined && { ward: parsed.data.ward ?? null }),
      ...(parsed.data.district !== undefined && { district: parsed.data.district ?? null }),
      ...(parsed.data.pollNumber !== undefined && { pollNumber: parsed.data.pollNumber ?? null }),
      ...(parsed.data.expectedTurnout !== undefined && { expectedTurnout: parsed.data.expectedTurnout ?? null }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes ?? null }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; locationId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardLocation(session!.user.id, params.eventId, params.locationId, true);
  if (guardError) return guardError;

  const submissionCount = await prisma.captureSubmission.count({
    where: { locationId: params.locationId },
  });
  if (submissionCount > 0) {
    return NextResponse.json({ error: "Cannot delete location with existing submissions" }, { status: 409 });
  }

  await prisma.captureLocation.delete({ where: { id: params.locationId } });

  return NextResponse.json({ ok: true });
}
