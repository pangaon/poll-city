import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  issueId: z.string().optional(),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  summary: z.string().optional(),
  body: z.string().min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const campaignId = params.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const publishStatus = params.get("publishStatus");
  const issueId = params.get("issueId");
  const where: Record<string, unknown> = { campaignId: campaignId! };
  if (publishStatus) where.publishStatus = publishStatus;
  if (issueId) where.issueId = issueId;

  const [pages, total] = await Promise.all([
    prisma.reputationResponsePage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, slug: true, summary: true,
        publishStatus: true, publishedAt: true, createdAt: true,
        issue: { select: { id: true, title: true } },
      },
    }),
    prisma.reputationResponsePage.count({ where }),
  ]);

  return NextResponse.json({ pages, total });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { campaignId, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const page = await prisma.reputationResponsePage.create({
    data: {
      campaignId,
      createdByUserId: session!.user.id,
      publishStatus: "draft",
      ...rest,
    },
  });

  await audit(prisma, "reputation.page.created", {
    campaignId,
    userId: session!.user.id,
    entityId: page.id,
    entityType: "ReputationResponsePage",
    after: { title: page.title, slug: page.slug },
  });

  return NextResponse.json({ page }, { status: 201 });
}
