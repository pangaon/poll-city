/**
 * GET /api/alerts/summary?campaignId=X
 *
 * Lightweight endpoint for the topbar bell — returns counts + top 3 alerts.
 * Uses the same detection logic as the full alerts page but runs server-side.
 */
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

  // Pull raw metrics in parallel (fast — count queries only)
  const [
    followUpCount,
    p1Uncontacted,
    pendingSigns,
    shiftsUnfilled,
    spendingAgg,
    campaign,
    inactiveCanvassers,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId: cid, followUpNeeded: true, isDeceased: false } }),
    prisma.contact.count({ where: { campaignId: cid, supportLevel: "strong_support", voted: false, isDeceased: false } }),
    prisma.sign.count({ where: { campaignId: cid, status: "requested" } }),
    prisma.volunteerShift.count({
      where: {
        campaignId: cid,
        shiftDate: { gte: new Date() },
        signups: { none: {} },
      },
    }),
    prisma.budgetItem.aggregate({ where: { campaignId: cid }, _sum: { amount: true } }).catch(() => null),
    prisma.campaign.findUnique({ where: { id: cid }, select: { spendingLimit: true, electionDate: true } }),
    prisma.membership.count({
      where: {
        campaignId: cid,
        user: {
          interactions: {
            none: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          },
        },
      },
    }).catch(() => 0),
  ]);

  const spendingTotal = Number(spendingAgg?._sum?.amount ?? 0);
  const spendingLimit = Number(campaign?.spendingLimit ?? 0);
  const spendingPct = spendingLimit > 0 ? (spendingTotal / spendingLimit) * 100 : 0;

  type SevLevel = "critical" | "warning" | "watch";
  const alerts: Array<{ id: string; severity: SevLevel; title: string; module: string }> = [];

  if (p1Uncontacted > 50)
    alerts.push({ id: "p1", severity: "critical", title: `${p1Uncontacted} strong supporters not yet contacted`, module: "GOTV" });
  else if (p1Uncontacted > 20)
    alerts.push({ id: "p1", severity: "warning", title: `${p1Uncontacted} strong supporters not yet contacted`, module: "GOTV" });

  if (followUpCount > 50)
    alerts.push({ id: "fu", severity: "warning", title: `${followUpCount} follow-ups overdue`, module: "Field Ops" });
  else if (followUpCount > 20)
    alerts.push({ id: "fu", severity: "watch", title: `${followUpCount} follow-ups pending`, module: "Field Ops" });

  if (spendingPct >= 95)
    alerts.push({ id: "spend", severity: "critical", title: `Spending at ${Math.round(spendingPct)}% of limit`, module: "Finance" });
  else if (spendingPct >= 80)
    alerts.push({ id: "spend", severity: "warning", title: `Spending at ${Math.round(spendingPct)}% of limit`, module: "Finance" });

  if (pendingSigns > 20)
    alerts.push({ id: "signs", severity: "watch", title: `${pendingSigns} sign requests pending`, module: "Signs" });

  if (shiftsUnfilled > 3)
    alerts.push({ id: "shifts", severity: "warning", title: `${shiftsUnfilled} upcoming shifts unfilled`, module: "Volunteers" });

  if (inactiveCanvassers > 5)
    alerts.push({ id: "canvas", severity: "watch", title: `${inactiveCanvassers} canvassers inactive this week`, module: "Field Ops" });

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.filter((a) => a.severity === "warning").length;

  // Sort: critical first, then warning, then watch
  const sevOrder: Record<SevLevel, number> = { critical: 0, warning: 1, watch: 2 };
  alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return NextResponse.json({
    critical,
    warning,
    top: alerts.slice(0, 4),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
