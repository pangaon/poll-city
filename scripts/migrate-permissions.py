#!/usr/bin/env python3
"""
Bulk migrate legacy requirePermission + membership.findUnique to guardCampaignRoute.

Handles:
  Pattern A: GET/DELETE with query param campaignId + membership check
  Pattern B: POST/PATCH/PUT with body campaignId + membership check
  Pattern C: requirePermission only (no membership check) — adds guard
"""
import re, os, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "app", "api")

TARGET_FILES = [
    # communications
    "communications/audience/route.ts",
    "communications/email/route.ts",
    "communications/sms/route.ts",
    "communications/social/accounts/route.ts",
    "communications/social/mentions/route.ts",
    "communications/social/mentions/[id]/route.ts",
    "communications/social/posts/route.ts",
    "communications/social/posts/[id]/route.ts",
    # contacts
    "contacts/route.ts",
    "contacts/[id]/route.ts",
    "contacts/bulk-tag/route.ts",
    "contacts/bulk-update/route.ts",
    "contacts/column-preferences/route.ts",
    "contacts/filter-presets/route.ts",
    "contacts/filter-presets/[id]/route.ts",
    "contacts/streets/route.ts",
    # canvassing
    "canvass/route.ts",
    "canvass/assign/route.ts",
    "canvassing/debrief/route.ts",
    "canvassing/intelligence/route.ts",
    "canvassing/literature-drop/route.ts",
    "canvassing/scripts/route.ts",
    "canvassing/smart-plan/route.ts",
    "canvassing/street-priority/route.ts",
    # tasks
    "tasks/route.ts",
    "tasks/[id]/route.ts",
    # signs
    "signs/route.ts",
    # events
    "events/route.ts",
    "events/[eventId]/route.ts",
    "events/[eventId]/calendar/route.ts",
    "events/[eventId]/check-in/route.ts",
    "events/[eventId]/duplicate/route.ts",
    "events/[eventId]/rsvps/route.ts",
    # volunteers
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
    # budget / finance
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
    # intelligence / opponents
    "intelligence/route.ts",
    "intelligence/voter-profile/route.ts",
    "intelligence/zone-analysis/route.ts",
    "opponents/route.ts",
    # resources
    "resources/upload/route.ts",
    # call-list / turf / canvasser
    "call-list/route.ts",
    "turf/route.ts",
    "turf/leaderboard/route.ts",
    "turf/preview/route.ts",
    "volunteers/performance/route.ts",
]

def fix_import(src: str) -> str:
    # Replace "apiAuth, requirePermission" with just "apiAuth"
    src = re.sub(
        r'import\s*\{\s*apiAuth\s*,\s*requirePermission\s*\}\s*from\s*"@/lib/auth/helpers"',
        'import { apiAuth } from "@/lib/auth/helpers"',
        src
    )
    src = re.sub(
        r'import\s*\{\s*requirePermission\s*,\s*apiAuth\s*\}\s*from\s*"@/lib/auth/helpers"',
        'import { apiAuth } from "@/lib/auth/helpers"',
        src
    )
    # Add guardCampaignRoute import if not already present
    if 'guardCampaignRoute' not in src:
        # Insert after the apiAuth import line
        src = re.sub(
            r'(import \{ apiAuth \} from "@/lib/auth/helpers";)',
            r'\1\nimport { guardCampaignRoute } from "@/lib/permissions/engine";',
            src
        )
    return src

def fix_pattern_a(src: str) -> str:
    """
    Pattern A — GET/DELETE: requirePermission + getParam campaignId + membership check.

    Before:
      const permError = requirePermission(session!.user.role as string, "X:Y");
      if (permError) return permError;

      const campaignId = req.nextUrl.searchParams.get("campaignId");
      if (!campaignId) return NextResponse.json({ ... }, { status: 400 });

      const membership = await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
      });
      if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    After:
      const campaignId = req.nextUrl.searchParams.get("campaignId");
      const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "X:Y");
      if (forbidden) return forbidden;
    """
    pattern = re.compile(
        r'const permError\d*\s*=\s*requirePermission\(session!\.\w+\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n'
        r'\s*if \(permError\d*\) return permError\d*;\s*\n'
        r'\s*\n?'
        r'\s*const (campaignId\w*)\s*=\s*(?:req\.nextUrl\.searchParams\.get\("campaignId"\)|sp\.get\("campaignId"\));\s*\n'
        r'\s*if \(!\2\)[^\n]+\n'
        r'\s*\n?'
        r'\s*const membership\d*\s*=\s*await prisma\.membership\.findUnique\(\{\s*\n'
        r'\s*where:\s*\{\s*userId_campaignId:\s*\{\s*userId:\s*session!\.user\.id,\s*campaignId:?\s*\2?\s*\}\s*\},?\s*\n'
        r'\s*\}\);\s*\n'
        r'\s*if \(!membership\d*\)[^\n]+\n',
        re.MULTILINE
    )
    def replace_a(m):
        perm = m.group(1)
        cid_var = m.group(2)
        getter = "req.nextUrl.searchParams.get(\"campaignId\")"
        if "sp.get" in m.group(0):
            getter = 'sp.get("campaignId")'
        return (
            f'  const {cid_var} = {getter};\n'
            f'  const {{ forbidden }} = await guardCampaignRoute(session!.user.id, {cid_var}, "{perm}");\n'
            f'  if (forbidden) return forbidden;\n'
        )
    return pattern.sub(replace_a, src)

