/**
 * POST /api/voice/webhook — Twilio status callback for voice calls.
 * Updates call status and processes IVR responses in real time.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { InteractionType, SupportLevel } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const callSid = body.get("CallSid") as string;
  const callStatus = body.get("CallStatus") as string;
  const duration = body.get("CallDuration") as string;
  const digits = body.get("Digits") as string | null;

  if (!callSid) return new Response("OK", { status: 200 });

  // Find the call by Twilio SID
  const call = await prisma.voiceBroadcastCall.findFirst({
    where: { twilioSid: callSid },
    include: { broadcast: true },
  });

  if (!call) return new Response("OK", { status: 200 });

  // Map Twilio status to our status
  const statusMap: Record<string, string> = {
    queued: "queued",
    ringing: "ringing",
    "in-progress": "answered",
    completed: "completed",
    busy: "busy",
    "no-answer": "no_answer",
    failed: "failed",
    canceled: "failed",
  };

  const newStatus = statusMap[callStatus] ?? callStatus;

  const updates: Record<string, unknown> = { status: newStatus };
  if (duration) updates.duration = parseInt(duration, 10);
  if (newStatus === "completed" || newStatus === "failed") updates.completedAt = new Date();
  if (newStatus === "answered" && !call.startedAt) updates.startedAt = new Date();

  // Handle IVR keypress responses
  if (digits && call.broadcast.type === "ivr_poll") {
    const existingResponses = (call.ivrResponses as Record<string, string>) ?? {};
    existingResponses[`response_${Object.keys(existingResponses).length + 1}`] = digits;
    updates.ivrResponses = existingResponses;

    // Map IVR digits to support levels (configurable per broadcast)
    const supportMap: Record<string, string> = { "1": "strong_support", "2": "leaning_support", "3": "undecided", "4": "leaning_against", "5": "against" };
    if (supportMap[digits]) {
      updates.supportLevel = supportMap[digits];
      // Update the contact's support level in real time
      await prisma.contact.update({
        where: { id: call.contactId },
        data: { supportLevel: supportMap[digits] as SupportLevel },
      }).catch(() => {});

      // Log as interaction
      await prisma.interaction.create({
        data: {
          contactId: call.contactId,
          userId: call.broadcast.createdById,
          type: InteractionType.phone_call,
          supportLevel: supportMap[digits] as SupportLevel,
          notes: `IVR poll response: pressed ${digits}`,
        },
      }).catch(() => {});
    }

    // Handle opt-out (press 9)
    if (digits === "9") {
      updates.status = "opted_out";
      await prisma.voiceOptOut.upsert({
        where: { campaignId_phone: { campaignId: call.broadcast.campaignId, phone: call.phone } },
        create: { campaignId: call.broadcast.campaignId, phone: call.phone, source: "ivr_keypress" },
        update: {},
      }).catch(() => {});
    }
  }

  await prisma.voiceBroadcastCall.update({ where: { id: call.id }, data: updates });

  // Update broadcast aggregate stats
  if (["completed", "failed", "busy", "no_answer", "opted_out"].includes(newStatus)) {
    await prisma.voiceBroadcast.update({
      where: { id: call.broadcastId },
      data: {
        completedCalls: { increment: 1 },
        ...(newStatus === "completed" ? { answeredCalls: { increment: 1 } } : {}),
        ...(newStatus === "failed" || newStatus === "busy" || newStatus === "no_answer" ? { failedCalls: { increment: 1 } } : {}),
        ...(newStatus === "opted_out" ? { optOutCount: { increment: 1 } } : {}),
      },
    });
  }

  return new Response("OK", { status: 200 });
}
