import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real Toronto City Council as of 2024-2026 term
// Source: https://www.toronto.ca/city-government/council/members-of-toronto-city-council/
const TORONTO_COUNCIL = [
  {
    externalId: "toronto-council-mayor",
    name: "Olivia Chow",
    firstName: "Olivia",
    lastName: "Chow",
    title: "Mayor",
    district: "City of Toronto",
    districtCode: "TORONTO-MAYOR",
    website: "https://www.toronto.ca/city-government/council/office-of-the-mayor/",
    wardNumber: null,
  },
  {
    externalId: "toronto-council-ward-1",
    name: "Vincent Crisanti",
    firstName: "Vincent",
    lastName: "Crisanti",
    title: "Councillor",
    district: "Etobicoke North",
    districtCode: "TORONTO-W1",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-1/",
    wardNumber: 1,
  },
  {
    externalId: "toronto-council-ward-2",
    name: "Stephen Holyday",
    firstName: "Stephen",
    lastName: "Holyday",
    title: "Councillor",
    district: "Etobicoke Centre",
    districtCode: "TORONTO-W2",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-2/",
    wardNumber: 2,
  },
  {
    externalId: "toronto-council-ward-3",
    name: "Amber Morley",
    firstName: "Amber",
    lastName: "Morley",
    title: "Councillor",
    district: "Etobicoke-Lakeshore",
    districtCode: "TORONTO-W3",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-3/",
    wardNumber: 3,
  },
  {
    externalId: "toronto-council-ward-4",
    name: "Gord Perks",
    firstName: "Gord",
    lastName: "Perks",
    title: "Councillor",
    district: "Parkdale-High Park",
    districtCode: "TORONTO-W4",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-4/",
    wardNumber: 4,
  },
  {
    externalId: "toronto-council-ward-5",
    name: "Frances Nunziata",
    firstName: "Frances",
    lastName: "Nunziata",
    title: "Councillor",
    district: "York South-Weston",
    districtCode: "TORONTO-W5",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-5/",
    wardNumber: 5,
  },
  {
    externalId: "toronto-council-ward-6",
    name: "James Pasternak",
    firstName: "James",
    lastName: "Pasternak",
    title: "Councillor",
    district: "York Centre",
    districtCode: "TORONTO-W6",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-6/",
    wardNumber: 6,
  },
  {
    externalId: "toronto-council-ward-7",
    name: "Anthony Perruzza",
    firstName: "Anthony",
    lastName: "Perruzza",
    title: "Councillor",
    district: "Humber River-Black Creek",
    districtCode: "TORONTO-W7",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-7/",
    wardNumber: 7,
  },
  {
    externalId: "toronto-council-ward-8",
    name: "Mike Colle",
    firstName: "Mike",
    lastName: "Colle",
    title: "Councillor",
    district: "Eglinton-Lawrence",
    districtCode: "TORONTO-W8",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-8/",
    wardNumber: 8,
  },
  {
    externalId: "toronto-council-ward-9",
    name: "Alejandra Bravo",
    firstName: "Alejandra",
    lastName: "Bravo",
    title: "Councillor",
    district: "Davenport",
    districtCode: "TORONTO-W9",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-9/",
    wardNumber: 9,
  },
  {
    externalId: "toronto-council-ward-10",
    name: "Ausma Malik",
    firstName: "Ausma",
    lastName: "Malik",
    title: "Councillor",
    district: "Spadina-Fort York",
    districtCode: "TORONTO-W10",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-10/",
    wardNumber: 10,
  },
  {
    externalId: "toronto-council-ward-11",
    name: "Dianne Saxe",
    firstName: "Dianne",
    lastName: "Saxe",
    title: "Councillor",
    district: "University-Rosedale",
    districtCode: "TORONTO-W11",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-11/",
    wardNumber: 11,
  },
  {
    externalId: "toronto-council-ward-12",
    name: "Josh Matlow",
    firstName: "Josh",
    lastName: "Matlow",
    title: "Councillor",
    district: "Toronto-St. Paul's",
    districtCode: "TORONTO-W12",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-12/",
    wardNumber: 12,
  },
  {
    externalId: "toronto-council-ward-13",
    name: "Chris Moise",
    firstName: "Chris",
    lastName: "Moise",
    title: "Councillor",
    district: "Toronto Centre",
    districtCode: "TORONTO-W13",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-13/",
    wardNumber: 13,
  },
  {
    externalId: "toronto-council-ward-14",
    name: "Paula Fletcher",
    firstName: "Paula",
    lastName: "Fletcher",
    title: "Councillor",
    district: "Toronto-Danforth",
    districtCode: "TORONTO-W14",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-14/",
    wardNumber: 14,
  },
  {
    externalId: "toronto-council-ward-15",
    name: "Rachel Chernos Lin",
    firstName: "Rachel",
    lastName: "Chernos Lin",
    title: "Councillor",
    district: "Don Valley West",
    districtCode: "TORONTO-W15",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-15/",
    wardNumber: 15,
  },
  {
    externalId: "toronto-council-ward-16",
    name: "Jon Burnside",
    firstName: "Jon",
    lastName: "Burnside",
    title: "Councillor",
    district: "Don Valley East",
    districtCode: "TORONTO-W16",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-16/",
    wardNumber: 16,
  },
  {
    externalId: "toronto-council-ward-17",
    name: "Shelley Carroll",
    firstName: "Shelley",
    lastName: "Carroll",
    title: "Councillor",
    district: "Don Valley North",
    districtCode: "TORONTO-W17",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-17/",
    wardNumber: 17,
  },
  {
    externalId: "toronto-council-ward-18",
    name: "Lily Cheng",
    firstName: "Lily",
    lastName: "Cheng",
    title: "Councillor",
    district: "Willowdale",
    districtCode: "TORONTO-W18",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-18/",
    wardNumber: 18,
  },
  {
    externalId: "toronto-council-ward-19",
    name: "Brad Bradford",
    firstName: "Brad",
    lastName: "Bradford",
    title: "Councillor",
    district: "Beaches-East York",
    districtCode: "TORONTO-W19",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-19/",
    wardNumber: 19,
  },
  {
    externalId: "toronto-council-ward-20",
    name: "Parthi Kandavel",
    firstName: "Parthi",
    lastName: "Kandavel",
    title: "Councillor",
    district: "Scarborough Southwest",
    districtCode: "TORONTO-W20",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-20/",
    wardNumber: 20,
  },
  {
    externalId: "toronto-council-ward-21",
    name: "Michael Thompson",
    firstName: "Michael",
    lastName: "Thompson",
    title: "Councillor",
    district: "Scarborough Centre",
    districtCode: "TORONTO-W21",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-21/",
    wardNumber: 21,
  },
  {
    externalId: "toronto-council-ward-22",
    name: "Nick Mantas",
    firstName: "Nick",
    lastName: "Mantas",
    title: "Councillor",
    district: "Scarborough-Agincourt",
    districtCode: "TORONTO-W22",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-22/",
    wardNumber: 22,
  },
  {
    externalId: "toronto-council-ward-23",
    name: "Jamaal Myers",
    firstName: "Jamaal",
    lastName: "Myers",
    title: "Councillor",
    district: "Scarborough North",
    districtCode: "TORONTO-W23",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-23/",
    wardNumber: 23,
  },
  {
    externalId: "toronto-council-ward-24",
    name: "Paul Ainslie",
    firstName: "Paul",
    lastName: "Ainslie",
    title: "Councillor",
    district: "Scarborough-Guildwood",
    districtCode: "TORONTO-W24",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-24/",
    wardNumber: 24,
  },
  {
    externalId: "toronto-council-ward-25",
    name: "Neethan Shan",
    firstName: "Neethan",
    lastName: "Shan",
    title: "Councillor",
    district: "Scarborough-Rouge Park",
    districtCode: "TORONTO-W25",
    website: "https://www.toronto.ca/city-government/council/members-of-council/councillor-ward-25/",
    wardNumber: 25,
  },
];

