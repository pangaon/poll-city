// Startup environment validation for Poll City.
// Fails loudly in production when required secrets are missing,
// warns in dev when optional integrations aren't configured.

const REQUIRED_ENV_VARS = [
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "NEXTAUTH_URL",
] as const;

const WARNED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "VAPID_PRIVATE_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "POLL_ANONYMITY_SALT",
  "IP_HASH_SALT",
  "STRIPE_SECRET_KEY",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CRON_SECRET",
] as const;

let validated = false;

export function validateEnv(): { ok: boolean; missing: string[]; warned: string[] } {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  const warned = WARNED_ENV_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    const msg =
      `Missing required environment variables:\n${missing
        .map((v) => `  - ${v}`)
        .join("\n")}\n` +
      "See docs/ENVIRONMENT_VARIABLES.md for setup instructions.";
    // Only throw in production / at runtime — during `next build`,
    // some routes evaluate module code without env loaded.
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error(msg);
    } else {
      if (!validated) {
        console.warn(`[Poll City] ${msg}`);
      }
    }
  }

  if (!validated && warned.length > 0 && process.env.NODE_ENV !== "test") {
    console.warn(
      "[Poll City] Optional environment variables not set (some features will be disabled):\n" +
        warned.map((v) => `  - ${v}`).join("\n"),
    );
  }

  validated = true;
  return { ok: missing.length === 0, missing, warned };
}
