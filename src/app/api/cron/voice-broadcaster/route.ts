/**
 * Cron: /api/cron/voice-broadcaster — runs every 2 minutes.
 * Picks up in_progress broadcasts and dials queued calls via Twilio.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { isWithinCallingHours } from "@/lib/voice/crtc-compliance";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const BATCH_SIZE = 50; // calls per cron run per broadcast

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // CRTC: only call during permitted hours
  if (!isWithinCallingHours()) {
    return NextResponse.json({ message: "Outside CRTC calling hours (9am-9:30pm ET)" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return NextResponse.json({ message: "Twilio not configured" });
  }

  // Find active broadcasts
  const broadcasts = await prisma.voiceBroadcast.findMany({
    where: { status: "in_progress" },
    take: 3,
  });

  if (broadcasts.length === 0) {
    return NextResponse.json({ message: "No active broadcasts" });
  }

  const results = [];

  for (const broadcast of broadcasts) {
    // Get queued calls for this broadcast
    const queuedCalls = await prisma.voiceBroadcastCall.findMany({
      where: { broadcastId: broadcast.id, status: "queued" },
      take: BATCH_SIZE,
    });

    if (queuedCalls.length === 0) {
      // All calls processed — mark broadcast complete
      await prisma.voiceBroadcast.update({
        where: { id: broadcast.id },
        data: { status: "completed", completedAt: new Date() },
      });
      results.push({ broadcastId: broadcast.id, status: "completed", dialed: 0 });
      continue;
    }

    let dialed = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require("twilio") as any;
      const client = twilio(accountSid, authToken);
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://pollcity.ca"}/api/voice/webhook`;

      for (const call of queuedCalls) {
        try {
          const twilioCall = await client.calls.create({
            to: call.phone,
            from: broadcast.callerId!,
            url: broadcast.audioUrl
              ? `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/twiml/${broadcast.id}`
              : undefined,
            twiml: broadcast.twimlScript ?? undefined,
            statusCallback: webhookUrl,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
            machineDetection: broadcast.type === "voice_drop" ? "DetectMessageEnd" : undefined,
          });

          await prisma.voiceBroadcastCall.update({
            where: { id: call.id },
            data: { status: "ringing", twilioSid: twilioCall.sid, startedAt: new Date() },
          });
          dialed++;
        } catch (e) {
          await prisma.voiceBroadcastCall.update({
            where: { id: call.id },
            data: { status: "failed", completedAt: new Date() },
          });
        }
      }
    } catch (e) {
      console.error("[Voice Broadcaster] Twilio error:", e);
    }

    results.push({ broadcastId: broadcast.id, name: broadcast.name, dialed, queued: queuedCalls.length });
  }

  return NextResponse.json({ results });
}
