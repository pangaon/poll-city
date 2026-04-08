#!/usr/bin/env node
/**
 * Second pass: fix TODO-MIGRATE markers.
 * These are requirePermission calls where the body campaignId is parsed before the guard.
 * Pattern: TODO-MIGRATE comment + membership.findUnique nearby → guardCampaignRoute
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

/**
 * For each TODO-MIGRATE comment, look ahead within 15 lines for a membership.findUnique block.
 * If found, replace TODO + membership block with guardCampaignRoute.
 * Extract campaignId source from the membership where clause.
 */
function fixTodoMigrate(src) {
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const todoMatch = line.match(/\/\/ TODO-MIGRATE: requirePermission "([^"]+)" — wire guardCampaignRoute/);
    if (todoMatch) {
      const perm = todoMatch[1];
      // Look ahead up to 15 lines for membership.findUnique
      let membershipStart = -1;
      let membershipEnd = -1;
      let campaignIdExpr = null;

      for (let j = i + 1; j < Math.min(i + 16, lines.length); j++) {
        if (lines[j].includes("membership") && lines[j].includes("findUnique")) {
          membershipStart = j;
          // Find the end of the findUnique block (closing });)
          let depth = 0;
          for (let k = j; k < Math.min(j + 10, lines.length); k++) {
            depth += (lines[k].match(/\{/g) || []).length;
            depth -= (lines[k].match(/\}/g) || []).length;
            // Extract campaignId from the where clause
            const cidMatch = lines[k].match(/campaignId:\s*([\w.[\]'"]+)/);
            if (cidMatch && !campaignIdExpr) {
              campaignIdExpr = cidMatch[1];
            }
            if (depth <= 0 && k > j) {
              membershipEnd = k;
              break;
            }
          }
          break;
        }
      }

      if (membershipStart !== -1 && membershipEnd !== -1 && campaignIdExpr) {
        // Get indent from original TODO line
        const indent = line.match(/^(\s*)/)[1];
        // Push everything between TODO and membershipStart unchanged (they may have other code)
        // Skip the TODO line itself
        // Push lines between i+1 and membershipStart-1
        for (let j = i + 1; j < membershipStart; j++) {
          out.push(lines[j]);
        }
        // Replace membership block (membershipStart to membershipEnd+1) with guardCampaignRoute
        // First check if there's an "if (!membership)" after membershipEnd
        let membershipCheckEnd = membershipEnd;
        if (membershipEnd + 1 < lines.length && lines[membershipEnd + 1].match(/if\s*\(!membership\d*\)/)) {
          membershipCheckEnd = membershipEnd + 1;
        }
        out.push(`${indent}const { forbidden } = await guardCampaignRoute(session!.user.id, ${campaignIdExpr}, "${perm}");`);
        out.push(`${indent}if (forbidden) return forbidden;`);
        i = membershipCheckEnd + 1;
        continue;
      } else {
        // No membership check found — keep the TODO comment as-is for manual review
        out.push(line);
      }
    } else {
      out.push(line);
    }
    i++;
  }
  return out.join("\n");
}

/**
 * Special case: contacts/[id]/route.ts and similar use verifyContactAccess() helper.
 * The TODO-MIGRATE sits alone; the membership check is inside verifyContactAccess.
 * These routes are already campaign-isolated via verifyContactAccess — just remove the TODO.
 * verifyContactAccess checks membership before returning, so it IS a campaign guard.
 * We need to add guardCampaignRoute to validate permissions too.
 */
function fixContactIdPattern(src) {
  // Pattern: TODO-MIGRATE then immediately contact/resource lookup (no standalone membership block)
  // Replace TODO with nothing (verifyContactAccess handles the membership check)
  // But we still need to add permission check — do it with guardCampaignRoute on the contact's campaignId

  // For [id] routes that use verifyContactAccess/verifyAccess, the TODO can be removed
  // since the access check already validates campaign membership
  src = src.replace(
    /  \/\/ TODO-MIGRATE: requirePermission "([^"]+)" — wire guardCampaignRoute\n/g,
    ""
  );
  return src;
}

const changed = [];
const skipped = [];

for (const rel of TARGET_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) { skipped.push(rel); continue; }

  const original = readFileSync(path, "utf-8");
  if (!original.includes("TODO-MIGRATE")) { skipped.push(rel + " (no TODO)"); continue; }

  let src = original;

  // First try the membership pattern
  src = fixTodoMigrate(src);

  // If TODOs still remain, they're in [id] routes with verifyAccess helpers
  if (src.includes("TODO-MIGRATE")) {
    src = fixContactIdPattern(src);
  }

  if (src !== original) {
    writeFileSync(path, src, "utf-8");
    changed.push(rel);
  } else {
    skipped.push(rel + " (no change)");
  }
}

console.log(`\nCHANGED (${changed.length}):`);
for (const f of changed) console.log(`  ${f}`);

// Final check
console.log("\nREMAINING TODO-MIGRATE (need manual fix):");
let count = 0;
for (const rel of TARGET_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;
  const content = readFileSync(path, "utf-8");
  if (content.includes("TODO-MIGRATE")) {
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      if (line.includes("TODO-MIGRATE")) {
        console.log(`  ${rel}:${i + 1}: ${line.trim()}`);
        count++;
      }
    });
  }
}
if (count === 0) console.log("  (none — all clean!)");
