#!/usr/bin/env node
/**
 * Pass 3: Fix issues left by pass1/pass2.
 *
 * Issue 1: `const sp = req.nextUrl.searchParams;` was eaten by the DOTALL regex.
 *   Fix: insert it before `const campaignId = sp.get("campaignId");` if sp is not defined.
 *
 * Issue 2: `string | null` not assignable in Prisma where clauses.
 *   Fix: use `campaignId!` in where clauses when campaignId comes from guardCampaignRoute.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "src", "app", "api");

const TARGET_FILES = [
  "communications/audience/route.ts",
  "communications/email/route.ts",
  "communications/sms/route.ts",
  "communications/social/accounts/route.ts",
  "communications/social/mentions/route.ts",
  "communications/social/mentions/[id]/route.ts",
  "communications/social/posts/route.ts",
  "communications/social/posts/[id]/route.ts",
  "contacts/route.ts",
  "contacts/[id]/route.ts",
  "contacts/bulk-tag/route.ts",
  "contacts/bulk-update/route.ts",
  "contacts/column-preferences/route.ts",
  "contacts/filter-presets/route.ts",
  "contacts/filter-presets/[id]/route.ts",
  "contacts/streets/route.ts",
  "canvass/route.ts",
  "canvass/assign/route.ts",
  "canvassing/debrief/route.ts",
  "canvassing/intelligence/route.ts",
  "canvassing/literature-drop/route.ts",
  "canvassing/scripts/route.ts",
  "canvassing/smart-plan/route.ts",
  "canvassing/street-priority/route.ts",
  "tasks/route.ts",
  "tasks/[id]/route.ts",
  "signs/route.ts",
  "events/route.ts",
  "events/[eventId]/route.ts",
  "events/[eventId]/calendar/route.ts",
  "events/[eventId]/check-in/route.ts",
  "events/[eventId]/duplicate/route.ts",
  "events/[eventId]/rsvps/route.ts",
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
  "intelligence/route.ts",
  "intelligence/voter-profile/route.ts",
  "intelligence/zone-analysis/route.ts",
  "opponents/route.ts",
  "resources/upload/route.ts",
  "call-list/route.ts",
  "turf/route.ts",
  "turf/leaderboard/route.ts",
  "turf/preview/route.ts",
];

function fixMissingSp(src) {
  // If sp.get("campaignId") appears but there's no `const sp =` before it in the same function block,
  // insert `const sp = req.nextUrl.searchParams;` before it.
  // The pattern: lines that have `sp.get("campaignId")` (or other sp.get) but sp is not declared.
  const lines = src.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line uses sp.get but sp hasn't been defined recently
    if (line.match(/\bsp\.get\(/) && !src.slice(0, src.indexOf(line)).match(/const sp\s*=/)) {
      // More precise: check if sp is defined anywhere before this line in same function
      const before = lines.slice(0, i).join("\n");
      // Find the start of current function
      let fnStart = i;
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].match(/^export async function|^async function|^\s*async function/)) {
          fnStart = j;
          break;
        }
      }
      const fnBefore = lines.slice(fnStart, i).join("\n");
      if (!fnBefore.includes("const sp ")) {
        const indent = line.match(/^(\s*)/)[1];
        out.push(`${indent}const sp = req.nextUrl.searchParams;`);
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

function fixNullableCampaignId(src) {
  // In Prisma where clauses, campaignId: campaignId can fail if null.
  // After guardCampaignRoute, campaignId is guaranteed non-null if we passed.
  // Fix: campaignId: campaignId → campaignId: campaignId! in where objects.
  // Only fix Prisma where contexts.

  // Pattern: where: { campaignId, or where: { campaignId: campaignId,
  // The `guardCampaignRoute` returns forbidden if null, so after the guard, campaignId is non-null.
  // We'll use campaignId! only inside where: { } blocks.

  // Simple approach: replace `campaignId,` and `campaignId: campaignId,` → `campaignId: campaignId!,`
  // and `where: { campaignId }` → `where: { campaignId: campaignId! }`

  // This is aggressive but safe since the route guards against null
  // Only do this in files that use guardCampaignRoute
  if (!src.includes("guardCampaignRoute")) return src;

  // Fix shorthand `campaignId,` inside where/filter objects
  // We need context to avoid replacing in other cases - use a functional approach

  // Replace `where: { campaignId,` with `where: { campaignId: campaignId!,`
  src = src.replace(/where:\s*\{\s*campaignId,/g, "where: { campaignId: campaignId!,");
  src = src.replace(/where:\s*\{\s*campaignId\s*\}/g, "where: { campaignId: campaignId! }");

  // Fix campaignId: campaignId in where contexts
  // This is harder to target - look for `campaignId: campaignId,` near where/findMany/count patterns
  // Use a line-by-line approach
  const lines = src.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // In Prisma query contexts, fix `campaignId: campaignId,` and `campaignId: campaignId }`
    if (line.match(/\bcampaignId:\s*campaignId[,}]/) && !line.includes("campaignId!")) {
      // Check if we're in a Prisma context (look backward for findMany/findFirst/count/create/update/where)
      const context = lines.slice(Math.max(0, i - 5), i + 1).join("\n");
      if (context.match(/where|findMany|findFirst|findUnique|create|update|count|deleteMany/)) {
        line = line.replace(/\bcampaignId:\s*campaignId([,}])/g, "campaignId: campaignId!$1");
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

const changed = [];
const errors = [];

for (const rel of TARGET_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;

  const original = readFileSync(path, "utf-8");
  let src = original;

  src = fixMissingSp(src);
  src = fixNullableCampaignId(src);

  if (src !== original) {
    writeFileSync(path, src, "utf-8");
    changed.push(rel);
  }
}

console.log(`\nCHANGED (${changed.length}):`);
for (const f of changed) console.log(`  ${f}`);
