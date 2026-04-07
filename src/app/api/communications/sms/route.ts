import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
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
  testOnly: z.boolean().default(false),
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
  const permError = requirePermission(session!.user.role as string, "sms:write");
  if (permError) return permError;
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
  const { campaignId, body: msgBody, supportLevels, wards, tagIds, excludeDnc, testOnly } = parsed.data;

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(m.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const brand = await loadBrandKit(campaignId);

  const where = {
    campaignId,
    isDeceased: false,
    ...(excludeDnc ? { doNotContact: false } : {}),
    phone: { not: null },
    ...(supportLevels && supportLevels.length > 0
      ? { supportLevel: { in: supportLevels as never[] } }
      : {}),
    ...(wards && wards.length > 0 ? { ward: { in: wards } } : {}),
    ...(tagIds && tagIds.length > 0
      ? { tags: { some: { tagId: { in: tagIds } } } }
      : {}),
  };

  const recipients = await prisma.contact.findMany({
    where,
    select: { id: true, firstName: true, phone: true, ward: true },
    take: testOnly ? 1 : 2000,
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients match that audience" }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM));

  for (const r of recipients) {
    if (!r.phone) continue;
    const personalized = msgBody
      .replace(/\{\{firstName\}\}/g, r.firstName ?? "")
      .replace(/\{\{ward\}\}/g, r.ward ?? "")
      .replace(/\{\{candidateName\}\}/g, brand.candidateName ?? brand.campaignName);
    const caslSuffix = ` Reply STOP to opt out. ${brand.campaignName}`;
    const finalMsg = `${personalized}${caslSuffix}`.slice(0, 320); // 2 segments max

    const ok = await sendSms(r.phone, finalMsg);
    if (ok || !hasTwilio) sent += 1;
    else failed += 1;
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

  return NextResponse.json({ sent, failed, audienceSize: recipients.length, twilioConfigured: hasTwilio });
}
