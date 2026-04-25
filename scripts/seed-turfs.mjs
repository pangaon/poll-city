/**
 * scripts/seed-turfs.mjs
 * Creates 2 demo Turf records + TurfStops using contacts already in the DB.
 * Safe to run multiple times (upserts only).
 *
 * Usage: node scripts/seed-turfs.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedForCampaign(campaign) {
  const contacts = await prisma.contact.findMany({
    where: { campaignId: campaign.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, firstName: true, lastName: true, address1: true },
  });

  if (contacts.length < 2) {
    console.log(`  ⚠ Skipping ${campaign.candidateName} — only ${contacts.length} contacts`);
    return;
  }

  // Find first ADMIN membership to assign turfs to a real user
  const adminMembership = await prisma.membership.findFirst({
    where: { campaignId: campaign.id, role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
    select: { id: true, userId: true },
  });

  const half = Math.min(5, contacts.length);
  const remaining = Math.min(5, contacts.length - half);

  // Delete any existing demo turfs for this campaign and recreate
  await prisma.turf.deleteMany({
    where: { campaignId: campaign.id, name: { in: ["Maple / Oak Block", "Birch / College North"] } },
  });

  const turf1 = await prisma.turf.create({
    data: {
      campaignId: campaign.id,
      name: "Maple / Oak Block",
      ward: "Ward 12",
      streets: ["Maple Avenue", "Oak Street"],
      status: "assigned",
      assignedUserId: adminMembership?.userId ?? null,
      assignedVolunteerId: adminMembership?.id ?? null,
      totalDoors: half,
      totalStops: half,
      estimatedMinutes: 45,
      notes: "Dense residential. Good conversion area.",
    },
  });

  const turf2 = await prisma.turf.create({
    data: {
      campaignId: campaign.id,
      name: "Birch / College North",
      ward: "Ward 12",
      streets: ["Birch Crescent", "College Way"],
      status: "assigned",
      assignedUserId: adminMembership?.userId ?? null,
      assignedVolunteerId: adminMembership?.id ?? null,
      totalDoors: remaining,
      totalStops: remaining,
      estimatedMinutes: 35,
      notes: "Mix of homeowners and renters.",
    },
  });

  const batch1 = contacts.slice(0, half);
  for (let i = 0; i < batch1.length; i++) {
    await prisma.turfStop.create({ data: { turfId: turf1.id, contactId: batch1[i].id, order: i + 1 } });
  }
  const batch2 = contacts.slice(half, half + remaining);
  for (let i = 0; i < batch2.length; i++) {
    await prisma.turfStop.create({ data: { turfId: turf2.id, contactId: batch2[i].id, order: i + 1 } });
  }

  console.log(`  ✅ ${campaign.candidateName}: turf1=${half} stops, turf2=${remaining} stops`);
}

async function main() {
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, candidateName: true, _count: { select: { contacts: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${campaigns.length} campaigns. Seeding demo turfs for all with contacts...\n`);

  for (const c of campaigns) {
    if (c._count.contacts === 0) {
      console.log(`  ⚠ Skipping ${c.candidateName} — 0 contacts`);
      continue;
    }
    await seedForCampaign(c);
  }

  console.log("\n✅ Done. Refresh the mobile canvassing tab.");
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
