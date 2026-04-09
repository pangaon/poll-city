import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/db/prisma";

/**
 * POST /api/webhooks/resend
 * Handles Resend webhook events: delivered, bounced, complained, opened, clicked.
 * Configure in Resend dashboard → Webhooks → https://poll.city/api/webhooks/resend
 */
export async function POST(req: NextRequest) {
  // Replay attack protection: Resend sends svix-timestamp (Unix seconds).
  // Reject if older than 5 minutes.
  const svixTimestamp = req.headers.get("svix-timestamp");
  if (svixTimestamp) {
    const ts = parseInt(svixTimestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts * 1000) > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Webhook timestamp expired" }, { status: 400 });
    }
  }

  // Read raw body once — needed for both signature verification and JSON parsing.
  const rawBody = await req.text();

  // Signature guard: validate against RESEND_WEBHOOK_SECRET when configured.
  // Resend uses the Svix signing scheme: HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{body}",
  // secret is base64-encoded after stripping the "whsec_" prefix.
  const resendSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (resendSecret) {
    const svixSignature = req.headers.get("svix-signature");
    const svixId = req.headers.get("svix-id");
    if (!svixSignature || !svixId || !svixTimestamp) {
      return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 401 });
    }

    const secretBytes = Buffer.from(resendSecret.replace(/^whsec_/, ""), "base64");
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const computed = createHmac("sha256", secretBytes).update(toSign).digest("base64");

    // svix-signature header is "v1,<sig1> v1,<sig2>" — any matching sig passes
    const sigs = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
    const valid = sigs.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(computed, "base64"));
      } catch {
        return false;
      }
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  try {
    const event = JSON.parse(rawBody) as { type: string; data: Record<string, unknown> };
    return await handleEvent(event.type, event.data);
  } catch (err) {
    console.error("Resend webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

/**
 * Resolves the campaign IDs that are associated with a given email address
 * via newsletter subscribers. Used to scope contact updates to the correct
 * campaign(s) — never update contacts cross-campaign.
 */
async function getCampaignIdsForEmail(email: string): Promise<string[]> {
  const subs = await prisma.newsletterSubscriber.findMany({
    where: {
      email: { equals: email, mode: "insensitive" },
      campaignId: { not: null },
    },
    select: { campaignId: true },
  });
  return subs.flatMap((s) => (s.campaignId ? [s.campaignId] : []));
}

async function handleEvent(type: string, data: Record<string, unknown>): Promise<NextResponse> {
  const toEmail = Array.isArray(data.to) ? (data.to[0] as string) : (data.to as string);

  switch (type) {
    case "email.delivered": {
      if (toEmail) {
        // Scope to campaigns this email belongs to via newsletter subscribers.
        const campaignIds = await getCampaignIdsForEmail(toEmail).catch(() => [] as string[]);
        if (campaignIds.length > 0) {
          await prisma.contact.updateMany({
            where: {
              campaignId: { in: campaignIds },
              email: { equals: toEmail, mode: "insensitive" },
              deletedAt: null,
            },
            data: { lastContactedAt: new Date() },
          }).catch((err: unknown) => {
            console.error("[Resend webhook] email.delivered contact update failed:", err);
          });
        }
      }
      break;
    }

    case "email.bounced": {
      // FLAG the contact as bounced but do NOT set doNotContact — a single bounce
      // may be a temporary failure. That decision belongs to the campaign manager.
      if (toEmail) {
        const now = new Date();
        const campaignIds = await getCampaignIdsForEmail(toEmail).catch(() => [] as string[]);

        if (campaignIds.length > 0) {
          await prisma.contact.updateMany({
            where: {
              campaignId: { in: campaignIds },
              email: { equals: toEmail, mode: "insensitive" },
              deletedAt: null,
              emailBounced: false, // only set the timestamp on first bounce
            },
            data: {
              emailBounced: true,
              emailBouncedAt: now,
            },
          }).catch((err: unknown) => {
            console.error("[Resend webhook] email.bounced contact update failed:", err);
          });
        }

        // Always mark the newsletter subscriber record as bounced regardless of
        // whether we found a campaign-scoped contact.
        await prisma.newsletterSubscriber.updateMany({
          where: { email: { equals: toEmail, mode: "insensitive" } },
          data: { status: "bounced" },
        }).catch((err: unknown) => {
          console.error("[Resend webhook] email.bounced subscriber update failed:", err);
        });
      }
      break;
    }

    case "email.complained": {
      // Spam complaint — here doNotContact IS appropriate: the recipient explicitly
      // marked us as spam, which is a deliberate signal.
      if (toEmail) {
        const campaignIds = await getCampaignIdsForEmail(toEmail).catch(() => [] as string[]);

        if (campaignIds.length > 0) {
          await prisma.contact.updateMany({
            where: {
              campaignId: { in: campaignIds },
              email: { equals: toEmail, mode: "insensitive" },
              deletedAt: null,
            },
            data: { doNotContact: true },
          }).catch((err: unknown) => {
            console.error("[Resend webhook] email.complained contact update failed:", err);
          });
        }

        await prisma.newsletterSubscriber.updateMany({
          where: { email: { equals: toEmail, mode: "insensitive" } },
          data: { status: "unsubscribed", unsubscribedAt: new Date() },
        }).catch((err: unknown) => {
          console.error("[Resend webhook] email.complained subscriber update failed:", err);
        });
      }
      break;
    }

    case "email.opened":
    case "email.clicked": {
      if (toEmail) {
        const campaignIds = await getCampaignIdsForEmail(toEmail).catch(() => [] as string[]);
        if (campaignIds.length > 0) {
          await prisma.contact.updateMany({
            where: {
              campaignId: { in: campaignIds },
              email: { equals: toEmail, mode: "insensitive" },
              deletedAt: null,
            },
            data: { lastContactedAt: new Date() },
          }).catch((err: unknown) => {
            console.error("[Resend webhook] email.opened/clicked contact update failed:", err);
          });
        }
      }
      break;
    }
  }

  // Always return 200 — never block webhook acknowledgment on contact-update failures.
  return NextResponse.json({ received: true });
}
