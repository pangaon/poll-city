import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  issueId: z.string().optional(),
  title: z.string().min(1).max(255),
  suggestedCopy: z.string().optional(),
  audienceFilter: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const campaignId = params.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const actions = await prisma.amplificationAction.findMany({
    where: { campaignId: campaignId! },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participations: true } },
      issue: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ actions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { campaignId, audienceFilter, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const action = await prisma.amplificationAction.create({
    data: {
      campaignId,
      createdByUserId: session!.user.id,
      status: "draft",
      audienceFilter: audienceFilter as unknown as Prisma.InputJsonValue | undefined,
      ...rest,
    },
  });

  await audit(prisma, "reputation.amplification.created", {
    campaignId,
    userId: session!.user.id,
    entityId: action.id,
    entityType: "AmplificationAction",
    after: { title: action.title },
  });

  return NextResponse.json({ action }, { status: 201 });
}
