/**
 * Poll City — Add SUPER_ADMIN to every campaign as ADMIN
 *
 * Run whenever George needs to access all campaigns on mobile.
 * Safe to run multiple times — skips existing memberships.
 *
 *   OWNER_EMAIL=pangaon@gmail.com npx tsx scripts/add-owner-to-all-campaigns.ts
 */

import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL;
  if (!email) {
    console.error("Set OWNER_EMAIL before running.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const campaigns = await prisma.campaign.findMany({ select: { id: true, name: true } });
  console.log(`Found ${campaigns.length} campaigns. Adding ${user.email} as ADMIN...`);

  let added = 0;
  let skipped = 0;

  for (const campaign of campaigns) {
    const existing = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
    });

    if (existing) {
      console.log(`  SKIP  ${campaign.name}`);
      skipped++;
    } else {
      await prisma.membership.create({
        data: {
          userId: user.id,
          campaignId: campaign.id,
          role: Role.ADMIN,
          trustLevel: 5,
        },
      });
      console.log(`  ADDED ${campaign.name}`);
      added++;
    }
  }

  console.log(`\nDone. Added: ${added}  Skipped (already member): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
