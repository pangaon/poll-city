import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

/** GET — List voice broadcasts for the active campaign */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "sms:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
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

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const body = await req.json();
  const { name, type, audioUrl, twimlScript, ivrQuestions, targetAudience, callerId, callerIdName, callWindowStart, callWindowEnd, scheduledFor } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!["robocall", "voice_drop", "ivr_poll"].includes(type)) {
    return NextResponse.json({ error: "Type must be robocall, voice_drop, or ivr_poll" }, { status: 400 });
  }

  const broadcast = await prisma.voiceBroadcast.create({
    data: {
      campaignId,
      createdById: session.user.id as string,
      name: name.trim(),
      type,
      status: "draft",
      audioUrl: audioUrl || null,
      twimlScript: twimlScript || null,
      ivrQuestions: ivrQuestions || null,
      targetAudience: targetAudience || null,
      callerId: callerId || null,
      callerIdName: callerIdName || null,
      callWindowStart: callWindowStart || "09:00",
      callWindowEnd: callWindowEnd || "21:30",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });

  return NextResponse.json({ broadcast }, { status: 201 });
}
