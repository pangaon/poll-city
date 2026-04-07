/**
 * Cron: /api/cron/event-reminders — runs every hour.
 * Sends pending event reminders (email/push) for upcoming events.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find pending reminders that are due
  const dueReminders = await prisma.eventReminder.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: now },
    },
    include: {
      event: {
        include: {
          campaign: { select: { name: true, candidateName: true } },
          rsvps: {
            where: { status: "going" },
            select: { name: true, email: true },
          },
        },
      },
    },
    take: 50,
  });

  if (dueReminders.length === 0) {
    return NextResponse.json({ sent: 0, message: "No reminders due" });
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    try {
      const event = reminder.event;
      const attendees = event.rsvps.filter((r) => Boolean(r.email));

      if (reminder.channel === "email" && attendees.length > 0) {
        // Send email reminders via Resend (if configured)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);

          for (const attendee of attendees) {
            await resend.emails.send({
              from: `${event.campaign.candidateName ?? event.campaign.name} <noreply@pollcity.ca>`,
              to: attendee.email,
              subject: `Reminder: ${event.name} — ${event.eventDate?.toLocaleDateString("en-CA") ?? "upcoming"}`,
              text: `Hi ${attendee.name ?? "there"},\n\nThis is a reminder about ${event.name}.\n\nWhen: ${event.eventDate?.toLocaleString("en-CA") ?? "TBD"}\nWhere: ${event.location ?? "TBD"}\n\nSee you there!\n\n— ${event.campaign.candidateName ?? event.campaign.name}`,
            }).catch(() => {});
          }
        }
      }

      await prisma.eventReminder.update({
        where: { id: reminder.id },
        data: { status: "sent", sentAt: new Date() },
      });
      sent++;
    } catch (e) {
      await prisma.eventReminder.update({
        where: { id: reminder.id },
        data: { status: "failed", errorMessage: (e as Error).message },
      });
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: dueReminders.length });
}
