/**
 * GET /api/maps/ward-progress — ward and turf completion summary for dashboard.
 *
 * Returns per-ward aggregated progress: contact count, doors knocked,
 * completion percentage, turf count, assigned volunteers.
 * Used by dashboard ward progress widget and map legend.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

interface WardProgress {
  ward: string;
  totalContacts: number;
  doorsKnocked: number;
  completionPct: number;
  turfCount: number;
  turfsComplete: number;
  turfsInProgress: number;
  assignedVolunteers: number;
  status: "not_started" | "in_progress" | "complete";
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  // Get all turfs for the campaign
  const turfs = await prisma.turf.findMany({
    where: { campaignId: campaignId! },
    select: {
      ward: true,
      totalStops: true,
      completedStops: true,
      completionPercent: true,
      totalDoors: true,
      doorsKnocked: true,
      assignedUserId: true,
      assignedVolunteerId: true,
    },
  });

  // Get contact counts per ward
  const contactsByWard = await prisma.contact.groupBy({
    by: ["ward"],
    where: { campaignId: campaignId!, isDeceased: false, doNotContact: false, ward: { not: null } },
    _count: true,
  });

  // Get interaction counts per ward (doors knocked)
  const interactionsByWard: Array<{ ward: string; count: number }> = [];
  for (const wc of contactsByWard) {
    if (!wc.ward) continue;
    const count = await prisma.interaction.count({
      where: {
        contact: { campaignId: campaignId!, ward: wc.ward },
        type: "door_knock" as never,
      },
    });
    interactionsByWard.push({ ward: wc.ward, count });
  }

  // Build ward map
  const wardMap = new Map<string, WardProgress>();

  for (const wc of contactsByWard) {
    if (!wc.ward) continue;
    const contactCount = wc._count as number;
    const doors = interactionsByWard.find((i) => i.ward === wc.ward)?.count ?? 0;
    const pct = contactCount > 0 ? Math.round((doors / contactCount) * 100) : 0;
    wardMap.set(wc.ward, {
      ward: wc.ward,
      totalContacts: contactCount,
      doorsKnocked: doors,
      completionPct: Math.min(100, pct),
      turfCount: 0,
      turfsComplete: 0,
      turfsInProgress: 0,
      assignedVolunteers: 0,
      status: pct >= 90 ? "complete" : pct > 0 ? "in_progress" : "not_started",
    });
  }

  // Overlay turf data
  for (const turf of turfs) {
    const wardName = turf.ward ?? "Unassigned";
    let entry = wardMap.get(wardName);
    if (!entry) {
      entry = {
        ward: wardName,
        totalContacts: 0,
        doorsKnocked: 0,
        completionPct: 0,
        turfCount: 0,
        turfsComplete: 0,
        turfsInProgress: 0,
        assignedVolunteers: 0,
        status: "not_started",
      };
      wardMap.set(wardName, entry);
    }
    entry.turfCount++;
    const turfPct = turf.completionPercent ?? 0;
    if (turfPct >= 90) entry.turfsComplete++;
    else if (turfPct > 0) entry.turfsInProgress++;
    if (turf.assignedUserId || turf.assignedVolunteerId) entry.assignedVolunteers++;
  }

  const wards = Array.from(wardMap.values()).sort((a, b) => b.totalContacts - a.totalContacts);

  // Overall summary
  const totalContacts = wards.reduce((s, w) => s + w.totalContacts, 0);
  const totalKnocked = wards.reduce((s, w) => s + w.doorsKnocked, 0);
  const totalTurfs = turfs.length;
  const turfsComplete = wards.reduce((s, w) => s + w.turfsComplete, 0);
  const wardsComplete = wards.filter((w) => w.status === "complete").length;
  const wardsInProgress = wards.filter((w) => w.status === "in_progress").length;

  return NextResponse.json({
    wards,
    summary: {
      totalWards: wards.length,
      wardsComplete,
      wardsInProgress,
      wardsNotStarted: wards.length - wardsComplete - wardsInProgress,
      totalContacts,
      totalKnocked,
      overallPct: totalContacts > 0 ? Math.round((totalKnocked / totalContacts) * 100) : 0,
      totalTurfs,
      turfsComplete,
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
