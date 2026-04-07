import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Weekly outreach to unclaimed officials who have an email.
// Schedule: Monday 09:00 UTC via vercel.json.

const COOLDOWN_DAYS = 30;
const BATCH_LIMIT = 100; // cap per run to avoid rate limits on Resend

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.official.findMany({
    where: {
      isClaimed: false,
      isActive: true,
      email: { not: null },
      OR: [
        { outreach: { none: {} } },
        { outreach: { every: { sentAt: { lt: cutoff } } } },
      ],
    },
    select: { id: true, name: true, email: true, title: true, externalId: true },
    take: BATCH_LIMIT,
  });

  let sent = 0;
  let failed = 0;

  for (const official of candidates) {
    if (!official.email) continue;
    const claimUrl = `${process.env.NEXTAUTH_URL ?? "https://poll.city"}/claim/${official.externalId ?? official.id}`;

    if (!process.env.RESEND_API_KEY) {
      console.log(`[claim-outreach] would send to ${official.email}: ${claimUrl}`);
      continue;
    }

    try {
      await sendEmail({
        to: official.email,
        subject: `Claim your Poll City profile, ${official.name}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="color:#1E3A8A;font-size:24px;">Your Poll City profile is waiting</h1>
          <p>Hi ${official.name},</p>
          <p>Poll City maintains a free public profile for every ${official.title ?? "elected official"} in Canada. Constituents can send questions, view your voting record, and follow your work.</p>
          <p><strong>Claim your profile</strong> to edit your bio, add social links, and respond to constituent questions:</p>
          <p style="margin:24px 0;">
            <a href="${claimUrl}" style="background:#1E3A8A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Claim my profile</a>
          </p>
          <p style="color:#64748b;font-size:14px;">No cost, no commitment. Reply to this email with any questions.</p>
          <p style="color:#64748b;font-size:14px;">— The Poll City team</p>
        </div>`,
      });
      await prisma.officialOutreach.create({
        data: { officialId: official.id, sentAt: new Date() },
      });
      sent += 1;
    } catch (e) {
      console.error(`[claim-outreach] failed for ${official.email}:`, e);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, sent, failed });
}
