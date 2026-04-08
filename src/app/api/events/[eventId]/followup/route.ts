import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/events/[eventId]/followup
 * Sends a thank-you/follow-up email to all RSVPs.
 * - Attended (attended=true or checkedInAt set): "Thank you for coming"
 * - Registered but didn't attend: "We missed you"
 * Deduplication: skips RSVPs where followUpSentAt is already set.
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
      campaign: { select: { name: true, candidateName: true, websiteUrl: true } },
      rsvps: {
        where: {
          followUpSentAt: null,
          email: { not: "" },
          status: { in: ["going", "checked_in", "interested"] },
        },
        select: { id: true, name: true, email: true, attended: true, checkedInAt: true },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (event.rsvps.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No eligible RSVPs (all already received follow-up)." });
  }

  const campaignName = event.campaign.candidateName ?? event.campaign.name;

  const attendedHtml = (name: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <div style="background: #1D9E75; color: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85;">Thank You</p>
      <h1 style="margin: 4px 0 0; font-size: 20px;">${event.name}</h1>
    </div>

    <p style="color: #374151; font-size: 15px;">Hi ${name},</p>
    <p style="color: #374151; font-size: 15px;">Thank you for joining us at <strong>${event.name}</strong>. Your support means everything to this campaign.</p>
    <p style="color: #374151; font-size: 15px;">If you have any feedback or questions, please don&rsquo;t hesitate to reach out.</p>

    ${event.campaign.websiteUrl ? `<div style="text-align: center; margin: 28px 0;">
      <a href="${event.campaign.websiteUrl}" style="background: #0A2342; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">Visit Our Website</a>
    </div>` : ""}

    <p style="color: #374151; font-size: 15px;">With gratitude,<br><strong>${campaignName}</strong></p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Powered by Poll City.</p>
  </div>
</body>
</html>`;

  const missedHtml = (name: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <div style="background: #0A2342; color: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7;">We Missed You</p>
      <h1 style="margin: 4px 0 0; font-size: 20px;">${event.name}</h1>
    </div>

    <p style="color: #374151; font-size: 15px;">Hi ${name},</p>
    <p style="color: #374151; font-size: 15px;">We missed you at <strong>${event.name}</strong>! We hope everything is well.</p>
    <p style="color: #374151; font-size: 15px;">We&rsquo;d love to stay in touch. Keep an eye out for future events from our campaign — we hope to see you at the next one.</p>

    ${event.campaign.websiteUrl ? `<div style="text-align: center; margin: 28px 0;">
      <a href="${event.campaign.websiteUrl}" style="background: #0A2342; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">Stay Connected</a>
    </div>` : ""}

    <p style="color: #374151; font-size: 15px;">Thanks for your support,<br><strong>${campaignName}</strong></p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Powered by Poll City.</p>
  </div>
</body>
</html>`;

  let sent = 0;
  const errors: string[] = [];
  const sentIds: string[] = [];

  for (const rsvp of event.rsvps) {
    const didAttend = rsvp.attended || !!rsvp.checkedInAt;
    const html = didAttend ? attendedHtml(rsvp.name || "there") : missedHtml(rsvp.name || "there");
    const subject = didAttend
      ? `Thank you for attending ${event.name}!`
      : `We missed you at ${event.name}`;

    try {
      await sendEmail({ to: rsvp.email, subject, html });
      sentIds.push(rsvp.id);
      sent++;
    } catch (e) {
      errors.push(`${rsvp.email}: ${(e as Error).message}`);
    }
  }

  // Mark followUpSentAt on successful sends
  if (sentIds.length > 0) {
    await prisma.eventRsvp.updateMany({
      where: { id: { in: sentIds } },
      data: { followUpSentAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
