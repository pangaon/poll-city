import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import { createVoiceBroadcastSchema } from "@/lib/validators/voice";

/** GET — List voice broadcasts for the active campaign */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "sms:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const broadcasts = await prisma.voiceBroadcast.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ broadcasts });
}

/** POST — Create a new voice broadcast (draft) */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "sms:write");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const body = await req.json();
  const parsed = createVoiceBroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { name, type, audioUrl, twimlScript, ivrQuestions, targetAudience, callerId, callerIdName, callWindowStart, callWindowEnd, scheduledFor } = parsed.data;

  const broadcast = await prisma.voiceBroadcast.create({
    data: {
      campaignId,
      createdById: session.user.id as string,
      name: name.trim(),
      type,
      status: "draft",
      audioUrl: audioUrl ?? null,
      twimlScript: twimlScript ?? null,
      ivrQuestions: (ivrQuestions as object) ?? null,
      targetAudience: (targetAudience as object) ?? null,
      callerId: callerId ?? null,
      callerIdName: callerIdName ?? null,
      callWindowStart: callWindowStart || "09:00",
      callWindowEnd: callWindowEnd || "21:30",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });

  return NextResponse.json({ broadcast }, { status: 201 });
}
