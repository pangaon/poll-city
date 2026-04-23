/**
 * fix-demo-dates.ts
 * Updates stale demo task due dates (2024 and past) to current-relative dates.
 * Run: npx tsx scripts/fix-demo-dates.ts
 *
 * Safe to re-run — only touches demo campaigns, only updates tasks with past due dates.
 */

import { PrismaClient, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_CAMPAIGN_NAMES = ["Demo Campaign 2026", "Toronto Mayoral Campaign 2026"];

// Spread out future due dates across upcoming days — realistic campaign workload
const FUTURE_OFFSETS_DAYS = [1, 2, 2, 3, 3, 4, 5, 5, 7, 7, 10, 10, 14, 14, 21];

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0); // 5pm — realistic end-of-day deadline
  return d;
}

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: { name: { in: DEMO_CAMPAIGN_NAMES } },
    select: { id: true, name: true },
  });

  if (campaigns.length === 0) {
    console.log("No demo campaigns found. Nothing to update.");
    return;
  }

  for (const campaign of campaigns) {
    console.log(`\nProcessing: ${campaign.name} (${campaign.id})`);

    const staleTasks = await prisma.task.findMany({
      where: {
        campaignId: campaign.id,
        deletedAt: null,
        status: { in: [TaskStatus.pending, TaskStatus.in_progress] },
        dueDate: { lt: new Date() },
      },
      select: { id: true, title: true, dueDate: true, priority: true },
      orderBy: { priority: "asc" },
    });

    console.log(`  Found ${staleTasks.length} tasks with stale/past due dates`);

    if (staleTasks.length === 0) continue;

    // Assign future dates — urgent/high tasks get shorter windows
    let offsetIdx = 0;
    for (const task of staleTasks) {
      const days = FUTURE_OFFSETS_DAYS[offsetIdx % FUTURE_OFFSETS_DAYS.length];
      offsetIdx++;

      await prisma.task.update({
        where: { id: task.id },
        data: { dueDate: daysFromNow(days) },
      });

      console.log(`  ✓ "${task.title.slice(0, 55)}" → +${days}d`);
    }
  }

  console.log("\n✅ Demo dates updated. Run npx prisma db push if Tasks v2 schema not yet applied.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