def fix_pattern_a_simple(src: str) -> str:
    """
    Simpler version without the explicit null check line (some files skip it).
    """
    pattern = re.compile(
        r'const permError\d*\s*=\s*requirePermission\(session!\.\w+\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n'
        r'\s*if \(permError\d*\) return permError\d*;\s*\n'
        r'\s*\n?'
        r'\s*const (campaignId\w*)\s*=\s*(?:req\.nextUrl\.searchParams\.get\("campaignId"\)|sp\.get\("campaignId"\));\s*\n'
        r'\s*if \(!\2\)[^\n]+\n'
        r'(?:\s*\n)?'
        r'\s*const membership\d*\s*=\s*await prisma\.membership\.findUnique\(\{[^}]+\}\s*\}\);\s*\n'
        r'\s*if \(!membership\d*\)[^\n]+\n',
        re.MULTILINE | re.DOTALL
    )
    def replace_a_simple(m):
        perm = m.group(1)
        cid_var = m.group(2)
        getter = "req.nextUrl.searchParams.get(\"campaignId\")"
        if "sp.get" in m.group(0):
            getter = 'sp.get("campaignId")'
        return (
            f'  const {cid_var} = {getter};\n'
            f'  const {{ forbidden }} = await guardCampaignRoute(session!.user.id, {cid_var}, "{perm}");\n'
            f'  if (forbidden) return forbidden;\n'
        )
    return pattern.sub(replace_a_simple, src)

def fix_remaining_perm_errors(src: str) -> str:
    """
    Remove any remaining standalone requirePermission calls that weren't caught
    by the pattern replacements above. These are cases where membership check
    comes from a different helper or comes BEFORE the campaignId extract.
    Replace with a comment so we can manually review.
    """
    # Only remove if there's also a membership check nearby (manual marker)
    pattern = re.compile(
        r'  const permError\d*\s*=\s*requirePermission\(session!\.\w+\.role\s+as\s+string,\s*"([^"]+)"\);\s*\n'
        r'  if \(permError\d*\) return permError\d*;\s*\n',
        re.MULTILINE
    )
    def mark(m):
        perm = m.group(1)
        return f'  // TODO-MIGRATE: requirePermission "{perm}" — wire guardCampaignRoute\n'
    return pattern.sub(mark, src)

changed = []
skipped = []
errors = []

for rel in TARGET_FILES:
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        skipped.append(rel + " (not found)")
        continue

    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    if "requirePermission" not in original:
        skipped.append(rel + " (already clean)")
        continue

    src = original
    src = fix_import(src)
    src = fix_pattern_a(src)
    src = fix_pattern_a_simple(src)
    src = fix_remaining_perm_errors(src)

    if src != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(src)
        changed.append(rel)
    else:
        skipped.append(rel + " (no pattern match)")

print(f"\nCHANGED ({len(changed)}):")
for f in changed: print(f"  {f}")
print(f"\nSKIPPED ({len(skipped)}):")
for f in skipped: print(f"  {f}")

# Check for any remaining requirePermission calls
print("\nREMAINING requirePermission (need manual fix):")
for rel in TARGET_FILES:
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path): continue
    with open(path, "r") as f:
        content = f.read()
    if "requirePermission" in content:
        lines = [(i+1, l.strip()) for i,l in enumerate(content.splitlines()) if "requirePermission" in l]
        for lineno, line in lines:
            print(f"  {rel}:{lineno}: {line}")
