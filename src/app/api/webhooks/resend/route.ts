import { NextRequest, NextResponse } from "next/server";
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

  // Signature guard: validate against RESEND_WEBHOOK_SECRET when configured.
  // Resend uses the Svix signing library — header is svix-signature.
  const resendSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (resendSecret) {
    const svixSignature = req.headers.get("svix-signature");
    const svixId = req.headers.get("svix-id");
    if (!svixSignature || !svixId || !svixTimestamp) {
      return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 401 });
    }
    // Full Svix HMAC verification is left for when the svix package is added.
    // For now: presence of all three Svix headers is enforced.
    // TODO: npm install svix and verify with new Webhook(resendSecret).verify(body, headers)
  }

  try {
    const event = await req.json();
    const type = event.type as string;
    const data = event.data as Record<string, unknown>;

    // Extract email recipient
    const toEmail = Array.isArray(data.to) ? (data.to[0] as string) : (data.to as string);

    switch (type) {
      case "email.delivered": {
        // Update contact lastContactedAt
        if (toEmail) {
          await prisma.contact.updateMany({
            where: { email: { equals: toEmail, mode: "insensitive" } },
            data: { lastContactedAt: new Date() },
          });
        }
        break;
      }

      case "email.bounced": {
        // Mark contact as bounced — set doNotContact for hard bounces
        if (toEmail) {
          await prisma.contact.updateMany({
            where: { email: { equals: toEmail, mode: "insensitive" } },
            data: { doNotContact: true },
          });
          // Also unsubscribe newsletter
          await prisma.newsletterSubscriber.updateMany({
            where: { email: { equals: toEmail, mode: "insensitive" } },
            data: { status: "bounced" },
          });
        }
        break;
      }

      case "email.complained": {
        // Spam complaint — immediate DNC
        if (toEmail) {
          await prisma.contact.updateMany({
            where: { email: { equals: toEmail, mode: "insensitive" } },
            data: { doNotContact: true },
          });
          await prisma.newsletterSubscriber.updateMany({
            where: { email: { equals: toEmail, mode: "insensitive" } },
            data: { status: "unsubscribed", unsubscribedAt: new Date() },
          });
        }
        break;
      }

      case "email.opened":
      case "email.clicked": {
        // Track engagement — update lastContactedAt
        if (toEmail) {
          await prisma.contact.updateMany({
            where: { email: { equals: toEmail, mode: "insensitive" } },
            data: { lastContactedAt: new Date() },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Resend webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
