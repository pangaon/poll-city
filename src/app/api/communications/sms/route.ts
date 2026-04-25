import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { loadBrandKit } from "@/lib/brand/brand-kit";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  campaignId: z.string().min(1),
  body: z.string().min(2).max(1000),
  supportLevels: z.array(z.string()).optional(),
  wards: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  excludeDnc: z.boolean().default(true),
  excludeSmsOptOut: z.boolean().default(true),
  testOnly: z.boolean().default(false),
  // E-001: client-generated idempotency key prevents double-send on retry
  sendKey: z.string().optional(),
});

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM;
  if (!sid || !tok || !from) {
    console.log(`[comms/sms] (no Twilio config) would send to ${to}: ${body}`);
    return false;
  }
  const auth = Buffer.from(`${sid}:${tok}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    return res.ok;
  } catch (e) {
    console.error("[comms/sms] twilio error:", e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const limited = await enforceLimit(req, "export", session!.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { campaignId, body: msgBody, supportLevels, wards, tagIds, excludeDnc, excludeSmsOptOut, testOnly, sendKey } = parsed.data;

  // E-008: fail loudly when Twilio is not configured
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM),
  );
  if (!hasTwilio) {
    return NextResponse.json(
      { error: "SMS sending is not configured for this environment.", code: "INTEGRATION_UNAVAILABLE" },
      { status: 400 },
    );
  }

  // E-001: idempotency — reject duplicate sendKey
  if (sendKey) {
    const existing = await prisma.notificationLog.findUnique({ where: { sendKey } });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate send — this sendKey was already processed.", code: "DUPLICATE_SEND" },
        { status: 409 },
      );
    }
  }

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(m.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const [brand, campaign] = await Promise.all([
    loadBrandKit(campaignId),
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { commsCooldownHours: true, commsMaxPerWeek: true, commsMaxPerMonth: true },
    }),
  ]);

  const where = {
    campaignId,
    deletedAt: null,
    isDeceased: false,
    ...(excludeDnc ? { doNotContact: false } : {}),
    ...(excludeSmsOptOut ? { smsOptOut: false } : {}),
    phone: { not: null },
    ...(supportLevels && supportLevels.length > 0
      ? { supportLevel: { in: supportLevels as never[] } }
      : {}),
    ...(wards && wards.length > 0 ? { ward: { in: wards } } : {}),
    ...(tagIds && tagIds.length > 0
      ? { tags: { some: { tagId: { in: tagIds } } } }
      : {}),
  };

  const allRecipients = await prisma.contact.findMany({
    where,
    select: { id: true, firstName: true, phone: true, ward: true },
    take: testOnly ? 1 : 2000,
  });

  if (allRecipients.length === 0) {
    return NextResponse.json({ error: "No recipients match that audience" }, { status: 400 });
  }

  // Fatigue guard: skip contacts contacted by any channel within the campaign cooldown window.
  const cooldownMs = (campaign?.commsCooldownHours ?? 24) * 60 * 60 * 1000;
  const fatigueCutoff = new Date(Date.now() - cooldownMs);
  const allIds = allRecipients.map((r) => r.id);
  const recentlyContacted = await prisma.contact.findMany({
    where: { id: { in: allIds }, lastContactedAt: { gte: fatigueCutoff } },
    select: { id: true },
  });
  const recentIds = new Set(recentlyContacted.map((r) => r.id));
  const cooldownFiltered = allRecipients.filter((r) => !recentIds.has(r.id));
  const fatigueSuppressed = allRecipients.length - cooldownFiltered.length;

  // Per-period frequency check — enforces commsMaxPerWeek / commsMaxPerMonth if set.
  // Uses ContactCommsLog; skipped gracefully if table doesn't exist yet (before npx prisma db push).
  const frequencySuppressedIds = new Set<string>();
  if (campaign?.commsMaxPerWeek != null || campaign?.commsMaxPerMonth != null) {
    try {
      const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const logs = await prisma.contactCommsLog.findMany({
        where: { contactId: { in: cooldownFiltered.map((r) => r.id) }, campaignId, sentAt: { gte: monthStart } },
        select: { contactId: true, sentAt: true },
      });
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const counts = new Map<string, { week: number; month: number }>();
      for (const l of logs) {
        const c = counts.get(l.contactId) ?? { week: 0, month: 0 };
        c.month++;
        if (l.sentAt >= weekStart) c.week++;
        counts.set(l.contactId, c);
      }
      for (const [id, c] of counts) {
        if (campaign.commsMaxPerWeek != null && c.week >= campaign.commsMaxPerWeek) frequencySuppressedIds.add(id);
        if (campaign.commsMaxPerMonth != null && c.month >= campaign.commsMaxPerMonth) frequencySuppressedIds.add(id);
      }
    } catch {
      // ContactCommsLog may not exist until npx prisma db push — frequency check skipped
    }
  }
  const recipients = cooldownFiltered.filter((r) => !frequencySuppressedIds.has(r.id));
  const frequencySuppressed = cooldownFiltered.length - recipients.length;

  let sent = 0;
  let failed = 0;
  const sentContactIds: string[] = [];

  for (const r of recipients) {
    if (!r.phone) continue;
    const personalized = msgBody
      .replace(/\{\{firstName\}\}/g, r.firstName ?? "")
      .replace(/\{\{ward\}\}/g, r.ward ?? "")
      .replace(/\{\{candidateName\}\}/g, brand.candidateName ?? brand.campaignName);
    const caslSuffix = ` Reply STOP to opt out. ${brand.campaignName}`;
    const finalMsg = `${personalized}${caslSuffix}`.slice(0, 320); // 2 segments max

    const ok = await sendSms(r.phone, finalMsg);
    if (ok) { sent += 1; sentContactIds.push(r.id); }
    else failed += 1;
  }

  if (sentContactIds.length > 0) {
    const sentAt = new Date();
    await prisma.contact.updateMany({
      where: { id: { in: sentContactIds } },
      data: { lastContactedAt: sentAt },
    }).catch(() => {});
    await prisma.contactCommsLog.createMany({
      data: sentContactIds.map((id) => ({ contactId: id, campaignId, channel: "sms", sentAt })),
    }).catch(() => {});
  }

  await prisma.notificationLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      title: "SMS blast",
      body: msgBody.slice(0, 160),
      status: "sent",
      sentAt: new Date(),
      totalSubscribers: recipients.length,
      deliveredCount: sent,
      failedCount: failed,
      audience: { supportLevels, wards, tagIds, excludeDnc, testOnly },
      ...(sendKey ? { sendKey } : {}),
    },
  }).catch(() => {});

  await audit(prisma, 'sms.send', {
    campaignId,
    userId: session!.user.id,
    entityId: campaignId,
    entityType: 'SmsBlast',
    ip: req.headers.get('x-forwarded-for'),
    details: { audienceSize: recipients.length, sent, failed },
  });

  return NextResponse.json({ sent, failed, audienceSize: allRecipients.length, fatigueSuppressed, frequencySuppressed });
}
