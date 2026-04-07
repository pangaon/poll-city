/**
 * Ward 20 Demo Seed — makes Poll City come alive.
 *
 * Run: npx tsx prisma/seeds/ward20-demo.ts
 *
 * Creates a complete campaign with 5,000 contacts, interactions,
 * volunteers, donations, signs, events, tasks, and GOTV data.
 * Every page in the app will show real, meaningful data.
 *
 * This is what George shows to clients.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Toronto Ward 20 street data ────────────────────────────────────────────

const STREETS = [
  "Queen Street East", "King Street East", "Dundas Street East", "Gerrard Street East",
  "Broadview Avenue", "Pape Avenue", "Carlaw Avenue", "Logan Avenue",
  "Withrow Avenue", "Langley Avenue", "De Grassi Street", "Boulton Avenue",
  "Hamilton Street", "Morse Street", "Booth Avenue", "Bertmount Avenue",
  "Leslie Street", "Jones Avenue", "Greenwood Avenue", "Coxwell Avenue",
  "Victor Avenue", "Riverdale Avenue", "Hogarth Avenue", "Sparkhall Avenue",
  "Jackman Avenue", "Bowden Street", "Wroxeter Avenue", "Dingwall Avenue",
  "Hillingdon Avenue", "Cambridge Avenue", "Simpson Avenue", "Wardell Street",
  "Oak Street", "Badgerow Avenue", "Dagmar Avenue", "Heward Avenue",
  "Munro Street", "Tiverton Avenue", "Ivy Avenue", "Felstead Avenue",
];

const FIRST_NAMES = [
  "Sarah", "Michael", "Jessica", "David", "Emily", "James", "Olivia", "Robert",
  "Sophia", "William", "Emma", "John", "Ava", "Daniel", "Isabella", "Matthew",
  "Mia", "Andrew", "Charlotte", "Ryan", "Amelia", "Kevin", "Harper", "Mark",
  "Ella", "Brian", "Grace", "Timothy", "Lily", "Jason", "Chloe", "Eric",
  "Natalie", "Steven", "Hannah", "Chris", "Zoe", "Scott", "Leah", "Jeff",
  "Priya", "Raj", "Wei", "Li", "Fatima", "Hassan", "Yuki", "Kenji",
  "Maria", "Carlos", "Ana", "Pedro", "Sofia", "Diego", "Valentina", "Marco",
  "Aisha", "Omar", "Noor", "Tariq", "Chen", "Ming", "Suki", "Hiro",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia",
  "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson",
  "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Clark", "Lewis",
  "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Hill", "Green",
  "Chen", "Wong", "Singh", "Patel", "Kim", "Nguyen", "Li", "Wang",
  "Suzuki", "Tanaka", "Santos", "Costa", "Silva", "Oliveira", "Nowak", "Kowalski",
  "Ahmed", "Hassan", "Ali", "Khan", "Sharma", "Gupta", "Rossi", "Bianchi",
  "Mueller", "Schmidt", "O'Brien", "Murphy", "Campbell", "Stewart", "Fraser", "MacDonald",
];

const POSTAL_PREFIXES = ["M4K", "M4J", "M4M", "M4L"];

const ISSUES = ["transit", "housing", "safety", "parks", "development", "taxes", "environment", "schools"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n: number): Date { return new Date(Date.now() - n * 24 * 60 * 60 * 1000); }
function randDate(daysBack: number): Date { return daysAgo(rand(0, daysBack)); }
function postalCode(): string { return `${pick(POSTAL_PREFIXES)} ${rand(1, 9)}${pick("ABCDEFGHJKLMNPRSTUVWXY".split(""))}${rand(0, 9)}`; }
function phone(): string { return `416${rand(200, 999)}${rand(1000, 9999)}`; }
function email(first: string, last: string): string { return `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 99)}@${pick(["gmail.com", "outlook.com", "yahoo.ca", "hotmail.com", "icloud.com"])}`; }

async function main() {
  console.log("🌆 Ward 20 Demo Seed — Making Poll City come alive\n");

  // Find or use the first campaign
  let campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
  if (!campaign) {
    console.log("❌ No campaign found. Create one first at /campaigns.");
    return;
  }
  console.log(`📋 Campaign: ${campaign.name} (${campaign.id})`);

  // Find admin user
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) {
    console.log("❌ No admin user found.");
    return;
  }
  console.log(`👤 Admin: ${admin.name ?? admin.email}`);

  const campaignId = campaign.id;
  const userId = admin.id;

  // ─── 1. Create 5,000 contacts ───────────────────────────────────────────
  console.log("\n📇 Creating 5,000 contacts...");

  const supportDist = [
    ...Array(1500).fill("strong_support"),
    ...Array(750).fill("leaning_support"),
    ...Array(1000).fill("undecided"),
    ...Array(500).fill("leaning_against"),
    ...Array(250).fill("against"),
    ...Array(1000).fill("unknown"),
  ];

  const contactData = [];
  for (let i = 0; i < 5000; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const street = pick(STREETS);
    const support = supportDist[i] ?? "unknown";
    const hasPhone = Math.random() < 0.7;
    const hasEmail = Math.random() < 0.5;
    const contacted = Math.random() < 0.6;

    contactData.push({
      campaignId,
      firstName: first,
      lastName: last,
      address1: `${rand(1, 999)} ${street}`,
      city: "Toronto",
      province: "Ontario",
      postalCode: postalCode(),
      ward: "Ward 20 — Scarborough Southwest",
      municipalPoll: `Poll ${rand(1, 60)}`,
      phone: hasPhone ? phone() : null,
      email: hasEmail ? email(first, last) : null,
      supportLevel: support as any,
      lastContactedAt: contacted ? randDate(60) : null,
      notHome: !contacted && Math.random() < 0.3,
      signRequested: support === "strong_support" && Math.random() < 0.3,
      signPlaced: support === "strong_support" && Math.random() < 0.15,
      volunteerInterest: Math.random() < 0.08,
      voted: support === "strong_support" && Math.random() < 0.1,
      votedAt: support === "strong_support" && Math.random() < 0.1 ? randDate(2) : null,
      issues: Math.random() < 0.4 ? [pick(ISSUES)] : [],
      notes: Math.random() < 0.15 ? pick([
        "Very friendly, wants to help", "Concerned about transit on Queen St",
        "Has a dog", "Needs ride to polling station", "Speaks Mandarin",
        "Asked for call from candidate", "Apartment building — buzzer code 4521",
        "Works late — try after 7pm", "Has opposition sign in yard",
        "Just moved to neighbourhood", "Long-time resident, knows everyone",
      ]) : null,
      source: pick(["canvass", "import", "web", "event", "referral"]),
      createdAt: randDate(90),
    });
  }

  // Batch insert in chunks of 500
  for (let i = 0; i < contactData.length; i += 500) {
    await prisma.contact.createMany({ data: contactData.slice(i, i + 500), skipDuplicates: true });
    process.stdout.write(`  ${Math.min(i + 500, contactData.length)} / ${contactData.length}\r`);
  }
  console.log(`  ✅ ${contactData.length} contacts created`);

  // ─── 2. Create interactions ─────────────────────────────────────────────
  console.log("\n🚪 Creating 2,500 interactions...");

  const contacts = await prisma.contact.findMany({
    where: { campaignId, lastContactedAt: { not: null } },
    select: { id: true },
    take: 2500,
  });

  const interactionData = contacts.map((c) => ({
    contactId: c.id,
    userId,
    type: pick(["door_knock", "door_knock", "door_knock", "phone_call", "phone_call", "note"]) as any,
    notes: Math.random() < 0.3 ? pick(["Good conversation", "Not interested", "Wants lawn sign", "Will volunteer", "Undecided — follow up"]) : null,
    createdAt: randDate(60),
  }));

  for (let i = 0; i < interactionData.length; i += 500) {
    await prisma.interaction.createMany({ data: interactionData.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`  ✅ ${interactionData.length} interactions created`);

  // ─── 3. Create donations ────────────────────────────────────────────────
  console.log("\n💰 Creating 150 donations...");

  const donorContacts = await prisma.contact.findMany({
    where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] } },
    select: { id: true },
    take: 150,
  });

  const donationData = donorContacts.map((c) => ({
    campaignId,
    contactId: c.id,
    recordedById: userId,
    amount: pick([25, 50, 50, 100, 100, 100, 200, 250, 500, 1200]),
    method: pick(["cheque", "e-transfer", "credit", "cash", "online"]),
    status: "received" as any,
    createdAt: randDate(60),
  }));

  await prisma.donation.createMany({ data: donationData, skipDuplicates: true });
  console.log(`  ✅ ${donationData.length} donations ($${donationData.reduce((s, d) => s + d.amount, 0).toLocaleString()} total)`);

  // ─── 4. Create events ───────────────────────────────────────────────────
  console.log("\n📅 Creating 8 events...");

  const eventData = [
    { name: "Campaign Launch BBQ", location: "Withrow Park", eventDate: daysAgo(-7) },
    { name: "Town Hall — Transit", location: "Ralph Thornton Community Centre", eventDate: daysAgo(-14) },
    { name: "Canvass Launch — Oak Street", location: "Campaign Office", eventDate: daysAgo(-3) },
    { name: "Fundraiser Dinner", location: "Terroni, Queen East", eventDate: daysAgo(-21) },
    { name: "Volunteer Appreciation Night", location: "Campaign Office", eventDate: daysAgo(-10) },
    { name: "Door Knock Blitz — Broadview", location: "Broadview & Gerrard", eventDate: daysAgo(-1) },
    { name: "All-Candidates Debate", location: "East York Civic Centre", eventDate: daysAgo(-28) },
    { name: "Election Night Party", location: "The Broadview Hotel", eventDate: daysAgo(-60) },
  ];

  for (const e of eventData) {
    await prisma.event.create({
      data: {
        campaignId,
        name: e.name,
        location: e.location,
        eventDate: e.eventDate,
        status: "published" as any,
        visibility: "internal" as any,
        isPublic: false,
      },
    }).catch(() => {}); // skip if exists
  }
  console.log(`  ✅ 8 events created`);

  // ─── 5. Create budget items ─────────────────────────────────────────────
  console.log("\n📊 Creating budget items...");

  const budgetItems = [
    { category: "Printing", amount: 2500, description: "Lawn signs — 200 units" },
    { category: "Printing", amount: 800, description: "Door hangers — 5,000 units" },
    { category: "Printing", amount: 350, description: "Palm cards — 2,000 units" },
    { category: "Events", amount: 1200, description: "Campaign launch BBQ catering" },
    { category: "Events", amount: 600, description: "Town hall venue rental" },
    { category: "Communications", amount: 150, description: "Email platform — 3 months" },
    { category: "Office", amount: 400, description: "Campaign office supplies" },
    { category: "Advertising", amount: 500, description: "Social media ads — May" },
    { category: "Transportation", amount: 200, description: "Canvasser gas reimbursements" },
  ];

  for (const item of budgetItems) {
    await prisma.budgetItem.create({
      data: {
        campaignId,
        itemType: "expense",
        category: item.category,
        amount: item.amount,
        description: item.description,
        status: "approved" as any,
        createdAt: randDate(45),
      },
    }).catch(() => {});
  }
  console.log(`  ✅ ${budgetItems.length} budget items ($${budgetItems.reduce((s, b) => s + b.amount, 0).toLocaleString()} total expenses)`);

  // ─── 6. Create tasks ────────────────────────────────────────────────────
  console.log("\n📝 Creating tasks...");

  const tasks = [
    { title: "Order lawn signs — 200 units", priority: "high", status: "completed" },
    { title: "Set up turf for Oak Street", priority: "high", status: "completed" },
    { title: "Call top 20 donors for fundraiser", priority: "high", status: "pending" },
    { title: "Send thank-you notes to volunteers", priority: "medium", status: "pending" },
    { title: "Update candidate bio on website", priority: "medium", status: "completed" },
    { title: "Book town hall venue for September", priority: "medium", status: "pending" },
    { title: "Print door hangers — second batch", priority: "low", status: "pending" },
    { title: "Upload latest voters list update", priority: "high", status: "pending", dueDate: daysAgo(3) },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        campaignId,
        title: t.title,
        priority: t.priority as any,
        status: t.status as any,
        createdById: userId,
        dueDate: (t as any).dueDate ?? daysAgo(-rand(1, 14)),
      },
    }).catch(() => {});
  }
  console.log(`  ✅ ${tasks.length} tasks created`);

  // ─── 7. Activity log entries ────────────────────────────────────────────
  console.log("\n📋 Creating activity log entries...");

  const activities = [
    { action: "smart_import_execute", entityType: "campaign", details: { importedCount: 4200, filename: "ward20-voters.csv" } },
    { action: "canvass_debrief", entityType: "canvass_debrief", details: { feeling: "great", doorsKnocked: 47, bestMoment: "Sarah on Oak Street switched to supporter after transit conversation" } },
    { action: "canvass_debrief", entityType: "canvass_debrief", details: { feeling: "tough", doorsKnocked: 23, streetsNeedFollowUp: "4th Avenue felt hostile. Three opposition signs in a row." } },
    { action: "canvass_debrief", entityType: "canvass_debrief", details: { feeling: "good", doorsKnocked: 35, bestMoment: "Got 3 volunteer signups on Broadview" } },
    { action: "brand_updated", entityType: "Campaign", details: { primaryColor: "#1e40af" } },
    { action: "gotv_upload_voted_list", entityType: "GOTV", details: { matched: 47, unmatched: 3, filename: "advance-voted.csv" } },
  ];

  for (const a of activities) {
    await prisma.activityLog.create({
      data: { campaignId, userId, action: a.action, entityType: a.entityType, entityId: campaignId, details: a.details as object, createdAt: randDate(30) },
    }).catch(() => {});
  }
  console.log(`  ✅ ${activities.length} activity entries created`);

  // ─── Summary ────────────────────────────────────────────────────────────
  const totalContacts = await prisma.contact.count({ where: { campaignId } });
  const totalSupporters = await prisma.contact.count({ where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] } } });
  const totalInteractions = await prisma.interaction.count({ where: { contact: { campaignId } } });
  const totalDonations = await prisma.donation.count({ where: { campaignId } });

  console.log("\n" + "=".repeat(50));
  console.log("🎉 WARD 20 DEMO SEED COMPLETE");
  console.log("=".repeat(50));
  console.log(`  Contacts:     ${totalContacts.toLocaleString()}`);
  console.log(`  Supporters:   ${totalSupporters.toLocaleString()} (${Math.round(totalSupporters / totalContacts * 100)}%)`);
  console.log(`  Interactions:  ${totalInteractions.toLocaleString()}`);
  console.log(`  Donations:    ${totalDonations}`);
  console.log(`  Events:       8`);
  console.log(`  Tasks:        ${tasks.length}`);
  console.log("");
  console.log("Every page in Poll City now has real data.");
  console.log("Run: npm run build && npm start");
  console.log("Visit: /dashboard, /contacts, /gotv, /briefing, /analytics");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
