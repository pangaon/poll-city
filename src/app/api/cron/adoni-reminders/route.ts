import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { configureWebPush, sendPushBatch } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fires every 15 minutes. Finds due reminders, marks them sent,
// creates next occurrence for recurring ones, and sends push notifications.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.adoniReminder.findMany({
    where: { scheduledFor: { lte: now }, sent: false },
    take: 100,
  });

  const pushConfigured = configureWebPush().ok;

  let sent = 0;
  let pushed = 0;

  for (const r of due) {
    try {
      await prisma.adoniReminder.update({
        where: { id: r.id },
        data: { sent: true, sentAt: now },
      });

      // Schedule next occurrence for recurring reminders
      if (r.isRecurring && r.recurPattern) {
        const next = calculateNext(r.scheduledFor, r.recurPattern);
        await prisma.adoniReminder.create({
          data: {
            userId: r.userId,
            campaignId: r.campaignId,
            message: r.message,
            scheduledFor: next,
            isRecurring: true,
            recurPattern: r.recurPattern,
          },
        });
      }

      // Send push notification to user
      if (pushConfigured) {
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { userId: r.userId },
          select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
        });

        if (subscriptions.length > 0) {
          await sendPushBatch({
            subscriptions,
            title: "Reminder from Adoni",
            body: r.message.length > 100 ? r.message.slice(0, 97) + "…" : r.message,
            data: { type: "adoni_reminder", reminderId: r.id, campaignId: r.campaignId },
          });
          pushed++;
        }
      }

      sent += 1;
    } catch (e) {
      console.error(`[adoni-reminders] failed for ${r.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, due: due.length, sent, pushed });
}

function calculateNext(last: Date, pattern: string): Date {
  const d = new Date(last);
  const p = pattern.toLowerCase();
  if (p.includes("daily")) {
    d.setDate(d.getDate() + 1);
  } else if (p.includes("monday") || p.includes("weekly")) {
    d.setDate(d.getDate() + 7);
  } else if (p.includes("friday")) {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + 7); // default weekly
  }
  return d;
}
