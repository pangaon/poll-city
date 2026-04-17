import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const cid = campaignId!;
  const now = new Date();

  const [
    newAlerts,
    criticalAlerts,
    openIssues,
    overdueIssues,
    escalatedIssues,
    pendingActions,
    recentAlerts,
  ] = await Promise.all([
    prisma.reputationAlert.count({ where: { campaignId: cid, status: "new" } }),
    prisma.reputationAlert.count({ where: { campaignId: cid, severity: "critical", status: { notIn: ["dismissed"] } } }),
    prisma.reputationIssue.count({ where: { campaignId: cid, status: { notIn: ["resolved", "archived"] } } }),
    prisma.reputationIssue.count({ where: { campaignId: cid, slaDeadline: { lt: now }, status: { notIn: ["resolved", "archived"] } } }),
    prisma.reputationIssue.count({ where: { campaignId: cid, status: "escalated" } }),
    prisma.reputationResponseAction.count({ where: { campaignId: cid, status: { in: ["draft", "awaiting_approval"] } } }),
    prisma.reputationAlert.findMany({
      where: { campaignId: cid, status: "new" },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, title: true, severity: true, sentiment: true, sourceType: true, detectedAt: true },
    }),
  ]);

  return NextResponse.json({
    newAlerts,
    criticalAlerts,
    openIssues,
    overdueIssues,
    escalatedIssues,
    pendingActions,
    recentAlerts,
  }, { headers: { "Cache-Control": "no-store" } });
}
