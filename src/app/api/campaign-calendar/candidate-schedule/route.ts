import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError } from "@/lib/api/errors";
import { CalendarItemType, CalendarItemStatus } from "@prisma/client";

// Candidate-facing item types — everything the candidate personally attends
const CANDIDATE_TYPES: CalendarItemType[] = [
  "candidate_appearance",
  "debate",
  "media_appearance",
  "fundraiser",
  "donor_meeting",
  "town_hall",
  "community_meeting",
];

// GET /api/campaign-calendar/candidate-schedule?start=&end=&status=
// Returns all candidate-facing items with CandidateAppearance detail joined.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { searchParams } = new URL(req.url);
  const start  = searchParams.get("start");
  const end    = searchParams.get("end");
  const status = searchParams.get("status") as CalendarItemStatus | null;

  try {
    const where: Record<string, unknown> = {
      campaignId,
      deletedAt: null,
      itemType: { in: CANDIDATE_TYPES },
    };

    if (start && end) {
      where.startAt = { gte: new Date(start) };
      where.endAt   = { lte: new Date(end) };
    } else if (start) {
      where.startAt = { gte: new Date(start) };
    } else {
      // Default: today forward
      where.startAt = { gte: new Date() };
    }

    if (status) where.itemStatus = status;

    const items = await prisma.calendarItem.findMany({
      where,
      include: {
        calendar: { select: { id: true, name: true, color: true } },
        candidateAppearance: true,
        assignments: {
          include: {
            assignedUser: { select: { id: true, name: true, avatarUrl: true, phone: true } },
          },
        },
        conflictsSource: {
          where: { status: "open" },
          select: { id: true, conflictType: true, severity: true, entityLabel: true },
        },
        reminders: { select: { id: true, minutesBefore: true, deliveryChannel: true, status: true } },
      },
      orderBy: { startAt: "asc" },
    });

    // Summary stats for the schedule header
    const now = new Date();
    const electionDay = items.find(i => i.itemType === "poll_day_ops");
    const nextDebate  = items.find(i => i.itemType === "debate" && i.startAt > now);
    const nextMedia   = items.find(i => i.itemType === "media_appearance" && i.startAt > now);

    const countByType: Record<string, number> = {};
    for (const item of items) {
      countByType[item.itemType] = (countByType[item.itemType] ?? 0) + 1;
    }

    return NextResponse.json({
      data: items,
      meta: {
        total: items.length,
        nextDebate: nextDebate
          ? { id: nextDebate.id, title: nextDebate.title, startAt: nextDebate.startAt }
          : null,
        nextMedia: nextMedia
          ? { id: nextMedia.id, title: nextMedia.title, startAt: nextMedia.startAt }
          : null,
        electionDay: electionDay?.startAt ?? null,
        countByType,
      },
    });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/candidate-schedule");
  }
}
