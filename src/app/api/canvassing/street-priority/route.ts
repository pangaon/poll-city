/**
 * GET /api/canvassing/street-priority?street=Oak+Street — Street-level intelligence.
 *
 * From the SUBJECT-MATTER-BIBLE: "Three houses in a row with opposition signs?
 * The system flags that block as low priority."
 *
 * Returns a complete picture of a single street:
 * contacts, support breakdown, sign intelligence, canvass history,
 * and a recommended action.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const street = sp.get("street");
  if (!campaignId || !street) return NextResponse.json({ error: "campaignId and street required" }, { status: 400 });

  const contacts = await prisma.contact.findMany({
    where: { campaignId: campaignId!, address1: { contains: street, mode: "insensitive" } },
    select: {
      id: true, firstName: true, lastName: true, address1: true,
      supportLevel: true, lastContactedAt: true, notHome: true, phone: true,
      signRequested: true, signPlaced: true, volunteerInterest: true,
    },
    orderBy: { address1: "asc" },
  });

  const total = contacts.length;
  if (total === 0) {
    return NextResponse.json({ street, total: 0, message: "No contacts found on this street" });
  }

  const supporters = contacts.filter((c) => (c.supportLevel as string) === "strong_support" || (c.supportLevel as string) === "leaning_support").length;
  const undecided = contacts.filter((c) => (c.supportLevel as string) === "undecided").length;
  const against = contacts.filter((c) => (c.supportLevel as string) === "strong_opposition" || (c.supportLevel as string) === "leaning_opposition").length;
  const unknown = contacts.filter((c) => (c.supportLevel as string) === "unknown").length;
  const notContacted = contacts.filter((c) => !c.lastContactedAt).length;
  const notHome = contacts.filter((c) => c.notHome).length;
  const withPhone = contacts.filter((c) => c.phone).length;
  const signRequests = contacts.filter((c) => c.signRequested).length;
  const signsPlaced = contacts.filter((c) => c.signPlaced).length;
  const volunteerInterest = contacts.filter((c) => c.volunteerInterest).length;

  const supportRate = total > 0 ? Math.round((supporters / total) * 100) : 0;

  // Determine recommended action
  let recommendation: string;
  let priority: "high" | "medium" | "low";

  if (undecided > total * 0.3) {
    recommendation = `High persuasion opportunity — ${undecided} undecided voters. Send your best canvasser with the persuadable script.`;
    priority = "high";
  } else if (notContacted > total * 0.5) {
    recommendation = `${notContacted} contacts never reached. Fresh territory — worth a full canvass sweep.`;
    priority = "high";
  } else if (notHome > total * 0.4) {
    recommendation = `${notHome} not-home from previous visits. Try an evening canvass (5:30-8pm weekday).`;
    priority = "medium";
  } else if (against > total * 0.5) {
    recommendation = `Opposition-heavy street (${against} against). Deprioritize — focus effort on persuadable streets.`;
    priority = "low";
  } else if (supporters > total * 0.5) {
    recommendation = `Friendly street — ${supporters} supporters. Good for sign deployment and volunteer recruitment.`;
    priority = "medium";
  } else {
    recommendation = `Mixed street. ${undecided} undecided, ${notContacted} not contacted. Worth a targeted visit.`;
    priority = "medium";
  }

  return NextResponse.json({
    street,
    total,
    breakdown: { supporters, undecided, against, unknown, notContacted, notHome },
    supportRate,
    assets: { withPhone, signRequests, signsPlaced, volunteerInterest },
    recommendation,
    priority,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      address: c.address1,
      supportLevel: c.supportLevel,
      lastContacted: c.lastContactedAt,
      notHome: c.notHome,
      hasPhone: !!c.phone,
    })),
  });
}
