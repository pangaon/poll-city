import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "5.0.0",
    environment: process.env.NODE_ENV,
    envVars: {
      nextauthSecret: !!process.env.NEXTAUTH_SECRET,
      databaseUrl: !!process.env.DATABASE_URL,
      nextauthUrl: !!process.env.NEXTAUTH_URL,
      anthropicKey: !!process.env.ANTHROPIC_API_KEY,
      resendKey: !!process.env.RESEND_API_KEY,
      vapidKeys: !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      stripeKey: !!process.env.STRIPE_SECRET_KEY,
      redisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      turnstileKey: !!process.env.TURNSTILE_SECRET_KEY,
      pollAnonymitySalt: !!process.env.POLL_ANONYMITY_SALT,
      ipHashSalt: !!process.env.IP_HASH_SALT,
      cronSecret: !!process.env.CRON_SECRET,
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const allCriticalPass =
    checks.database &&
    checks.envVars.nextauthSecret &&
    checks.envVars.databaseUrl &&
    checks.envVars.nextauthUrl;

  return NextResponse.json(checks, { status: allCriticalPass ? 200 : 503 });
}
