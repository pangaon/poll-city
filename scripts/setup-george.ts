/**
 * One-time setup script for George's SUPER_ADMIN account.
 * - Finds George's account by email
 * - Assigns him to the demo campaign
 * - Sets activeCampaignId so the dashboard loads
 *
 * Run: npx tsx scripts/setup-george.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "pangaon@gmail.com";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.error("User not found"); process.exit(1); }

  const campaign = await prisma.campaign.findFirst({
    where: { slug: "demo-campaign-2026" },
  });
  if (!campaign) { console.error("Demo campaign not found — run seed first"); process.exit(1); }

  // Add membership
  await prisma.membership.upsert({
    where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
    update: { role: "ADMIN" },
    create: { userId: user.id, campaignId: campaign.id, role: "ADMIN" },
  });

  // Set active campaign
  await prisma.user.update({
    where: { id: user.id },
    data: { activeCampaignId: campaign.id },
  });

  console.log(`✅ George (${email}) set up on campaign: ${campaign.name}`);
  console.log(`   activeCampaignId: ${campaign.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