// Fake seed officials that should be deactivated
const FAKE_SEED_IDS = ["off-council-w12", "off-mp-todan", "off-mpp-todan"];

async function main() {
  console.log("Deactivating fake seed officials...");
  await prisma.official.updateMany({
    where: { id: { in: FAKE_SEED_IDS } },
    data: { isActive: false },
  });

  console.log(`Upserting ${TORONTO_COUNCIL.length} Toronto City Council members...`);
  let created = 0;
  let updated = 0;

  for (const member of TORONTO_COUNCIL) {
    const existing = await prisma.official.findFirst({
      where: { externalId: member.externalId },
      select: { id: true },
    });

    const data = {
      name: member.name,
      firstName: member.firstName,
      lastName: member.lastName,
      title: member.title,
      level: "municipal" as const,
      district: member.district,
      districtCode: member.districtCode,
      province: "ON",
      website: member.website,
      externalId: member.externalId,
      externalSource: "toronto_city_council_2024",
      isActive: true,
      isClaimed: false,
      subscriptionStatus: "free",
    };

    if (existing) {
      await prisma.official.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.official.create({ data });
      created++;
    }

    console.log(`  ✓ ${member.title} ${member.name} — ${member.district}`);
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}`);
  console.log("Toronto City Council is now live in Poll City Social.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
