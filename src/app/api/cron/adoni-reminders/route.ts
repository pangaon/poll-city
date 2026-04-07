import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fires every 15 minutes. Finds due reminders, marks them sent,
// creates next occurrence for recurring ones.
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

  let sent = 0;
  for (const r of due) {
    try {
      await prisma.adoniReminder.update({
        where: { id: r.id },
        data: { sent: true, sentAt: now },
      });

      // If recurring, schedule next
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

      // TODO: send push notification to user.id — wire into PushSubscription table
      sent += 1;
    } catch (e) {
      console.error(`[adoni-reminders] failed for ${r.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, due: due.length, sent });
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
