import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mentions = await prisma.mediaMention.findMany({ where: { campaignId }, orderBy: { mentionDate: "desc" } });
  return NextResponse.json({ data: mentions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; outlet?: string; mentionDate?: string; url?: string; sentiment?: "positive" | "neutral" | "negative"; summary?: string;
  } | null;

  if (!body?.campaignId || !body.outlet?.trim() || !body.mentionDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mention = await prisma.mediaMention.create({
    data: {
      campaignId: body.campaignId,
      outlet: body.outlet.trim(),
      mentionDate: new Date(body.mentionDate),
      url: body.url?.trim() || null,
      sentiment: body.sentiment ?? "neutral",
      summary: body.summary?.trim() || null,
    },
  });

  return NextResponse.json({ data: mention }, { status: 201 });
}
