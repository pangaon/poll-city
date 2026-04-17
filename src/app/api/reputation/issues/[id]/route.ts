import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { updateIssueStatus, assignIssueOwner } from "@/lib/reputation/issue-engine";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  campaignId: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum(["misinformation", "policy", "personal_attack", "media_inquiry", "local_controversy", "supporter_concern", "legal", "financial", "general"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["open", "triaged", "in_progress", "escalated", "resolved", "archived"]).optional(),
  ownerUserId: z.string().nullable().optional(),
  slaDeadline: z.string().datetime().nullable().optional(),
  geography: z.string().optional(),
  impactScore: z.number().min(0).max(100).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const issue = await prisma.reputationIssue.findUnique({
    where: { id: params.id, campaignId: campaignId! },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      alertLinks: {
        include: {
          alert: {
            select: {
              id: true, title: true, severity: true, sentiment: true,
              sourceType: true, sourceName: true, detectedAt: true, velocityScore: true,
            },
          },
        },
      },
      recommendations: {
        where: { isDismissed: false },
        orderBy: { createdAt: "desc" },
      },
      responseActions: {
        orderBy: { createdAt: "desc" },
      },
      responsePages: {
        select: { id: true, title: true, slug: true, publishStatus: true },
      },
      ampActions: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { campaignId, status, ownerUserId, slaDeadline, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const before = await prisma.reputationIssue.findUnique({
    where: { id: params.id, campaignId },
    select: { status: true, ownerUserId: true, severity: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle status change with audit
  if (status && status !== before.status) {
    await updateIssueStatus(params.id, campaignId, session!.user.id, status);
  }

  // Handle owner assignment with audit
  if (ownerUserId !== undefined && ownerUserId !== before.ownerUserId) {
    if (ownerUserId) {
      await assignIssueOwner(params.id, campaignId, session!.user.id, ownerUserId);
    }
  }

  const updateData: Record<string, unknown> = { ...rest };
  if (slaDeadline !== undefined) updateData.slaDeadline = slaDeadline ? new Date(slaDeadline) : null;

  const updated = await prisma.reputationIssue.update({
    where: { id: params.id },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      recommendations: { where: { isDismissed: false }, orderBy: { createdAt: "desc" } },
    },
  });

  if (Object.keys(rest).length > 0) {
    await audit(prisma, "reputation.issue.updated", {
      campaignId,
      userId: session!.user.id,
      entityId: params.id,
      entityType: "ReputationIssue",
      before: rest,
      after: updated,
    });
  }

  return NextResponse.json({ issue: updated });
}
