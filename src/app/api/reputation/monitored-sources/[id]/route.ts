import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional().or(z.literal("")),
  handle: z.string().max(100).optional(),
  sourceType: z.enum(["twitter_handle", "reddit_search", "rss", "news_keyword", "facebook_group"]).optional(),
  alertThreshold: z.enum(["all", "high_only", "critical_only"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const source = await prisma.repMonitoredSource.updateMany({
    where: { id: params.id, campaignId: campaignId! },
    data: {
      ...parsed.data,
      url: parsed.data.url === "" ? null : parsed.data.url,
    },
  });

  if (source.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  await prisma.repMonitoredSource.updateMany({
    where: { id: params.id, campaignId: campaignId! },
    data: { active: false },
  });
  return NextResponse.json({ ok: true });
}
