/**
 * Cron: /api/cron/send-scheduled — runs every 5 minutes.
 *
 * Picks up queued ScheduledMessages where sendAt <= now() and sends them.
 *
 * Atomic lock pattern (E-002 double-send prevention):
 *   UPDATE scheduled_messages SET status='processing', processingKey=uuid
 *   WHERE id=? AND status='queued'
 * If 0 rows updated, another worker grabbed it — skip.
 *
 * Audience is re-resolved at send time from the stored filterDefinition so
 * that dynamic segments reflect contacts added after scheduling.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { loadBrandKit } from "@/lib/brand/brand-kit";
import { buildBrandedEmail } from "@/lib/email/branded-template";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 290; // 5-min window, leave headroom

const BATCH_SIZE = 5; // max scheduled messages per cron run

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find queued messages due to send
  const due = await prisma.scheduledMessage.findMany({
    where: {
      status: "queued",
      sendAt: { lte: now },
      deletedAt: null,
    },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { sendAt: "asc" },
  });

  if (due.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results: Array<{ id: string; status: string; sent?: number; failed?: number }> = [];

  for (const { id } of due) {
    const processingKey = randomUUID();

    // Atomic compare-and-set: only proceed if we claimed this row
    const claimed = await prisma.scheduledMessage.updateMany({
      where: { id, status: "queued" },
      data: { status: "processing", processingKey },
    });

    if (claimed.count === 0) {
      // Another worker grabbed it
      results.push({ id, status: "skipped" });
      continue;
    }

    // Re-fetch full message now that we own it
    const msg = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: { segment: { select: { filterDefinition: true } } },
    });
    if (!msg) {
      results.push({ id, status: "not_found" });
      continue;
    }

    try {
      // Resolve filter: segment's filterDefinition takes precedence if segmentId set
      const rawFilter = (msg.segmentId && msg.segment?.filterDefinition)
        ? msg.segment.filterDefinition
        : msg.filterDefinition;

      type FilterDef = {
        supportLevels?: string[];
        wards?: string[];
        tagIds?: string[];
        excludeDnc?: boolean;
        volunteerOnly?: boolean;
        hasEmail?: boolean;
        hasPhone?: boolean;
      };

      const filter: FilterDef =
        rawFilter && typeof rawFilter === "object" && !Array.isArray(rawFilter)
          ? (rawFilter as FilterDef)
          : {};

      const excludeDnc = filter.excludeDnc !== false; // default true

      const baseWhere = {
        campaignId: msg.campaignId,
        deletedAt: null,
        isDeceased: false,
        ...(excludeDnc ? { doNotContact: false } : {}),
        ...(filter.supportLevels && filter.supportLevels.length > 0
          ? { supportLevel: { in: filter.supportLevels as never[] } }
          : {}),
        ...(filter.wards && filter.wards.length > 0 ? { ward: { in: filter.wards } } : {}),
        ...(filter.tagIds && filter.tagIds.length > 0
          ? { tags: { some: { tagId: { in: filter.tagIds } } } }
          : {}),
        ...(filter.volunteerOnly ? { volunteerProfile: { isNot: null } } : {}),
      };

      const brand = await loadBrandKit(msg.campaignId);
      const campaign = await prisma.campaign.findUnique({
        where: { id: msg.campaignId },
        select: { fromEmailName: true, replyToEmail: true },
      });

      let sent = 0;
      let failed = 0;

      if (msg.channel === "email") {
        const recipients = await prisma.contact.findMany({
          where: { ...baseWhere, email: { not: null } },
          select: { id: true, firstName: true, lastName: true, email: true, ward: true },
          take: 5000,
        });

        const hasResend = Boolean(process.env.RESEND_API_KEY);
        if (!hasResend) {
          throw new Error("RESEND_API_KEY not configured — cannot send scheduled email");
        }

        const baseUrl = process.env.NEXTAUTH_URL ?? "https://poll.city";
        const caslFooter = `
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px">
          <div style="font-size:11px;color:#64748b;line-height:1.5">
            <p style="margin:0 0 6px"><strong>${brand.campaignName}</strong>${brand.websiteUrl ? ` · <a href="${brand.websiteUrl}" style="color:#64748b">${brand.websiteUrl}</a>` : ""}</p>
            <p style="margin:0 0 6px">You're receiving this because you or someone in your household was contacted by this campaign.</p>
            <p style="margin:0"><a href="${baseUrl}/unsubscribe?c={{contactId}}" style="color:#64748b">Unsubscribe</a> · Sent via Poll City campaign tools · Complies with Canada's Anti-Spam Legislation (CASL)</p>
          </div>
        `;

        for (const r of recipients) {
          if (!r.email) continue;
          const bodyHtml = msg.bodyHtml ?? `<p>${msg.bodyText}</p>`;
          const personalized = bodyHtml
            .replace(/\{\{firstName\}\}/g, r.firstName ?? "there")
            .replace(/\{\{lastName\}\}/g, r.lastName ?? "")
            .replace(/\{\{ward\}\}/g, r.ward ?? "")
            .replace(/\{\{candidateName\}\}/g, brand.candidateName ?? brand.campaignName)
            .replace(/\{\{campaignName\}\}/g, brand.campaignName);
          const footer = caslFooter.replace("{{contactId}}", r.id);
          const html = buildBrandedEmail({ bodyHtml: personalized, caslFooter: footer, brand });
          try {
            await sendEmail({
              to: r.email,
              subject: msg.subject ?? "(no subject)",
              html,
              ...(campaign?.fromEmailName ? { fromName: campaign.fromEmailName } : {}),
              ...(campaign?.replyToEmail ? { replyTo: campaign.replyToEmail } : {}),
            });
            sent += 1;
          } catch {
            failed += 1;
          }
        }
      } else if (msg.channel === "sms") {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioTok = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM;

        if (!twilioSid || !twilioTok || !twilioFrom) {
          throw new Error("Twilio not configured — cannot send scheduled SMS");
        }

        const recipients = await prisma.contact.findMany({
          where: { ...baseWhere, phone: { not: null } },
          select: { id: true, firstName: true, phone: true, ward: true },
          take: 2000,
        });

        const auth64 = Buffer.from(`${twilioSid}:${twilioTok}`).toString("base64");
        const sentContactIds: string[] = [];

        for (const r of recipients) {
          if (!r.phone) continue;
          const personalized = msg.bodyText
            .replace(/\{\{firstName\}\}/g, r.firstName ?? "")
            .replace(/\{\{ward\}\}/g, r.ward ?? "")
            .replace(/\{\{candidateName\}\}/g, brand.candidateName ?? brand.campaignName);
          const caslSuffix = ` Reply STOP to opt out. ${brand.campaignName}`;
          const finalMsg = `${personalized}${caslSuffix}`.slice(0, 320);

          const form = new URLSearchParams({ To: r.phone, From: twilioFrom, Body: finalMsg });
          try {
            const res = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${auth64}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: form,
              },
            );
            if (res.ok) {
              sent += 1;
              sentContactIds.push(r.id);
            } else {
              failed += 1;
            }
          } catch {
            failed += 1;
          }
        }

        if (sentContactIds.length > 0) {
          await prisma.contact.updateMany({
            where: { id: { in: sentContactIds } },
            data: { lastContactedAt: new Date() },
          }).catch(() => {});
        }
      }

      // Mark sent and write NotificationLog
      await prisma.scheduledMessage.update({
        where: { id },
        data: { status: "sent", sentAt: new Date(), sentCount: sent, failedCount: failed },
      });

      await prisma.notificationLog.create({
        data: {
          campaignId: msg.campaignId,
          userId: msg.createdById,
          title: msg.subject ?? `${msg.channel.toUpperCase()} scheduled blast`,
          body: msg.bodyText.slice(0, 160),
          status: "sent",
          sentAt: new Date(),
          totalSubscribers: sent + failed,
          deliveredCount: sent,
          failedCount: failed,
          sendKey: `scheduled:${id}`,
        },
      }).catch(() => {});

      results.push({ id, status: "sent", sent, failed });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await prisma.scheduledMessage.update({
        where: { id },
        data: { status: "failed", errorMessage },
      });
      results.push({ id, status: "failed" });
      console.error(`[cron/send-scheduled] failed for ${id}:`, errorMessage);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
