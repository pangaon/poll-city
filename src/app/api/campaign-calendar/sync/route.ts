import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError } from "@/lib/api/errors";
import { CalendarSyncProvider, SyncDirection } from "@prisma/client";

const ConnectSchema = z.object({
  provider: z.nativeEnum(CalendarSyncProvider),
  externalCalendarId: z.string().max(500).optional(),
  externalCalendarName: z.string().max(200).optional(),
  syncDirection: z.nativeEnum(SyncDirection).default("bidirectional"),
  pushCalendarIds: z.array(z.string()).default([]),
  pullCalendarIds: z.array(z.string()).default([]),
});

// GET /api/campaign-calendar/sync — list sync accounts for current user
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const userId = session!.user.id as string;

  try {
    const accounts = await prisma.calendarSyncAccount.findMany({
      where: { campaignId, userId },
      include: {
        syncLogs: {
          orderBy: { syncStartedAt: "desc" },
          take: 1,
          select: { syncStartedAt: true, success: true, itemsPushed: true, itemsPulled: true, errorMessage: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: accounts, meta: { total: accounts.length } });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/sync");
  }
}

// POST /api/campaign-calendar/sync — register a new sync account (stub: sets pending_auth)
// In production this would initiate OAuth. For now it creates the record and returns
// a placeholder auth URL that the user would follow.
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const userId = session!.user.id as string;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, { issues: parsed.error.issues });
  }

  const data = parsed.data;

  // One connection per user × provider × external calendar
  const existing = await prisma.calendarSyncAccount.findFirst({
    where: { userId, provider: data.provider, externalCalendarId: data.externalCalendarId ?? null },
  });
  if (existing) return apiError("Sync account already connected for this provider", 409);

  try {
    const account = await prisma.calendarSyncAccount.create({
      data: {
        campaignId,
        userId,
        provider: data.provider,
        externalCalendarId: data.externalCalendarId,
        externalCalendarName: data.externalCalendarName,
        syncDirection: data.syncDirection,
        syncStatus: "pending_auth",
        pushCalendarIds: data.pushCalendarIds,
        pullCalendarIds: data.pullCalendarIds,
      },
    });

    // Stub auth URLs — in production these would be real OAuth flows
    const authUrls: Record<string, string> = {
      google_calendar: "https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/calendar&access_type=offline&response_type=code&client_id=STUB",
      apple_calendar:  "https://appleid.apple.com/auth/authorize?STUB",
      outlook:         "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?STUB",
      ical_feed:       null as unknown as string,
    };

    return NextResponse.json({
      data: account,
      authUrl: authUrls[data.provider] ?? null,
      note: "Calendar sync is in preview. OAuth flow not yet wired — account created in pending_auth state.",
    }, { status: 201 });
  } catch (err) {
    return internalError(err, "POST /api/campaign-calendar/sync");
  }
}
