/**
 * GET /api/canvassing/smart-plan — AI-powered canvass deployment plan.
 *
 * From the SUBJECT-MATTER-BIBLE: "The field director is deploying 20
 * volunteers across 8 turfs simultaneously. They need to see everything
 * at once. They need to reassign turfs on the fly."
 *
 * This endpoint answers: "I have N volunteers tonight. Where do I send them?"
 *
 * Algorithm:
 * 1. Rank streets by persuadable density (undecided contacts per block)
 * 2. Penalize streets recently canvassed (diminishing returns)
 * 3. Boost streets with high not-home rate (worth revisiting)
 * 4. Cluster into volunteer-sized turfs (~80 doors each)
 * 5. Return ordered deployment plan
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

interface StreetScore {
  street: string;
  totalContacts: number;
  undecided: number;
  notContacted: number;
  notHome: number;
  supporters: number;
  lastCanvassed: Date | null;
  score: number;
  reason: string;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const volunteersAvailable = Math.max(1, Number(sp.get("volunteers") || "4"));
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all contacts with their street info and status
  const contacts = await prisma.contact.findMany({
    where: { campaignId, isDeceased: false, doNotContact: false },
    select: {
      id: true,
      streetName: true,
      address1: true,
      supportLevel: true,
      lastContactedAt: true,
      notHome: true,
    },
  });

  // Group by street
  const streetMap = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const street = c.streetName ?? c.address1?.replace(/^\d+\s*/, "").split(",")[0]?.trim() ?? "Unknown";
    if (!streetMap.has(street)) streetMap.set(street, []);
    streetMap.get(street)!.push(c);
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Score each street
  const streetScores: StreetScore[] = [];
  for (const [street, streetContacts] of Array.from(streetMap.entries())) {
    if (street === "Unknown" || streetContacts.length < 3) continue;

    const undecided = streetContacts.filter((c) => c.supportLevel === "undecided").length;
    const notContacted = streetContacts.filter((c) => !c.lastContactedAt).length;
    const notHome = streetContacts.filter((c) => c.notHome).length;
    const supporters = streetContacts.filter((c) => c.supportLevel === "strong_support" || c.supportLevel === "leaning_support").length;

    const lastCanvassed = streetContacts
      .filter((c) => c.lastContactedAt)
      .reduce((latest, c) => (c.lastContactedAt && (!latest || c.lastContactedAt > latest) ? c.lastContactedAt : latest), null as Date | null);

    // Scoring algorithm
    let score = 0;
    let reason = "";

    // Undecided density is king — these are the persuadable voters
    const undecidedRate = undecided / streetContacts.length;
    score += undecidedRate * 40;

    // Not-contacted contacts = unknown potential
    const notContactedRate = notContacted / streetContacts.length;
    score += notContactedRate * 25;

    // Not-home contacts = worth revisiting (evening canvass)
    const notHomeRate = notHome / streetContacts.length;
    score += notHomeRate * 15;

    // Recency penalty — recently canvassed streets get lower priority
    if (lastCanvassed) {
      const daysSince = (now - lastCanvassed.getTime()) / dayMs;
      if (daysSince < 3) score *= 0.3; // heavily penalize <3 days
      else if (daysSince < 7) score *= 0.6;
      else if (daysSince < 14) score *= 0.8;
    }

    // Street size bonus — larger streets are more efficient for canvassers
    if (streetContacts.length >= 20) score *= 1.2;

    // Determine primary reason
    if (undecidedRate > 0.3) reason = `${undecided} undecided voters — high persuasion opportunity`;
    else if (notContactedRate > 0.5) reason = `${notContacted} contacts never reached — unknown potential`;
    else if (notHomeRate > 0.3) reason = `${notHome} not-home from previous visits — evening revisit`;
    else if (supporters > 5) reason = `${supporters} supporters — reinforce and recruit volunteers`;
    else reason = `${streetContacts.length} contacts to reach`;

    streetScores.push({
      street,
      totalContacts: streetContacts.length,
      undecided,
      notContacted,
      notHome,
      supporters,
      lastCanvassed,
      score: Math.round(score * 100) / 100,
      reason,
    });
  }

  // Sort by score descending
  streetScores.sort((a, b) => b.score - a.score);

  // Create deployment plan — assign top streets to volunteers
  const doorsPerVolunteer = 80;
  const plan: { volunteer: number; streets: StreetScore[]; totalDoors: number; estimatedHours: number }[] = [];

  let streetIdx = 0;
  for (let v = 0; v < volunteersAvailable; v++) {
    const assignment: StreetScore[] = [];
    let doors = 0;

    while (streetIdx < streetScores.length && doors < doorsPerVolunteer) {
      const street = streetScores[streetIdx];
      assignment.push(street);
      doors += street.totalContacts;
      streetIdx++;
    }

    if (assignment.length > 0) {
      plan.push({
        volunteer: v + 1,
        streets: assignment,
        totalDoors: doors,
        estimatedHours: Math.round((doors / 25) * 10) / 10, // ~25 doors per hour
      });
    }
  }

  return NextResponse.json({
    volunteersAvailable,
    totalStreetsScored: streetScores.length,
    plan,
    topStreets: streetScores.slice(0, 20),
    uncovered: streetScores.slice(streetIdx),
  });
}
