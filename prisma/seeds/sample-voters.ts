// Seeds 250 realistic Ontario voters into a target campaign.
// Useful for demos, E2E tests, and onboarding new users to a non-empty CRM.
//
// Usage:
//   npx tsx prisma/seeds/sample-voters.ts                    # uses first campaign
//   CAMPAIGN_SLUG=jane-smith-ward-20 npx tsx prisma/seeds/sample-voters.ts

import { PrismaClient, SupportLevel, GotvStatus } from "@prisma/client";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Adam", "Aisha", "Alex", "Amanda", "Amir", "Andrew", "Angela", "Anika", "Anthony", "Arjun",
  "Ava", "Benjamin", "Beth", "Brian", "Caleb", "Carlos", "Carol", "Cassidy", "Catherine", "Chen",
  "Chloe", "Christian", "Christina", "Daniel", "David", "Deepa", "Devon", "Diana", "Edward", "Elaine",
  "Elena", "Eli", "Emily", "Emma", "Eric", "Evelyn", "Fatima", "Felix", "Fernando", "Francesca",
  "Frank", "Gabriel", "George", "Grace", "Hannah", "Harold", "Hassan", "Helen", "Henry", "Hiroshi",
  "Ian", "Imran", "Isaac", "Isabella", "Jack", "Jackson", "Jacob", "Jaime", "James", "Jamie",
  "Jane", "Jason", "Jasmine", "Jean", "Jennifer", "Jessica", "John", "Jonathan", "Jordan", "Joseph",
  "Joshua", "Julia", "Juliet", "Justin", "Kaitlyn", "Karen", "Katie", "Kavya", "Keisha", "Kevin",
  "Kim", "Laura", "Leah", "Leo", "Lily", "Linda", "Liu", "Logan", "Lucas", "Luis",
  "Madeline", "Maria", "Mark", "Mary", "Matthew", "Maya", "Megan", "Mei", "Melissa", "Michael",
  "Michelle", "Miguel", "Mohamed", "Monique", "Nadia", "Nancy", "Naomi", "Natalie", "Nathan", "Nicholas",
  "Nicole", "Noah", "Olivia", "Owen", "Pablo", "Patricia", "Paul", "Peter", "Priya", "Rachel",
  "Rafael", "Rahul", "Rebecca", "Richard", "Robert", "Rohan", "Rosa", "Ryan", "Sabrina", "Samantha",
  "Samuel", "Sandra", "Sarah", "Scott", "Sean", "Sharon", "Shawn", "Simone", "Sofia", "Sophie",
  "Stephanie", "Steven", "Susan", "Tariq", "Taylor", "Theresa", "Thomas", "Tiffany", "Tyler", "Vanessa",
  "Victor", "Victoria", "Vikram", "Wei", "William", "Xavier", "Yara", "Yuki", "Zachary", "Zoe",
];

const LAST_NAMES = [
  "Ahmed", "Ali", "Anderson", "Baker", "Bennett", "Brown", "Campbell", "Carter", "Chan", "Chen",
  "Clark", "Collins", "Cook", "Cooper", "Davis", "Dixon", "Edwards", "Evans", "Fernandes", "Foster",
  "Garcia", "Ghosh", "Gonzalez", "Green", "Gupta", "Hall", "Hamilton", "Harris", "Hernandez", "Hill",
  "Ho", "Huang", "Hughes", "Jackson", "James", "Johnson", "Jones", "Kaur", "Kelly", "Khan",
  "Kim", "King", "Kumar", "Lam", "Lee", "Lewis", "Li", "Lin", "Liu", "Lopez",
  "MacDonald", "Martin", "Martinez", "Mehta", "Miller", "Mitchell", "Moore", "Morgan", "Morris", "Murphy",
  "Nelson", "Nguyen", "O'Brien", "Oliveira", "Osman", "Parker", "Patel", "Perez", "Peterson", "Phillips",
  "Pickup", "Rahman", "Ramirez", "Reyes", "Richards", "Rivera", "Roberts", "Robinson", "Rodriguez", "Rogers",
  "Rossi", "Roy", "Russo", "Ryan", "Sandhu", "Santos", "Scott", "Shah", "Sharma", "Silva",
  "Singh", "Smith", "Stewart", "Sullivan", "Tan", "Taylor", "Thomas", "Thompson", "Tran", "Turner",
  "Walker", "Wang", "Watson", "Williams", "Wilson", "Wong", "Wood", "Wright", "Xu", "Yang",
  "Young", "Zhang", "Zhao",
];

const STREETS = [
  "Bloor St W", "Queen St E", "King St W", "Danforth Ave", "College St", "Dundas St W",
  "Gerrard St E", "Eglinton Ave W", "St. Clair Ave W", "Lawrence Ave E", "Finch Ave W", "Sheppard Ave E",
  "Jane St", "Keele St", "Dufferin St", "Ossington Ave", "Bathurst St", "Spadina Ave",
  "University Ave", "Yonge St", "Church St", "Jarvis St", "Parliament St", "Broadview Ave",
  "Pape Ave", "Coxwell Ave", "Woodbine Ave", "Main St", "Victoria Park Ave",
];

