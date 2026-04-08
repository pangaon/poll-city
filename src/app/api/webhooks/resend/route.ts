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

async function handleEvent(type: string, data: Record<string, unknown>): Promise<NextResponse> {
  const toEmail = Array.isArray(data.to) ? (data.to[0] as string) : (data.to as string);

  switch (type) {
    case "email.delivered": {
      if (toEmail) {
        await prisma.contact.updateMany({
          where: { email: { equals: toEmail, mode: "insensitive" } },
          data: { lastContactedAt: new Date() },
        });
      }
      break;
    }

    case "email.bounced": {
      if (toEmail) {
        await prisma.contact.updateMany({
          where: { email: { equals: toEmail, mode: "insensitive" } },
          data: { doNotContact: true },
        });
        await prisma.newsletterSubscriber.updateMany({
          where: { email: { equals: toEmail, mode: "insensitive" } },
          data: { status: "bounced" },
        });
      }
      break;
    }

    case "email.complained": {
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
}
