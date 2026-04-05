// Seeds 25 sample volunteers linked to sample voters with strong_support level.
// Creates VolunteerProfile with realistic skills, availability, hours, vehicle.
//
// Run AFTER sample-voters.ts so there are strong_support contacts to pick.
//
// Usage:
//   npx tsx prisma/seeds/sample-volunteers.ts
//   CAMPAIGN_SLUG=jane-smith-ward-20 npx tsx prisma/seeds/sample-volunteers.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKILLS = [
  "door_knocking",
  "phone_banking",
  "data_entry",
  "event_coordination",
  "social_media",
  "driving",
  "sign_install",
  "translation",
  "photography",
  "graphic_design",
];

const AVAILABILITIES = [
  "Evenings and weekends",
  "Weekends only",
  "Weekday mornings",
  "Flexible schedule",
  "After 6pm weekdays",
  "Saturday all day",
  "Sundays after church",
];

function pickMany<T>(arr: readonly T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const slug = process.env.CAMPAIGN_SLUG;
  const campaign = slug
    ? await prisma.campaign.findUnique({ where: { slug } })
    : await prisma.campaign.findFirst({ orderBy: { createdAt: "asc" } });

  if (!campaign) {
    console.error("No campaign found. Create one first, or set CAMPAIGN_SLUG.");
    process.exit(1);
  }

  // Pull 25 strong-support contacts to promote to volunteers
  const strongSupporters = await prisma.contact.findMany({
    where: { campaignId: campaign.id, supportLevel: "strong_support" },
    take: 25,
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true },
  });

  if (strongSupporters.length === 0) {
    console.error("No strong_support contacts found. Run sample-voters.ts first.");
    process.exit(1);
  }

  console.log(`Promoting ${strongSupporters.length} contacts to volunteers in ${campaign.name}`);

  let created = 0;
  let skipped = 0;

  for (const c of strongSupporters) {
    const existing = await prisma.volunteerProfile.findUnique({
      where: { contactId: c.id },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.volunteerProfile.create({
      data: {
        campaignId: campaign.id,
        contactId: c.id,
        skills: pickMany(SKILLS, 2, 4),
        availability: pick(AVAILABILITIES),
        maxHoursPerWeek: pick([4, 8, 10, 15, 20] as const),
        hasVehicle: Math.random() < 0.4,
        totalHours: Math.floor(Math.random() * 40),
        isActive: true,
      },
    });

    // Mark the contact as having volunteerInterest
    await prisma.contact.update({
      where: { id: c.id },
      data: { volunteerInterest: true },
    });

    created += 1;
  }

  console.log(`Sample volunteers: created=${created} skipped=${skipped} in campaign=${campaign.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
