// Collects all training data from the live system for Adoni's knowledge base.
// Called by `npm run adoni:train` and the nightly cron.

import prisma from "@/lib/db/prisma";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

export interface AdoniTrainingData {
  platformCapabilities: string;
  apiRoutes: string;
  featureChecklist: string;
  recentBugFixes: string;
  electionLaw: string;
  generatedAt: string;
}

export async function collectTrainingData(): Promise<AdoniTrainingData> {
  const apiDir = path.join(process.cwd(), "src/app/api");
  const apiRoutes = collectApiRoutes(apiDir);

  const checklistPath = path.join(process.cwd(), "docs/FEATURE_EXECUTION_CHECKLIST.md");
  const featureChecklist = existsSync(checklistPath)
    ? readFileSync(checklistPath, "utf-8")
    : "Checklist not found";

  const recentBugFixes = getRecentBugFixes();
  const electionLaw = getElectionLaw();
  const platformCapabilities = await buildPlatformCapabilities();

  return {
    platformCapabilities,
    apiRoutes,
    featureChecklist,
    recentBugFixes,
    electionLaw,
    generatedAt: new Date().toISOString(),
  };
}

function collectApiRoutes(dir: string, prefix = ""): string {
  if (!existsSync(dir)) return "";
  const routes: string[] = [];
  try {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const sub = collectApiRoutes(path.join(dir, item.name), `${prefix}/${item.name}`);
        if (sub) routes.push(sub);
      } else if (item.name === "route.ts") {
        const content = readFileSync(path.join(dir, item.name), "utf-8");
        const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((m) =>
          content.includes(`export async function ${m}`),
        );
        if (methods.length > 0) routes.push(`/api${prefix} [${methods.join(", ")}]`);
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return routes.join("\n");
}

function getRecentBugFixes(): string {
  try {
    const { execSync } = require("child_process");
    return execSync('git log --oneline --grep="fix" -20 2>/dev/null || echo "No git history"', {
      encoding: "utf-8",
    });
  } catch {
    return "Git log not available";
  }
}

function getElectionLaw(): string {
  return `
ONTARIO MUNICIPAL 2026:
- Election day: October 26, 2026
- Nomination deadline: August 21, 2026 at 2pm
- Spending limit: Lesser of ($5,000 + $0.20/elector) or $25,000 for councillors
- Head of council: Lesser of ($7,500 + $0.20/elector) or $25,000
- Donation limit: $1,200 per individual ($2,500 Toronto Mayor)
- No corporations, no unions. Only Ontario residents.
- Auditor required over $10,000
- Filing: 90 days post-election (~January 24, 2027)
- Anonymous/cash donations: $25 max
- Registration fee: $100 councillor / $200 head of council

BC LOCAL 2026:
- Election day: October 17, 2026
- Pre-campaign: July 20, 2026. Campaign period: September 19, 2026.
- Individual limit: $1,429.70 (CPI-adjusted)
- Anonymous: $50 max. Crypto: permitted.
- Filing: 90 days post-election

ONTARIO PROVINCIAL 2026:
- Election day: June 4, 2026. Individual limit: $3,425/candidate.

FEDERAL:
- Last election: April 28, 2025. Individual limit: $3,425 (2026).
  `;
}

async function buildPlatformCapabilities(): Promise<string> {
  const [contactCount, campaignCount, officialCount] = await Promise.all([
    prisma.contact.count(),
    prisma.campaign.count(),
    prisma.official.count(),
  ]);

  return `
POLL CITY PLATFORM STATUS (live):
- Total contacts: ${contactCount.toLocaleString()}
- Active campaigns: ${campaignCount}
- Officials in directory: ${officialCount.toLocaleString()}
  `;
}
