import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";

async function resolveAndGuard(
  req: NextRequest,
  eventId: string,
  qid: string,
) {
  const { session, error } = await apiAuth(req, [
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.CAMPAIGN_MANAGER,
  ]);
  if (error) return { session: null, question: null, authError: error };

  const question = await prisma.townhallQuestion.findUnique({
    where: { id: qid },
    include: { event: { select: { campaignId: true } } },
  });

  if (!question || question.eventId !== eventId) {
    return {
      session: null,
      question: null,
      authError: NextResponse.json({ error: "Question not found" }, { status: 404 }),
    };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id,
        campaignId: question.event.campaignId,
      },
    },
  });
  if (!membership) {
    return {
      session: null,
      question: null,
      authError: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, question, authError: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; qid: string } },
) {
  const { question, authError } = await resolveAndGuard(req, params.eventId, params.qid);
  if (authError) return authError;

  const body = (await req.json().catch(() => null)) as {
    isAnswered?: boolean;
    isHidden?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const data: { isAnswered?: boolean; answeredAt?: Date | null; isHidden?: boolean } = {};
  if (body.isAnswered !== undefined) {
    data.isAnswered = body.isAnswered;
    data.answeredAt = body.isAnswered ? new Date() : null;
  }
  if (body.isHidden !== undefined) data.isHidden = body.isHidden;

  const updated = await prisma.townhallQuestion.update({
    where: { id: question!.id },
    data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string; qid: string } },
) {
  const { question, authError } = await resolveAndGuard(req, params.eventId, params.qid);
  if (authError) return authError;

  await prisma.townhallQuestion.update({
    where: { id: question!.id },
    data: { isHidden: true },
  });

  return NextResponse.json({ ok: true });
}
