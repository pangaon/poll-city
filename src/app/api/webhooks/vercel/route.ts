import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Vercel signs with HMAC-SHA1 over the raw body, not the raw secret string.
  const rawBody = await req.text();

  const signature = req.headers.get("x-vercel-signature");
  if (!signature) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
  if (signature !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Replay attack protection: reject webhooks older than 5 minutes
  const webhookTimestamp = req.headers.get("x-webhook-timestamp");
  if (webhookTimestamp) {
    const ts = parseInt(webhookTimestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts * 1000) > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Webhook timestamp expired" }, { status: 400 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = (body.type as string) ?? "unknown";
  const deploymentUrl = (body.url as string) ?? (body.deploymentUrl as string) ?? "";
  const status = (body.status as string) ?? (body.state as string) ?? "unknown";
  const name = (body.name as string) ?? "poll-city";

  const isError = status === "ERROR" || status === "error" || type === "deployment.error";
  const title = isError ? `Deploy failed: ${name}` : `Deploy succeeded: ${name}`;
  const notifBody = isError
    ? `Deployment to ${deploymentUrl} failed. Check Vercel dashboard.`
    : `Deployment to ${deploymentUrl} completed successfully.`;

  await prisma.operatorNotification.create({
    data: {
      type: isError ? "deploy_failure" : "deploy_success",
      title,
      body: notifBody,
      data: body as object,
    },
  });

  return NextResponse.json({ ok: true });
}
