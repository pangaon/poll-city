import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import type { Prisma } from "@prisma/client";
import { SocialMentionSentiment } from "@prisma/client";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const mention = await prisma.socialMention.findUnique({ where: { id: params.id } });
  if (!mention) return NextResponse.json({ error: "Mention not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, mention.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    needsResponse?: boolean;
    respondedAt?: string | null;
    resolutionNotes?: string | null;
    sentiment?: string;
    assignedToUserId?: string | null;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const data: Prisma.SocialMentionUpdateInput = {};
  if (body.needsResponse !== undefined) data.needsResponse = body.needsResponse;
  if (body.resolutionNotes !== undefined) data.resolutionNotes = body.resolutionNotes?.trim() || null;
  if (body.respondedAt !== undefined) data.respondedAt = body.respondedAt ? new Date(body.respondedAt) : null;

  if (body.sentiment && Object.values(SocialMentionSentiment).includes(body.sentiment as SocialMentionSentiment)) {
    data.sentiment = body.sentiment as SocialMentionSentiment;
  }

  if (body.assignedToUserId !== undefined) {
    data.assignedTo = body.assignedToUserId ? { connect: { id: body.assignedToUserId } } : { disconnect: true };
  }

  const updated = await prisma.socialMention.update({
    where: { id: params.id },
    data,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      socialAccount: { select: { id: true, platform: true, handle: true, displayName: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
