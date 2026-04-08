/**
 * POST /api/canvassing/debrief — End-of-shift canvassing debrief.
 *
 * From SUBJECT-MATTER-BIBLE Part 3:
 * "At the end of the night the app asks three questions:
 * 'How did it feel out there tonight?'
 * 'Any streets that need follow-up?'
 * 'Anything unusual we should know about?'
 *
 * These answers go to the field director.
 * They appear in Adoni's morning brief."
 */
import { sanitizeUserText } from "@/lib/security/monitor";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const debriefSchema = z.object({
  campaignId: z.string().min(1),
  turfId: z.string().nullish(),
  feeling: z.enum(["great", "good", "okay", "tough", "hostile"]),
  streetsNeedFollowUp: z.string().max(1000).nullish(),
  unusualNotes: z.string().max(2000).nullish(),
  doorsKnocked: z.number().int().min(0).nullish(),
  bestMoment: z.string().max(500).nullish(),
});

/** GET — List debriefs for a campaign (field director view) */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const debriefs = await prisma.activityLog.findMany({
    where: { campaignId: campaignId!, action: "canvass_debrief" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    debriefs: debriefs.map((d) => ({
      id: d.id,
      volunteer: d.user?.name ?? "Unknown",
      ...((d.details as Record<string, unknown>) ?? {}),
      createdAt: d.createdAt,
    })),
  });
}

/** POST — Submit a canvassing debrief */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json();
  const parsed = debriefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { campaignId, turfId, feeling, streetsNeedFollowUp, unusualNotes, doorsKnocked, bestMoment } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Store as activity log with rich details (appears in Adoni morning brief)
  const log = await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "canvass_debrief",
      entityType: "canvass_debrief",
      entityId: turfId ?? campaignId,
      details: {
        feeling,
        streetsNeedFollowUp: sanitizeUserText(streetsNeedFollowUp),
        unusualNotes: sanitizeUserText(unusualNotes),
        doorsKnocked: doorsKnocked ?? null,
        bestMoment: sanitizeUserText(bestMoment),
        turfId: turfId ?? null,
      },
    },
  });

  return NextResponse.json({ ok: true, debriefId: log.id }, { status: 201 });
}
