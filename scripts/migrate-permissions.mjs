#!/usr/bin/env node
/**
 * Bulk migrate legacy requirePermission + membership.findUnique to guardCampaignRoute.
 * Node.js port of migrate-permissions.py
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "src", "app", "api");

const TARGET_FILES = [
  // communications
  "communications/audience/route.ts",
  "communications/email/route.ts",
  "communications/sms/route.ts",
  "communications/social/accounts/route.ts",
  "communications/social/mentions/route.ts",
  "communications/social/mentions/[id]/route.ts",
  "communications/social/posts/route.ts",
  "communications/social/posts/[id]/route.ts",
  // contacts
  "contacts/route.ts",
  "contacts/[id]/route.ts",
  "contacts/bulk-tag/route.ts",
  "contacts/bulk-update/route.ts",
  "contacts/column-preferences/route.ts",
  "contacts/filter-presets/route.ts",
  "contacts/filter-presets/[id]/route.ts",
  "contacts/streets/route.ts",
  // canvassing
  "canvass/route.ts",
  "canvass/assign/route.ts",
  "canvassing/debrief/route.ts",
  "canvassing/intelligence/route.ts",
  "canvassing/literature-drop/route.ts",
  "canvassing/scripts/route.ts",
  "canvassing/smart-plan/route.ts",
  "canvassing/street-priority/route.ts",
  // tasks
  "tasks/route.ts",
  "tasks/[id]/route.ts",
  // signs
  "signs/route.ts",
  // events
  "events/route.ts",
  "events/[eventId]/route.ts",
  "events/[eventId]/calendar/route.ts",
  "events/[eventId]/check-in/route.ts",
  "events/[eventId]/duplicate/route.ts",
  "events/[eventId]/rsvps/route.ts",
  // volunteers
  "volunteers/route.ts",
  "volunteers/bulk-activate/route.ts",
  "volunteers/bulk-deactivate/route.ts",
  "volunteers/expenses/route.ts",
  "volunteers/expenses/[id]/route.ts",
  "volunteers/groups/route.ts",
  "volunteers/groups/[id]/members/route.ts",
  "volunteers/groups/[id]/message/route.ts",
  "volunteers/performance/route.ts",
  "volunteers/quick-capture/route.ts",
  "volunteers/shifts/route.ts",
  "volunteers/shifts/reminders/route.ts",
  "volunteers/shifts/[id]/checkin/route.ts",
  "volunteers/shifts/[id]/signup/route.ts",
  "volunteers/stats/route.ts",
  // budget / finance
  "budget/route.ts",
  "budget/[id]/route.ts",
  "budget/import/route.ts",
  "budget/import-smart/route.ts",
  "budget/rules/route.ts",
  "budget/rules/[id]/route.ts",
  "budget/suggestions/route.ts",
  "budget/templates/route.ts",
  "donations/route.ts",
  "donations/receipt/route.ts",
  "donations/quick-capture/route.ts",
  // intelligence / opponents
  "intelligence/route.ts",
  "intelligence/voter-profile/route.ts",
  "intelligence/zone-analysis/route.ts",
  "opponents/route.ts",
  // resources
  "resources/upload/route.ts",
  // call-list / turf / canvasser
  "call-list/route.ts",
  "turf/route.ts",
  "turf/leaderboard/route.ts",
  "turf/preview/route.ts",
];

function fixImport(src) {
  // Replace "apiAuth, requirePermission" or "requirePermission, apiAuth" with just "apiAuth"
  src = src.replace(
    /import\s*\{\s*apiAuth\s*,\s*requirePermission\s*\}\s*from\s*"@\/lib\/auth\/helpers"/g,
    'import { apiAuth } from "@/lib/auth/helpers"'
  );
  src = src.replace(
    /import\s*\{\s*requirePermission\s*,\s*apiAuth\s*\}\s*from\s*"@\/lib\/auth\/helpers"/g,
    'import { apiAuth } from "@/lib/auth/helpers"'
  );
  // Add guardCampaignRoute import if not already present
  if (!src.includes("guardCampaignRoute")) {
    src = src.replace(
      /(import \{ apiAuth \} from "@\/lib\/auth\/helpers";)/,
      '$1\nimport { guardCampaignRoute } from "@/lib/permissions/engine";'
    );
  }
  return src;
}

// Pattern A: GET/DELETE — requirePermission + searchParams.get("campaignId") + membership check
function fixPatternA(src) {
  const pattern =
    /const permError\d*\s*=\s*requirePermission\(session!\.user\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n\s*if \(permError\d*\) return permError\d*;\s*\n\s*\n?\s*const (campaignId\w*)\s*=\s*(req\.nextUrl\.searchParams\.get\("campaignId"\)|sp\.get\("campaignId"\));\s*\n\s*if \(!\2\)[^\n]+\n\s*\n?\s*const membership\d*\s*=\s*await prisma\.membership\.findUnique\(\{\s*\n\s*where:\s*\{\s*userId_campaignId:\s*\{\s*userId:\s*session!\.user\.id,\s*campaignId:?\s*\2?\s*\}\s*\},?\s*\n\s*\}\);\s*\n\s*if \(!membership\d*\)[^\n]+\n/gm;

  return src.replace(pattern, (m, perm, cidVar, getter) => {
    const g = getter.startsWith("sp.") ? 'sp.get("campaignId")' : 'req.nextUrl.searchParams.get("campaignId")';
    return (
      `  const ${cidVar} = ${g};\n` +
      `  const { forbidden } = await guardCampaignRoute(session!.user.id, ${cidVar}, "${perm}");\n` +
      `  if (forbidden) return forbidden;\n`
    );
  });
}

// Pattern A simple — same but membership block on one line (DOTALL)
function fixPatternASimple(src) {
  // More permissive: handles multi-line membership blocks
  const pattern =
    /const permError\d*\s*=\s*requirePermission\(session!\.user\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n\s*if \(permError\d*\) return permError\d*;\s*\n[\s\S]{0,200}?const (campaignId\w*)\s*=\s*(req\.nextUrl\.searchParams\.get\("campaignId"\)|sp\.get\("campaignId"\));\s*\n\s*if \(!\2\)[^\n]+\n(?:\s*\n)?\s*const membership\d*\s*=\s*await prisma\.membership\.findUnique\(\{[\s\S]*?\}\);\s*\n\s*if \(!membership\d*\)[^\n]+\n/gm;

  return src.replace(pattern, (m, perm, cidVar, getter) => {
    const g = getter.startsWith("sp.") ? 'sp.get("campaignId")' : 'req.nextUrl.searchParams.get("campaignId")';
    return (
      `  const ${cidVar} = ${g};\n` +
      `  const { forbidden } = await guardCampaignRoute(session!.user.id, ${cidVar}, "${perm}");\n` +
      `  if (forbidden) return forbidden;\n`
    );
  });
}

// Pattern B: POST/PATCH — requirePermission + body.campaignId + membership check
function fixPatternB(src) {
  // Handles: body parsed first, then requirePermission, then body.campaignId used
  const pattern =
    /const permError\d*\s*=\s*requirePermission\(session!\.user\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n\s*if \(permError\d*\) return permError\d*;\s*\n[\s\S]{0,300}?const membership\d*\s*=\s*await prisma\.membership\.findUnique\(\{\s*\n?\s*where:\s*\{\s*userId_campaignId:\s*\{\s*userId:\s*session!\.user\.id,\s*campaignId:?\s*(?:body\.campaignId|data\.campaignId|campaignId)?\s*\}\s*\},?\s*\n?\s*\}\);\s*\n\s*if \(!membership\d*\)[^\n]+\n/gm;

  return src.replace(pattern, (m, perm) => {
    // Extract campaignId source from the match
    let cidExpr = "body.campaignId";
    if (m.includes("data.campaignId")) cidExpr = "data.campaignId";
    return (
      `  const { forbidden } = await guardCampaignRoute(session!.user.id, ${cidExpr}, "${perm}");\n` +
      `  if (forbidden) return forbidden;\n`
    );
  });
}

// Remove any remaining standalone requirePermission calls — mark for manual review
function fixRemainingPermErrors(src) {
  return src.replace(
    /  const permError\d*\s*=\s*requirePermission\(session!\.user\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n  if \(permError\d*\) return permError\d*;\s*\n/gm,
    (m, perm) => `  // TODO-MIGRATE: requirePermission "${perm}" — wire guardCampaignRoute\n`
  );
}

const changed = [];
const skipped = [];

for (const rel of TARGET_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) {
    skipped.push(rel + " (not found)");
    continue;
  }

  const original = readFileSync(path, "utf-8");

  if (!original.includes("requirePermission")) {
    skipped.push(rel + " (already clean)");
    continue;
  }

  let src = original;
  src = fixImport(src);
  src = fixPatternA(src);
  src = fixPatternASimple(src);
  src = fixPatternB(src);
  src = fixRemainingPermErrors(src);

  if (src !== original) {
    writeFileSync(path, src, "utf-8");
    changed.push(rel);
  } else {
    skipped.push(rel + " (no pattern match)");
  }
}

console.log(`\nCHANGED (${changed.length}):`);
for (const f of changed) console.log(`  ${f}`);
console.log(`\nSKIPPED (${skipped.length}):`);
for (const f of skipped) console.log(`  ${f}`);

// Check for any remaining requirePermission calls
console.log("\nREMAINING requirePermission (need manual fix):");
let remainingCount = 0;
for (const rel of TARGET_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;
  const content = readFileSync(path, "utf-8");
  if (content.includes("requirePermission")) {
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      if (line.includes("requirePermission")) {
        console.log(`  ${rel}:${i + 1}: ${line.trim()}`);
        remainingCount++;
      }
    });
  }
}
if (remainingCount === 0) console.log("  (none — all clean!)");
