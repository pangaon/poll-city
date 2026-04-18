import crypto from "crypto";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { notifyQrCaptureStaff } from "./notify";
import type { QrIntent, QrProspectType, SupportLevel, FunnelStage } from "@prisma/client";
import type { QrScanResult } from "./types";

function buildIpHash(ip: string | null, userAgent: string | null): string | null {
  if (!ip) return null;
  return crypto
    .createHash("sha256")
    .update(ip + "|" + (userAgent ?? ""))
    .digest("hex")
    .slice(0, 32);
}

function classifyDevice(userAgent: string | null): "mobile" | "tablet" | "desktop" {
  if (!userAgent) return "desktop";
  const ua = userAgent.toLowerCase();
  if (/ipad|android.*tablet|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "mobile";
  return "desktop";
}

function intentToSupportLevel(intent: QrIntent | null, existing: SupportLevel | null): SupportLevel {
  const highIntent =
    intent === "support" || intent === "volunteer" || intent === "donate" || intent === "request_sign";
  const medIntent =
    intent === "keep_updated" ||
    intent === "more_info" ||
    intent === "interested_in_issue" ||
    intent === "attend_event";
  if (highIntent) return "leaning_support";
  if (medIntent) return existing && existing !== "unknown" ? existing : "undecided";
  return existing ?? "unknown";
}

function intentToFunnelStage(
  intent: QrIntent | null,
  volunteerInterest: boolean,
  existing: FunnelStage | null,
): FunnelStage {
  if (volunteerInterest || intent === "volunteer") return "volunteer";
  if (intent === "support" || intent === "request_sign" || intent === "donate") return "supporter";
  if (
    intent === "keep_updated" ||
    intent === "more_info" ||
    intent === "interested_in_issue" ||
    intent === "attend_event"
  ) {
    if (existing === "volunteer" || existing === "donor" || existing === "supporter") return existing;
    return "contact";
  }
  return existing ?? "unknown";
}

function buildThankYouEmail(opts: {
  firstName: string;
  campaignName: string;
  signRequested: boolean;
  volunteerInterest: boolean;
}): string {
  const extras =
    (opts.signRequested
      ? "<p>We've noted your sign request and our team will follow up to arrange installation.</p>"
      : "") +
    (opts.volunteerInterest
      ? "<p>Our volunteer coordinator will be in touch soon with information about how you can get involved.</p>"
      : "");

  return (
    "<!DOCTYPE html>" +
    "<html><head><meta charset=\"utf-8\"></head>" +
    "<body style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;\">" +
    "<h2 style=\"color:#0A2342;\">Thanks for connecting, " +
    opts.firstName +
    "!</h2>" +
    "<p>You've connected with <strong>" +
    opts.campaignName +
    "</strong>. We're glad you reached out.</p>" +
    extras +
    "<p>We'll be in touch - every voice matters in this election.</p>" +
    "<p style=\"color:#666;font-size:12px;margin-top:30px;\">You received this because you scanned a QR code for the " +
    opts.campaignName +
    " campaign.</p>" +
    "</body></html>"
  );
}

interface RecordScanOptions {
  token: string;
  ip: string | null;
  userAgent: string | null;
  sessionToken: string | null;
  referrer: string | null;
}

export async function recordScan(opts: RecordScanOptions): Promise<QrScanResult | null> {
  const qrCode = await prisma.qrCode.findUnique({
    where: { token: opts.token },
    select: {
      id: true,
      campaignId: true,
      status: true,
      endAt: true,
      allowAnonymous: true,
    },
  });

  if (!qrCode) return null;

  const ipHash = buildIpHash(opts.ip, opts.userAgent);
  const deviceClass = classifyDevice(opts.userAgent);

  let isRepeat = false;
  if (opts.sessionToken) {
    const prior = await prisma.qrScan.findFirst({
      where: { qrCodeId: qrCode.id, sessionToken: opts.sessionToken },
      select: { id: true },
    });
    isRepeat = !!prior;
  }

  const scan = await prisma.qrScan.create({
    data: {
      qrCodeId: qrCode.id,
      campaignId: qrCode.campaignId,
      sessionToken: opts.sessionToken,
      ipHash,
      userAgent: opts.userAgent,
      deviceClass,
      isRepeat,
      referrer: opts.referrer,
      conversionStage: "landed",
    },
  });

  if (!isRepeat) {
    await prisma.qrCode.update({
      where: { id: qrCode.id },
      data: { scanCount: { increment: 1 } },
    });
  }

  return {
    scanId: scan.id,
    isRepeat,
    conversionStage: "landed",
    prospectId: null,
  };
}

interface RecordIntentOptions {
  scanId: string;
  intent: QrIntent;
  lat: number | null;
  lng: number | null;
  geoGranted: boolean;
}

export async function recordIntent(opts: RecordIntentOptions): Promise<void> {
  await prisma.qrScan.update({
    where: { id: opts.scanId },
    data: {
      intent: opts.intent,
      lat: opts.lat,
      lng: opts.lng,
      geoGranted: opts.geoGranted,
      conversionStage: "intent_set",
    },
  });
}

interface CaptureIdentityOptions {
  scanId: string;
  name?: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  note?: string;
  signRequested?: boolean;
  volunteerInterest?: boolean;
}

export async function captureIdentity(
  opts: CaptureIdentityOptions,
): Promise<{ prospectId: string; contactId: string | null }> {
  const scan = await prisma.qrScan.findUnique({
    where: { id: opts.scanId },
    select: {
      id: true,
      qrCodeId: true,
      campaignId: true,
      intent: true,
      lat: true,
      lng: true,
      qrCode: {
        select: { teaserMode: true, locationName: true },
      },
    },
  });

  if (!scan) throw new Error("Scan not found");
  if (!scan.campaignId) throw new Error("Scan has no campaignId");

  const campaignId = scan.campaignId;
  const isTeaserMode = scan.qrCode?.teaserMode ?? false;
  const prospectType = intentToProspectType(scan.intent);
  const score = computeProspectScore(opts, scan.intent);

  const prospect = await prisma.qrProspect.create({
    data: {
      qrCodeId: scan.qrCodeId,
      campaignId,
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      postalCode: opts.postalCode,
      intent: scan.intent,
      prospectType,
      score,
      signRequested: opts.signRequested ?? false,
      volunteerInterest: opts.volunteerInterest ?? false,
      locationCluster: scan.qrCode?.locationName,
      isLocked: isTeaserMode,
      unlockEligible: isTeaserMode,
    },
  });

  await prisma.qrScan.update({
    where: { id: opts.scanId },
    data: {
      prospectId: prospect.id,
      capturedName: opts.name,
      capturedEmail: opts.email,
      capturedPhone: opts.phone,
      capturedPostal: opts.postalCode,
      capturedAddress: opts.address,
      capturedNote: opts.note,
      conversionStage: "converted",
    },
  });

  // Teaser mode: capture the prospect but stop all downstream wiring
  if (isTeaserMode) {
    return { prospectId: prospect.id, contactId: null };
  }

  // ── DOWNSTREAM WIRING ────────────────────────────────────────────────────────

  if (opts.signRequested) {
    await prisma.qrSignOpportunity
      .create({
        data: {
          qrCodeId: scan.qrCodeId,
          prospectId: prospect.id,
          campaignId,
          approximateAddress: opts.address,
          requesterName: opts.name,
          requesterPhone: opts.phone,
          requesterEmail: opts.email,
          notes: opts.note,
        },
      })
      .catch(() => {});
  }

  let contactId: string | null = null;
  let doNotContact = false;

  if (campaignId && (opts.email || opts.phone)) {
    const existing = await prisma.contact.findFirst({
      where: {
        campaignId,
        deletedAt: null,
        OR: [
          ...(opts.email ? [{ email: opts.email }] : []),
          ...(opts.phone ? [{ phone: opts.phone }] : []),
        ],
      },
      select: { id: true, doNotContact: true, supportLevel: true, funnelStage: true },
    });

    if (existing) {
      contactId = existing.id;
      doNotContact = existing.doNotContact;
      const newSupportLevel = intentToSupportLevel(scan.intent, existing.supportLevel);
      const newFunnelStage = intentToFunnelStage(
        scan.intent,
        opts.volunteerInterest ?? false,
        existing.funnelStage,
      );
      await prisma.contact
        .update({
          where: { id: contactId },
          data: {
            lastContactedAt: new Date(),
            ...(opts.signRequested ? { signRequested: true } : {}),
            ...(opts.volunteerInterest ? { volunteerInterest: true } : {}),
            ...(newSupportLevel !== existing.supportLevel ? { supportLevel: newSupportLevel } : {}),
            ...(newFunnelStage !== existing.funnelStage ? { funnelStage: newFunnelStage } : {}),
          },
        })
        .catch(() => {});
    } else if (opts.name?.trim()) {
      const parts = opts.name.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "";
      const newSupportLevel = intentToSupportLevel(scan.intent, null);
      const newFunnelStage = intentToFunnelStage(scan.intent, opts.volunteerInterest ?? false, null);

      await prisma.contact
        .create({
          data: {
            campaignId,
            firstName,
            lastName,
            email: opts.email,
            phone: opts.phone,
            postalCode: opts.postalCode,
            address1: opts.address,
            importSource: "qr_capture",
            signRequested: opts.signRequested ?? false,
            volunteerInterest: opts.volunteerInterest ?? false,
            supportLevel: newSupportLevel,
            funnelStage: newFunnelStage,
            lastContactedAt: new Date(),
          },
        })
        .then((c) => {
          contactId = c.id;
        })
        .catch(() => {});
    }

    if (contactId) {
      await Promise.all([
        prisma.qrProspect.update({ where: { id: prospect.id }, data: { contactId } }),
        prisma.qrScan.update({ where: { id: opts.scanId }, data: { contactId } }),
      ]).catch(() => {});
    }
  }

  // Interaction — field_encounter, self-reported. Skip ActivityLog (userId required, unavailable here).
  if (contactId) {
    const locationNote = scan.qrCode?.locationName ? " at " + scan.qrCode.locationName : "";
    const intentNote = scan.intent ? "Intent: " + scan.intent : null;
    const noteParts = ["QR capture" + locationNote, intentNote, opts.note ?? null].filter(
      Boolean,
    ) as string[];

    await prisma.interaction
      .create({
        data: {
          contactId,
          type: "field_encounter",
          source: "self",
          signRequested: opts.signRequested ?? false,
          volunteerInterest: opts.volunteerInterest ?? false,
          supportLevel: intentToSupportLevel(scan.intent, null),
          notes: noteParts.join(". "),
          latitude: scan.lat,
          longitude: scan.lng,
        },
      })
      .catch(() => {});
  }

  // Sign record — Sign.address1 is required, use placeholder if address not provided
  if (opts.signRequested) {
    const locationSuffix = scan.qrCode?.locationName ? " (" + scan.qrCode.locationName + ")" : "";
    const signNotes = ["Requested via QR scan" + locationSuffix, opts.note ?? null]
      .filter(Boolean)
      .join(". ");

    await prisma.sign
      .create({
        data: {
          campaignId,
          contactId: contactId ?? undefined,
          address1: opts.address ?? "Address pending - QR capture",
          postalCode: opts.postalCode ?? undefined,
          lat: scan.lat ?? undefined,
          lng: scan.lng ?? undefined,
          notes: signNotes,
          status: "requested",
          requestedAt: new Date(),
        },
      })
      .catch(() => {});
  }

  // VolunteerProfile — contactId @unique, check before creating
  if (opts.volunteerInterest && contactId) {
    const existingProfile = await prisma.volunteerProfile
      .findUnique({ where: { contactId }, select: { id: true } })
      .catch(() => null);

    if (!existingProfile) {
      const volNote =
        "Expressed interest via QR scan" +
        (scan.qrCode?.locationName ? " at " + scan.qrCode.locationName : "") +
        ".";
      await prisma.volunteerProfile
        .create({
          data: {
            campaignId,
            contactId,
            isActive: true,
            notes: volNote,
          },
        })
        .catch(() => {});
    }
  }

  // Thank-you email — skip if doNotContact or no email
  if (opts.email && !doNotContact) {
    const campaign = await prisma.campaign
      .findUnique({ where: { id: campaignId }, select: { name: true, candidateName: true } })
      .catch(() => null);

    const campaignDisplayName = campaign?.candidateName ?? campaign?.name ?? "Your Campaign";
    const firstName = opts.name?.trim().split(/\s+/)[0] ?? "there";

    await sendEmail({
      to: opts.email,
      subject: "Thanks for connecting with " + campaignDisplayName + "!",
      html: buildThankYouEmail({
        firstName,
        campaignName: campaignDisplayName,
        signRequested: opts.signRequested ?? false,
        volunteerInterest: opts.volunteerInterest ?? false,
      }),
      fromName: campaignDisplayName,
    }).catch(() => {});
  }

  // QrFollowUp staff notification — create queue entry then fire inline notification
  const followUpBody = [
    "New QR prospect: " + (opts.name ?? "Anonymous"),
    scan.intent ? "Intent: " + scan.intent : null,
    opts.signRequested ? "Sign requested" : null,
    opts.volunteerInterest ? "Volunteer interest" : null,
    contactId
      ? "Matched to contact " + contactId
      : opts.name
        ? "New contact created"
        : "No contact",
  ]
    .filter(Boolean)
    .join(" · ");

  // Determine follow-up type: sign alerts take priority, then volunteer, then general
  const followUpType =
    opts.signRequested ? "sign_team_alert" : opts.volunteerInterest ? "volunteer_callback" : "notification";

  let followUpId: string | null = null;
  try {
    const followUp = await prisma.qrFollowUp.create({
      data: {
        qrScanId: opts.scanId,
        prospectId: prospect.id,
        campaignId,
        type: followUpType,
        status: "pending",
        body: followUpBody,
      },
    });
    followUpId = followUp.id;
  } catch {
    // Non-fatal — continue without follow-up record
  }

  // Inline staff notification — fire and forget; cron worker catches failures
  if (followUpId && (opts.signRequested || opts.volunteerInterest)) {
    notifyQrCaptureStaff({
      campaignId,
      prospectId: prospect.id,
      scanId: opts.scanId,
      followUpId,
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      signRequested: opts.signRequested ?? false,
      volunteerInterest: opts.volunteerInterest ?? false,
      intent: scan.intent,
      locationName: scan.qrCode?.locationName,
      address: opts.address,
      score,
      contactId,
    }).catch(() => {});
  }

  return { prospectId: prospect.id, contactId };
}

function intentToProspectType(intent: QrIntent | null): QrProspectType {
  switch (intent) {
    case "support":
      return "supporter";
    case "volunteer":
      return "volunteer_lead";
    case "request_sign":
      return "sign_request";
    case "keep_updated":
    case "more_info":
      return "update_subscriber";
    case "interested_in_issue":
      return "issue_responder";
    case "attend_event":
      return "event_attendee";
    case "donate":
      return "donor_lead";
    default:
      return "anonymous_engagement";
  }
}

function computeProspectScore(opts: CaptureIdentityOptions, intent: QrIntent | null): number {
  let score = 0;
  if (opts.name) score += 15;
  if (opts.email) score += 25;
  if (opts.phone) score += 20;
  if (opts.postalCode) score += 10;
  if (opts.address) score += 10;
  if (opts.signRequested) score += 10;
  if (opts.volunteerInterest) score += 10;
  if (intent === "support" || intent === "volunteer" || intent === "donate") score += 10;
  return Math.min(score, 100);
}
