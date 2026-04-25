/**
 * scripts/seed-turfs.mjs
 * Creates 2 demo Turf records + TurfStops using contacts already in the DB.
 * Safe to run multiple times (upserts only).
 *
 * Usage: node scripts/seed-turfs.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the demo campaign (first campaign in DB, or the one with slug "ward-12-campaign")
  const campaign = await prisma.campaign.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, candidateName: true },
  });

  if (!campaign) {
    console.error("❌ No campaign found. Run the main seed first.");
    process.exit(1);
  }
  console.log(`📍 Using campaign: ${campaign.candidateName} (${campaign.id})`);

  // Get up to 10 contacts from this campaign
  const contacts = await prisma.contact.findMany({
    where: { campaignId: campaign.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, firstName: true, lastName: true, address1: true },
  });

  if (contacts.length < 4) {
    console.error(`❌ Only ${contacts.length} contacts found. Need at least 4.`);
    process.exit(1);
  }
  console.log(`👥 Found ${contacts.length} contacts`);

  // Upsert Turf 1
  const turf1 = await prisma.turf.upsert({
    where: { id: "turf-demo-maple" },
    update: { totalDoors: Math.min(5, contacts.length), totalStops: Math.min(5, contacts.length) },
    create: {
      id: "turf-demo-maple",
      campaignId: campaign.id,
      name: "Maple / Oak Block",
      ward: "Ward 12",
      streets: ["Maple Avenue", "Oak Street"],
      status: "assigned",
      totalDoors: Math.min(5, contacts.length),
      totalStops: Math.min(5, contacts.length),
      estimatedMinutes: 45,
      notes: "Dense residential. Good conversion area.",
    },
  });
  console.log(`✅ Turf 1: ${turf1.name}`);

  // Upsert Turf 2
  const half = Math.min(5, contacts.length);
  const remaining = contacts.length - half;
  const turf2 = await prisma.turf.upsert({
    where: { id: "turf-demo-birch" },
    update: { totalDoors: remaining, totalStops: remaining },
    create: {
      id: "turf-demo-birch",
      campaignId: campaign.id,
      name: "Birch / College North",
      ward: "Ward 12",
      streets: ["Birch Crescent", "College Way"],
      status: "assigned",
      totalDoors: remaining,
      totalStops: remaining,
      estimatedMinutes: 35,
      notes: "Mix of homeowners and renters.",
    },
  });
  console.log(`✅ Turf 2: ${turf2.name}`);

  // Wipe old TurfStops for these turfs so we start clean
  await prisma.turfStop.deleteMany({ where: { turfId: { in: [turf1.id, turf2.id] } } });

  // Create TurfStops for turf1 (first half of contacts)
  const batch1 = contacts.slice(0, half);
  for (let i = 0; i < batch1.length; i++) {
    await prisma.turfStop.create({
      data: { turfId: turf1.id, contactId: batch1[i].id, order: i + 1 },
    });
    console.log(`  → Stop ${i + 1}: ${batch1[i].firstName} ${batch1[i].lastName} @ ${batch1[i].address1}`);
  }

  // Create TurfStops for turf2 (second half)
  const batch2 = contacts.slice(half);
  for (let i = 0; i < batch2.length; i++) {
    await prisma.turfStop.create({
      data: { turfId: turf2.id, contactId: batch2[i].id, order: i + 1 },
    });
    console.log(`  → Stop ${i + 1}: ${batch2[i].firstName} ${batch2[i].lastName} @ ${batch2[i].address1}`);
  }

  console.log(`\n✅ Done. 2 turfs, ${contacts.length} stops total.`);
  console.log(`   Turf 1 "${turf1.name}": ${batch1.length} stops`);
  console.log(`   Turf 2 "${turf2.name}": ${batch2.length} stops`);
  console.log(`\n   Refresh the mobile canvassing tab — missions should appear.`);
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
