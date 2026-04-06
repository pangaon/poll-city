import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import type { Prisma } from "@prisma/client";
import { SocialPostStatus } from "@prisma/client";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const post = await prisma.socialPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, post.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    content?: string;
    title?: string;
    status?: string;
    scheduledFor?: string | null;
    failureReason?: string | null;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const data: Prisma.SocialPostUpdateInput = {};
  if (body.title !== undefined) data.title = body.title?.trim() || null;
  if (body.content !== undefined) data.content = body.content.trim();
  if (body.failureReason !== undefined) data.failureReason = body.failureReason?.trim() || null;

  if (body.scheduledFor !== undefined) {
    if (body.scheduledFor === null) {
      data.scheduledFor = null;
    } else {
      const scheduledFor = parseDate(body.scheduledFor);
      if (!scheduledFor) return NextResponse.json({ error: "Invalid scheduledFor" }, { status: 400 });
      data.scheduledFor = scheduledFor;
    }
  }

  if (body.status !== undefined && Object.values(SocialPostStatus).includes(body.status as SocialPostStatus)) {
    const status = body.status as SocialPostStatus;
    data.status = status;

    if (status === SocialPostStatus.pending_approval) data.approvalRequestedAt = new Date();
    if (status === SocialPostStatus.approved) {
      data.approvedAt = new Date();
      data.approvedBy = { connect: { id: session!.user.id } };
    }
    if (status === SocialPostStatus.published) data.publishedAt = new Date();
    if (status === SocialPostStatus.failed) data.failedAt = new Date();
    if (status === SocialPostStatus.cancelled) data.failedAt = null;
    if (status === SocialPostStatus.draft) {
      data.approvedAt = null;
      data.approvalRequestedAt = null;
      data.publishedAt = null;
      data.failedAt = null;
      data.failedAt = null;
      data.approvedBy = { disconnect: true };
    }
  }

  const updated = await prisma.socialPost.update({
    where: { id: params.id },
    data,
    include: {
      socialAccount: { select: { id: true, platform: true, handle: true, displayName: true } },
      author: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const post = await prisma.socialPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const membership = await ensureMembership(session!.user.id, post.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.socialPost.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
