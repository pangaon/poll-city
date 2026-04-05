import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const publicResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "5.0.0",
  };

  const healthSecret = process.env.HEALTH_CHECK_SECRET;
  const headerSecret = request.headers.get("x-health-secret");
  const isInternal = Boolean(healthSecret) && headerSecret === healthSecret;

  if (!isInternal) {
    return NextResponse.json(publicResponse, { status: 200 });
  }

  const dbOk = await prisma.$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false);

  return NextResponse.json(
    {
      ...publicResponse,
      database: dbOk,
      env: {
        nextauthSecret: !!process.env.NEXTAUTH_SECRET,
        database: !!process.env.DATABASE_URL,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        resend: !!process.env.RESEND_API_KEY,
      },
    },
    { status: dbOk ? 200 : 503 }
  );
}
