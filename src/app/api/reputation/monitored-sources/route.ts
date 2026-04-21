import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal("")),
  handle: z.string().max(100).optional(),
  sourceType: z.enum(["twitter_handle", "reddit_search", "rss", "news_keyword", "facebook_group"]).default("news_keyword"),
  alertThreshold: z.enum(["all", "high_only", "critical_only"]).default("all"),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const sources = await prisma.repMonitoredSource.findMany({
    where: { campaignId: campaignId!, active: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { campaignId, name, url, handle, sourceType, alertThreshold } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const source = await prisma.repMonitoredSource.create({
    data: {
      campaignId,
      name,
      url: url || null,
      handle: handle || null,
      sourceType,
      alertThreshold,
      createdByUserId: session!.user.id,
    },
  });
  return NextResponse.json({ source }, { status: 201 });
}
