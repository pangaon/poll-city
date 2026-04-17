import crypto from "crypto";
import prisma from "@/lib/db/prisma";
import type { QrConversionStage, QrIntent, QrProspectType } from "@prisma/client";
import type { QrScanResult } from "./types";

// Privacy-safe device fingerprinting — sha256(ip + userAgent), never raw IP
function buildIpHash(ip: string | null, userAgent: string | null): string | null {
  if (!ip) return null;
  return crypto
    .createHash("sha256")
    .update(`${ip}|${userAgent ?? ""}`)
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

  // Allow scans on inactive/expired codes — they still count, landing handles messaging
  const ipHash = buildIpHash(opts.ip, opts.userAgent);
  const deviceClass = classifyDevice(opts.userAgent);

  // Repeat scan detection via sessionToken
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

  // Increment scanCount — only for new (non-repeat) scans
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

  // Determine prospect type from intent
  const prospectType = intentToProspectType(scan.intent);

  // Score the prospect (simple heuristic)
  const score = computeProspectScore(opts, scan.intent);

  // Create or update prospect
  const prospect = await prisma.qrProspect.create({
    data: {
      qrCodeId: scan.qrCodeId,
      campaignId: scan.campaignId,
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
      isLocked: scan.qrCode?.teaserMode ?? false,
      unlockEligible: scan.qrCode?.teaserMode ?? false,
    },
  });

  // Update scan with capture data and prospect linkage
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

  // If sign was requested, create a sign opportunity record
  if (opts.signRequested) {
    await prisma.qrSignOpportunity.create({
      data: {
        qrCodeId: scan.qrCodeId,
        prospectId: prospect.id,
        campaignId: scan.campaignId,
        approximateAddress: opts.address,
        requesterName: opts.name,
        requesterPhone: opts.phone,
        requesterEmail: opts.email,
        notes: opts.note,
      },
    });
  }

  // Attempt to match to existing Contact (by email or phone within campaign)
  let contactId: string | null = null;
  if (scan.campaignId && (opts.email || opts.phone)) {
    const existing = await prisma.contact.findFirst({
      where: {
        campaignId: scan.campaignId,
        deletedAt: null,
        OR: [
          opts.email ? { email: opts.email } : undefined,
          opts.phone ? { phone: opts.phone } : undefined,
        ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
      },
      select: { id: true },
    });

    if (existing) {
      contactId = existing.id;
      await prisma.qrProspect.update({
        where: { id: prospect.id },
        data: { contactId },
      });
      await prisma.qrScan.update({
        where: { id: opts.scanId },
        data: { contactId },
      });
    }
  }

  // Queue a follow-up notification to campaign staff (non-blocking)
  if (scan.campaignId && !scan.qrCode?.teaserMode) {
    await prisma.qrFollowUp.create({
      data: {
        qrScanId: opts.scanId,
        prospectId: prospect.id,
        campaignId: scan.campaignId,
        type: "notification",
        status: "pending",
        body: `New QR prospect: ${opts.name ?? "Anonymous"} — ${scan.intent ?? "no intent"}`,
      },
    }).catch(() => {}); // non-fatal
  }

  return { prospectId: prospect.id, contactId };
}

function intentToProspectType(intent: QrIntent | null): QrProspectType {
  switch (intent) {
    case "support": return "supporter";
    case "volunteer": return "volunteer_lead";
    case "request_sign": return "sign_request";
    case "keep_updated":
    case "more_info": return "update_subscriber";
    case "interested_in_issue": return "issue_responder";
    case "attend_event": return "event_attendee";
    case "donate": return "donor_lead";
    default: return "anonymous_engagement";
  }
}

function computeProspectScore(
  opts: CaptureIdentityOptions,
  intent: QrIntent | null,
): number {
  let score = 0;
  if (opts.name) score += 15;
  if (opts.email) score += 25;
  if (opts.phone) score += 20;
  if (opts.postalCode) score += 10;
  if (opts.address) score += 10;
  if (opts.signRequested) score += 10;
  if (opts.volunteerInterest) score += 10;
  // High-intent actions
  if (intent === "support" || intent === "volunteer" || intent === "donate") score += 10;
  return Math.min(score, 100);
}
