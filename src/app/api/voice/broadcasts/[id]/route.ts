import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import { checkCRTCCompliance, filterOptedOut } from "@/lib/voice/crtc-compliance";

/** GET — Get broadcast details */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuthWithPermission(req, "sms:read");
  if (error) return error;

  const broadcast = await prisma.voiceBroadcast.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true } } },
  });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ broadcast });
}

/** PATCH — Update broadcast or change status */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuthWithPermission(req, "sms:write");
  if (error) return error;

  const broadcast = await prisma.voiceBroadcast.findUnique({ where: { id: params.id } });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Status transitions
  if (body.status) {
    const validTransitions: Record<string, string[]> = {
      draft: ["scheduled", "cancelled"],
      scheduled: ["in_progress", "cancelled"],
      in_progress: ["paused", "completed", "cancelled"],
      paused: ["in_progress", "cancelled"],
    };

    const allowed = validTransitions[broadcast.status] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: `Cannot transition from ${broadcast.status} to ${body.status}` }, { status: 400 });
    }

    // CRTC compliance check before going live
    if (body.status === "scheduled" || body.status === "in_progress") {
      const compliance = await checkCRTCCompliance(params.id);
      if (!compliance.compliant) {
        return NextResponse.json({ error: "CRTC compliance check failed", violations: compliance.violations, warnings: compliance.warnings }, { status: 400 });
      }

      // Count target contacts and filter opt-outs
      if (body.status === "in_progress" && !broadcast.startedAt) {
        const contacts = await prisma.contact.findMany({
          where: { campaignId: broadcast.campaignId, phone: { not: null } },
          select: { id: true, phone: true },
        });
        const phones = contacts.filter((c) => c.phone).map((c) => c.phone!);
        const { allowed: allowedPhones } = await filterOptedOut(broadcast.campaignId, phones);

        // Create call records for each contact
        const callData = contacts
          .filter((c) => c.phone && allowedPhones.includes(c.phone))
          .map((c) => ({
            broadcastId: params.id,
            contactId: c.id,
            phone: c.phone!,
            status: "queued",
          }));

        if (callData.length > 0) {
          await prisma.voiceBroadcastCall.createMany({ data: callData });
        }

        body.totalContacts = callData.length;
        body.startedAt = new Date();
        body.doNotCallChecked = true;
      }
    }
  }

  const updates: Record<string, unknown> = {};
  for (const key of ["name", "type", "audioUrl", "twimlScript", "ivrQuestions", "targetAudience", "callerId", "callerIdName", "callWindowStart", "callWindowEnd", "scheduledFor", "status", "totalContacts", "startedAt", "doNotCallChecked"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const updated = await prisma.voiceBroadcast.update({ where: { id: params.id }, data: updates });

  await prisma.activityLog.create({
    data: {
      campaignId: broadcast.campaignId,
      userId: session.user.id as string,
      action: `voice_broadcast.${body.status ?? "updated"}`,
      entityType: "VoiceBroadcast",
      entityId: params.id,
      details: { name: updated.name, status: updated.status } as object,
    },
  });

  return NextResponse.json({ broadcast: updated });
}

/** DELETE — Delete a draft broadcast */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuthWithPermission(req, "sms:write");
  if (error) return error;

  const broadcast = await prisma.voiceBroadcast.findUnique({ where: { id: params.id } });
  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (broadcast.status !== "draft") {
    return NextResponse.json({ error: "Can only delete draft broadcasts" }, { status: 400 });
  }

  await prisma.voiceBroadcast.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
