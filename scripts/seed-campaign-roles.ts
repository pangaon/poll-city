/** Seeds default CampaignRole records for all campaigns and links existing memberships */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEGACY_ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  CAMPAIGN_MANAGER: "campaign-manager",
  VOLUNTEER_LEADER: "volunteer-leader",
  VOLUNTEER: "volunteer",
  PUBLIC_USER: "viewer",
};

async function main() {
  console.log("Seeding campaign roles...");

  const campaigns = await prisma.campaign.findMany({ select: { id: true, name: true } });
  console.log(`Found ${campaigns.length} campaigns`);

  // Import templates dynamically to avoid TS path issues in scripts
  const { DEFAULT_ROLE_TEMPLATES } = await import("../src/lib/permissions/constants");

  for (const campaign of campaigns) {
    console.log(`  Campaign: ${campaign.name}`);

    // Create all default roles
    for (const template of DEFAULT_ROLE_TEMPLATES) {
      await prisma.campaignRole.upsert({
        where: { campaignId_slug: { campaignId: campaign.id, slug: template.slug } },
        create: {
          campaignId: campaign.id,
          name: template.name,
          slug: template.slug,
          description: template.description,
          colour: template.colour,
          permissions: template.permissions,
          isSystem: template.isSystem,
          isDefault: template.slug === "volunteer",
          trustFloor: template.trustFloor,
          trustCeiling: template.trustCeiling,
          priority: template.priority,
        },
        update: {},
      });
    }

    // Link existing memberships to their CampaignRole
    const memberships = await prisma.membership.findMany({
      where: { campaignId: campaign.id, campaignRoleId: null },
    });

    for (const m of memberships) {
      const slug = LEGACY_ROLE_MAP[m.role] ?? "volunteer";
      const role = await prisma.campaignRole.findUnique({
        where: { campaignId_slug: { campaignId: campaign.id, slug } },
      });
      if (role) {
        await prisma.membership.update({
          where: { id: m.id },
          data: { campaignRoleId: role.id, trustLevel: role.trustFloor === 5 ? 5 : 2 },
        });
      }
    }

    console.log(`    ${memberships.length} memberships linked`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
