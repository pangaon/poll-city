import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

// POST /api/inbox/[threadId]/reply
// Sends a reply via Resend (email) or Twilio (SMS) and appends an outbound InboxMessage.
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { campaignId, body } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const thread = await prisma.inboxThread.findFirst({
    where: { id: params.threadId, campaignId },
    include: {
      campaign: {
        select: {
          fromEmailName: true,
          replyToEmail: true,
          candidateName: true,
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@poll.city";
  const campaignFromEmail = thread.campaign.replyToEmail ?? fromEmail;
  let externalId: string | null = null;

  if (thread.channel === "email") {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email not configured", code: "INTEGRATION_UNAVAILABLE" },
        { status: 400 },
      );
    }

    const subject = thread.subject ? `Re: ${thread.subject}` : "Reply from campaign";
    const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">${body.replace(/\n/g, "<br>")}</div>`;

    try {
      const result = await sendEmail({
        to: thread.fromHandle,
        subject,
        html,
        replyTo: campaignFromEmail,
        fromName: thread.campaign.fromEmailName ?? thread.campaign.candidateName ?? undefined,
      });
      externalId = result?.id ?? null;
    } catch (e) {
      console.error("[inbox/reply] email send failed:", e);
      return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
    }
  } else {
    // SMS via Twilio
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const tok = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM;

    if (!sid || !tok || !fromPhone) {
      return NextResponse.json(
        { error: "SMS not configured", code: "INTEGRATION_UNAVAILABLE" },
        { status: 400 },
      );
    }

    const auth = Buffer.from(`${sid}:${tok}`).toString("base64");
    const form = new URLSearchParams({
      To: thread.fromHandle,
      From: fromPhone,
      Body: body.slice(0, 320),
    });

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form,
        },
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[inbox/reply] Twilio error:", res.status, detail);
        return NextResponse.json({ error: "Failed to send SMS" }, { status: 502 });
      }
      const smsData = (await res.json()) as { sid?: string };
      externalId = smsData.sid ?? null;
    } catch (e) {
      console.error("[inbox/reply] Twilio fetch error:", e);
      return NextResponse.json({ error: "Failed to send SMS" }, { status: 502 });
    }
  }

  // Persist the outbound message and update thread.
  const [message] = await Promise.all([
    prisma.inboxMessage.create({
      data: {
        threadId: params.threadId,
        direction: "outbound",
        fromHandle: campaignFromEmail,
        toHandle: thread.fromHandle,
        body,
        externalId,
        sentByUserId: session!.user.id,
      },
      select: {
        id: true,
        direction: true,
        fromHandle: true,
        toHandle: true,
        body: true,
        sentAt: true,
        sentByUser: { select: { id: true, name: true } },
      },
    }),
    prisma.inboxThread.update({
      where: { id: params.threadId },
      data: { lastMessageAt: new Date(), status: "open" },
    }),
  ]);

  await audit(prisma, "inbox.reply", {
    campaignId,
    userId: session!.user.id,
    entityId: params.threadId,
    entityType: "InboxThread",
    ip: req.headers.get("x-forwarded-for"),
    details: { channel: thread.channel, to: thread.fromHandle },
  });

  return NextResponse.json({ message });
}
