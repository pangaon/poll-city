import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { ingestAlert } from "@/lib/reputation/alert-engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sourceType: z.enum(["social_media", "news", "blog", "forum", "manual", "internal_monitoring"]).default("manual"),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sentiment: z.enum(["negative", "neutral", "positive", "mixed", "unknown"]).default("unknown"),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  velocityScore: z.number().min(0).max(10).default(0),
  geography: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const campaignId = params.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const cid = campaignId!;
  const severity = params.get("severity");
  const status = params.get("status");
  const sentiment = params.get("sentiment");
  const sourceType = params.get("sourceType");
  const geography = params.get("geography");
  const search = params.get("search");
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(params.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { campaignId: cid };
  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (sentiment) where.sentiment = sentiment;
  if (sourceType) where.sourceType = sourceType;
  if (geography) where.geography = { contains: geography, mode: "insensitive" };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [alerts, total] = await Promise.all([
    prisma.reputationAlert.findMany({
      where,
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: limit,
      skip,
      include: {
        issueLinks: { select: { issueId: true } },
      },
    }),
    prisma.reputationAlert.count({ where }),
  ]);

  return NextResponse.json({ alerts, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { campaignId } = parsed.data as typeof parsed.data & { campaignId?: string };
  const cid = body.campaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, cid, "contacts:read");
  if (forbidden) return forbidden;

  const alert = await ingestAlert({
    campaignId: cid,
    userId: session!.user.id,
    ...parsed.data,
    sourceUrl: parsed.data.sourceUrl || undefined,
  });

  return NextResponse.json({ alert }, { status: 201 });
}
