import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  actionType: z.string().min(1),
  title: z.string().min(1).max(255),
  notes: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  commsRef: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const actions = await prisma.reputationResponseAction.findMany({
    where: { issueId: params.id, campaignId: campaignId! },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ actions });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { campaignId, scheduledFor, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const issue = await prisma.reputationIssue.findUnique({
    where: { id: params.id, campaignId },
    select: { id: true },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const action = await prisma.reputationResponseAction.create({
    data: {
      issueId: params.id,
      campaignId,
      createdByUserId: session!.user.id,
      status: "draft",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      ...rest,
    },
  });

  await audit(prisma, "reputation.action.created", {
    campaignId,
    userId: session!.user.id,
    entityId: action.id,
    entityType: "ReputationResponseAction",
    after: { issueId: params.id, actionType: action.actionType, title: action.title },
  });

  return NextResponse.json({ action }, { status: 201 });
}
