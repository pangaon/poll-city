/**
 * GET /api/platform/readiness
 * SUPER_ADMIN only. Returns a pre-flight checklist for first client onboarding.
 * Checks env vars, DB connectivity, and platform configuration — never exposes values.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";

type CheckStatus = "ok" | "warn" | "error";

interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail?: string;
  georgeAction?: string;
}

function envSet(key: string): boolean {
  const v = process.env[key];
  return !!v && v !== "" && !v.startsWith("your-") && !v.startsWith("change-this");
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;
  void session;

  const checks: ReadinessCheck[] = [];

  // ── Core auth ────────────────────────────────────────────────────
  checks.push({
    id: "nextauth_secret",
    label: "Auth secret",
    description: "NEXTAUTH_SECRET — required for sessions and JWT signing",
    status: envSet("NEXTAUTH_SECRET") ? "ok" : "error",
    georgeAction: envSet("NEXTAUTH_SECRET") ? undefined : "Add NEXTAUTH_SECRET to Vercel env vars (generate with: openssl rand -base64 32)",
  });

  checks.push({
    id: "nextauth_url",
    label: "App URL",
    description: "NEXTAUTH_URL — must match your production domain",
    status: envSet("NEXTAUTH_URL") ? "ok" : "error",
    georgeAction: envSet("NEXTAUTH_URL") ? undefined : "Add NEXTAUTH_URL=https://app.poll.city to Vercel env vars",
  });

  // ── Database ─────────────────────────────────────────────────────
  let dbOk = false;
  let dbDetail: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbDetail = e instanceof Error ? e.message.slice(0, 80) : "connection failed";
  }
  checks.push({
    id: "database",
    label: "Database",
    description: "PostgreSQL connection via DATABASE_URL",
    status: dbOk ? "ok" : "error",
    detail: dbDetail,
    georgeAction: dbOk ? undefined : "Check DATABASE_URL in Vercel env vars — must be Railway PostgreSQL connection string",
  });

  // ── Schema baseline ───────────────────────────────────────────────
  // Check if intelligenceEnabled column exists (added this session)
  let schemaOk = false;
  try {
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'campaigns' AND column_name = 'intelligenceEnabled'
    `;
    schemaOk = result.length > 0;
  } catch { /* ignore */ }
  checks.push({
    id: "schema",
    label: "Schema baseline",
    description: "Recent migrations synced to Railway",
    status: schemaOk ? "ok" : "warn",
    detail: schemaOk ? undefined : "intelligenceEnabled column not found — schema may be behind",
    georgeAction: schemaOk ? undefined : "Run: npx prisma db push (from your local terminal, connected to Railway)",
  });

  // ── AI / Adoni ───────────────────────────────────────────────────
  checks.push({
    id: "anthropic",
    label: "Adoni AI (Anthropic)",
    description: "ANTHROPIC_API_KEY — required for Adoni responses",
    status: envSet("ANTHROPIC_API_KEY") ? "ok" : "warn",
    detail: envSet("ANTHROPIC_API_KEY") ? undefined : "Adoni will return 500 errors in production",
    georgeAction: envSet("ANTHROPIC_API_KEY") ? undefined : "Add ANTHROPIC_API_KEY to Vercel env vars (sk-ant-...)",
  });

  // ── Email ────────────────────────────────────────────────────────
  checks.push({
    id: "resend",
    label: "Email (Resend)",
    description: "RESEND_API_KEY — invite emails, receipts, blasts",
    status: envSet("RESEND_API_KEY") ? "ok" : "error",
    detail: envSet("RESEND_API_KEY") ? undefined : "All emails fail silently — invites, receipts, and blasts will not send",
    georgeAction: envSet("RESEND_API_KEY") ? undefined : "Add RESEND_API_KEY to Vercel env vars (get from resend.com → API Keys)",
  });

  // ── Stripe ───────────────────────────────────────────────────────
  checks.push({
    id: "stripe",
    label: "Stripe (billing + donations)",
    description: "STRIPE_SECRET_KEY — platform subscriptions and campaign fundraising",
    status: envSet("STRIPE_SECRET_KEY") ? "ok" : "warn",
    detail: envSet("STRIPE_SECRET_KEY") ? undefined : "Billing and online donations are disabled",
    georgeAction: envSet("STRIPE_SECRET_KEY") ? undefined : "Add STRIPE_SECRET_KEY to Vercel env vars (from stripe.com → Developers → API keys)",
  });

  // ── Geocoding ────────────────────────────────────────────────────
  const geocodeOk = envSet("GOOGLE_MAPS_API_KEY");
  checks.push({
    id: "geocoding",
    label: "Geocoding (Google Maps)",
    description: "GOOGLE_MAPS_API_KEY — converts voter file addresses to map coordinates",
    status: geocodeOk ? "ok" : "warn",
    detail: geocodeOk ? undefined : "Fallback: Nominatim (OpenStreetMap, 1 req/sec). Fine for demo data. Too slow for 5,000+ household imports.",
    georgeAction: geocodeOk ? undefined : "Add GOOGLE_MAPS_API_KEY to Vercel (see GEORGE_TODO items 78-79). Free tier covers demos.",
  });

  // ── SMS ──────────────────────────────────────────────────────────
  checks.push({
    id: "twilio",
    label: "SMS (Twilio)",
    description: "TWILIO_ACCOUNT_SID — SMS blasts and voter outreach",
    status: envSet("TWILIO_ACCOUNT_SID") ? "ok" : "warn",
    detail: envSet("TWILIO_ACCOUNT_SID") ? undefined : "SMS blasts disabled — email and in-app notifications still work",
    georgeAction: envSet("TWILIO_ACCOUNT_SID") ? undefined : "Add TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER to Vercel when ready for SMS",
  });

  // ── Cron ─────────────────────────────────────────────────────────
  checks.push({
    id: "cron",
    label: "Cron jobs",
    description: "CRON_SECRET — protects automated background tasks",
    status: envSet("CRON_SECRET") ? "ok" : "warn",
    detail: envSet("CRON_SECRET") ? undefined : "Geocoding cron, reminders, and automation triggers will fail",
    georgeAction: envSet("CRON_SECRET") ? undefined : "Add CRON_SECRET to Vercel (generate: openssl rand -base64 32) AND set as Vercel cron secret",
  });

  // ── Encryption ───────────────────────────────────────────────────
  checks.push({
    id: "encryption",
    label: "DB encryption",
    description: "DATABASE_ENCRYPTION_KEY — encrypts sensitive fields at rest",
    status: envSet("DATABASE_ENCRYPTION_KEY") ? "ok" : "warn",
    detail: envSet("DATABASE_ENCRYPTION_KEY") ? undefined : "Sensitive fields stored unencrypted. Set before any real client data enters the system.",
    georgeAction: envSet("DATABASE_ENCRYPTION_KEY") ? undefined : "Add DATABASE_ENCRYPTION_KEY to Vercel (generate: openssl rand -hex 32) — set before first real client data",
  });

  // ── Active campaigns ─────────────────────────────────────────────
  let campaignCount = 0;
  let geocodedHouseholds = 0;
  let totalHouseholds = 0;
  try {
    campaignCount = await prisma.campaign.count({ where: { isActive: true } });
    totalHouseholds = await prisma.household.count();
    geocodedHouseholds = await prisma.household.count({ where: { lat: { not: null } } });
  } catch { /* ignore */ }

  checks.push({
    id: "campaigns",
    label: "Active campaigns",
    description: `${campaignCount} campaign${campaignCount !== 1 ? "s" : ""} currently active`,
    status: campaignCount > 0 ? "ok" : "warn",
    detail: campaignCount === 0 ? "No active campaigns — use Ops → Clients to provision the first one" : undefined,
  });

  checks.push({
    id: "geocoding_data",
    label: "Voter file geocoding",
    description: `${geocodedHouseholds.toLocaleString()} of ${totalHouseholds.toLocaleString()} households mapped`,
    status: totalHouseholds === 0 ? "warn" : geocodedHouseholds === totalHouseholds ? "ok" : geocodedHouseholds > 0 ? "warn" : "warn",
    detail: totalHouseholds === 0
      ? "No voter file imported yet — import via Campaign App → Import/Export"
      : `${(totalHouseholds - geocodedHouseholds).toLocaleString()} pending geocoding (hourly cron + manual batch available)`,
  });

  const errorCount = checks.filter((c) => c.status === "error").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const okCount = checks.filter((c) => c.status === "ok").length;

  const overallStatus: CheckStatus =
    errorCount > 0 ? "error" : warnCount > 0 ? "warn" : "ok";

  return NextResponse.json({
    data: {
      overallStatus,
      summary: { ok: okCount, warn: warnCount, error: errorCount, total: checks.length },
      checks,
    },
  });
}
