import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { SocialPlatform, SocialPostStatus } from "@prisma/client";

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

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await ensureMembership(session!.user.id, campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");
  const where = {
    campaignId,
    ...(status && Object.values(SocialPostStatus).includes(status as SocialPostStatus)
      ? { status: status as SocialPostStatus }
      : {}),
  };

  const posts = await prisma.socialPost.findMany({
    where,
    include: {
      socialAccount: { select: { id: true, platform: true, handle: true, displayName: true } },
      author: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      rejectedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ data: posts });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    socialAccountId?: string;
    content?: string;
    title?: string;
    mediaUrls?: string[];
    linkUrl?: string;
    hashtags?: string[];
    targetPlatforms?: string[];
    status?: string;
    scheduledFor?: string;
  } | null;

  if (!body?.campaignId || !body.content?.trim()) {
    return NextResponse.json({ error: "campaignId and content are required" }, { status: 400 });
  }

  const membership = await ensureMembership(session!.user.id, body.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scheduledFor = parseDate(body.scheduledFor);
  if (body.scheduledFor && !scheduledFor) {
    return NextResponse.json({ error: "Invalid scheduledFor" }, { status: 400 });
  }

  const targetPlatforms = (body.targetPlatforms || []).filter((platform): platform is SocialPlatform =>
    Object.values(SocialPlatform).includes(platform as SocialPlatform)
  );

  const status = body.status && Object.values(SocialPostStatus).includes(body.status as SocialPostStatus)
    ? (body.status as SocialPostStatus)
    : scheduledFor
      ? SocialPostStatus.scheduled
      : SocialPostStatus.draft;

  const created = await prisma.socialPost.create({
    data: {
      campaignId: body.campaignId,
      socialAccountId: body.socialAccountId || null,
      authorUserId: session!.user.id,
      title: body.title?.trim() || null,
      content: body.content.trim(),
      mediaUrls: body.mediaUrls?.filter(Boolean) || [],
      linkUrl: body.linkUrl?.trim() || null,
      hashtags: body.hashtags?.filter(Boolean) || [],
      targetPlatforms,
      status,
      scheduledFor,
      ...(status === SocialPostStatus.pending_approval ? { approvalRequestedAt: new Date() } : {}),
      ...(status === SocialPostStatus.published ? { publishedAt: new Date() } : {}),
    },
    include: {
      socialAccount: { select: { id: true, platform: true, handle: true, displayName: true } },
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
