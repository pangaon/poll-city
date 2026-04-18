import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import {
  resolveNotificationRecipients,
  getPushSubscriptionsForUsers,
} from "@/lib/notifications/routing";
import { configureWebPush, sendPushBatch } from "@/lib/notifications/push";
import type { QrIntent } from "@prisma/client";

export interface QrCaptureNotifyOptions {
  campaignId: string;
  prospectId: string;
  scanId: string;
  followUpId: string;
  name?: string;
  email?: string;
  phone?: string;
  signRequested: boolean;
  volunteerInterest: boolean;
  intent: QrIntent | null;
  locationName?: string | null;
  address?: string;
  score: number;
  contactId: string | null;
}

/**
 * Send staff notifications for a QR capture event.
 * Called inline from captureIdentity and as fallback from the cron worker.
 * All operations non-fatal — never throws.
 */
export async function notifyQrCaptureStaff(opts: QrCaptureNotifyOptions): Promise<void> {
  const { campaignId } = opts;

  const campaign = await prisma.campaign
    .findUnique({
      where: { id: campaignId },
      select: { name: true, candidateName: true },
    })
    .catch(() => null);

  const campaignName = campaign?.candidateName ?? campaign?.name ?? "Your Campaign";
  const baseUrl = process.env.NEXTAUTH_URL ?? "";

  // Resolve recipients: union of sign-request and volunteer-signup routing
  const alertTypes: Array<"qr_sign_request" | "qr_volunteer_signup"> = [];
  if (opts.signRequested) alertTypes.push("qr_sign_request");
  if (opts.volunteerInterest) alertTypes.push("qr_volunteer_signup");

  // If no action-specific alert, still mark the follow-up sent
  if (alertTypes.length === 0) {
    await markSent(opts.followUpId);
    return;
  }

  const allUserIds = new Set<string>();
  await Promise.all(
    alertTypes.map(async (type) => {
      const uids = await resolveNotificationRecipients(campaignId, type).catch(() => []);
      uids.forEach((id) => allUserIds.add(id));
    }),
  );

  const userIds = Array.from(allUserIds);

  if (userIds.length > 0) {
    const staffUsers = await prisma.user
      .findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })
      .catch(() => []);

    const subject = buildSubject(opts, campaignName);
    const html = buildStaffEmail(opts, campaignName, baseUrl);

    // Email each staff member
    await Promise.all(
      staffUsers.map((staff) =>
        sendEmail({
          to: staff.email,
          subject,
          html,
          fromName: campaignName,
        }).catch(() => {}),
      ),
    );

    // Web push for staff with subscriptions
    const pushConfig = configureWebPush();
    if (pushConfig.ok) {
      const subscriptions = await getPushSubscriptionsForUsers(userIds).catch(() => []);
      if (subscriptions.length > 0) {
        const prospectLabel = opts.name ?? "Anonymous";
        const locationSuffix = opts.locationName ? " at " + opts.locationName : "";
        await sendPushBatch({
          subscriptions,
          title: buildPushTitle(opts) + ": " + prospectLabel,
          body: campaignName + locationSuffix + " — Score " + opts.score + "/100",
          data: { url: "/qr", prospectId: opts.prospectId },
        }).catch(() => {});
      }
    }
  }

  await markSent(opts.followUpId);
}

async function markSent(followUpId: string): Promise<void> {
  await prisma.qrFollowUp
    .update({
      where: { id: followUpId },
      data: {
        status: "sent",
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    })
    .catch(() => {});
}

function buildSubject(opts: QrCaptureNotifyOptions, campaignName: string): string {
  const actions: string[] = [];
  if (opts.signRequested) actions.push("Sign Request");
  if (opts.volunteerInterest) actions.push("Volunteer Interest");
  const actionLabel = actions.join(" + ");
  const prospect = opts.name ?? "Anonymous";
  const loc = opts.locationName ? " at " + opts.locationName : "";
  return "[" + campaignName + "] " + actionLabel + ": " + prospect + loc;
}

function buildPushTitle(opts: QrCaptureNotifyOptions): string {
  if (opts.signRequested && opts.volunteerInterest) return "Sign + Volunteer";
  if (opts.signRequested) return "Sign Request";
  if (opts.volunteerInterest) return "New Volunteer Lead";
  return "QR Capture";
}

function buildStaffEmail(
  opts: QrCaptureNotifyOptions,
  campaignName: string,
  baseUrl: string,
): string {
  const badges: string[] = [];
  if (opts.signRequested)
    badges.push(
      "<span style=\"background:#0A2342;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;margin-right:6px;\">Sign Requested</span>",
    );
  if (opts.volunteerInterest)
    badges.push(
      "<span style=\"background:#1D9E75;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;margin-right:6px;\">Volunteer Interest</span>",
    );

  const rows: string[] = [];
  const row = (label: string, value: string) =>
    "<tr><td style=\"padding:5px 0;color:#666;font-size:13px;width:90px;\">" +
    label +
    "</td><td style=\"padding:5px 0 5px 12px;font-size:13px;font-weight:600;\">" +
    value +
    "</td></tr>";

  if (opts.name) rows.push(row("Name", opts.name));
  if (opts.email) rows.push(row("Email", "<a href=\"mailto:" + opts.email + "\">" + opts.email + "</a>"));
  if (opts.phone) rows.push(row("Phone", opts.phone));
  if (opts.intent) rows.push(row("Intent", opts.intent.replace(/_/g, " ")));
  if (opts.locationName) rows.push(row("Location", opts.locationName));
  if (opts.address && !opts.address.startsWith("Address pending"))
    rows.push(row("Address", opts.address));
  rows.push(row("Score", opts.score + "/100"));

  const dashUrl = baseUrl + "/qr";

  return (
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head>" +
    "<body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#222;\">" +
    "<div style=\"border-left:4px solid #0A2342;padding-left:16px;margin-bottom:20px;\">" +
    "<h2 style=\"margin:0 0 4px;color:#0A2342;font-size:20px;\">New QR Prospect</h2>" +
    "<p style=\"margin:0;color:#666;font-size:13px;\">" + campaignName + "</p>" +
    "</div>" +
    "<div style=\"margin-bottom:16px;\">" + badges.join("") + "</div>" +
    "<table cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:collapse;\">" +
    rows.join("") +
    "</table>" +
    "<div style=\"margin-top:24px;\">" +
    "<a href=\"" + dashUrl + "\" style=\"display:inline-block;background:#0A2342;color:#fff;" +
    "padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;\">View QR Hub</a>" +
    "</div>" +
    "<p style=\"color:#999;font-size:11px;margin-top:28px;border-top:1px solid #eee;padding-top:12px;\">" +
    "Poll City alert — a prospect was captured via QR scan for " + campaignName + "." +
    "</p>" +
    "</body></html>"
  );
}
