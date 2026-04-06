import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateEnv } from "@/lib/env-check";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const envCheck = validateEnv();
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
      redisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      turnstileSecret: !!process.env.TURNSTILE_SECRET_KEY,
      turnstileSiteKey: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    },
    envValidation: {
      ok: envCheck.ok,
      missing: envCheck.missing,
      warned: envCheck.warned,
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const allCriticalPass = checks.database && checks.envVars.nextauthSecret && checks.envVars.databaseUrl && checks.envVars.nextauthUrl;
  return NextResponse.json(checks, { status: allCriticalPass ? 200 : 503 });
}
