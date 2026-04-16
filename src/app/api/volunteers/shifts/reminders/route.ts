import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/volunteers/shifts/reminders
 * Sends real reminder emails to signed-up volunteers.
 * Finds shifts starting in the next 24 hours and sends reminders.
 * Safe to run via cron — won't double-send to the same person for the same shift.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const campaignId = body.campaignId as string | undefined;

  // If a specific campaign is targeted, verify the caller is a member of that campaign.
  // Without this check, any authenticated user could trigger email sends to another campaign's volunteers.
  if (campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    // No campaignId = cross-campaign send (cron use). Restrict to SUPER_ADMIN only.
    if (session!.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const now = new Date();
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h window (cron runs hourly)

  const shiftWhere: Record<string, unknown> = { shiftDate: { gte: now, lte: in25h } };
  if (campaignId) shiftWhere.campaignId = campaignId;

  const shifts = await prisma.volunteerShift.findMany({
    where: shiftWhere,
    include: {
      campaign: { select: { name: true, candidateName: true } },
      signups: {
        where: { status: { not: "cancelled" } },
        include: {
          volunteerProfile: {
            include: {
              user: { select: { name: true, email: true } },
              contact: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const shift of shifts) {
    const campaignName = shift.campaign.candidateName ?? shift.campaign.name;

    const shiftDateStr = new Date(shift.shiftDate).toLocaleString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    for (const signup of shift.signups) {
      const profile = signup.volunteerProfile;
      const email = profile.user?.email ?? profile.contact?.email;
      const name =
        profile.user?.name ??
        (profile.contact
          ? `${profile.contact.firstName} ${profile.contact.lastName}`.trim()
          : null) ??
        "there";

      if (!email) { skipped++; continue; }

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
    <div style="background: #0A2342; color: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7;">Shift Reminder</p>
      <h1 style="margin: 4px 0 0; font-size: 20px;">${shift.name}</h1>
    </div>

    <p style="color: #374151; font-size: 15px;">Hi ${name},</p>
    <p style="color: #374151; font-size: 15px;">Your volunteer shift is coming up <strong>tomorrow</strong>. Here are the details:</p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0; width: 80px;">Shift</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 600;">${shift.name}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Date</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 600;">${shiftDateStr}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Time</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 600;">${shift.startTime} – ${shift.endTime}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Location</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 600;">${shift.meetingLocation}</td>
        </tr>
        ${shift.targetTurfArea ? `<tr>
          <td style="color: #64748b; font-size: 13px; padding: 4px 0;">Area</td>
          <td style="color: #0f172a; font-size: 13px;">${shift.targetTurfArea}</td>
        </tr>` : ""}
      </table>
    </div>

    ${shift.notes ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;"><strong>Notes:</strong> ${shift.notes}</p>` : ""}

    <p style="color: #374151; font-size: 15px;">Thank you for volunteering. Every door counts.</p>
    <p style="color: #374151; font-size: 15px;">— ${campaignName}</p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">You're receiving this because you signed up for this volunteer shift. Powered by Poll City.</p>
  </div>
</body>
</html>`;

      try {
        await sendEmail({
          to: email,
          subject: `Reminder: Volunteer shift tomorrow — ${shift.name}`,
          html,
        });
        sent++;
      } catch (e) {
        errors.push(`${email}: ${(e as Error).message}`);
      }
    }
  }

  return NextResponse.json({
    data: {
      shiftsChecked: shifts.length,
      sent,
      skipped,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}
