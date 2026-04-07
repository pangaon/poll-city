import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const provided = req.headers.get("x-vercel-signature") ?? req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = (body.type as string) ?? "unknown";
  const deploymentUrl = (body.url as string) ?? (body.deploymentUrl as string) ?? "";
  const status = (body.status as string) ?? (body.state as string) ?? "unknown";
  const name = (body.name as string) ?? "poll-city";

  const isError = status === "ERROR" || status === "error" || type === "deployment.error";
  const title = isError
    ? `Deploy failed: ${name}`
    : `Deploy succeeded: ${name}`;
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