const WARDS_TORONTO = [
  "Ward 4 - Parkdale—High Park", "Ward 9 - Davenport", "Ward 10 - Spadina—Fort York",
  "Ward 11 - University—Rosedale", "Ward 12 - Toronto—St. Paul's", "Ward 13 - Toronto Centre",
  "Ward 14 - Toronto—Danforth", "Ward 19 - Beaches—East York", "Ward 20 - Scarborough Southwest",
];

const TAGS_POOL = ["churchgoer", "business owner", "retiree", "family", "student", "homeowner", "renter", "new to canada", "union member", "senior"];

const ISSUES_POOL = ["transit", "housing", "taxes", "safety", "environment", "cycling", "schools", "parks", "homelessness", "development"];

const SUPPORT_DISTRIBUTION: Array<{ level: SupportLevel; weight: number }> = [
  { level: "strong_support" as SupportLevel, weight: 18 },
  { level: "leaning_support" as SupportLevel, weight: 22 },
  { level: "undecided" as SupportLevel, weight: 28 },
  { level: "leaning_opposition" as SupportLevel, weight: 12 },
  { level: "strong_opposition" as SupportLevel, weight: 8 },
  { level: "unknown" as SupportLevel, weight: 12 },
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: readonly T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function weightedPick<T>(items: Array<{ level: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.level;
  }
  return items[items.length - 1].level;
}

function phone(): string {
  const area = pick(["416", "647", "437"] as const);
  const exchange = 200 + Math.floor(Math.random() * 799);
  const subscriber = String(1000 + Math.floor(Math.random() * 8999));
  return `${area}-${exchange}-${subscriber}`;
}

function postalCode(): string {
  const letters = "ABCEGHJKLMNPRSTVXY";
  const p = (i: number) => letters[Math.floor(Math.random() * letters.length)];
  const d = () => Math.floor(Math.random() * 10);
  return `M${d()}${p(0)} ${d()}${p(0)}${d()}`;
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

  console.log(`Seeding 250 voters into campaign: ${campaign.name} (${campaign.slug})`);

  // Seed tags
  const tagRecords = [];
  for (const name of TAGS_POOL) {
    const tag = await prisma.tag.upsert({
      where: { name_campaignId: { name, campaignId: campaign.id } },
      update: {},
      create: { name, campaignId: campaign.id, color: "#3b82f6" },
    });
    tagRecords.push(tag);
  }

  let created = 0;
  const gotvStatuses: GotvStatus[] = ["not_checked", "not_home", "will_vote", "voted", "refused"] as GotvStatus[];

  for (let i = 0; i < 250; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const streetNumber = String(100 + Math.floor(Math.random() * 899));
    const streetName = pick(STREETS);
    const ward = pick(WARDS_TORONTO);
    const supportLevel = weightedPick(SUPPORT_DISTRIBUTION);
    const hasPhone = Math.random() < 0.78;
    const hasEmail = Math.random() < 0.52;
    const volunteerInterest = supportLevel === "strong_support" && Math.random() < 0.18;
    const signRequested = (supportLevel === "strong_support" || supportLevel === "leaning_support") && Math.random() < 0.22;
    const followUpNeeded = supportLevel === "undecided" && Math.random() < 0.3;
    const lastContactedAt =
      Math.random() < 0.4
        ? new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000)
        : null;
    const issues = Math.random() < 0.35 ? pickMany(ISSUES_POOL, 1, 3) : [];
    const gotvStatus: GotvStatus =
      supportLevel === "strong_support"
        ? (Math.random() < 0.4 ? "will_vote" : "not_checked") as GotvStatus
        : pick(gotvStatuses);

    const contact = await prisma.contact.create({
      data: {
        campaignId: campaign.id,
        firstName,
        lastName,
        phone: hasPhone ? phone() : null,
        email: hasEmail ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}@example.com` : null,
        address1: `${streetNumber} ${streetName}`,
        streetNumber,
        streetName,
        city: "Toronto",
        province: "ON",
        postalCode: postalCode(),
        ward,
        supportLevel,
        gotvStatus,
        followUpNeeded,
        volunteerInterest,
        signRequested,
        lastContactedAt,
        issues,
        importSource: "sample_seed",
        source: "sample_seed",
        notes: Math.random() < 0.2 ? "Open to a follow-up call in the next 2 weeks." : null,
      },
    });

    // Tag 1-2 contacts with pool tags
    if (Math.random() < 0.45) {
      const picked = pickMany(tagRecords, 1, 2);
      for (const tag of picked) {
        await prisma.contactTag.create({
          data: { contactId: contact.id, tagId: tag.id },
        }).catch(() => {});
      }
    }

    created += 1;
    if (created % 50 === 0) console.log(`  ${created}/250`);
  }

  console.log(`Sample voters: created=${created} in campaign=${campaign.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
