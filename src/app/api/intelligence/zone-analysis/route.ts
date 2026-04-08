/**
 * GET /api/intelligence/zone-analysis — High-priority zone identification.
 *
 * What Qomon does: "High-priority zone identification."
 * What we do: rank every zone by persuasion opportunity, canvassing ROI,
 * GOTV reliability, and volunteer density. Tell the field director
 * EXACTLY where to deploy resources.
 *
 * Zones are defined by municipal poll boundaries.
 * Each zone gets a composite priority score and a recommended action.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const contacts = await prisma.contact.findMany({
    where: { campaignId: campaignId!, isDeceased: false },
    select: {
      municipalPoll: true, supportLevel: true, voted: true,
      lastContactedAt: true, notHome: true, phone: true,
      signPlaced: true, volunteerInterest: true,
    },
  });

  // Group by poll
  const zones = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const zone = c.municipalPoll ?? "Unassigned";
    if (!zones.has(zone)) zones.set(zone, []);
    zones.get(zone)!.push(c);
  }

  const zoneAnalysis = Array.from(zones.entries())
    .filter(([, zc]) => zc.length >= 10)
    .map(([zone, zc]) => {
      const total = zc.length;
      const supporters = zc.filter((c) => (c.supportLevel as string) === "strong_support" || (c.supportLevel as string) === "leaning_support").length;
      const undecided = zc.filter((c) => (c.supportLevel as string) === "undecided").length;
      const unknown = zc.filter((c) => (c.supportLevel as string) === "unknown").length;
      const against = zc.filter((c) => (c.supportLevel as string) === "strong_opposition" || (c.supportLevel as string) === "leaning_opposition").length;
      const contacted = zc.filter((c) => c.lastContactedAt).length;
      const notHome = zc.filter((c) => c.notHome).length;
      const voted = zc.filter((c) => c.voted).length;
      const withPhone = zc.filter((c) => c.phone).length;
      const signs = zc.filter((c) => c.signPlaced).length;
      const volInterest = zc.filter((c) => c.volunteerInterest).length;

      const supportRate = Math.round((supporters / total) * 100);
      const undecidedRate = Math.round((undecided / total) * 100);
      const contactedRate = Math.round((contacted / total) * 100);

      // Priority scoring
      // Persuasion opportunity: high undecided + low contacted = gold
      const persuasionScore = (undecidedRate * 0.5) + ((100 - contactedRate) * 0.3) + (notHome / total * 100 * 0.2);

      // GOTV reliability: high supporters + high phone coverage
      const gotvScore = (supportRate * 0.6) + (withPhone / total * 100 * 0.4);

      // Canvassing ROI: large zone + low contacted = high efficiency
      const canvassROI = total * (1 - contacted / total);

      // Composite priority
      const priorityScore = Math.round(persuasionScore * 0.4 + gotvScore * 0.3 + (canvassROI / 10) * 0.3);

      // Recommended action
      let action: string;
      let actionType: "canvass" | "phone" | "gotv" | "signs" | "skip";
      if (undecidedRate > 30 && contactedRate < 50) {
        action = `High persuasion zone — ${undecided} undecided, only ${contactedRate}% contacted. Priority canvass target.`;
        actionType = "canvass";
      } else if (supportRate > 50 && voted < supporters * 0.5) {
        action = `GOTV priority — ${supporters} supporters but only ${voted} voted. Phone bank this zone.`;
        actionType = "gotv";
      } else if (unknown > total * 0.4) {
        action = `Unknown territory — ${unknown} unidentified contacts. Full canvass sweep needed.`;
        actionType = "canvass";
      } else if (supportRate > 40 && signs < 3) {
        action = `Friendly zone with no signs — deploy lawn signs for visibility.`;
        actionType = "signs";
      } else if (notHome > total * 0.3 && contactedRate > 50) {
        action = `${notHome} not-home contacts. Try evening canvass (5:30-8pm) or phone calls.`;
        actionType = "phone";
      } else if (against > total * 0.5) {
        action = `Opposition-heavy zone. Deprioritize — focus resources elsewhere.`;
        actionType = "skip";
      } else {
        action = `Balanced zone. Maintain regular canvass cadence.`;
        actionType = "canvass";
      }

      return {
        zone,
        total,
        breakdown: { supporters, undecided, unknown, against },
        rates: { supportRate, undecidedRate, contactedRate, votedRate: Math.round((voted / total) * 100) },
        coverage: { withPhone, signs, volInterest, notHome },
        scores: { persuasion: Math.round(persuasionScore), gotv: Math.round(gotvScore), canvassROI: Math.round(canvassROI), priority: priorityScore },
        recommendation: { action, actionType },
      };
    })
    .sort((a, b) => b.scores.priority - a.scores.priority);

  return NextResponse.json({
    zones: zoneAnalysis,
    totalZones: zoneAnalysis.length,
    topPersuasion: zoneAnalysis.filter((z) => z.recommendation.actionType === "canvass").slice(0, 5),
    topGOTV: zoneAnalysis.filter((z) => z.recommendation.actionType === "gotv").slice(0, 5),
    deprioritize: zoneAnalysis.filter((z) => z.recommendation.actionType === "skip"),
  });
}
