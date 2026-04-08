import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/events/[eventId]/remind
 * Sends a reminder email to all confirmed RSVPs (status = "going" or "checked_in").
 * Respects lastReminderRunAt — won't spam if called within 1 hour.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.event.findUnique({
    where: { id: params.eventId, deletedAt: null },
    include: {
      campaign: { select: { name: true, candidateName: true, candidateEmail: true } },
      rsvps: {
        where: {
          status: { in: ["going", "checked_in"] },
          email: { not: "" },
        },
        select: { id: true, name: true, email: true, status: true },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Auth: must be a member of this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Rate-limit: don't allow re-sending within 1 hour
  if (event.lastReminderRunAt) {
    const sinceMs = Date.now() - new Date(event.lastReminderRunAt).getTime();
    if (sinceMs < 60 * 60 * 1000) {
      return NextResponse.json(
        { error: `Reminder already sent ${Math.round(sinceMs / 60000)} minutes ago. Wait before re-sending.` },
        { status: 429 }
      );
    }
  }

  if (event.rsvps.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No confirmed RSVPs to remind." });
  }

  const campaignName = event.campaign.candidateName ?? event.campaign.name;
  const eventDate = new Date(event.eventDate).toLocaleString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timezone,
  });

  const reminderHtml = (name: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <div style="background: #0A2342; color: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7;">Event Reminder</p>
      <h1 style="margin: 4px 0 0; font-size: 20px;">${event.name}</h1>
    </div>

    <p style="color: #374151; font-size: 15px;">Hi ${name},</p>
    <p style="color: #374151; font-size: 15px;">Just a reminder that you&rsquo;re registered for <strong>${event.name}</strong>.</p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0; width: 80px;">When</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 600;">${eventDate}</td>
        </tr>
        ${event.location ? `<tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Where</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 600;">${event.location}</td>
        </tr>` : ""}
        ${event.address1 ? `<tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Address</td>
          <td style="color: #0f172a; font-size: 13px;">${event.address1}${event.city ? `, ${event.city}` : ""}</td>
        </tr>` : ""}
      </table>
    </div>

    ${event.description ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;">${event.description}</p>` : ""}

    <p style="color: #374151; font-size: 15px; margin-top: 20px;">We look forward to seeing you there.</p>
    <p style="color: #374151; font-size: 15px;">— ${campaignName}</p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">You&rsquo;re receiving this because you registered for this event. Powered by Poll City.</p>
  </div>
</body>
</html>`;

  // Send in batches of 10 to avoid rate limits
  let sent = 0;
  const errors: string[] = [];

  for (const rsvp of event.rsvps) {
    try {
      await sendEmail({
        to: rsvp.email,
        subject: `Reminder: ${event.name} — ${eventDate}`,
        html: reminderHtml(rsvp.name || "there"),
      });
      sent++;
    } catch (e) {
      errors.push(`${rsvp.email}: ${(e as Error).message}`);
    }
  }

  // Log the reminder and update lastReminderRunAt
  await Promise.all([
    prisma.event.update({
      where: { id: params.eventId },
      data: { lastReminderRunAt: new Date() },
    }),
    prisma.eventReminder.create({
      data: {
        eventId: params.eventId,
        channel: "email",
        templateKey: "event_reminder",
        scheduledFor: new Date(),
        sentAt: new Date(),
        status: errors.length === 0 ? "sent" : "partial",
        errorMessage: errors.length > 0 ? errors.join("; ") : null,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    sent,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
