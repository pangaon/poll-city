import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

async function guardCandidate(userId: string, eventId: string, candidateId: string) {
  const candidate = await prisma.captureCandidate.findFirst({
    where: { id: candidateId, eventId },
    include: { event: { select: { campaignId: true } } },
  });
  if (!candidate) return { candidate: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: candidate.event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return { candidate: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return { candidate: null, error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { candidate, error: null };
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  party: z.string().max(100).nullish(),
  ballotOrder: z.number().int().min(0).optional(),
  isWithdrawn: z.boolean().optional(),
  isWriteIn: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; candidateId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { candidate, error: guardError } = await guardCandidate(session!.user.id, params.eventId, params.candidateId);
  if (guardError) return guardError;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.captureCandidate.update({
    where: { id: params.candidateId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.party !== undefined && { party: parsed.data.party ?? null }),
      ...(parsed.data.ballotOrder !== undefined && { ballotOrder: parsed.data.ballotOrder }),
      ...(parsed.data.isWithdrawn !== undefined && { isWithdrawn: parsed.data.isWithdrawn }),
      ...(parsed.data.isWriteIn !== undefined && { isWriteIn: parsed.data.isWriteIn }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; candidateId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { error: guardError } = await guardCandidate(session!.user.id, params.eventId, params.candidateId);
  if (guardError) return guardError;

  const hasResults = await prisma.captureSubmissionResult.count({
    where: { candidateId: params.candidateId },
  });
  if (hasResults > 0) {
    return NextResponse.json({ error: "Cannot delete candidate with existing submission results" }, { status: 409 });
  }

  await prisma.captureCandidate.delete({ where: { id: params.candidateId } });

  return NextResponse.json({ ok: true });
}
