/**
 * API Route Verification Script
 * Tests every critical API route for basic functionality.
 * Run: npx tsx scripts/verify-api-routes.ts
 *
 * NOTE: Requires a running dev server (npm run dev) or uses the production URL.
 * Cannot test authenticated routes without a session token.
 * This script verifies that routes EXIST and return valid HTTP responses.
 */

const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface RouteTest {
  method: string;
  path: string;
  requiresAuth: boolean;
  description: string;
}

const routes: RouteTest[] = [
  // Public routes (no auth needed)
  { method: "GET", path: "/api/health", requiresAuth: false, description: "Health check" },
  { method: "GET", path: "/api/officials/directory?limit=1", requiresAuth: false, description: "Officials directory" },
  { method: "GET", path: "/api/polls?limit=1", requiresAuth: false, description: "Public polls" },
  { method: "GET", path: "/api/resources/templates", requiresAuth: false, description: "Resource templates" },
  { method: "GET", path: "/api/help/articles", requiresAuth: false, description: "Help articles" },
  { method: "GET", path: "/api/help/search?q=test", requiresAuth: false, description: "Help search" },
  { method: "GET", path: "/api/geo?postalCode=M5V3L9", requiresAuth: false, description: "Geo lookup" },
  { method: "GET", path: "/api/auth/providers-status", requiresAuth: false, description: "Auth providers" },

  // Authenticated routes (will return 401 without session — that's expected and correct)
  { method: "GET", path: "/api/contacts?campaignId=test", requiresAuth: true, description: "Contacts list" },
  { method: "GET", path: "/api/signs?campaignId=test", requiresAuth: true, description: "Signs list" },
  { method: "GET", path: "/api/tasks?campaignId=test", requiresAuth: true, description: "Tasks list" },
  { method: "GET", path: "/api/events?campaignId=test", requiresAuth: true, description: "Events list" },
  { method: "GET", path: "/api/budget?campaignId=test", requiresAuth: true, description: "Budget" },
  { method: "GET", path: "/api/donations?campaignId=test", requiresAuth: true, description: "Donations" },
  { method: "GET", path: "/api/volunteers?campaignId=test", requiresAuth: true, description: "Volunteers" },
  { method: "GET", path: "/api/team?campaignId=test", requiresAuth: true, description: "Team" },
  { method: "GET", path: "/api/analytics/campaign", requiresAuth: true, description: "Analytics campaign" },
  { method: "GET", path: "/api/analytics/canvassing", requiresAuth: true, description: "Analytics canvassing" },
  { method: "GET", path: "/api/analytics/supporters", requiresAuth: true, description: "Analytics supporters" },
  { method: "GET", path: "/api/analytics/donations", requiresAuth: true, description: "Analytics donations" },
  { method: "GET", path: "/api/analytics/gotv", requiresAuth: true, description: "Analytics GOTV" },
  { method: "GET", path: "/api/gotv?campaignId=test", requiresAuth: true, description: "GOTV" },
  { method: "GET", path: "/api/gotv/gap?campaignId=test", requiresAuth: true, description: "GOTV Gap" },
  { method: "GET", path: "/api/gotv/tiers?campaignId=test", requiresAuth: true, description: "GOTV Tiers" },
  { method: "GET", path: "/api/gotv/rides?campaignId=test", requiresAuth: true, description: "GOTV Rides" },
  { method: "GET", path: "/api/canvass?campaignId=test", requiresAuth: true, description: "Canvass lists" },
  { method: "GET", path: "/api/turf?campaignId=test", requiresAuth: true, description: "Turfs" },
  { method: "GET", path: "/api/import/history?campaignId=test", requiresAuth: true, description: "Import history" },
  { method: "GET", path: "/api/feature-flags", requiresAuth: true, description: "Feature flags" },
  { method: "GET", path: "/api/campaigns/current", requiresAuth: true, description: "Current campaign" },
  { method: "GET", path: "/api/permissions/roles", requiresAuth: true, description: "Permission roles" },
  { method: "GET", path: "/api/voice/broadcasts", requiresAuth: true, description: "Voice broadcasts" },
  { method: "GET", path: "/api/newsletters/subscribers", requiresAuth: true, description: "Newsletter subscribers" },
  { method: "GET", path: "/api/call-center/integrations", requiresAuth: true, description: "Call center integrations" },
  { method: "GET", path: "/api/campaign-cost", requiresAuth: true, description: "Campaign cost calculator" },
  { method: "GET", path: "/api/export/contacts?campaignId=test", requiresAuth: true, description: "Export contacts" },
];

async function verifyRoutes() {
  console.log(`\n=== API ROUTE VERIFICATION ===`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Testing ${routes.length} routes...\n`);

  const results: { route: string; status: number; ok: boolean; issue: string | null; description: string }[] = [];

  for (const route of routes) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timeout);

      // For auth routes, 401 is expected and CORRECT (proves the route exists and auth works)
      const isExpected401 = route.requiresAuth && res.status === 401;
      const isOk = res.status < 500 && (res.status < 400 || isExpected401);

      results.push({
        route: `${route.method} ${route.path}`,
        status: res.status,
        ok: isOk,
        issue: isOk ? null : `HTTP ${res.status}`,
        description: route.description,
      });

      const icon = isOk ? "✅" : "❌";
      const note = isExpected401 ? " (401 = auth working)" : "";
      console.log(`${icon} ${route.description}: ${res.status}${note}`);
    } catch (error: any) {
      const isAbort = error.name === "AbortError";
      results.push({
        route: `${route.method} ${route.path}`,
        status: 0,
        ok: false,
        issue: isAbort ? "TIMEOUT (>10s)" : error.message,
        description: route.description,
      });
      console.log(`❌ ${route.description}: ${isAbort ? "TIMEOUT" : error.message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  const passing = results.filter((r) => r.ok);
  const failing = results.filter((r) => !r.ok);

  console.log(`✅ Passing: ${passing.length}/${results.length}`);
  console.log(`❌ Failing: ${failing.length}/${results.length}`);

  if (failing.length > 0) {
    console.log(`\nFAILING ROUTES:`);
    failing.forEach((r) => console.log(`  ${r.route} — ${r.issue} (${r.description})`));
  }

  console.log(`\nDone.`);
  process.exit(failing.length > 0 ? 1 : 0);
}

verifyRoutes().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
