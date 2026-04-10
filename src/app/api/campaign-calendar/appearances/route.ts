import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError } from "@/lib/api/errors";
import { CandidateAppearanceFormat } from "@prisma/client";

const CreateAppearanceSchema = z.object({
  calendarItemId: z.string().min(1),
  appearanceFormat: z.nativeEnum(CandidateAppearanceFormat).default("other"),
  hostOrganization: z.string().max(200).optional(),
  hostContactName: z.string().max(200).optional(),
  hostContactPhone: z.string().max(20).optional(),
  hostContactEmail: z.string().email().optional(),
  expectedAttendees: z.number().int().min(0).optional(),
  mediaPresent: z.boolean().default(false),
  mediaOutlets: z.array(z.string()).default([]),
  hasLiveStream: z.boolean().default(false),
  liveStreamUrl: z.string().url().optional(),
  speakingDurationMinutes: z.number().int().min(0).optional(),
  prepWindowMinutes: z.number().int().min(0).default(30),
  travelRequiresVehicle: z.boolean().default(false),
  travelNotes: z.string().max(1000).optional(),
  talkingPoints: z.array(z.string()).default([]),
  briefingNotes: z.string().max(5000).optional(),
  briefingDocumentUrl: z.string().url().optional(),
  dresscode: z.string().max(200).optional(),
  staffingNotes: z.string().max(2000).optional(),
  securityNotes: z.string().max(2000).optional(),
});

// GET /api/campaign-calendar/appearances?calendarItemId=&format=&upcoming=true
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { searchParams } = new URL(req.url);
  const calendarItemId = searchParams.get("calendarItemId");
  const format = searchParams.get("format") as CandidateAppearanceFormat | null;
  const upcoming = searchParams.get("upcoming") === "true";

  try {
    const where: Record<string, unknown> = { campaignId };

    if (calendarItemId) where.calendarItemId = calendarItemId;
    if (format) where.appearanceFormat = format;

    if (upcoming) {
      where.calendarItem = {
        startAt: { gte: new Date() },
        deletedAt: null,
      };
    }

    const appearances = await prisma.candidateAppearance.findMany({
      where,
      include: {
        calendarItem: {
          select: {
            id: true, title: true, startAt: true, endAt: true,
            itemType: true, itemStatus: true, locationType: true,
            locationName: true, city: true, province: true,
            virtualUrl: true, ward: true,
            calendar: { select: { id: true, name: true, color: true } },
            assignments: {
              include: { assignedUser: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
      orderBy: { calendarItem: { startAt: "asc" } },
    });

    return NextResponse.json({ data: appearances, meta: { total: appearances.length } });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/appearances");
  }
}

// POST /api/campaign-calendar/appearances
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = CreateAppearanceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, { issues: parsed.error.issues });
  }

  const data = parsed.data;

  // Verify calendarItem belongs to this campaign
  const calItem = await prisma.calendarItem.findFirst({
    where: { id: data.calendarItemId, campaignId, deletedAt: null },
  });
  if (!calItem) return apiError("Calendar item not found", 404);

  // Only one appearance record per item
  const existing = await prisma.candidateAppearance.findUnique({
    where: { calendarItemId: data.calendarItemId },
  });
  if (existing) return apiError("Appearance record already exists for this item — use PATCH to update", 409);

  try {
    const appearance = await prisma.candidateAppearance.create({
      data: {
        campaignId,
        calendarItemId: data.calendarItemId,
        appearanceFormat: data.appearanceFormat,
        hostOrganization: data.hostOrganization,
        hostContactName: data.hostContactName,
        hostContactPhone: data.hostContactPhone,
        hostContactEmail: data.hostContactEmail,
        expectedAttendees: data.expectedAttendees,
        mediaPresent: data.mediaPresent,
        mediaOutlets: data.mediaOutlets,
        hasLiveStream: data.hasLiveStream,
        liveStreamUrl: data.liveStreamUrl,
        speakingDurationMinutes: data.speakingDurationMinutes,
        prepWindowMinutes: data.prepWindowMinutes,
        travelRequiresVehicle: data.travelRequiresVehicle,
        travelNotes: data.travelNotes,
        talkingPoints: data.talkingPoints,
        briefingNotes: data.briefingNotes,
        briefingDocumentUrl: data.briefingDocumentUrl,
        dresscode: data.dresscode,
        staffingNotes: data.staffingNotes,
        securityNotes: data.securityNotes,
      },
      include: {
        calendarItem: { select: { id: true, title: true, startAt: true, itemType: true } },
      },
    });

    await prisma.calendarAuditLog.create({
      data: {
        campaignId,
        entityType: "candidate_appearance",
        entityId: appearance.id,
        action: "created",
        newValueJson: { calendarItemId: data.calendarItemId, format: data.appearanceFormat },
        actorUserId: session!.user.id as string,
      },
    });

    return NextResponse.json({ data: appearance }, { status: 201 });
  } catch (err) {
    return internalError(err, "POST /api/campaign-calendar/appearances");
  }
}
