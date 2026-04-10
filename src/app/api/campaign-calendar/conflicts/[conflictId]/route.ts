import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError, NOT_FOUND } from "@/lib/api/errors";

const ResolveSchema = z.object({
  status: z.enum(["resolved", "dismissed", "acknowledged"]),
  resolutionNotes: z.string().max(500).optional(),
});

interface Params {
  params: Promise<{ conflictId: string }>;
}

// PATCH /api/campaign-calendar/conflicts/[conflictId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { conflictId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = ResolveSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, { issues: parsed.error.issues });
  }

  try {
    const conflict = await prisma.scheduleConflict.findFirst({
      where: { id: conflictId, campaignId },
    });
    if (!conflict) return NOT_FOUND;

    const updated = await prisma.scheduleConflict.update({
      where: { id: conflictId },
      data: {
        status: parsed.data.status,
        resolvedAt: parsed.data.status !== "acknowledged" ? new Date() : undefined,
        resolvedByUserId: session!.user.id as string,
        resolutionNotes: parsed.data.resolutionNotes,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return internalError(err, "PATCH /api/campaign-calendar/conflicts/[conflictId]");
  }
}
