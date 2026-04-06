import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { SocialPlatform } from "@prisma/client";

async function ensureMembership(userId: string, campaignId: string) {
  return prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await ensureMembership(session!.user.id, campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accounts = await prisma.socialAccount.findMany({
    where: { campaignId },
    orderBy: [{ platform: "asc" }, { handle: "asc" }],
  });

  return NextResponse.json({ data: accounts });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    platform?: string;
    handle?: string;
    displayName?: string;
  } | null;

  if (!body?.campaignId || !body.platform || !body.handle?.trim()) {
    return NextResponse.json({ error: "campaignId, platform, and handle are required" }, { status: 400 });
  }

  const membership = await ensureMembership(session!.user.id, body.campaignId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!Object.values(SocialPlatform).includes(body.platform as SocialPlatform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const created = await prisma.socialAccount.create({
    data: {
      campaignId: body.campaignId,
      platform: body.platform as SocialPlatform,
      handle: body.handle.trim(),
      displayName: body.displayName?.trim() || null,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
