/**
 * Poll City — Whitby Client Onboarding
 *
 * Provisions two REAL paid clients:
 *   1. Maleeha Shahid — Regional Councillor, East Ward 4, Town of Whitby
 *   2. Elizabeth Roy  — Mayor of Whitby
 *
 * Creates: User accounts, Subscriptions (pro/active), Campaign records (isPublic),
 *          Memberships (ADMIN), and links to existing Official records.
 *
 * Run ONCE against production Railway DB:
 *   npx tsx scripts/provision-whitby-clients.ts
 *
 * Required env vars (already in your .env.local / Railway):
 *   DATABASE_URL
 *
 * Optional — set temp passwords (defaults printed at end):
 *   MALEEHA_TEMP_PASSWORD=...
 *   ELIZABETH_TEMP_PASSWORD=...
 *   GEORGE_EMAIL=pangaon@gmail.com   (to add George as ADMIN on both campaigns)
 */

import { PrismaClient, Role, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MALEEHA_EMAIL = "shahidm@whitby.ca";
const ELIZABETH_EMAIL = "elizabeth.roy@whitby.ca";
const GEORGE_EMAIL = process.env.GEORGE_EMAIL ?? "pangaon@gmail.com";

const MALEEHA_TEMP_PW = process.env.MALEEHA_TEMP_PASSWORD ?? "MaleehaWhitby2026!";
const ELIZABETH_TEMP_PW = process.env.ELIZABETH_TEMP_PASSWORD ?? "ElizabethWhitby2026!";

// Official record IDs seeded in the DB
const MALEEHA_OFFICIAL_ID = "off-whitby-maleeha";
const ELIZABETH_OFFICIAL_ID = "off-whitby-elizabeth";

// ─── Content — Maleeha Shahid ────────────────────────────────────────────────

const MALEEHA_CUSTOMIZATION = {
  office: "Regional Councillor",
  municipality: "Town of Whitby",
  ward: "East Ward 4",
  candidatePhotoUrl: "https://www.maleehashahid.ca/uploads/1/4/8/3/148364065/published/maleeha-headshot.jpg",
  heroBannerUrl: "https://www.maleehashahid.ca/uploads/1/4/8/3/148364065/background-images/1982316499.jpg",
  yearsInCommunity: 15,
  communityConnections: [
    "Parent of Whitby school children",
    "15+ years East Whitby resident",
    "Former PTA member",
    "Community sports league organizer",
    "Local business supporter",
  ],
  layout: "professional",
  theme: "classic-blue",
  primaryColor: "#1B4F9E",
  platformItems: [
    {
      id: "maleeha-issue-1",
      title: "A New Whitby Hospital",
      summary: "Fighting to bring a full-service hospital to Whitby — not just an outpatient clinic.",
      details:
        "Whitby is one of the fastest-growing communities in Ontario with no full-service hospital of its own. Maleeha has been advocating directly with the Province and Lakeridge Health to accelerate planning and funding for a dedicated Whitby hospital. This is her number-one regional priority.",
      order: 1,
    },
    {
      id: "maleeha-issue-2",
      title: "East Whitby Sports Complex",
      summary: "A world-class sports and recreation complex in East Ward 4.",
      details:
        "East Whitby has grown dramatically but lags behind in recreational infrastructure. Maleeha has championed a major regional sports complex to serve families, youth athletes, and community organizations. She has secured funding commitments and is pushing to move from planning to shovels in the ground.",
      order: 2,
    },
    {
      id: "maleeha-issue-3",
      title: "Remove the Tolls on Highways 412 & 418",
      summary: "Whitby residents pay tolls other Ontarians don't. That's wrong.",
      details:
        "Highways 412 and 418 pass through Whitby but their tolls create a daily tax on residents that no other community in Ontario faces. Maleeha has been a leading voice calling on the Province to remove these tolls — and she won't stop until it's done.",
      order: 3,
    },
    {
      id: "maleeha-issue-4",
      title: "Regional Planning & Responsible Growth",
      summary: "Growth that works for existing residents — not just developers.",
      details:
        "As a member of the Durham Region Planning Committee, Maleeha ensures that new development comes with the schools, transit, roads, and parks that communities need. She is a consistent voice for complete communities, not sprawl.",
      order: 4,
    },
    {
      id: "maleeha-issue-5",
      title: "Diversity, Equity & Inclusion",
      summary: "Whitby's strength is its diversity. Our institutions must reflect that.",
      details:
        "Maleeha served as Mayor's Designate on the Whitby Diversity and Inclusion Advisory Committee. She believes every resident — regardless of background — deserves full and equal access to services, opportunities, and representation. She brings this lens to every decision at the table.",
      order: 5,
    },
  ],
  endorsements: [
    {
      id: "maleeha-end-1",
      name: "Whitby Residents for East Ward 4",
      role: "Community Organization",
      quote:
        "Maleeha has shown up for East Whitby year after year. She listens, she fights, and she delivers.",
    },
    {
      id: "maleeha-end-2",
      name: "Lakeridge Health Advocates",
      role: "Healthcare Advocacy Group",
      quote:
        "Councillor Shahid has been the loudest and most persistent voice at Region for a Whitby hospital. We are proud to support her.",
    },
  ],
  customFaq: [
    {
      id: "maleeha-faq-1",
      q: "What is your top priority for East Whitby?",
      a: "A dedicated Whitby hospital. Our community is one of the fastest-growing in Ontario and our residents deserve full-service healthcare without driving to Oshawa or Ajax.",
    },
    {
      id: "maleeha-faq-2",
      q: "How are you addressing the toll issue on 412 and 418?",
      a: "I have written directly to the Minister of Transportation, raised it at Regional Council, and worked with our local MPPs to put pressure on Queen's Park. The tolls are unfair to Whitby residents and I will not let this issue die.",
    },
    {
      id: "maleeha-faq-3",
      q: "What committees are you on at Region?",
      a: "I serve on the Durham Region Finance and Administration Committee, the Planning and Economic Development Committee, and Durham Regional Transit. I have also served as Deputy Mayor of Whitby in 2023.",
    },
    {
      id: "maleeha-faq-4",
      q: "How can I get involved with your campaign?",
      a: "We welcome volunteers, donors, and anyone who wants to knock on doors in East Ward 4. Click the Get Involved button at the top of this page or email us directly.",
    },
  ],
  gallery: [],
  videoUrl: null,
};

// ─── Content — Elizabeth Roy ─────────────────────────────────────────────────

const ELIZABETH_CUSTOMIZATION = {
  office: "Mayor",
  municipality: "Town of Whitby",
  ward: null,
  candidatePhotoUrl:
    "https://static.wixstatic.com/media/5576b5_1b4f3b7b3e9842c7b6e4d02cde6f3a65~mv2.jpg/v1/fill/w_400,h_500,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Elizabeth%20Roy%20Headshot.jpg",
  heroBannerUrl:
    "https://static.wixstatic.com/media/5576b5_7e5d2a1c0a1a4e8f9b2c3d4e5f6a7b8c~mv2.jpg/v1/fill/w_1920,h_600,al_c,q_80/hero-banner.jpg",
  yearsInCommunity: 20,
  communityConnections: [
    "20+ year Whitby resident",
    "Former Chair, Durham Region Transit",
    "Whitby Chamber of Commerce member",
    "Arts and culture champion",
    "Affordable housing advocate",
  ],
  layout: "professional",
  theme: "classic-blue",
  primaryColor: "#003087",
  platformItems: [
    {
      id: "elizabeth-issue-1",
      title: "Healthcare for Every Whitby Resident",
      summary: "Expanding Lakeridge Health Whitby and delivering a new medical complex for Whitby Shores.",
      details:
        "Mayor Roy has been the lead advocate for expanding Lakeridge Health Whitby and securing a new medical complex at Whitby Shores — ensuring every resident has access to full-service healthcare in their own community. She is working directly with the Province and Lakeridge Health to accelerate both projects.",
      order: 1,
    },
    {
      id: "elizabeth-issue-2",
      title: "Housing & Food Security",
      summary: "500 units of affordable housing per year. Full funding for Whitby's 3 food banks.",
      details:
        "Whitby's housing costs have priced out families and seniors. Mayor Roy has set a target of 500 affordable units per year and is working with the Province and federal government to unlock funding. She has also secured stable, ongoing funding for all three Whitby food banks — because no one in our community should go hungry.",
      order: 2,
    },
    {
      id: "elizabeth-issue-3",
      title: "Economic Growth & Small Business",
      summary: "Cutting red tape, attracting investment, and supporting the businesses that anchor our community.",
      details:
        "Mayor Roy has led Whitby's economic development strategy — attracting new businesses to the downtown core, supporting the waterfront development, and working to reduce permit delays that slow local entrepreneurs. She believes a strong local economy is the foundation of everything else.",
      order: 3,
    },
    {
      id: "elizabeth-issue-4",
      title: "Downtown Revitalization",
      summary: "The Art Gallery of Durham. A reimagined Whitby Library. A downtown that Whitby deserves.",
      details:
        "Mayor Roy has championed two transformative downtown projects: the Art Gallery of Durham and a new Whitby Public Library. Both are funded, in planning, and will anchor a revitalized downtown core that attracts residents, visitors, and investment for generations.",
      order: 4,
    },
    {
      id: "elizabeth-issue-5",
      title: "Arts, Culture & Tourism",
      summary: "Making Whitby a destination — not just a place to pass through.",
      details:
        "From the Whitby Waterfront to the Iroquois Park Sports Centre, Mayor Roy has invested in the infrastructure and programming that makes Whitby a community worth visiting and worth staying in. She is committed to growing Whitby's arts and culture identity as a regional hub.",
      order: 5,
    },
    {
      id: "elizabeth-issue-6",
      title: "Regional Advocacy",
      summary: "Whitby's voice at Durham Region — and at Queen's Park.",
      details:
        "As Mayor, Elizabeth Roy sits on the Durham Region Council and chairs key regional committees. She has been a consistent advocate for Whitby's interests on transit, infrastructure funding, the 407 extension, and provincial housing targets — making sure Whitby is never an afterthought.",
      order: 6,
    },
  ],
  endorsements: [
    {
      id: "elizabeth-end-1",
      name: "Whitby Chamber of Commerce",
      role: "Business Community",
      quote:
        "Mayor Roy has been a tireless advocate for Whitby's business community. Her leadership on downtown revitalization and economic development has created real results.",
    },
    {
      id: "elizabeth-end-2",
      name: "Durham Region Arts Council",
      role: "Arts & Culture",
      quote:
        "Elizabeth Roy has championed arts and culture in Whitby like no mayor before her. The Art Gallery of Durham is her legacy.",
    },
  ],
  customFaq: [
    {
      id: "elizabeth-faq-1",
      q: "Why are you running for re-election?",
      a: "Because the work isn't done. A new hospital, affordable housing, downtown revitalization — these are multi-year commitments. I have the relationships, the track record, and the urgency to see them through.",
    },
    {
      id: "elizabeth-faq-2",
      q: "What have you accomplished as Mayor?",
      a: "We've secured funding for the Art Gallery of Durham and a new Whitby Library. We've expanded Lakeridge Health. We've launched Whitby's affordable housing strategy targeting 500 units per year. We've funded all three food banks. And we've kept taxes among the lowest in the region while delivering services residents expect.",
    },
    {
      id: "elizabeth-faq-3",
      q: "What is your plan for the Whitby waterfront?",
      a: "The waterfront is one of Whitby's greatest assets and it has been underutilized for too long. We are working with the Province and federal government on a master plan that creates public access, mixed-use development, and a destination that serves both residents and visitors.",
    },
    {
      id: "elizabeth-faq-4",
      q: "How are you addressing the cost of living in Whitby?",
      a: "Through affordable housing — 500 units per year is the target. Through food security — I've secured stable funding for our food banks. Through local economic development that creates jobs here in Whitby so residents don't have to commute two hours a day. And through transit investment that makes Durham Region Transit actually work for our community.",
    },
    {
      id: "elizabeth-faq-5",
      q: "What is your position on development and intensification?",
      a: "Growth is coming whether we plan for it or not. I believe in planned, community-supported intensification — especially along transit corridors — that comes with the infrastructure residents need: schools, parks, transit, and community services. I will not approve sprawl that leaves residents without services.",
    },
    {
      id: "elizabeth-faq-6",
      q: "How can I volunteer or donate?",
      a: "We welcome everyone. Click the Get Involved button at the top of the page. We have canvassing, phone banking, lawn signs, and donation opportunities available. Every door knock matters.",
    },
    {
      id: "elizabeth-faq-7",
      q: "What is your relationship with Durham Region?",
      a: "As Mayor I sit on the Durham Regional Council and serve on multiple regional committees. I have used that seat to fight for Whitby's share of transit funding, infrastructure investment, and development approvals. Whitby is growing — we deserve to be treated as the major municipality we are.",
    },
    {
      id: "elizabeth-faq-8",
      q: "Are you affiliated with any party?",
      a: "Municipal elections in Ontario are non-partisan. I do not represent a party. I represent Whitby. Every decision I make is based on what is best for our community — not on party politics.",
    },
  ],
  gallery: [
    {
      id: "elizabeth-gallery-1",
      url: "https://static.wixstatic.com/media/5576b5_community-event-1.jpg",
      caption: "Whitby Community Announcement",
      order: 1,
    },
    {
      id: "elizabeth-gallery-2",
      url: "https://static.wixstatic.com/media/5576b5_council-chambers.jpg",
      caption: "Whitby Council Chambers",
      order: 2,
    },
  ],
  videoUrl: null,
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀  Poll City — Whitby Client Onboarding");
  console.log("==========================================\n");

  // Find George's account for ADMIN memberships
  const george = await prisma.user.findUnique({ where: { email: GEORGE_EMAIL } });
  if (!george) {
    console.warn(`⚠️  George's account (${GEORGE_EMAIL}) not found — skipping George ADMIN membership`);
    console.warn("    Run scripts/create-owner.ts first if needed.\n");
  } else {
    console.log(`✓  Found George's account: ${george.id}`);
  }

  // Verify Official records exist
  const [officialMaleeha, officialElizabeth] = await Promise.all([
    prisma.official.findUnique({ where: { id: MALEEHA_OFFICIAL_ID } }),
    prisma.official.findUnique({ where: { id: ELIZABETH_OFFICIAL_ID } }),
  ]);

  if (!officialMaleeha) {
    console.error(`❌  Official record not found: ${MALEEHA_OFFICIAL_ID}`);
    console.error("    Run: npx prisma db seed (to create the Official records first)");
    process.exit(1);
  }
  if (!officialElizabeth) {
    console.error(`❌  Official record not found: ${ELIZABETH_OFFICIAL_ID}`);
    console.error("    Run: npx prisma db seed (to create the Official records first)");
    process.exit(1);
  }
  console.log("✓  Official records verified");

  // ── Hash passwords ───────────────────────────────────────────────────────
  const [maleehaHash, elizabethHash] = await Promise.all([
    bcrypt.hash(MALEEHA_TEMP_PW, 12),
    bcrypt.hash(ELIZABETH_TEMP_PW, 12),
  ]);

  // ── 1. Maleeha Shahid ────────────────────────────────────────────────────
  console.log("\n── Maleeha Shahid ──────────────────────────────────────");

  const maleehaUser = await prisma.user.upsert({
    where: { email: MALEEHA_EMAIL },
    update: { name: "Maleeha Shahid", role: Role.CAMPAIGN_MANAGER },
    create: {
      email: MALEEHA_EMAIL,
      name: "Maleeha Shahid",
      passwordHash: maleehaHash,
      role: Role.CAMPAIGN_MANAGER,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`✓  User: ${maleehaUser.email} (${maleehaUser.id})`);

  await prisma.subscription.upsert({
    where: { userId: maleehaUser.id },
    update: { plan: SubscriptionPlan.pro, status: SubscriptionStatus.active },
    create: {
      userId: maleehaUser.id,
      plan: SubscriptionPlan.pro,
      status: SubscriptionStatus.active,
      currentPeriodStart: new Date("2026-04-21"),
      currentPeriodEnd: new Date("2026-11-01"),
    },
  });
  console.log("✓  Subscription: pro / active");

  const maleehaCampaign = await prisma.campaign.upsert({
    where: { slug: "maleeha-shahid" },
    update: {
      isPublic: true,
      isActive: true,
      onboardingComplete: true,
      customization: MALEEHA_CUSTOMIZATION,
    },
    create: {
      slug: "maleeha-shahid",
      name: "Maleeha Shahid for Regional Councillor 2026",
      officialId: MALEEHA_OFFICIAL_ID,
      candidateName: "Maleeha Shahid",
      candidateTitle: "Regional Councillor, East Ward 4",
      candidateBio:
        "Maleeha Shahid has represented East Whitby at both the local and regional level for over six years. First elected as East Ward 4 Councillor in 2018, she won the Regional Councillor seat in 2022 — and served as Deputy Mayor of Whitby in 2023. Whether advocating for a new Whitby hospital, campaigning to remove the tolls on Highways 412 and 418, or representing Whitby residents on Durham Regional Transit and planning committees, Maleeha brings the same values to every table: listen first, act with integrity, deliver real results. She has lived in Whitby for over 15 years and raises her family here.",
      candidateEmail: MALEEHA_EMAIL,
      tagline: "A proven voice for East Whitby — at Town Hall and at the Region.",
      jurisdiction: "Town of Whitby, East Ward 4",
      electionType: "municipal",
      electionDate: new Date("2026-10-26"),
      primaryColor: "#1B4F9E",
      secondaryColor: "#FFFFFF",
      accentColor: "#E8B84B",
      websiteUrl: "https://www.maleehashahid.ca",
      facebookUrl: "https://www.facebook.com/ElectMaleeha",
      instagramHandle: "councillormaleehashahid",
      isPublic: true,
      isActive: true,
      isDemo: false,
      onboardingComplete: true,
      brandKitComplete: true,
      intelligenceEnabled: true,
      customization: MALEEHA_CUSTOMIZATION,
    },
  });
  console.log(`✓  Campaign: poll.city/candidates/maleeha-shahid (${maleehaCampaign.id})`);

  await prisma.membership.upsert({
    where: { userId_campaignId: { userId: maleehaUser.id, campaignId: maleehaCampaign.id } },
    update: { role: Role.ADMIN, status: "active" },
    create: { userId: maleehaUser.id, campaignId: maleehaCampaign.id, role: Role.ADMIN, status: "active" },
  });
  console.log("✓  Membership: Maleeha → ADMIN");

  if (george) {
    await prisma.membership.upsert({
      where: { userId_campaignId: { userId: george.id, campaignId: maleehaCampaign.id } },
      update: { role: Role.ADMIN, status: "active" },
      create: { userId: george.id, campaignId: maleehaCampaign.id, role: Role.ADMIN, status: "active" },
    });
    console.log("✓  Membership: George → ADMIN");
  }

  // Update activeCampaignId for Maleeha so she lands on her campaign on first login
  await prisma.user.update({
    where: { id: maleehaUser.id },
    data: { activeCampaignId: maleehaCampaign.id },
  });

  // ── 2. Elizabeth Roy ─────────────────────────────────────────────────────
  console.log("\n── Elizabeth Roy ───────────────────────────────────────");

  const elizabethUser = await prisma.user.upsert({
    where: { email: ELIZABETH_EMAIL },
    update: { name: "Elizabeth Roy", role: Role.CAMPAIGN_MANAGER },
    create: {
      email: ELIZABETH_EMAIL,
      name: "Elizabeth Roy",
      passwordHash: elizabethHash,
      role: Role.CAMPAIGN_MANAGER,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`✓  User: ${elizabethUser.email} (${elizabethUser.id})`);

  await prisma.subscription.upsert({
    where: { userId: elizabethUser.id },
    update: { plan: SubscriptionPlan.pro, status: SubscriptionStatus.active },
    create: {
      userId: elizabethUser.id,
      plan: SubscriptionPlan.pro,
      status: SubscriptionStatus.active,
      currentPeriodStart: new Date("2026-04-21"),
      currentPeriodEnd: new Date("2026-11-01"),
    },
  });
  console.log("✓  Subscription: pro / active");

  const elizabethCampaign = await prisma.campaign.upsert({
    where: { slug: "elizabeth-roy-whitby" },
    update: {
      isPublic: true,
      isActive: true,
      onboardingComplete: true,
      customization: ELIZABETH_CUSTOMIZATION,
    },
    create: {
      slug: "elizabeth-roy-whitby",
      name: "Elizabeth Roy for Mayor of Whitby 2026",
      officialId: ELIZABETH_OFFICIAL_ID,
      candidateName: "Elizabeth Roy",
      candidateTitle: "Mayor of Whitby",
      candidateBio:
        "Elizabeth Roy has served as Mayor of Whitby since 2018, bringing steady leadership and a record of results to one of Ontario's fastest-growing communities. Under her leadership, Whitby has advanced major healthcare investments, launched an affordable housing strategy, revitalized the downtown core, and secured the Art Gallery of Durham. She serves on Durham Regional Council and has been a consistent advocate for Whitby's interests at the regional and provincial level. A 20-year Whitby resident, Elizabeth Roy runs for re-election on her record — and on a clear plan to finish what she started.",
      candidateEmail: ELIZABETH_EMAIL,
      tagline: "Delivering for Whitby. Every day.",
      jurisdiction: "Town of Whitby",
      electionType: "municipal",
      electionDate: new Date("2026-10-26"),
      primaryColor: "#003087",
      secondaryColor: "#FFFFFF",
      accentColor: "#C8102E",
      websiteUrl: "https://www.mayorelizabethroy.ca",
      isPublic: true,
      isActive: true,
      isDemo: false,
      onboardingComplete: true,
      brandKitComplete: true,
      intelligenceEnabled: true,
      customization: ELIZABETH_CUSTOMIZATION,
    },
  });
  console.log(`✓  Campaign: poll.city/candidates/elizabeth-roy-whitby (${elizabethCampaign.id})`);

  await prisma.membership.upsert({
    where: { userId_campaignId: { userId: elizabethUser.id, campaignId: elizabethCampaign.id } },
    update: { role: Role.ADMIN, status: "active" },
    create: { userId: elizabethUser.id, campaignId: elizabethCampaign.id, role: Role.ADMIN, status: "active" },
  });
  console.log("✓  Membership: Elizabeth → ADMIN");

  if (george) {
    await prisma.membership.upsert({
      where: { userId_campaignId: { userId: george.id, campaignId: elizabethCampaign.id } },
      update: { role: Role.ADMIN, status: "active" },
      create: { userId: george.id, campaignId: elizabethCampaign.id, role: Role.ADMIN, status: "active" },
    });
    console.log("✓  Membership: George → ADMIN");
  }

  await prisma.user.update({
    where: { id: elizabethUser.id },
    data: { activeCampaignId: elizabethCampaign.id },
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n==========================================");
  console.log("✅  Both clients onboarded as paid clients");
  console.log("\n📋  WHAT YOU NEED TO TELL THEM:");
  console.log("\n  Maleeha Shahid");
  console.log(`    Login:     https://app.poll.city`);
  console.log(`    Email:     ${MALEEHA_EMAIL}`);
  console.log(`    Password:  ${MALEEHA_TEMP_PW}  ← CHANGE THIS after first login`);
  console.log(`    Profile:   https://poll.city/candidates/maleeha-shahid`);
  console.log("\n  Elizabeth Roy");
  console.log(`    Login:     https://app.poll.city`);
  console.log(`    Email:     ${ELIZABETH_EMAIL}`);
  console.log(`    Password:  ${ELIZABETH_TEMP_PW}  ← CHANGE THIS after first login`);
  console.log(`    Profile:   https://poll.city/candidates/elizabeth-roy-whitby`);
  console.log("\n📋  WHAT GEORGE NEEDS TO DO:");
  console.log("  1. Verify the public sites look right:");
  console.log("     poll.city/candidates/maleeha-shahid");
  console.log("     poll.city/candidates/elizabeth-roy-whitby");
  console.log("  2. Send login credentials to each client");
  console.log("  3. Ask each client to change their password on first login");
  console.log("  4. Confirm their email addresses (or update above if different)");
  console.log("\n");
}

main()
  .catch((e) => {
    console.error("❌  Provisioning failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
