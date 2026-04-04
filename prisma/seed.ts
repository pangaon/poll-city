import {
  PrismaClient, Role, SupportLevel, ElectionType, InteractionType,
  TaskStatus, TaskPriority, GovernmentLevel, PollType, PollVisibility,
  SignStatus, SupportSignalType
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Poll City full ecosystem...\n");
  const passwordHash = await bcrypt.hash("password123", 12);

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@pollcity.dev" }, update: {},
    create: { email: "admin@pollcity.dev", name: "Alex Admin", passwordHash, role: Role.ADMIN, phone: "416-555-0100", postalCode: "M4C 1A1", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@pollcity.dev" }, update: {},
    create: { email: "manager@pollcity.dev", name: "Morgan Manager", passwordHash, role: Role.CAMPAIGN_MANAGER, phone: "416-555-0101", postalCode: "M4C 2B2", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  const volunteer1 = await prisma.user.upsert({
    where: { email: "volunteer@pollcity.dev" }, update: {},
    create: { email: "volunteer@pollcity.dev", name: "Val Volunteer", passwordHash, role: Role.VOLUNTEER, phone: "416-555-0102", postalCode: "M4J 1C3", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  const publicUser = await prisma.user.upsert({
    where: { email: "voter@pollcity.dev" }, update: {},
    create: { email: "voter@pollcity.dev", name: "Pat Public", passwordHash, role: Role.PUBLIC_USER, postalCode: "M4C 3D4", ward: "Ward 12", riding: "Toronto—Danforth", emailVerified: true },
  });
  console.log("✅ Users created (4)");

  // ── Geo Districts ──────────────────────────────────────────────────────────
  const geoRows = [
    { postalPrefix: "M4C", ward: "Ward 12", wardCode: "W12", riding: "Toronto—Danforth", ridingCode: "ON-15", province: "ON", city: "Toronto", level: GovernmentLevel.municipal },
    { postalPrefix: "M4C", ward: null, wardCode: null, riding: "Toronto—Danforth", ridingCode: "ON-15", province: "ON", city: "Toronto", level: GovernmentLevel.federal },
    { postalPrefix: "M4J", ward: "Ward 14", wardCode: "W14", riding: "Toronto—Danforth", ridingCode: "ON-15", province: "ON", city: "Toronto", level: GovernmentLevel.municipal },
    { postalPrefix: "M4J", ward: null, wardCode: null, riding: "Toronto—Danforth", ridingCode: "ON-15", province: "ON", city: "Toronto", level: GovernmentLevel.federal },
    { postalPrefix: "K1A", ward: "Somerset", wardCode: "W14", riding: "Ottawa Centre", ridingCode: "ON-48", province: "ON", city: "Ottawa", level: GovernmentLevel.municipal },
  ];
  for (const g of geoRows) {
    await prisma.geoDistrict.upsert({
      where: { postalPrefix_level: { postalPrefix: g.postalPrefix, level: g.level } },
      update: {}, create: g,
    });
  }
  console.log("✅ Geo districts seeded");

  // ── Officials ──────────────────────────────────────────────────────────────
  const officialCouncil = await prisma.official.upsert({
    where: { id: "off-council-w12" }, update: {},
    create: { id: "off-council-w12", name: "Jamie Park", title: "City Councillor", level: GovernmentLevel.municipal, district: "Ward 12", districtCode: "W12", party: "Independent", email: "jpark.ward12@toronto.ca", phone: "416-392-1240", bio: "Jamie Park has served Ward 12 since 2018, focusing on transit, housing, and community safety.", postalCodes: ["M4C", "M4J", "M4B"], province: "ON", subscriptionStatus: "verified", claimedAt: new Date() },
  });
  const officialMP = await prisma.official.upsert({
    where: { id: "off-mp-todan" }, update: {},
    create: { id: "off-mp-todan", name: "Chris Adeyemi", title: "Member of Parliament", level: GovernmentLevel.federal, district: "Toronto—Danforth", districtCode: "ON-15", party: "Liberal", email: "chris.adeyemi@parl.gc.ca", phone: "416-467-0860", bio: "Chris Adeyemi represents Toronto—Danforth federally with a focus on housing, climate, and social policy.", postalCodes: ["M4C", "M4J", "M4K", "M4E", "M4B"], province: "ON", subscriptionStatus: "pro", claimedAt: new Date() },
  });
  await prisma.official.upsert({
    where: { id: "off-mpp-todan" }, update: {},
    create: { id: "off-mpp-todan", name: "Priya Nair", title: "Member of Provincial Parliament", level: GovernmentLevel.provincial, district: "Toronto—Danforth", districtCode: "ON-P-22", party: "NDP", email: "pnair.mpp@ontario.ca", bio: "Priya Nair serves as MPP for Toronto—Danforth with a focus on education, healthcare, and affordable housing.", postalCodes: ["M4C", "M4J", "M4K", "M4E"], province: "ON", subscriptionStatus: "free" },
  });
  console.log("✅ Officials seeded (3)");

  // ── Campaign ───────────────────────────────────────────────────────────────
  const campaign = await prisma.campaign.upsert({
    where: { slug: "ward-12-2026" }, update: {},
    create: { name: "Ward 12 — City Council 2026", slug: "ward-12-2026", description: "Municipal election campaign for Ward 12 City Council seat.", electionType: ElectionType.municipal, jurisdiction: "City of Toronto — Ward 12", electionDate: new Date("2026-10-26"), candidateName: "Sam Rivera", candidateTitle: "Candidate for City Council, Ward 12", candidateBio: "Sam Rivera is a longtime Ward 12 resident with 15 years of experience in housing and transit advocacy.", candidateEmail: "sam@ward12campaign.ca", candidatePhone: "416-555-0200", primaryColor: "#1e40af" },
  });
  for (const { userId, role } of [{ userId: admin.id, role: Role.ADMIN }, { userId: manager.id, role: Role.CAMPAIGN_MANAGER }, { userId: volunteer1.id, role: Role.VOLUNTEER }]) {
    await prisma.membership.upsert({ where: { userId_campaignId: { userId, campaignId: campaign.id } }, update: {}, create: { userId, campaignId: campaign.id, role } });
  }
  console.log("✅ Campaign + memberships created");

  // Provision built-in field definitions for this campaign
  const BUILT_IN = [
    { key: "__support_level", label: "Support Level", category: "canvassing", showOnCard: true, showOnList: true },
    { key: "__gotv_status", label: "GOTV Status", category: "canvassing", showOnCard: true, showOnList: false },
    { key: "__follow_up", label: "Follow-up Needed", category: "canvassing", showOnCard: true, showOnList: true },
    { key: "__sign_requested", label: "Sign Requested", category: "canvassing", showOnCard: true, showOnList: true },
    { key: "__volunteer_interest", label: "Volunteer Interest", category: "canvassing", showOnCard: true, showOnList: true },
    { key: "__issues", label: "Issues", category: "canvassing", showOnCard: true, showOnList: false },
    { key: "__notes", label: "Notes", category: "canvassing", showOnCard: true, showOnList: false },
    { key: "__not_home", label: "Not Home", category: "canvassing", showOnCard: true, showOnList: false },
    { key: "__phone", label: "Phone", category: "contact_info", showOnCard: true, showOnList: true },
    { key: "__email", label: "Email", category: "contact_info", showOnCard: false, showOnList: true },
    { key: "__first_choice", label: "First Choice", category: "membership", showOnCard: true, showOnList: true },
    { key: "__second_choice", label: "Second Choice", category: "membership", showOnCard: true, showOnList: true },
  ];
  for (const f of BUILT_IN) {
    await prisma.campaignField.upsert({
      where: { campaignId_key: { campaignId: campaign.id, key: f.key } },
      update: {},
      create: { campaignId: campaign.id, key: f.key, label: f.label, fieldType: "text", category: f.category as any, showOnCard: f.showOnCard, showOnList: f.showOnList, isVisible: true, sortOrder: 0 },
    });
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  const tagDefs = [
    { name: "Transit", color: "#3b82f6" }, { name: "Housing", color: "#10b981" },
    { name: "Environment", color: "#84cc16" }, { name: "Safety", color: "#f59e0b" },
    { name: "Seniors", color: "#8b5cf6" }, { name: "Donor", color: "#ec4899" },
    { name: "Volunteer", color: "#06b6d4" }, { name: "Sign Request", color: "#f97316" },
  ];
  const tags: Record<string, { id: string }> = {};
  for (const t of tagDefs) {
    tags[t.name] = await prisma.tag.upsert({ where: { name_campaignId: { name: t.name, campaignId: campaign.id } }, update: {}, create: { ...t, campaignId: campaign.id } });
  }

  // ── Households & Contacts ──────────────────────────────────────────────────
  const h1 = await prisma.household.create({ data: { address1: "147 Maple Avenue", city: "Toronto", province: "ON", postalCode: "M4C 1B2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id } });
  const h2 = await prisma.household.create({ data: { address1: "89 Oak Street", city: "Toronto", province: "ON", postalCode: "M4J 3A9", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id } });

  const contactRows = [
    { nameTitle: "Ms.", firstName: "Jennifer", lastName: "Walsh", email: "jennifer.walsh@email.com", phone: "416-555-1001", address1: "147 Maple Avenue", city: "Toronto", province: "ON", postalCode: "M4C 1B2", ward: "Ward 12", supportLevel: SupportLevel.strong_support, issues: ["Transit", "Housing"], signRequested: true, volunteerInterest: true, notes: "Very enthusiastic. Willing to host a lawn sign and help with phone banking.", householdId: h1.id },
    { firstName: "David", lastName: "Walsh", email: "david.walsh@email.com", phone: "416-555-1002", address1: "147 Maple Avenue", city: "Toronto", province: "ON", postalCode: "M4C 1B2", ward: "Ward 12", supportLevel: SupportLevel.leaning_support, issues: ["Transit"], householdId: h1.id },
    { firstName: "Patricia", lastName: "Nguyen", email: "p.nguyen@mail.ca", phone: "416-555-1003", address1: "89 Oak Street", city: "Toronto", province: "ON", postalCode: "M4J 3A9", ward: "Ward 12", supportLevel: SupportLevel.undecided, issues: ["Housing", "Safety"], followUpNeeded: true, notes: "Concerned about Oak Street corridor. Needs follow-up.", householdId: h2.id },
    { firstName: "Marcus", lastName: "Thompson", email: "mthompson@gmail.com", phone: "416-555-1004", address1: "234 Birch Crescent", city: "Toronto", province: "ON", postalCode: "M4C 2K8", ward: "Ward 12", supportLevel: SupportLevel.strong_opposition, issues: ["Environment"] },
    { firstName: "Linda", lastName: "Osei", email: "linda.osei@hotmail.com", phone: "416-555-1005", address1: "412 Elm Drive", city: "Toronto", province: "ON", postalCode: "M4E 1P5", ward: "Ward 12", supportLevel: SupportLevel.strong_support, issues: ["Seniors", "Transit"], volunteerInterest: true },
    { firstName: "Carlos", lastName: "Reyes", email: "creyes@outlook.com", phone: "416-555-1006", address1: "78 Pine Boulevard", city: "Toronto", province: "ON", postalCode: "M4B 3R2", ward: "Ward 12", supportLevel: SupportLevel.leaning_opposition, issues: ["Safety", "Housing"], followUpNeeded: true },
    { firstName: "Sarah", lastName: "Kim", email: "s.kim@university.ca", phone: "416-555-1007", address1: "56 College Way", city: "Toronto", province: "ON", postalCode: "M4K 1T3", ward: "Ward 12", supportLevel: SupportLevel.strong_support, issues: ["Environment", "Transit"], volunteerInterest: true, signRequested: true },
    { firstName: "Robert", lastName: "Dasilva", phone: "416-555-1008", address1: "901 Cedar Lane", city: "Toronto", province: "ON", postalCode: "M4C 4S7", ward: "Ward 12", supportLevel: SupportLevel.unknown, followUpNeeded: true },
    { firstName: "Fatima", lastName: "Al-Hassan", email: "fatima.ah@gmail.com", phone: "416-555-1009", address1: "333 Spruce Road", city: "Toronto", province: "ON", postalCode: "M4J 2N6", ward: "Ward 12", supportLevel: SupportLevel.leaning_support, issues: ["Housing", "Seniors"], preferredLanguage: "ar", notes: "Prefers Arabic. Daughter translates at door." },
    { nameTitle: "Mr.", firstName: "Grant", lastName: "Morrison", email: "grant.morrison@business.ca", phone: "416-555-1010", address1: "1 Business Plaza Suite 400", city: "Toronto", province: "ON", postalCode: "M4W 1A5", ward: "Ward 12", supportLevel: SupportLevel.undecided, issues: ["Transit"], followUpNeeded: true, followUpDate: new Date(Date.now() + 3 * 86400000) },
  ];
  const contacts = [];
  for (const c of contactRows) {
    contacts.push(await prisma.contact.create({ data: { ...c, campaignId: campaign.id, lastContactedAt: new Date(Date.now() - Math.random() * 30 * 86400000) } }));
  }
  await prisma.contactTag.createMany({
    data: [
      { contactId: contacts[0].id, tagId: tags["Volunteer"].id }, { contactId: contacts[0].id, tagId: tags["Sign Request"].id },
      { contactId: contacts[4].id, tagId: tags["Volunteer"].id }, { contactId: contacts[6].id, tagId: tags["Volunteer"].id },
      { contactId: contacts[6].id, tagId: tags["Sign Request"].id },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ ${contacts.length} contacts, 2 households, tags`);

  // ── Interactions ───────────────────────────────────────────────────────────
  await prisma.interaction.createMany({
    data: [
      { contactId: contacts[0].id, userId: volunteer1.id, type: InteractionType.door_knock, notes: "Warm reception. Jennifer committed to lawn sign and wants to volunteer.", supportLevel: SupportLevel.strong_support, signRequested: true, volunteerInterest: true, createdAt: new Date(Date.now() - 7 * 86400000) },
      { contactId: contacts[2].id, userId: volunteer1.id, type: InteractionType.door_knock, notes: "Patricia undecided. Concerned about Oak Street development.", supportLevel: SupportLevel.undecided, followUpNeeded: true, createdAt: new Date(Date.now() - 5 * 86400000) },
      { contactId: contacts[2].id, userId: manager.id, type: InteractionType.phone_call, notes: "Follow-up call. Sam spoke to her directly. Moved to leaning support.", supportLevel: SupportLevel.leaning_support, createdAt: new Date(Date.now() - 2 * 86400000) },
      { contactId: contacts[5].id, userId: volunteer1.id, type: InteractionType.door_knock, notes: "Carlos concerned about safety near school. Left literature.", supportLevel: SupportLevel.leaning_opposition, followUpNeeded: true, createdAt: new Date(Date.now() - 10 * 86400000) },
    ],
  });

  // ── Signs ──────────────────────────────────────────────────────────────────
  await prisma.sign.createMany({
    data: [
      { campaignId: campaign.id, contactId: contacts[0].id, address1: "147 Maple Avenue", city: "Toronto", postalCode: "M4C 1B2", status: SignStatus.installed, installedAt: new Date(Date.now() - 3 * 86400000), lat: 43.6930, lng: -79.3210 },
      { campaignId: campaign.id, contactId: contacts[6].id, address1: "56 College Way", city: "Toronto", postalCode: "M4K 1T3", status: SignStatus.requested, lat: 43.6750, lng: -79.3520 },
      { campaignId: campaign.id, address1: "200 Danforth Ave", city: "Toronto", postalCode: "M4K 1N6", status: SignStatus.installed, installedAt: new Date(Date.now() - 5 * 86400000), lat: 43.6770, lng: -79.3480 },
    ],
  });

  // ── Canvass ────────────────────────────────────────────────────────────────
  const cl = await prisma.canvassList.create({ data: { campaignId: campaign.id, name: "East Ward 12 — April Blitz", description: "Eastern corridor. Focus on undecided and persuadables.", status: "in_progress" } });
  await prisma.canvassAssignment.create({ data: { canvassListId: cl.id, userId: volunteer1.id, status: "in_progress", startedAt: new Date(Date.now() - 3 * 86400000) } });

  // ── Tasks ──────────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      { campaignId: campaign.id, contactId: contacts[2].id, assignedToId: manager.id, createdById: admin.id, title: "Follow up with Patricia Nguyen re: Oak Street", status: TaskStatus.pending, priority: TaskPriority.high, dueDate: new Date(Date.now() + 3 * 86400000) },
      { campaignId: campaign.id, contactId: contacts[5].id, assignedToId: volunteer1.id, createdById: manager.id, title: "Re-canvass Carlos Reyes — safety concerns", status: TaskStatus.pending, priority: TaskPriority.medium, dueDate: new Date(Date.now() + 7 * 86400000) },
      { campaignId: campaign.id, assignedToId: manager.id, createdById: admin.id, title: "Prepare phone bank list for weekend volunteers", status: TaskStatus.in_progress, priority: TaskPriority.high, dueDate: new Date(Date.now() + 2 * 86400000) },
      { campaignId: campaign.id, contactId: contacts[9].id, assignedToId: admin.id, createdById: admin.id, title: "Coffee meeting with Grant Morrison — business outreach", status: TaskStatus.pending, priority: TaskPriority.medium, dueDate: new Date(Date.now() + 5 * 86400000) },
      { campaignId: campaign.id, assignedToId: volunteer1.id, createdById: manager.id, title: "Deliver lawn signs to confirmed supporters", status: TaskStatus.completed, priority: TaskPriority.medium, dueDate: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86400000) },
    ],
  });
  console.log("✅ Signs, canvassing, tasks");

  // ── Polls ──────────────────────────────────────────────────────────────────
  const poll1 = await prisma.poll.create({
    data: { question: "What is the most important issue in Ward 12 right now?", type: PollType.multiple_choice, visibility: PollVisibility.public, targetRegion: "Ward 12", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4B", "M4E"], campaignId: campaign.id, tags: ["ward12", "municipal", "issues"], isFeatured: true, options: { create: [{ text: "Affordable Housing", order: 1 }, { text: "Public Transit", order: 2 }, { text: "Climate & Environment", order: 3 }, { text: "Public Safety", order: 4 }, { text: "Support for Seniors", order: 5 }] } },
    include: { options: true },
  });
  const poll2 = await prisma.poll.create({ data: { question: "Do you support expanding bike lanes on Danforth Avenue?", type: PollType.binary, visibility: PollVisibility.public, targetRegion: "Toronto—Danforth", targetPostalPrefixes: ["M4C", "M4J", "M4K"], officialId: officialMP.id, tags: ["transit", "cycling"], isFeatured: true } });
  const poll3 = await prisma.poll.create({ data: { question: "How would you rate the state of affordable housing in Toronto? (0 = terrible, 100 = excellent)", type: PollType.slider, visibility: PollVisibility.public, targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4E"], tags: ["housing", "toronto"] } });
  await prisma.pollResponse.createMany({
    data: [
      { pollId: poll1.id, optionId: poll1.options[0].id, userId: publicUser.id, postalCode: "M4C 3D4", ward: "Ward 12" },
      { pollId: poll1.id, optionId: poll1.options[1].id, postalCode: "M4J 1A1", ward: "Ward 12" },
      { pollId: poll1.id, optionId: poll1.options[0].id, postalCode: "M4K 2B3", ward: "Ward 14" },
      { pollId: poll1.id, optionId: poll1.options[2].id, postalCode: "M4C 4E5", ward: "Ward 12" },
      { pollId: poll2.id, value: "yes", userId: publicUser.id, postalCode: "M4C 3D4" },
      { pollId: poll2.id, value: "no", postalCode: "M4J 2A2" },
      { pollId: poll2.id, value: "yes", postalCode: "M4K 1C1" },
      { pollId: poll3.id, value: "25", userId: publicUser.id, postalCode: "M4C 3D4" },
      { pollId: poll3.id, value: "15", postalCode: "M4J 1B2" },
    ],
  });
  await prisma.poll.update({ where: { id: poll1.id }, data: { totalResponses: 4 } });
  await prisma.poll.update({ where: { id: poll2.id }, data: { totalResponses: 3 } });
  await prisma.poll.update({ where: { id: poll3.id }, data: { totalResponses: 2 } });
  console.log("✅ Polls + responses (3 polls)");

  // ── Support Signals & Questions ────────────────────────────────────────────
  await prisma.supportSignal.createMany({
    data: [
      { userId: publicUser.id, officialId: officialMP.id, type: SupportSignalType.strong_support, message: "Chris has been great for our riding!", postalCode: "M4C 3D4", ward: "Ward 12" },
      { userId: publicUser.id, campaignSlug: "ward-12-2026", type: SupportSignalType.sign_request, postalCode: "M4C 3D4", ward: "Ward 12" },
    ],
  });
  await prisma.publicQuestion.create({
    data: { userId: publicUser.id, officialId: officialMP.id, question: "What specific steps will you take to increase affordable housing in the riding?", answer: "We're pushing for federal co-investment in a community land trust model, targeting 500 permanently affordable units over 5 years in Toronto—Danforth.", answeredAt: new Date(Date.now() - 86400000), upvotes: 12 },
  });
  await prisma.officialFollow.createMany({
    data: [{ userId: publicUser.id, officialId: officialMP.id }, { userId: publicUser.id, officialId: officialCouncil.id }],
    skipDuplicates: true,
  });
  await prisma.volunteerProfile.upsert({
    where: { userId: volunteer1.id }, update: {},
    create: { userId: volunteer1.id, skills: ["canvassing", "phone_bank", "data_entry"], availabilityJson: { mon: true, tue: false, wed: true, thu: true, fri: false, sat: true, sun: false }, maxHoursPerWeek: 10, hasVehicle: true },
  });
  await prisma.activityLog.createMany({
    data: [
      { campaignId: campaign.id, userId: admin.id, action: "created", entityType: "campaign", entityId: campaign.id, details: { name: campaign.name } },
      { campaignId: campaign.id, userId: volunteer1.id, action: "logged_interaction", entityType: "contact", entityId: contacts[0].id, details: { type: "door_knock", contactName: "Jennifer Walsh" } },
      { campaignId: campaign.id, userId: manager.id, action: "updated_support_level", entityType: "contact", entityId: contacts[2].id, details: { from: "undecided", to: "leaning_support", contactName: "Patricia Nguyen" } },
    ],
  });


  // ── Custom Campaign Fields ─────────────────────────────────────────────────
  const customFieldDefs = [
    { key: "hydro_concern", label: "Hydro Concern", fieldType: "boolean" as const, category: "canvassing" as const, showOnCard: true },
    { key: "preferred_contact_time", label: "Best Time to Contact", fieldType: "select" as const, category: "contact_info" as const, options: ["Morning", "Afternoon", "Evening", "Weekend"], showOnCard: false, showOnList: true },
    { key: "yard_sign_size", label: "Preferred Sign Size", fieldType: "select" as const, category: "canvassing" as const, options: ["Small", "Large", "Window"], showOnCard: true },
    { key: "canvasser_notes", label: "Canvasser Notes", fieldType: "textarea" as const, category: "canvassing" as const, showOnCard: true },
  ];
  for (const f of customFieldDefs) {
    await prisma.campaignField.upsert({
      where: { campaignId_key: { campaignId: campaign.id, key: f.key } },
      update: {},
      create: { campaignId: campaign.id, ...f },
    });
  }
  console.log("✅ Custom field definitions seeded");

  console.log("✅ Signals, questions, follows, volunteer profile, activity logs\n");
  console.log("════════════════════════════════════════════════════");
  console.log("🚀 Poll City ecosystem seed complete!\n");
  console.log("CAMPAIGN APP:  admin@pollcity.dev / password123");
  console.log("               manager@pollcity.dev / password123");
  console.log("               volunteer@pollcity.dev / password123");
  console.log("SOCIAL APP:    voter@pollcity.dev / password123\n");
  console.log("3 officials · 10 contacts · 3 polls · signs · tasks");
  console.log("════════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

// This runs after main() — add to the bottom of the main function body
// Sample custom fields will be added inline below
