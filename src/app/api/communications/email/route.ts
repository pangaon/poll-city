import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { loadBrandKit } from "@/lib/brand/brand-kit";
import { buildBrandedEmail } from "@/lib/email/branded-template";
import { audit } from "@/lib/audit";
import { encodeTrackingToken } from "@/lib/email/tracking-token";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  campaignId: z.string().min(1),
  subject: z.string().min(3).max(150),
  bodyHtml: z.string().min(10).max(50_000),
  supportLevels: z.array(z.string()).optional(),
  wards: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  excludeDnc: z.boolean().default(true),
  excludeEmailBounced: z.boolean().default(true),
  testOnly: z.boolean().default(false),
  // E-001: client-generated idempotency key prevents double-send on retry
  sendKey: z.string().optional(),
});

// POST /api/communications/email — send bulk campaign email via Resend,
// CASL footer non-removable, logs each recipient to NotificationLog.
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
  const { campaignId, subject, bodyHtml, supportLevels, wards, tagIds, excludeDnc, excludeEmailBounced, testOnly, sendKey } = parsed.data;

  // E-007: fail loudly when Resend is not configured
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending is not configured for this environment.", code: "INTEGRATION_UNAVAILABLE" },
      { status: 400 },
    );
  }

  // E-001: idempotency — reject duplicate sendKey within last 5 minutes
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
      select: { fromEmailName: true, replyToEmail: true, commsCooldownHours: true, commsMaxPerWeek: true, commsMaxPerMonth: true },
    }),
  ]);
  const where = {
    campaignId,
    deletedAt: null,
    isDeceased: false,
    ...(excludeDnc ? { doNotContact: false } : {}),
    ...(excludeEmailBounced ? { emailBounced: false } : {}),
    email: { not: null },
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
    select: { id: true, firstName: true, lastName: true, email: true, ward: true },
    take: testOnly ? 1 : 5000,
  });

  if (allRecipients.length === 0) {
    return NextResponse.json({ error: "No recipients match that audience" }, { status: 400 });
  }

  // CASL consent check — filter to contacts with valid email consent only.
  // Contacts with express_withdrawal are ALWAYS excluded.
  // If ConsentRecord table doesn't exist yet (schema not pushed), treat all contacts as consented.
  const now = new Date();
  const contactIds = allRecipients.map((r) => r.id);

  const withdrawnIds = new Set<string>();
  const consentedIds = new Set<string>();
  let consentTableExists = true;

  try {
    const consentRecords = await prisma.consentRecord.findMany({
      where: { contactId: { in: contactIds }, campaignId, channel: "email" },
      select: { contactId: true, consentType: true, expiresAt: true },
      orderBy: { collectedAt: "desc" },
    });

    for (const rec of consentRecords) {
      if (rec.consentType === "express_withdrawal") {
        withdrawnIds.add(rec.contactId);
        continue;
      }
      if (withdrawnIds.has(rec.contactId)) continue;
      if (consentedIds.has(rec.contactId)) continue;
      if (
        (rec.consentType === "explicit" || rec.consentType === "implied") &&
        (rec.expiresAt === null || rec.expiresAt > now)
      ) {
        consentedIds.add(rec.contactId);
      }
    }
  } catch {
    // ConsentRecord table may not exist until npx prisma db push — skip filter
    consentTableExists = false;
  }

  // If consent table exists, filter to consented only. If not, send to all (no-filter mode).
  const consentFiltered = consentTableExists
    ? allRecipients.filter((r) => consentedIds.has(r.id))
    : allRecipients;
  const noConsentCount = consentTableExists ? allRecipients.length - consentFiltered.length : 0;

  // Fatigue guard: skip contacts contacted by any channel within the campaign cooldown window.
  const cooldownMs = (campaign?.commsCooldownHours ?? 24) * 60 * 60 * 1000;
  const fatigueCutoff = new Date(Date.now() - cooldownMs);
  const consentFilteredIds = consentFiltered.map((r) => r.id);
  const recentlyContacted = await prisma.contact.findMany({
    where: { id: { in: consentFilteredIds }, lastContactedAt: { gte: fatigueCutoff } },
    select: { id: true },
  });
  const recentIds = new Set(recentlyContacted.map((r) => r.id));
  const cooldownFiltered = consentFiltered.filter((r) => !recentIds.has(r.id));
  const fatigueSuppressed = consentFiltered.length - cooldownFiltered.length;

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
      Array.from(counts).forEach(([id, c]) => {
        if (campaign.commsMaxPerWeek != null && c.week >= campaign.commsMaxPerWeek) frequencySuppressedIds.add(id);
        if (campaign.commsMaxPerMonth != null && c.month >= campaign.commsMaxPerMonth) frequencySuppressedIds.add(id);
      });
    } catch {
      // ContactCommsLog may not exist until npx prisma db push — frequency check skipped
    }
  }
  const recipients = cooldownFiltered.filter((r) => !frequencySuppressedIds.has(r.id));
  const frequencySuppressed = cooldownFiltered.length - recipients.length;

  if (recipients.length === 0 && consentTableExists) {
    return NextResponse.json(
      {
        error: "No recipients have valid CASL email consent on record.",
        noConsentCount,
        hint: "Add consent records via Contacts → Consent tab, or use Import → map the consent_given column.",
      },
      { status: 400 },
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://poll.city";

  // Create the NotificationLog row BEFORE sending so we have the ID for tracking tokens.
  const log = await prisma.notificationLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      title: subject,
      body: subject,
      status: "sent",
      sentAt: new Date(),
      totalSubscribers: recipients.length,
      deliveredCount: 0,
      failedCount: 0,
      audience: { supportLevels, wards, tagIds, excludeDnc, testOnly },
      ...(sendKey ? { sendKey } : {}),
    },
    select: { id: true },
  });

  const caslFooter = `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">
    <div style="font-size:11px;color:#64748b;line-height:1.5">
      <p style="margin:0 0 6px"><strong>${brand.campaignName}</strong>${brand.websiteUrl ? ` · <a href="${brand.websiteUrl}" style="color:#64748b">${brand.websiteUrl}</a>` : ""}</p>
      <p style="margin:0 0 6px">You're receiving this because you or someone in your household was contacted by this campaign.</p>
      <p style="margin:0"><a href="${baseUrl}/unsubscribe?c={{contactId}}" style="color:#64748b">Unsubscribe</a> · Sent via Poll City campaign tools · Complies with Canada's Anti-Spam Legislation (CASL)</p>
    </div>
  `;

  let sent = 0;
  let failed = 0;
  const sentContactIds: string[] = [];

  for (const r of recipients) {
    if (!r.email) continue;

    const openToken = encodeTrackingToken({ t: "o", c: campaignId, b: log.id, co: r.id });
    const openPixel = `<img src="${baseUrl}/api/track/open/${openToken}" width="1" height="1" style="display:none;border:0" alt="" />`;

    const personalized = bodyHtml
      .replace(/\{\{firstName\}\}/g, r.firstName ?? "there")
      .replace(/\{\{lastName\}\}/g, r.lastName ?? "")
      .replace(/\{\{ward\}\}/g, r.ward ?? "")
      .replace(/\{\{candidateName\}\}/g, brand.candidateName ?? brand.campaignName)
      .replace(/\{\{campaignName\}\}/g, brand.campaignName)
      // Wrap absolute links with click-tracking redirect
      .replace(/href="(https?:\/\/[^"]+)"/g, (_match, url: string) => {
        const clickToken = encodeTrackingToken({ t: "k", c: campaignId, b: log.id, co: r.id, u: url });
        return `href="${baseUrl}/api/track/click/${clickToken}"`;
      });

    const footer = caslFooter.replace("{{contactId}}", r.id);
    const html = buildBrandedEmail({ bodyHtml: personalized, caslFooter: footer, openPixel, brand });
    try {
      await sendEmail({
        to: r.email,
        subject,
        html,
        ...(campaign?.fromEmailName ? { fromName: campaign.fromEmailName } : {}),
        ...(campaign?.replyToEmail ? { replyTo: campaign.replyToEmail } : {}),
      });
      sent += 1;
      sentContactIds.push(r.id);
    } catch (e) {
      console.error(`[comms/email] failed for ${r.email}:`, e);
      failed += 1;
    }
  }

  if (sentContactIds.length > 0) {
    const sentAt = new Date();
    await prisma.contact.updateMany({
      where: { id: { in: sentContactIds } },
      data: { lastContactedAt: sentAt },
    }).catch(() => {});
    await prisma.contactCommsLog.createMany({
      data: sentContactIds.map((id) => ({ contactId: id, campaignId, channel: "email", sentAt })),
    }).catch(() => {});
  }

  // Update final delivery counts on the log row we created above.
  await prisma.notificationLog.update({
    where: { id: log.id },
    data: { deliveredCount: sent, failedCount: failed },
  }).catch(() => {});

  await audit(prisma, 'email.send', {
    campaignId,
    userId: session!.user.id,
    entityId: campaignId,
    entityType: 'EmailBlast',
    ip: req.headers.get('x-forwarded-for'),
    details: { subject, audienceSize: recipients.length, sent, failed },
  });

  return NextResponse.json({ sent, failed, audienceSize: allRecipients.length, noConsentCount, fatigueSuppressed, frequencySuppressed });
}
