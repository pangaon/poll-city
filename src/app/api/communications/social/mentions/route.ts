import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { SocialMentionSentiment } from "@prisma/client";

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

  const needsResponse = req.nextUrl.searchParams.get("needsResponse");

  const mentions = await prisma.socialMention.findMany({
    where: {
      campaignId,
      ...(needsResponse === "true" ? { needsResponse: true } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      socialAccount: { select: { id: true, platform: true, handle: true, displayName: true } },
    },
    orderBy: [{ needsResponse: "desc" }, { mentionedAt: "desc" }],
  });

  return NextResponse.json({ data: mentions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    platform?: string;
    externalMentionId?: string;
    authorHandle?: string;
    authorName?: string;
    content?: string;
    url?: string;
    mentionedAt?: string;
    sentiment?: string;
    needsResponse?: boolean;
    socialAccountId?: string;
  } | null;

  if (!body?.campaignId || !body.platform || !body.externalMentionId || !body.content?.trim()) {
    return NextResponse.json(
      { error: "campaignId, platform, externalMentionId, and content are required" },
      { status: 400 }
    );
  }

  const membership = await ensureMembership(session!.user.id, body.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mentionedAt = parseDate(body.mentionedAt) || new Date();
  const sentiment =
    body.sentiment && Object.values(SocialMentionSentiment).includes(body.sentiment as SocialMentionSentiment)
      ? (body.sentiment as SocialMentionSentiment)
      : SocialMentionSentiment.unknown;

  const mention = await prisma.socialMention.upsert({
    where: {
      campaignId_platform_externalMentionId: {
        campaignId: body.campaignId,
        platform: body.platform as any,
        externalMentionId: body.externalMentionId,
      },
    },
    update: {
      authorHandle: body.authorHandle?.trim() || null,
      authorName: body.authorName?.trim() || null,
      content: body.content.trim(),
      url: body.url?.trim() || null,
      mentionedAt,
      sentiment,
      needsResponse: body.needsResponse ?? true,
      socialAccountId: body.socialAccountId || null,
    },
    create: {
      campaignId: body.campaignId,
      platform: body.platform as any,
      externalMentionId: body.externalMentionId,
      authorHandle: body.authorHandle?.trim() || null,
      authorName: body.authorName?.trim() || null,
      content: body.content.trim(),
      url: body.url?.trim() || null,
      mentionedAt,
      sentiment,
      needsResponse: body.needsResponse ?? true,
      socialAccountId: body.socialAccountId || null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      socialAccount: { select: { id: true, platform: true, handle: true, displayName: true } },
    },
  });

  return NextResponse.json({ data: mention }, { status: 201 });
}
