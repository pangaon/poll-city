import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { loadBrandKit } from "@/lib/brand/brand-kit";

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
  testOnly: z.boolean().default(false),
});

// POST /api/communications/email — send bulk campaign email via Resend,
// CASL footer non-removable, logs each recipient to NotificationLog.
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "email:write");
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
  const { campaignId, subject, bodyHtml, supportLevels, wards, tagIds, excludeDnc, testOnly } = parsed.data;

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
    email: { not: null },
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
    select: { id: true, firstName: true, lastName: true, email: true, ward: true },
    take: testOnly ? 1 : 5000,
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients match that audience" }, { status: 400 });
  }

  const caslFooter = `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px">
    <div style="font-family:system-ui,sans-serif;font-size:11px;color:#64748b;line-height:1.5">
      <p style="margin:0 0 6px"><strong>${brand.campaignName}</strong>${brand.websiteUrl ? ` · <a href="${brand.websiteUrl}" style="color:#64748b">${brand.websiteUrl}</a>` : ""}</p>
      <p style="margin:0 0 6px">You're receiving this because you or someone in your household was contacted by this campaign.</p>
      <p style="margin:0"><a href="${process.env.NEXTAUTH_URL ?? "https://poll.city"}/unsubscribe?c={{contactId}}" style="color:#64748b">Unsubscribe</a> · Sent via Poll City campaign tools · Complies with Canada's Anti-Spam Legislation (CASL)</p>
    </div>
  `;

  let sent = 0;
  let failed = 0;
  const hasResend = Boolean(process.env.RESEND_API_KEY);

  for (const r of recipients) {
    if (!r.email) continue;
    const personalized = bodyHtml
      .replace(/\{\{firstName\}\}/g, r.firstName ?? "there")
      .replace(/\{\{lastName\}\}/g, r.lastName ?? "")
      .replace(/\{\{ward\}\}/g, r.ward ?? "")
      .replace(/\{\{candidateName\}\}/g, brand.candidateName ?? brand.campaignName)
      .replace(/\{\{campaignName\}\}/g, brand.campaignName);
    const footer = caslFooter.replace("{{contactId}}", r.id);
    const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">${personalized}</div>${footer}`;

    if (!hasResend) {
      console.log(`[comms/email] (no RESEND_API_KEY) would send to ${r.email}: ${subject}`);
      continue;
    }
    try {
      await sendEmail({ to: r.email, subject, html });
      sent += 1;
    } catch (e) {
      console.error(`[comms/email] failed for ${r.email}:`, e);
      failed += 1;
    }
  }

  // One NotificationLog row summarising the whole blast
  await prisma.notificationLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      title: subject,
      body: subject,
      status: "sent",
      sentAt: new Date(),
      totalSubscribers: recipients.length,
      deliveredCount: sent,
      failedCount: failed,
      audience: { supportLevels, wards, tagIds, excludeDnc, testOnly },
    },
  }).catch(() => {});

  return NextResponse.json({ sent, failed, audienceSize: recipients.length, resendConfigured: hasResend });
}
