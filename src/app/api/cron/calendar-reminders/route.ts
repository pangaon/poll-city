/**
 * Cron: /api/cron/calendar-reminders — runs every 5 minutes.
 *
 * Picks up CalendarReminder records where status=pending and scheduledFor <= now().
 * Dispatches:
 *   in_app — creates Notification records for all assigned users
 *   email  — sends via sendEmail (requires RESEND_API_KEY)
 *   sms    — Twilio (requires TWILIO_* env vars)
 *   push   — not yet implemented, marked sent to avoid infinite retry
 *
 * No atomic lock needed: reminders are single-delivery, status flip is idempotent.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { loadBrandKit } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";
export const maxDuration = 290;

const BATCH_SIZE = 20;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.calendarReminder.findMany({
    where: { status: "pending", scheduledFor: { lte: now } },
    include: {
      calendarItem: {
        select: {
          id: true,
          title: true,
          startAt: true,
          campaignId: true,
          assignments: {
            include: {
              assignedUser: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
      },
    },
    take: BATCH_SIZE,
    orderBy: { scheduledFor: "asc" },
  });

  if (due.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results: Array<{ id: string; status: string; channel: string }> = [];

  for (const reminder of due) {
    const item = reminder.calendarItem;

    try {
      const channel = reminder.deliveryChannel;

      if (channel === "in_app") {
        const userIds = item.assignments
          .map((a) => a.assignedUser?.id)
          .filter((id): id is string => id != null);
        if (userIds.length > 0) {
          await prisma.notification.createMany({
            data: userIds.map((userId) => ({
              userId,
              title: `Reminder: ${item.title}`,
              body: `Starts ${item.startAt.toLocaleString("en-CA", { timeZone: "America/Toronto" })}`,
              type: "calendar_reminder",
              entityType: "calendar_item",
              entityId: item.id,
              link: `/calendar`,
            })),
            skipDuplicates: true,
          });
        }
      } else if (channel === "email") {
        if (!process.env.RESEND_API_KEY) {
          throw new Error("RESEND_API_KEY not configured");
        }
        const brand = await loadBrandKit(item.campaignId);
        const recipients = item.assignments
          .map((a) => a.assignedUser)
          .filter((u): u is NonNullable<typeof u> => u != null && Boolean(u.email));

        for (const user of recipients) {
          if (!user.email) continue;
          const localTime = item.startAt.toLocaleString("en-CA", { timeZone: "America/Toronto" });
          await sendEmail({
            to: user.email,
            subject: `Reminder: ${item.title}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px"><p>Hi ${user.name ?? "there"},</p><p>This is a reminder that <strong>${item.title}</strong> starts at ${localTime}.</p><p style="color:#64748b;font-size:13px">— ${brand.campaignName}</p></div>`,
          });
        }
      } else if (channel === "sms") {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioTok = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM;
        if (!twilioSid || !twilioTok || !twilioFrom) {
          throw new Error("Twilio not configured");
        }

        const brand = await loadBrandKit(item.campaignId);
        const auth64 = Buffer.from(`${twilioSid}:${twilioTok}`).toString("base64");

        for (const assignment of item.assignments) {
          const user = assignment.assignedUser;
          if (!user?.phone) continue;

          const localTime = item.startAt.toLocaleString("en-CA", { timeZone: "America/Toronto" });
          const body = `Reminder: ${item.title} at ${localTime}. ${brand.campaignName}. Reply STOP to opt out.`;
          const form = new URLSearchParams({ To: user.phone, From: twilioFrom, Body: body.slice(0, 160) });
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth64}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form,
          });
        }
      }
      // push: not yet implemented — fall through and mark sent to avoid infinite retry

      await prisma.calendarReminder.update({
        where: { id: reminder.id },
        data: { status: "sent", sentAt: now },
      });
      results.push({ id: reminder.id, status: "sent", channel: reminder.deliveryChannel });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await prisma.calendarReminder.update({
        where: { id: reminder.id },
        data: { status: "failed", errorMessage },
      });
      results.push({ id: reminder.id, status: "failed", channel: reminder.deliveryChannel });
      console.error(`[cron/calendar-reminders] reminder ${reminder.id} failed:`, errorMessage);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
