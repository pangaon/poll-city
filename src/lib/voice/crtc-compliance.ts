/**
 * CRTC Compliance Engine for Canadian telemarketing rules.
 *
 * CRTC Telecom Rules (Unsolicited Telecommunications Rules):
 * - Calls only between 9:00am and 9:30pm local time of the called party
 * - Must identify caller and campaign within 30 seconds
 * - Must provide opt-out mechanism (press key to be removed)
 * - Must honour National Do Not Call List (DNCL)
 * - Political campaigns are EXEMPT from DNCL but must still honour individual opt-outs
 * - Must maintain internal do-not-call list
 * - Caller ID must display a valid Canadian number
 */

import prisma from "@/lib/db/prisma";

interface ComplianceCheck {
  compliant: boolean;
  violations: string[];
  warnings: string[];
}

/** Check if a voice broadcast is CRTC compliant before sending */
export async function checkCRTCCompliance(broadcastId: string): Promise<ComplianceCheck> {
  const broadcast = await prisma.voiceBroadcast.findUnique({
    where: { id: broadcastId },
    include: { campaign: { select: { name: true, candidateName: true } } },
  });

  if (!broadcast) return { compliant: false, violations: ["Broadcast not found"], warnings: [] };

  const violations: string[] = [];
  const warnings: string[] = [];

  // 1. Must have caller ID (valid Canadian number)
  if (!broadcast.callerId) {
    violations.push("Caller ID is required. Must be a valid Canadian phone number.");
  } else if (!isCanadianPhoneNumber(broadcast.callerId)) {
    violations.push("Caller ID must be a valid Canadian phone number (10 digits, starting with area code).");
  }

  // 2. Must have audio or TwiML
  if (!broadcast.audioUrl && !broadcast.twimlScript) {
    violations.push("Audio file or TwiML script is required.");
  }

  // 3. Call window must be 9am-9:30pm
  const windowStart = broadcast.callWindowStart ?? "09:00";
  const windowEnd = broadcast.callWindowEnd ?? "21:30";
  const [startH, startM] = windowStart.split(":").map(Number);
  const [endH, endM] = windowEnd.split(":").map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  if (startMins < 540) { // 9:00am = 540 min
    violations.push("CRTC: Calls cannot begin before 9:00am local time.");
  }
  if (endMins > 1290) { // 9:30pm = 1290 min
    violations.push("CRTC: Calls must end by 9:30pm local time.");
  }

  // 4. Check internal do-not-call list was consulted
  if (!broadcast.doNotCallChecked) {
    warnings.push("Internal do-not-call list has not been checked. Opt-outs will be filtered automatically.");
  }

  // 5. Campaign identification
  if (!broadcast.callerIdName && !broadcast.campaign.candidateName) {
    warnings.push("No caller ID name set. CRTC requires campaign identification within 30 seconds.");
  }

  // 6. Scheduled time check
  if (broadcast.scheduledFor) {
    const scheduledHour = broadcast.scheduledFor.getHours();
    if (scheduledHour < 9 || scheduledHour >= 22) {
      violations.push("Scheduled time is outside CRTC calling hours (9am-9:30pm).");
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
  };
}

/** Filter contacts against internal opt-out list */
export async function filterOptedOut(
  campaignId: string,
  phones: string[],
): Promise<{ allowed: string[]; blocked: string[] }> {
  const optOuts = await prisma.voiceOptOut.findMany({
    where: { campaignId, phone: { in: phones } },
    select: { phone: true },
  });

  const blockedSet = new Set(optOuts.map((o) => o.phone));
  const allowed = phones.filter((p) => !blockedSet.has(p));
  const blocked = phones.filter((p) => blockedSet.has(p));

  return { allowed, blocked };
}

/** Check if a phone number is a valid Canadian number */
function isCanadianPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  // Canadian numbers: 10 digits, area code 2-9 as first digit
  if (digits.length === 10 && /^[2-9]/.test(digits)) return true;
  // With country code: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith("1") && /^1[2-9]/.test(digits)) return true;
  return false;
}

/** Check if current time is within CRTC calling hours (9am-9:30pm Eastern) */
export function isWithinCallingHours(): boolean {
  const now = new Date();
  // Convert to Eastern time (approximate — proper timezone handling would use Intl)
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const hours = eastern.getHours();
  const mins = eastern.getMinutes();
  const totalMins = hours * 60 + mins;
  return totalMins >= 540 && totalMins <= 1290; // 9:00am to 9:30pm
}
