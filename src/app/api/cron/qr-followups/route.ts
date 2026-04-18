/**
 * GET /api/cron/qr-followups
 * Processes pending QrFollowUp entries that weren't handled inline.
 * Fires every 5 minutes via Vercel Cron.
 * Only picks up entries older than 2 minutes — fresh captures are handled inline.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { notifyQrCaptureStaff } from "@/lib/qr/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2-minute grace window — inline notification handles fresh captures
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);

  const pending = await prisma.qrFollowUp.findMany({
    where: {
      status: "pending",
      createdAt: { lte: cutoff },
      type: { in: ["sign_team_alert", "volunteer_callback", "notification"] },
    },
    take: 50,
    orderBy: { createdAt: "asc" },
    include: {
      scan: {
        select: {
          id: true,
          campaignId: true,
          intent: true,
          capturedName: true,
          capturedEmail: true,
          capturedPhone: true,
          capturedAddress: true,
          contactId: true,
          qrCode: { select: { locationName: true } },
        },
      },
      prospect: {
        select: {
          id: true,
          score: true,
          signRequested: true,
          volunteerInterest: true,
        },
      },
    },
  });

  let processed = 0;
  let failed = 0;

  for (const followUp of pending) {
    const scan = followUp.scan;
    const prospect = followUp.prospect;

    if (!scan?.campaignId || !prospect) {
      await prisma.qrFollowUp
        .update({
          where: { id: followUp.id },
          data: { status: "failed", failReason: "Missing scan or prospect data", failedAt: new Date() },
        })
        .catch(() => {});
      failed++;
      continue;
    }

    try {
      await notifyQrCaptureStaff({
        campaignId: scan.campaignId,
        prospectId: prospect.id,
        scanId: scan.id,
        followUpId: followUp.id,
        name: scan.capturedName ?? undefined,
        email: scan.capturedEmail ?? undefined,
        phone: scan.capturedPhone ?? undefined,
        signRequested: prospect.signRequested,
        volunteerInterest: prospect.volunteerInterest,
        intent: scan.intent,
        locationName: scan.qrCode?.locationName,
        address: scan.capturedAddress ?? undefined,
        score: prospect.score,
        contactId: scan.contactId,
      });
      processed++;
    } catch {
      await prisma.qrFollowUp
        .update({
          where: { id: followUp.id },
          data: {
            status: "failed",
            failReason: "notifyQrCaptureStaff threw",
            failedAt: new Date(),
            attempts: { increment: 1 },
          },
        })
        .catch(() => {});
      failed++;
    }
  }

  return NextResponse.json({ processed, failed, total: pending.length });
}
