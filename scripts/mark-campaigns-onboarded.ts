/**
 * One-time backfill: mark all existing campaigns as onboardingComplete = true.
 *
 * Run this once on Railway (or locally with the prod DATABASE_URL) to prevent
 * existing campaigns from being redirected to the onboarding wizard.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/mark-campaigns-onboarded.ts
 *
 * Safe to run multiple times — only updates campaigns where onboardingComplete = false.
 */

import prisma from "../src/lib/db/prisma";

async function main() {
  const { count } = await prisma.campaign.updateMany({
    where: {
      onboardingComplete: false,
      createdAt: { lt: new Date("2026-04-16T00:00:00Z") },
    },
    data: { onboardingComplete: true },
  });

  console.log(`✓ Marked ${count} existing campaign(s) as onboarding complete.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
