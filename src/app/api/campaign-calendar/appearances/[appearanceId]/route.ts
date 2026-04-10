import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError, NOT_FOUND } from "@/lib/api/errors";
import { CandidateAppearanceFormat } from "@prisma/client";

const UpdateAppearanceSchema = z.object({
  appearanceFormat: z.nativeEnum(CandidateAppearanceFormat).optional(),
  hostOrganization: z.string().max(200).nullable().optional(),
  hostContactName: z.string().max(200).nullable().optional(),
  hostContactPhone: z.string().max(20).nullable().optional(),
  hostContactEmail: z.string().email().nullable().optional(),
  expectedAttendees: z.number().int().min(0).nullable().optional(),
  mediaPresent: z.boolean().optional(),
  mediaOutlets: z.array(z.string()).optional(),
  hasLiveStream: z.boolean().optional(),
  liveStreamUrl: z.string().url().nullable().optional(),
  speakingDurationMinutes: z.number().int().min(0).nullable().optional(),
  prepWindowMinutes: z.number().int().min(0).optional(),
  travelRequiresVehicle: z.boolean().optional(),
  travelNotes: z.string().max(1000).nullable().optional(),
  talkingPoints: z.array(z.string()).optional(),
  briefingNotes: z.string().max(5000).nullable().optional(),
  briefingDocumentUrl: z.string().url().nullable().optional(),
  dresscode: z.string().max(200).nullable().optional(),
  staffingNotes: z.string().max(2000).nullable().optional(),
  securityNotes: z.string().max(2000).nullable().optional(),
});

interface Params {
  params: Promise<{ appearanceId: string }>;
}

// GET /api/campaign-calendar/appearances/[appearanceId]
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { appearanceId } = await params;

  try {
    const appearance = await prisma.candidateAppearance.findFirst({
      where: { id: appearanceId, campaignId },
      include: {
        calendarItem: {
          include: {
            calendar: { select: { id: true, name: true, color: true } },
            assignments: {
              include: {
                assignedUser: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
              },
            },
            conflictsSource: {
              where: { status: "open" },
              select: { id: true, conflictType: true, severity: true },
            },
          },
        },
      },
    });

    if (!appearance) return NOT_FOUND;
    return NextResponse.json({ data: appearance });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/appearances/[appearanceId]");
  }
}

// PATCH /api/campaign-calendar/appearances/[appearanceId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { appearanceId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = UpdateAppearanceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, { issues: parsed.error.issues });
  }

  try {
    const existing = await prisma.candidateAppearance.findFirst({
      where: { id: appearanceId, campaignId },
    });
    if (!existing) return NOT_FOUND;

    const updated = await prisma.candidateAppearance.update({
      where: { id: appearanceId },
      data: parsed.data,
      include: {
        calendarItem: { select: { id: true, title: true, startAt: true, itemType: true } },
      },
    });

    await prisma.calendarAuditLog.create({
      data: {
        campaignId,
        entityType: "candidate_appearance",
        entityId: appearanceId,
        action: "updated",
        oldValueJson: { format: existing.appearanceFormat },
        newValueJson: { format: updated.appearanceFormat },
        actorUserId: session!.user.id as string,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return internalError(err, "PATCH /api/campaign-calendar/appearances/[appearanceId]");
  }
}

// DELETE /api/campaign-calendar/appearances/[appearanceId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { appearanceId } = await params;

  try {
    const existing = await prisma.candidateAppearance.findFirst({
      where: { id: appearanceId, campaignId },
    });
    if (!existing) return NOT_FOUND;

    await prisma.candidateAppearance.delete({ where: { id: appearanceId } });

    await prisma.calendarAuditLog.create({
      data: {
        campaignId,
        entityType: "candidate_appearance",
        entityId: appearanceId,
        action: "deleted",
        oldValueJson: { calendarItemId: existing.calendarItemId },
        actorUserId: session!.user.id as string,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(err, "DELETE /api/campaign-calendar/appearances/[appearanceId]");
  }
}
