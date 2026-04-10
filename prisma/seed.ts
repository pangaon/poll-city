import {
  PrismaClient, Role, SupportLevel, ElectionType, InteractionType,
  TaskStatus, TaskPriority, GovernmentLevel, PollType, PollVisibility,
  SignStatus, SupportSignalType, DonationStatus, EventStatus, EventVisibility,
  AssignmentType, AssignmentStatus, StopStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Poll City full ecosystem...\n");
  const passwordHash = await bcrypt.hash("password123", 12);

  // ── Users ──────────────────────────────────────────────────────────────────
  // ── Platform owner (demo login — George's real account is created via scripts/create-owner.ts)
  const admin = await prisma.user.upsert({
    where: { email: "admin@pollcity.dev" }, update: {},
    create: { email: "admin@pollcity.dev", name: "George Hatzis", passwordHash, role: Role.SUPER_ADMIN, phone: "416-555-0100", postalCode: "M4C 1A1", ward: "Ward 12", riding: "Toronto—Danforth" },
  });

  // ── Typical municipal campaign team ───────────────────────────────────────────
  // Campaign Manager — runs the day-to-day operation
  const manager = await prisma.user.upsert({
    where: { email: "manager@pollcity.dev" }, update: {},
    create: { email: "manager@pollcity.dev", name: "Rachel Dubois", passwordHash, role: Role.CAMPAIGN_MANAGER, phone: "416-555-0101", postalCode: "M4C 2B2", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Communications Director — media, social, messaging
  const comms = await prisma.user.upsert({
    where: { email: "comms@pollcity.dev" }, update: {},
    create: { email: "comms@pollcity.dev", name: "Marcus Chen", passwordHash, role: Role.CAMPAIGN_MANAGER, phone: "416-555-0103", postalCode: "M4K 1A1", ward: "Ward 14", riding: "Toronto—Danforth" },
  });
  // Field Director / Canvassing Captain — owns doors and turf
  const field = await prisma.user.upsert({
    where: { email: "field@pollcity.dev" }, update: {},
    create: { email: "field@pollcity.dev", name: "Priya Okonkwo", passwordHash, role: Role.VOLUNTEER_LEADER, phone: "416-555-0104", postalCode: "M4J 2B3", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Data Manager — voter list, imports, data integrity
  const data = await prisma.user.upsert({
    where: { email: "data@pollcity.dev" }, update: {},
    create: { email: "data@pollcity.dev", name: "Sanjay Patel", passwordHash, role: Role.CAMPAIGN_MANAGER, phone: "416-555-0105", postalCode: "M4C 3C3", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Volunteer Coordinator — shifts, onboarding, retention
  const volcoord = await prisma.user.upsert({
    where: { email: "volunteers@pollcity.dev" }, update: {},
    create: { email: "volunteers@pollcity.dev", name: "Amara Osei", passwordHash, role: Role.VOLUNTEER_LEADER, phone: "416-555-0106", postalCode: "M4E 1P5", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Treasurer — donations, receipts, financial reporting (legally required in Canada)
  const treasurer = await prisma.user.upsert({
    where: { email: "treasurer@pollcity.dev" }, update: {},
    create: { email: "treasurer@pollcity.dev", name: "Linda Kowalski", passwordHash, role: Role.CAMPAIGN_MANAGER, phone: "416-555-0107", postalCode: "M4B 3R2", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Events Coordinator — townhalls, meet-and-greets, door events
  const events = await prisma.user.upsert({
    where: { email: "events@pollcity.dev" }, update: {},
    create: { email: "events@pollcity.dev", name: "Carlos Beaumont", passwordHash, role: Role.VOLUNTEER_LEADER, phone: "416-555-0108", postalCode: "M4C 4S7", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Canvassers (field volunteers)
  const volunteer1 = await prisma.user.upsert({
    where: { email: "volunteer@pollcity.dev" }, update: {},
    create: { email: "volunteer@pollcity.dev", name: "Val Morrison", passwordHash, role: Role.VOLUNTEER, phone: "416-555-0102", postalCode: "M4J 1C3", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  const volunteer2 = await prisma.user.upsert({
    where: { email: "volunteer2@pollcity.dev" }, update: {},
    create: { email: "volunteer2@pollcity.dev", name: "James Fontaine", passwordHash, role: Role.VOLUNTEER, phone: "416-555-0109", postalCode: "M4C 2K8", ward: "Ward 12", riding: "Toronto—Danforth" },
  });
  // Public voter (for Social app testing)
  const publicUser = await prisma.user.upsert({
    where: { email: "voter@pollcity.dev" }, update: {},
    create: { email: "voter@pollcity.dev", name: "Pat Public", passwordHash, role: Role.PUBLIC_USER, postalCode: "M4C 3D4", ward: "Ward 12", riding: "Toronto—Danforth", emailVerified: true },
  });
  console.log("✅ Users created (10 — full campaign team)");

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
  for (const { userId, role } of [
    { userId: admin.id,      role: Role.ADMIN },
    { userId: manager.id,    role: Role.CAMPAIGN_MANAGER },
    { userId: comms.id,      role: Role.CAMPAIGN_MANAGER },
    { userId: field.id,      role: Role.VOLUNTEER_LEADER },
    { userId: data.id,       role: Role.CAMPAIGN_MANAGER },
    { userId: volcoord.id,   role: Role.VOLUNTEER_LEADER },
    { userId: treasurer.id,  role: Role.CAMPAIGN_MANAGER },
    { userId: events.id,     role: Role.VOLUNTEER_LEADER },
    { userId: volunteer1.id, role: Role.VOLUNTEER },
    { userId: volunteer2.id, role: Role.VOLUNTEER },
  ]) {
    await prisma.membership.upsert({ where: { userId_campaignId: { userId, campaignId: campaign.id } }, update: {}, create: { userId, campaignId: campaign.id, role } });
  }
  console.log("✅ Campaign + memberships created (10 members)");

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
  // Geocoords placed in central Toronto (College/Spadina area) so the demo map shows contacts
  const h1 = await prisma.household.create({ data: { address1: "147 Maple Avenue", city: "Toronto", province: "ON", postalCode: "M4C 1B2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6572, lng: -79.4012 } });
  const h2 = await prisma.household.create({ data: { address1: "89 Oak Street", city: "Toronto", province: "ON", postalCode: "M4J 3A9", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6558, lng: -79.3987 } });
  const h3 = await prisma.household.create({ data: { address1: "234 Birch Crescent", city: "Toronto", province: "ON", postalCode: "M4C 2K8", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6585, lng: -79.4035 } });
  const h4 = await prisma.household.create({ data: { address1: "56 College Way", city: "Toronto", province: "ON", postalCode: "M4K 1T3", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6597, lng: -79.3960 } });
  const h5 = await prisma.household.create({ data: { address1: "412 Elm Drive", city: "Toronto", province: "ON", postalCode: "M4E 1P5", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6543, lng: -79.4050 } });
  const h6 = await prisma.household.create({ data: { address1: "78 Pine Boulevard", city: "Toronto", province: "ON", postalCode: "M4B 3R2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6610, lng: -79.3920 } });
  const h7 = await prisma.household.create({ data: { address1: "901 Cedar Lane", city: "Toronto", province: "ON", postalCode: "M4C 4S7", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6530, lng: -79.4080 } });
  const h8 = await prisma.household.create({ data: { address1: "333 Spruce Road", city: "Toronto", province: "ON", postalCode: "M4J 2N6", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6620, lng: -79.3945 } });

  const contactRows = [
    { nameTitle: "Ms.", firstName: "Jennifer", lastName: "Walsh", email: "jennifer.walsh@email.com", phone: "416-555-1001", address1: "147 Maple Avenue", city: "Toronto", province: "ON", postalCode: "M4C 1B2", ward: "Ward 12", municipalPoll: "Poll 4", supportLevel: SupportLevel.strong_support, issues: ["Transit", "Housing"], signRequested: true, volunteerInterest: true, notes: "Very enthusiastic. Willing to host a lawn sign and help with phone banking.", householdId: h1.id },
    { firstName: "David", lastName: "Walsh", email: "david.walsh@email.com", phone: "416-555-1002", address1: "147 Maple Avenue", city: "Toronto", province: "ON", postalCode: "M4C 1B2", ward: "Ward 12", municipalPoll: "Poll 4", supportLevel: SupportLevel.leaning_support, issues: ["Transit"], householdId: h1.id },
    { firstName: "Patricia", lastName: "Nguyen", email: "p.nguyen@mail.ca", phone: "416-555-1003", address1: "89 Oak Street", city: "Toronto", province: "ON", postalCode: "M4J 3A9", ward: "Ward 12", municipalPoll: "Poll 7", supportLevel: SupportLevel.undecided, issues: ["Housing", "Safety"], followUpNeeded: true, notes: "Concerned about Oak Street corridor. Needs follow-up.", householdId: h2.id },
    { firstName: "Marcus", lastName: "Thompson", email: "mthompson@gmail.com", phone: "416-555-1004", address1: "234 Birch Crescent", city: "Toronto", province: "ON", postalCode: "M4C 2K8", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.strong_opposition, issues: ["Environment"], householdId: h3.id },
    { firstName: "Linda", lastName: "Osei", email: "linda.osei@hotmail.com", phone: "416-555-1005", address1: "412 Elm Drive", city: "Toronto", province: "ON", postalCode: "M4E 1P5", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.strong_support, issues: ["Seniors", "Transit"], volunteerInterest: true, householdId: h5.id },
    { firstName: "Carlos", lastName: "Reyes", email: "creyes@outlook.com", phone: "416-555-1006", address1: "78 Pine Boulevard", city: "Toronto", province: "ON", postalCode: "M4B 3R2", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.leaning_opposition, issues: ["Safety", "Housing"], followUpNeeded: true, householdId: h6.id },
    { firstName: "Sarah", lastName: "Kim", email: "s.kim@university.ca", phone: "416-555-1007", address1: "56 College Way", city: "Toronto", province: "ON", postalCode: "M4K 1T3", ward: "Ward 12", municipalPoll: "Poll 7", supportLevel: SupportLevel.strong_support, issues: ["Environment", "Transit"], volunteerInterest: true, signRequested: true, householdId: h4.id },
    { firstName: "Robert", lastName: "Dasilva", phone: "416-555-1008", address1: "901 Cedar Lane", city: "Toronto", province: "ON", postalCode: "M4C 4S7", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.unknown, followUpNeeded: true, householdId: h7.id },
    { firstName: "Fatima", lastName: "Al-Hassan", email: "fatima.ah@gmail.com", phone: "416-555-1009", address1: "333 Spruce Road", city: "Toronto", province: "ON", postalCode: "M4J 2N6", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.leaning_support, issues: ["Housing", "Seniors"], preferredLanguage: "ar", notes: "Prefers Arabic. Daughter translates at door.", householdId: h8.id },
    { nameTitle: "Mr.", firstName: "Grant", lastName: "Morrison", email: "grant.morrison@business.ca", phone: "416-555-1010", address1: "1 Business Plaza Suite 400", city: "Toronto", province: "ON", postalCode: "M4W 1A5", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.undecided, issues: ["Transit"], followUpNeeded: true, followUpDate: new Date(Date.now() + 3 * 86400000) },
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

  // ── Polls — 5 per type: binary, multiple_choice, ranked, slider ───────────

  // ── BINARY (5) ──────────────────────────────────────────────────────────────
  const binaryPoll1 = await prisma.poll.create({ data: {
    question: "Do you support mandatory inclusionary zoning requiring 10% affordable units in new residential developments?",
    description: "Inclusionary zoning would require developers to set aside a portion of new units at below-market rents.",
    type: PollType.binary, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4B", "M4E"],
    campaignId: campaign.id, tags: ["housing", "zoning", "affordability"], isFeatured: true,
  }});
  const binaryPoll2 = await prisma.poll.create({ data: {
    question: "Should the City of Toronto eliminate minimum parking requirements for new buildings within 500m of rapid transit?",
    description: "Removing parking minimums near transit could reduce construction costs and speed up new housing.",
    type: PollType.binary, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
    officialId: officialMP.id, tags: ["transit", "parking", "housing"],
  }});
  const binaryPoll3 = await prisma.poll.create({ data: {
    question: "Do you support 24-hour TTC subway service on Friday and Saturday nights?",
    description: "Night Network currently operates buses only. Subway extension would cost approximately $10M/year.",
    type: PollType.binary, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M5A"],
    tags: ["transit", "ttc", "nightlife"], isFeatured: true,
  }});
  const binaryPoll4 = await prisma.poll.create({ data: {
    question: "Should Toronto implement a road congestion pricing program for downtown vehicle access during peak hours?",
    description: "Similar to London's scheme, a downtown cordon charge could reduce congestion and fund transit improvements.",
    type: PollType.binary, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M5A", "M5B", "M5C", "M4Y"],
    tags: ["congestion", "transit", "environment"],
  }});
  const binaryPoll5 = await prisma.poll.create({ data: {
    question: "Do you support converting vacant office buildings in the downtown core into mixed-income residential housing?",
    description: "Office vacancy rates downtown have reached record highs post-pandemic. Conversion could add thousands of new homes.",
    type: PollType.binary, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M5H", "M5J", "M5K"],
    campaignId: campaign.id, tags: ["housing", "downtown", "office-conversion"],
  }});

  // ── MULTIPLE CHOICE (5) ──────────────────────────────────────────────────────
  const mcPoll1 = await prisma.poll.create({
    data: {
      question: "What is the most important issue in Ward 12 right now?",
      description: "Tell us what matters most to you. Your answer helps us prioritize.",
      type: PollType.multiple_choice, visibility: PollVisibility.public,
      targetRegion: "Ward 12", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4B", "M4E"],
      campaignId: campaign.id, tags: ["ward12", "municipal", "priorities"], isFeatured: true,
      options: { create: [
        { text: "Affordable Housing", order: 1 },
        { text: "Public Transit Reliability", order: 2 },
        { text: "Climate & Green Infrastructure", order: 3 },
        { text: "Public Safety & Policing", order: 4 },
        { text: "Support for Seniors & Accessibility", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const mcPoll2 = await prisma.poll.create({
    data: {
      question: "How do you most often get to work, school, or errands in Toronto?",
      description: "We're gathering data to help advocate for better transportation investment where it's needed most.",
      type: PollType.multiple_choice, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4E"],
      tags: ["transit", "transportation", "commute"],
      options: { create: [
        { text: "TTC (subway, bus, streetcar)", order: 1 },
        { text: "Personal vehicle", order: 2 },
        { text: "Cycling", order: 3 },
        { text: "Walking", order: 4 },
        { text: "I work from home / don't commute", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const mcPoll3 = await prisma.poll.create({
    data: {
      question: "Which approach to housing affordability do you most support?",
      description: "There are many proposed solutions to Toronto's housing crisis. Which do you believe would be most effective?",
      type: PollType.multiple_choice, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4B"],
      campaignId: campaign.id, tags: ["housing", "affordability", "policy"],
      options: { create: [
        { text: "Build more city-owned social housing", order: 1 },
        { text: "Expand and strengthen rent control", order: 2 },
        { text: "Remove zoning barriers to increase supply", order: 3 },
        { text: "Fund non-profit and co-operative housing", order: 4 },
        { text: "Tax vacant properties and speculation", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const mcPoll4 = await prisma.poll.create({
    data: {
      question: "Where should the City of Toronto increase its investment over the next 4 years?",
      description: "The city budget is under pressure. Where do you want to see additional spending?",
      type: PollType.multiple_choice, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
      officialId: officialCouncil.id, tags: ["budget", "municipal", "services"],
      options: { create: [
        { text: "Homeless shelters and supportive housing", order: 1 },
        { text: "TTC service and maintenance", order: 2 },
        { text: "Parks, trees, and green space", order: 3 },
        { text: "Mental health and addiction services", order: 4 },
        { text: "Road and sidewalk repair", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const mcPoll5 = await prisma.poll.create({
    data: {
      question: "What type of housing would you most like to see built in your neighbourhood?",
      description: "As Toronto grows, different types of housing are being debated. What would you welcome near you?",
      type: PollType.multiple_choice, visibility: PollVisibility.public,
      targetRegion: "Ward 12", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
      campaignId: campaign.id, tags: ["housing", "neighbourhood", "density"],
      options: { create: [
        { text: "Mid-rise rental apartments (6–12 storeys)", order: 1 },
        { text: "Affordable / co-operative housing", order: 2 },
        { text: "Townhomes and rowhouses", order: 3 },
        { text: "Laneway and garden suites", order: 4 },
        { text: "High-rise condos near transit hubs", order: 5 },
      ]},
    },
    include: { options: true },
  });

  // ── RANKED (5) ──────────────────────────────────────────────────────────────
  const rankPoll1 = await prisma.poll.create({
    data: {
      question: "Rank the following city budget priorities from most to least important to you.",
      description: "Drag to reorder from most important (1) to least important.",
      type: PollType.ranked, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
      campaignId: campaign.id, tags: ["budget", "priorities"],
      options: { create: [
        { text: "Affordable Housing Investment", order: 1 },
        { text: "TTC Maintenance and Expansion", order: 2 },
        { text: "Shelter and Homelessness Services", order: 3 },
        { text: "Climate Resilience and Green Infrastructure", order: 4 },
        { text: "Community Centres and Libraries", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const rankPoll2 = await prisma.poll.create({
    data: {
      question: "Rank these transit improvements in order of priority for Toronto.",
      description: "Tell us which transit improvements you want the city to prioritize.",
      type: PollType.ranked, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M5A"],
      tags: ["transit", "investment", "ttc"],
      options: { create: [
        { text: "Subway network expansion", order: 1 },
        { text: "Bus rapid transit on Eglinton/Finch", order: 2 },
        { text: "Real-time transit information and apps", order: 3 },
        { text: "Protected cycling lanes connecting to transit", order: 4 },
        { text: "Fare reduction for low-income riders", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const rankPoll3 = await prisma.poll.create({
    data: {
      question: "Rank these city services based on how well they currently perform in your neighbourhood.",
      description: "1 = best performing, 5 = worst performing.",
      type: PollType.ranked, visibility: PollVisibility.public,
      targetRegion: "Ward 12", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
      campaignId: campaign.id, tags: ["services", "performance", "ward12"],
      options: { create: [
        { text: "Garbage and recycling collection", order: 1 },
        { text: "Parks and recreation maintenance", order: 2 },
        { text: "Road and pothole repair", order: 3 },
        { text: "Winter snow clearing", order: 4 },
        { text: "Tree canopy and street trees", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const rankPoll4 = await prisma.poll.create({
    data: {
      question: "Rank these climate actions you want your councillor to champion at City Hall.",
      description: "What should the city prioritize to fight climate change?",
      type: PollType.ranked, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4E"],
      tags: ["climate", "environment", "action"],
      options: { create: [
        { text: "Deep retrofit program for older buildings", order: 1 },
        { text: "Expanded urban tree canopy planting", order: 2 },
        { text: "Flood resilience and stormwater infrastructure", order: 3 },
        { text: "Electric city vehicle fleet and charging", order: 4 },
        { text: "Community solar and rooftop energy programs", order: 5 },
      ]},
    },
    include: { options: true },
  });
  const rankPoll5 = await prisma.poll.create({
    data: {
      question: "Rank these changes to make local democracy more accessible.",
      description: "How should the city make it easier for residents to participate?",
      type: PollType.ranked, visibility: PollVisibility.public,
      targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
      officialId: officialCouncil.id, tags: ["democracy", "participation", "reform"],
      options: { create: [
        { text: "Online voting for municipal elections", order: 1 },
        { text: "More evening and weekend community meetings", order: 2 },
        { text: "Stronger conflict-of-interest rules for councillors", order: 3 },
        { text: "Participatory budgeting for ward projects", order: 4 },
        { text: "Improved 311 responsiveness and follow-up", order: 5 },
      ]},
    },
    include: { options: true },
  });

  // ── SLIDER (5) ──────────────────────────────────────────────────────────────
  const sliderPoll1 = await prisma.poll.create({ data: {
    question: "How satisfied are you with your local city councillor's performance? (0 = very unsatisfied, 100 = very satisfied)",
    type: PollType.slider, visibility: PollVisibility.public,
    targetRegion: "Ward 12", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
    officialId: officialCouncil.id, tags: ["councillor", "performance", "satisfaction"],
  }});
  const sliderPoll2 = await prisma.poll.create({ data: {
    question: "How would you rate the reliability of public transit in your area? (0 = terrible, 100 = excellent)",
    description: "Rate based on your actual daily experience.",
    type: PollType.slider, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4E"],
    tags: ["transit", "ttc", "reliability"], isFeatured: true,
  }});
  const sliderPoll3 = await prisma.poll.create({ data: {
    question: "How would you rate the state of affordable housing in Toronto today? (0 = catastrophically bad, 100 = very good)",
    description: "Consider the availability, accessibility, and quality of housing options.",
    type: PollType.slider, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J", "M4K", "M4E"],
    campaignId: campaign.id, tags: ["housing", "affordability", "toronto"],
  }});
  const sliderPoll4 = await prisma.poll.create({ data: {
    question: "How responsive is the City of Toronto to resident concerns and 311 requests? (0 = completely unresponsive, 100 = very responsive)",
    type: PollType.slider, visibility: PollVisibility.public,
    targetRegion: "Toronto", targetPostalPrefixes: ["M4C", "M4J"],
    tags: ["city-services", "311", "responsiveness"],
  }});
  const sliderPoll5 = await prisma.poll.create({ data: {
    question: "How safe do you feel walking in your neighbourhood at night? (0 = very unsafe, 100 = very safe)",
    description: "Your answer helps identify areas where residents feel the city needs to improve lighting, outreach, or services.",
    type: PollType.slider, visibility: PollVisibility.public,
    targetRegion: "Ward 12", targetPostalPrefixes: ["M4C", "M4J", "M4K"],
    campaignId: campaign.id, tags: ["safety", "neighbourhood", "ward12"],
  }});

  // ── Poll responses (realistic volume) ──────────────────────────────────────
  await prisma.pollResponse.createMany({ skipDuplicates: true, data: [
    // binary polls
    { pollId: binaryPoll1.id, value: "yes", userId: publicUser.id, postalCode: "M4C 3D4", ward: "Ward 12" },
    { pollId: binaryPoll1.id, value: "yes", postalCode: "M4J 1A1", ward: "Ward 12" },
    { pollId: binaryPoll1.id, value: "no", postalCode: "M4K 2B3", ward: "Ward 14" },
    { pollId: binaryPoll1.id, value: "yes", postalCode: "M4B 1R5", ward: "Ward 12" },
    { pollId: binaryPoll1.id, value: "yes", postalCode: "M4E 2K4", ward: "Ward 14" },
    { pollId: binaryPoll2.id, value: "yes", userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: binaryPoll2.id, value: "no", postalCode: "M4J 2A2" },
    { pollId: binaryPoll2.id, value: "yes", postalCode: "M4K 1C1" },
    { pollId: binaryPoll3.id, value: "yes", userId: publicUser.id, postalCode: "M4C 5L7" },
    { pollId: binaryPoll3.id, value: "yes", postalCode: "M4J 3P2" },
    { pollId: binaryPoll3.id, value: "no", postalCode: "M4K 1R8" },
    { pollId: binaryPoll3.id, value: "yes", postalCode: "M4E 2M3" },
    { pollId: binaryPoll4.id, value: "yes", postalCode: "M5A 1B2" },
    { pollId: binaryPoll4.id, value: "no", postalCode: "M5B 2C3" },
    { pollId: binaryPoll4.id, value: "no", postalCode: "M4Y 1P4" },
    { pollId: binaryPoll5.id, value: "yes", userId: publicUser.id, postalCode: "M5H 2N2" },
    { pollId: binaryPoll5.id, value: "yes", postalCode: "M5J 1A7" },
    { pollId: binaryPoll5.id, value: "yes", postalCode: "M5K 1B3" },
    // multiple choice
    { pollId: mcPoll1.id, optionId: mcPoll1.options[0].id, userId: publicUser.id, postalCode: "M4C 3D4", ward: "Ward 12" },
    { pollId: mcPoll1.id, optionId: mcPoll1.options[1].id, postalCode: "M4J 1A1", ward: "Ward 12" },
    { pollId: mcPoll1.id, optionId: mcPoll1.options[0].id, postalCode: "M4K 2B3", ward: "Ward 14" },
    { pollId: mcPoll1.id, optionId: mcPoll1.options[2].id, postalCode: "M4C 4E5", ward: "Ward 12" },
    { pollId: mcPoll1.id, optionId: mcPoll1.options[3].id, postalCode: "M4B 2L1", ward: "Ward 12" },
    { pollId: mcPoll2.id, optionId: mcPoll2.options[0].id, userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: mcPoll2.id, optionId: mcPoll2.options[1].id, postalCode: "M4J 2A2" },
    { pollId: mcPoll2.id, optionId: mcPoll2.options[2].id, postalCode: "M4K 1A4" },
    { pollId: mcPoll3.id, optionId: mcPoll3.options[2].id, userId: publicUser.id, postalCode: "M4C 5G3" },
    { pollId: mcPoll3.id, optionId: mcPoll3.options[0].id, postalCode: "M4J 1C7" },
    { pollId: mcPoll3.id, optionId: mcPoll3.options[3].id, postalCode: "M4K 3S1" },
    { pollId: mcPoll4.id, optionId: mcPoll4.options[0].id, postalCode: "M4C 2H4" },
    { pollId: mcPoll4.id, optionId: mcPoll4.options[1].id, postalCode: "M4J 4K2" },
    { pollId: mcPoll5.id, optionId: mcPoll5.options[0].id, userId: publicUser.id, postalCode: "M4C 1A1", ward: "Ward 12" },
    { pollId: mcPoll5.id, optionId: mcPoll5.options[1].id, postalCode: "M4J 2B3", ward: "Ward 12" },
    // ranked — each response is a separate row with rank
    { pollId: rankPoll1.id, optionId: rankPoll1.options[0].id, rank: 1, userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: rankPoll1.id, optionId: rankPoll1.options[2].id, rank: 2, userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: rankPoll1.id, optionId: rankPoll1.options[1].id, rank: 3, userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: rankPoll2.id, optionId: rankPoll2.options[3].id, rank: 1, postalCode: "M4J 1B4" },
    { pollId: rankPoll2.id, optionId: rankPoll2.options[0].id, rank: 2, postalCode: "M4J 1B4" },
    { pollId: rankPoll3.id, optionId: rankPoll3.options[1].id, rank: 1, postalCode: "M4K 2A1" },
    { pollId: rankPoll3.id, optionId: rankPoll3.options[0].id, rank: 2, postalCode: "M4K 2A1" },
    { pollId: rankPoll4.id, optionId: rankPoll4.options[1].id, rank: 1, userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: rankPoll4.id, optionId: rankPoll4.options[2].id, rank: 2, userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: rankPoll5.id, optionId: rankPoll5.options[0].id, rank: 1, postalCode: "M4J 3K2" },
    { pollId: rankPoll5.id, optionId: rankPoll5.options[3].id, rank: 2, postalCode: "M4J 3K2" },
    // slider
    { pollId: sliderPoll1.id, value: "62", userId: publicUser.id, postalCode: "M4C 3D4", ward: "Ward 12" },
    { pollId: sliderPoll1.id, value: "45", postalCode: "M4J 1A1", ward: "Ward 12" },
    { pollId: sliderPoll1.id, value: "78", postalCode: "M4K 2B3", ward: "Ward 14" },
    { pollId: sliderPoll2.id, value: "38", userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: sliderPoll2.id, value: "42", postalCode: "M4J 2A2" },
    { pollId: sliderPoll2.id, value: "55", postalCode: "M4K 1B1" },
    { pollId: sliderPoll3.id, value: "18", userId: publicUser.id, postalCode: "M4C 3D4" },
    { pollId: sliderPoll3.id, value: "22", postalCode: "M4J 1B2" },
    { pollId: sliderPoll4.id, value: "41", postalCode: "M4C 1R3" },
    { pollId: sliderPoll4.id, value: "35", postalCode: "M4J 4P1" },
    { pollId: sliderPoll5.id, value: "70", userId: publicUser.id, postalCode: "M4C 3D4", ward: "Ward 12" },
    { pollId: sliderPoll5.id, value: "55", postalCode: "M4J 1A1", ward: "Ward 12" },
    { pollId: sliderPoll5.id, value: "82", postalCode: "M4K 2C3", ward: "Ward 14" },
  ]});

  // Update response counts
  await Promise.all([
    prisma.poll.update({ where: { id: binaryPoll1.id }, data: { totalResponses: 5 } }),
    prisma.poll.update({ where: { id: binaryPoll2.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: binaryPoll3.id }, data: { totalResponses: 4 } }),
    prisma.poll.update({ where: { id: binaryPoll4.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: binaryPoll5.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: mcPoll1.id }, data: { totalResponses: 5 } }),
    prisma.poll.update({ where: { id: mcPoll2.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: mcPoll3.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: mcPoll4.id }, data: { totalResponses: 2 } }),
    prisma.poll.update({ where: { id: mcPoll5.id }, data: { totalResponses: 2 } }),
    prisma.poll.update({ where: { id: rankPoll1.id }, data: { totalResponses: 1 } }),
    prisma.poll.update({ where: { id: rankPoll2.id }, data: { totalResponses: 1 } }),
    prisma.poll.update({ where: { id: rankPoll3.id }, data: { totalResponses: 1 } }),
    prisma.poll.update({ where: { id: rankPoll4.id }, data: { totalResponses: 1 } }),
    prisma.poll.update({ where: { id: rankPoll5.id }, data: { totalResponses: 1 } }),
    prisma.poll.update({ where: { id: sliderPoll1.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: sliderPoll2.id }, data: { totalResponses: 3 } }),
    prisma.poll.update({ where: { id: sliderPoll3.id }, data: { totalResponses: 2 } }),
    prisma.poll.update({ where: { id: sliderPoll4.id }, data: { totalResponses: 2 } }),
    prisma.poll.update({ where: { id: sliderPoll5.id }, data: { totalResponses: 3 } }),
  ]);
  console.log("✅ Polls + responses (20 polls: 5 binary + 5 multiple_choice + 5 ranked + 5 slider)");

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

  // ── Additional volunteer profiles (vol2, field director, vol coord, events) ─
  await Promise.all([
    prisma.volunteerProfile.upsert({ where: { userId: volunteer2.id }, update: {}, create: { userId: volunteer2.id, campaignId: campaign.id, skills: ["canvassing", "data_entry"], availabilityJson: { mon: false, tue: true, wed: false, thu: true, fri: false, sat: true, sun: true }, maxHoursPerWeek: 8, hasVehicle: false } }),
    prisma.volunteerProfile.upsert({ where: { userId: field.id },      update: {}, create: { userId: field.id,      campaignId: campaign.id, skills: ["canvassing", "leadership", "training", "data_entry"], availabilityJson: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }, maxHoursPerWeek: 40, hasVehicle: true } }),
    prisma.volunteerProfile.upsert({ where: { userId: volcoord.id },   update: {}, create: { userId: volcoord.id,   campaignId: campaign.id, skills: ["volunteer_coordination", "scheduling", "onboarding", "phone_bank"], availabilityJson: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, maxHoursPerWeek: 30, hasVehicle: false } }),
    prisma.volunteerProfile.upsert({ where: { userId: events.id },     update: {}, create: { userId: events.id,     campaignId: campaign.id, skills: ["event_planning", "canvassing", "social_media"], availabilityJson: { mon: false, tue: false, wed: true, thu: false, fri: true, sat: true, sun: true }, maxHoursPerWeek: 20, hasVehicle: true } }),
  ]);
  console.log("✅ Volunteer profiles — 4 team members");

  // ── Expanded Households: 30 new, organised by poll ─────────────────────────
  // Poll 4 — Woodbine / Danforth corridor
  const h9  = await prisma.household.create({ data: { address1: "24 Woodbine Avenue",      city: "Toronto", province: "ON", postalCode: "M4E 2H6", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6752, lng: -79.3295 } });
  const h10 = await prisma.household.create({ data: { address1: "118 Eastwood Road",       city: "Toronto", province: "ON", postalCode: "M4E 1Y4", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6741, lng: -79.3312 } });
  const h11 = await prisma.household.create({ data: { address1: "72 Lawson Avenue",        city: "Toronto", province: "ON", postalCode: "M4E 3A2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6765, lng: -79.3278 } });
  const h12x = await prisma.household.create({ data: { address1: "205 Eastdale Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 1M8", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6730, lng: -79.3340 } });
  const h13 = await prisma.household.create({ data: { address1: "33 Clonmore Drive",       city: "Toronto", province: "ON", postalCode: "M4E 1S3", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6778, lng: -79.3261 } });
  const h14 = await prisma.household.create({ data: { address1: "441 Woodbine Avenue",     city: "Toronto", province: "ON", postalCode: "M4E 2H9", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6745, lng: -79.3320 } });
  // Poll 7 — Coxwell / Danforth corridor
  const h15 = await prisma.household.create({ data: { address1: "15 Swanwick Avenue",      city: "Toronto", province: "ON", postalCode: "M4J 1N2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6780, lng: -79.3380 } });
  const h16 = await prisma.household.create({ data: { address1: "90 Glebemount Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 1T8", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6795, lng: -79.3362 } });
  const h17 = await prisma.household.create({ data: { address1: "262 Cedarvale Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 4G9", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6768, lng: -79.3395 } });
  const h18 = await prisma.household.create({ data: { address1: "47 Roseheath Avenue",     city: "Toronto", province: "ON", postalCode: "M4J 1R5", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6802, lng: -79.3348 } });
  const h19 = await prisma.household.create({ data: { address1: "135 Coxwell Avenue",      city: "Toronto", province: "ON", postalCode: "M4C 3X1", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6785, lng: -79.3370 } });
  const h20 = await prisma.household.create({ data: { address1: "58 Langford Avenue",      city: "Toronto", province: "ON", postalCode: "M4J 3A2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6772, lng: -79.3382 } });
  // Poll 12 — Greenwood / Kingston Road corridor
  const h21 = await prisma.household.create({ data: { address1: "88 Greenwood Avenue",     city: "Toronto", province: "ON", postalCode: "M4L 2P6", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6720, lng: -79.3195 } });
  const h22 = await prisma.household.create({ data: { address1: "345 Kingston Road",       city: "Toronto", province: "ON", postalCode: "M4L 1T8", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6708, lng: -79.3215 } });
  const h23 = await prisma.household.create({ data: { address1: "12 Courcelette Road",     city: "Toronto", province: "ON", postalCode: "M4L 3K2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6732, lng: -79.3182 } });
  const h24 = await prisma.household.create({ data: { address1: "67 Kenilworth Avenue",    city: "Toronto", province: "ON", postalCode: "M4L 3S5", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6715, lng: -79.3202 } });
  const h25 = await prisma.household.create({ data: { address1: "183 Gerrard Street East", city: "Toronto", province: "ON", postalCode: "M5A 2E5", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6698, lng: -79.3228 } });
  const h26 = await prisma.household.create({ data: { address1: "29 Beech Avenue",         city: "Toronto", province: "ON", postalCode: "M4E 3H2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6726, lng: -79.3178 } });
  // Poll 15 — Main / Danforth corridor
  const h27 = await prisma.household.create({ data: { address1: "190 Main Street",         city: "Toronto", province: "ON", postalCode: "M4E 2W1", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6815, lng: -79.3082 } });
  const h28 = await prisma.household.create({ data: { address1: "73 Bowood Avenue",        city: "Toronto", province: "ON", postalCode: "M4N 2Y8", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6828, lng: -79.3065 } });
  const h29 = await prisma.household.create({ data: { address1: "44 Hannaford Street",     city: "Toronto", province: "ON", postalCode: "M4E 3G8", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6802, lng: -79.3098 } });
  const h30 = await prisma.household.create({ data: { address1: "156 Dentonia Park Ave",   city: "Toronto", province: "ON", postalCode: "M4B 1M6", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6839, lng: -79.3042 } });
  const h31 = await prisma.household.create({ data: { address1: "321 Danforth Avenue",     city: "Toronto", province: "ON", postalCode: "M4K 1P1", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6818, lng: -79.3075 } });
  const h32 = await prisma.household.create({ data: { address1: "85 Arundel Avenue",       city: "Toronto", province: "ON", postalCode: "M4K 3A3", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6808, lng: -79.3089 } });
  // Poll 18 — Victoria Park / Warden corridor
  const h33 = await prisma.household.create({ data: { address1: "40 Barrington Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 4Y7", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6855, lng: -79.2945 } });
  const h34 = await prisma.household.create({ data: { address1: "98 Elward Boulevard",     city: "Toronto", province: "ON", postalCode: "M1L 3L1", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6869, lng: -79.2928 } });
  const h35 = await prisma.household.create({ data: { address1: "237 Victoria Park Ave",   city: "Toronto", province: "ON", postalCode: "M4E 3S9", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6842, lng: -79.2962 } });
  const h36 = await prisma.household.create({ data: { address1: "53 Byng Avenue",          city: "Toronto", province: "ON", postalCode: "M4L 3P2", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6878, lng: -79.2912 } });
  const h37 = await prisma.household.create({ data: { address1: "161 Pharmacy Avenue",     city: "Toronto", province: "ON", postalCode: "M1L 3G4", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6862, lng: -79.2935 } });
  const h38 = await prisma.household.create({ data: { address1: "74 Birchmount Road",      city: "Toronto", province: "ON", postalCode: "M1N 3H1", ward: "Ward 12", riding: "Toronto—Danforth", campaignId: campaign.id, lat: 43.6849, lng: -79.2958 } });
  console.log("✅ 30 new households seeded (Polls 4, 7, 12, 15, 18)");

  // ── Expanded Contacts: 59 voters across 30 households ─────────────────────
  await prisma.contact.createMany({ data: [
    // ── Poll 4: Woodbine / Danforth ──────────────────────────────────────────
    { campaignId: campaign.id, householdId: h9.id,   firstName: "Elena",    lastName: "Marchetti",     email: "e.marchetti@gmail.com",     phone: "416-555-2001", address1: "24 Woodbine Avenue",      city: "Toronto", province: "ON", postalCode: "M4E 2H6", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.strong_support,    issues: ["Transit","Housing"],     signRequested: true,  volunteerInterest: true },
    { campaignId: campaign.id, householdId: h9.id,   firstName: "Guido",    lastName: "Marchetti",     email: "guido.marchetti@email.ca",  phone: "416-555-2002", address1: "24 Woodbine Avenue",      city: "Toronto", province: "ON", postalCode: "M4E 2H6", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.leaning_support,   issues: ["Transit"] },
    { campaignId: campaign.id, householdId: h10.id,  firstName: "Van Thanh",lastName: "Nguyen",        email: "vtnguyen@mail.ca",          phone: "416-555-2003", address1: "118 Eastwood Road",       city: "Toronto", province: "ON", postalCode: "M4E 1Y4", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.undecided,         issues: ["Housing"],               followUpNeeded: true, notes: "Concerned about rent increases." },
    { campaignId: campaign.id, householdId: h10.id,  firstName: "Lan",      lastName: "Nguyen",        email: "lan.nguyen@email.com",       phone: "416-555-2004", address1: "118 Eastwood Road",       city: "Toronto", province: "ON", postalCode: "M4E 1Y4", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.undecided,         issues: ["Housing"] },
    { campaignId: campaign.id, householdId: h10.id,  firstName: "Kim",      lastName: "Nguyen",                                            phone: "416-555-2005", address1: "118 Eastwood Road",       city: "Toronto", province: "ON", postalCode: "M4E 1Y4", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.leaning_support,   issues: ["Environment"] },
    { campaignId: campaign.id, householdId: h11.id,  firstName: "Isabel",   lastName: "Ferreira",      email: "isabel.ferreira@rn.ca",     phone: "416-555-2006", address1: "72 Lawson Avenue",        city: "Toronto", province: "ON", postalCode: "M4E 3A2", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.strong_support,    issues: ["Housing","Safety"],       volunteerInterest: true, notes: "Works nights. Available weekends." },
    { campaignId: campaign.id, householdId: h11.id,  firstName: "William",  lastName: "Ferreira",      email: "wferreira@gmail.com",        phone: "416-555-2007", address1: "72 Lawson Avenue",        city: "Toronto", province: "ON", postalCode: "M4E 3A2", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.strong_support,    issues: ["Transit"] },
    { campaignId: campaign.id, householdId: h12x.id, firstName: "Deepa",    lastName: "Krishnamurthy", email: "deepa.k@hotmail.com",        phone: "416-555-2008", address1: "205 Eastdale Avenue",     city: "Toronto", province: "ON", postalCode: "M4C 1M8", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.leaning_support,   issues: ["Seniors","Housing"] },
    { campaignId: campaign.id, householdId: h12x.id, firstName: "Raj",      lastName: "Krishnamurthy",                                     phone: "416-555-2009", address1: "205 Eastdale Avenue",     city: "Toronto", province: "ON", postalCode: "M4C 1M8", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.undecided,         issues: ["Transit"] },
    { campaignId: campaign.id, householdId: h13.id,  firstName: "June",     lastName: "Ababio",        email: "june.ababio@gmail.com",      phone: "416-555-2010", address1: "33 Clonmore Drive",       city: "Toronto", province: "ON", postalCode: "M4E 1S3", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.strong_support,    issues: ["Housing","Environment"],  signRequested: true },
    { campaignId: campaign.id, householdId: h13.id,  firstName: "Kevin",    lastName: "Ababio",        email: "kababio@university.ca",      phone: "416-555-2011", address1: "33 Clonmore Drive",       city: "Toronto", province: "ON", postalCode: "M4E 1S3", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.leaning_support,   issues: ["Environment"] },
    { campaignId: campaign.id, householdId: h14.id,  firstName: "Ian",      lastName: "Blackwood",                                         phone: "416-555-2012", address1: "441 Woodbine Avenue",     city: "Toronto", province: "ON", postalCode: "M4E 2H9", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.leaning_opposition, issues: ["Safety"],               followUpNeeded: true },
    { campaignId: campaign.id, householdId: h14.id,  firstName: "Helen",    lastName: "Chen",          email: "helen.chen@rogers.ca",       phone: "416-555-2013", address1: "441 Woodbine Avenue",     city: "Toronto", province: "ON", postalCode: "M4E 2H9", ward: "Ward 12", municipalPoll: "Poll 4",  supportLevel: SupportLevel.undecided,         issues: ["Housing","Seniors"] },
    // ── Poll 7: Coxwell / Danforth ───────────────────────────────────────────
    { campaignId: campaign.id, householdId: h15.id,  firstName: "Keisha",   lastName: "Brown",         email: "keisha.brown@outlook.com",   phone: "416-555-2014", address1: "15 Swanwick Avenue",      city: "Toronto", province: "ON", postalCode: "M4J 1N2", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.strong_support,    issues: ["Housing","Safety"],       volunteerInterest: true, notes: "Has car. Can do sign drops." },
    { campaignId: campaign.id, householdId: h15.id,  firstName: "Antoine",  lastName: "Brown",         email: "abrown@email.ca",            phone: "416-555-2015", address1: "15 Swanwick Avenue",      city: "Toronto", province: "ON", postalCode: "M4J 1N2", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.leaning_support,   issues: ["Transit"] },
    { campaignId: campaign.id, householdId: h16.id,  firstName: "Pierre",   lastName: "Tremblay",      email: "pierre.tremblay@bell.ca",    phone: "416-555-2016", address1: "90 Glebemount Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 1T8", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.strong_opposition, issues: ["Safety"],               notes: "Vocal at last town hall. Opposes bike lanes." },
    { campaignId: campaign.id, householdId: h16.id,  firstName: "Monique",  lastName: "Tremblay",      email: "m.tremblay@gmail.com",       phone: "416-555-2017", address1: "90 Glebemount Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 1T8", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.undecided,         issues: ["Housing"],               followUpNeeded: true },
    { campaignId: campaign.id, householdId: h17.id,  firstName: "Maria",    lastName: "Santos",        email: "maria.santos@mail.ca",       phone: "416-555-2018", address1: "262 Cedarvale Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 4G9", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.strong_support,    issues: ["Housing","Seniors"],      signRequested: true },
    { campaignId: campaign.id, householdId: h17.id,  firstName: "Raul",     lastName: "Santos",        email: "raul.santos@gmail.com",      phone: "416-555-2019", address1: "262 Cedarvale Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 4G9", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.leaning_support,   issues: ["Transit"] },
    { campaignId: campaign.id, householdId: h18.id,  firstName: "Samuel",   lastName: "Adeyemi",       email: "sadeyemi@student.ca",        phone: "416-555-2020", address1: "47 Roseheath Avenue",     city: "Toronto", province: "ON", postalCode: "M4J 1R5", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.leaning_support,   issues: ["Environment","Transit"] },
    { campaignId: campaign.id, householdId: h18.id,  firstName: "Adaeze",   lastName: "Adeyemi",       email: "adaeze.a@hotmail.com",       phone: "416-555-2021", address1: "47 Roseheath Avenue",     city: "Toronto", province: "ON", postalCode: "M4J 1R5", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.strong_support,    issues: ["Housing"],               volunteerInterest: true },
    { campaignId: campaign.id, householdId: h19.id,  firstName: "Lena",     lastName: "Petrov",        email: "lena.petrov@gmail.com",      phone: "416-555-2022", address1: "135 Coxwell Avenue",      city: "Toronto", province: "ON", postalCode: "M4C 3X1", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.undecided,         issues: ["Safety"],               followUpNeeded: true },
    { campaignId: campaign.id, householdId: h19.id,  firstName: "Boris",    lastName: "Petrov",                                            phone: "416-555-2023", address1: "135 Coxwell Avenue",      city: "Toronto", province: "ON", postalCode: "M4C 3X1", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.leaning_opposition },
    { campaignId: campaign.id, householdId: h20.id,  firstName: "Omar",     lastName: "Hassan",        email: "o.hassan@gmail.com",         phone: "416-555-2024", address1: "58 Langford Avenue",      city: "Toronto", province: "ON", postalCode: "M4J 3A2", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.strong_support,    issues: ["Housing","Safety"] },
    { campaignId: campaign.id, householdId: h20.id,  firstName: "Dana",     lastName: "Hassan",        email: "dana.hassan@outlook.com",    phone: "416-555-2025", address1: "58 Langford Avenue",      city: "Toronto", province: "ON", postalCode: "M4J 3A2", ward: "Ward 12", municipalPoll: "Poll 7",  supportLevel: SupportLevel.undecided,         issues: ["Environment"] },
    // ── Poll 12: Greenwood / Kingston Road ───────────────────────────────────
    { campaignId: campaign.id, householdId: h21.id,  firstName: "Judith",   lastName: "Mensah",        email: "judith.mensah@yahoo.ca",     phone: "416-555-2026", address1: "88 Greenwood Avenue",     city: "Toronto", province: "ON", postalCode: "M4L 2P6", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.strong_support,    issues: ["Housing","Seniors"] },
    { campaignId: campaign.id, householdId: h21.id,  firstName: "Brian",    lastName: "Mensah",        email: "b.mensah@gmail.com",         phone: "416-555-2027", address1: "88 Greenwood Avenue",     city: "Toronto", province: "ON", postalCode: "M4L 2P6", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.leaning_support,   issues: ["Transit"] },
    { campaignId: campaign.id, householdId: h22.id,  firstName: "Vanessa",  lastName: "Rodrigues",     email: "v.rodrigues@rogers.ca",      phone: "416-555-2028", address1: "345 Kingston Road",       city: "Toronto", province: "ON", postalCode: "M4L 1T8", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.undecided,                                    followUpNeeded: true, notes: "Wants more info on transit plans." },
    { campaignId: campaign.id, householdId: h23.id,  firstName: "Stanley",  lastName: "Kozlowski",     email: "s.kozlowski@bell.ca",        phone: "416-555-2029", address1: "12 Courcelette Road",     city: "Toronto", province: "ON", postalCode: "M4L 3K2", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.leaning_opposition, issues: ["Safety"] },
    { campaignId: campaign.id, householdId: h23.id,  firstName: "Irena",    lastName: "Kozlowski",                                         phone: "416-555-2030", address1: "12 Courcelette Road",     city: "Toronto", province: "ON", postalCode: "M4L 3K2", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.leaning_opposition },
    { campaignId: campaign.id, householdId: h23.id,  firstName: "Anna",     lastName: "Kozlowski",     email: "anna.k@hotmail.com",         phone: "416-555-2031", address1: "12 Courcelette Road",     city: "Toronto", province: "ON", postalCode: "M4L 3K2", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.leaning_support,   issues: ["Environment"] },
    { campaignId: campaign.id, householdId: h24.id,  firstName: "Paul",     lastName: "Chang",         email: "paul.chang@company.ca",      phone: "416-555-2032", address1: "67 Kenilworth Avenue",    city: "Toronto", province: "ON", postalCode: "M4L 3S5", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.strong_support,    issues: ["Transit","Environment"] },
    { campaignId: campaign.id, householdId: h24.id,  firstName: "Betty",    lastName: "Chang",         email: "betty.chang@gmail.com",      phone: "416-555-2033", address1: "67 Kenilworth Avenue",    city: "Toronto", province: "ON", postalCode: "M4L 3S5", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.strong_support,    issues: ["Housing"],               signRequested: true },
    { campaignId: campaign.id, householdId: h25.id,  firstName: "Michael",  lastName: "O'Brien",       email: "mobrien@union.ca",           phone: "416-555-2034", address1: "183 Gerrard Street East", city: "Toronto", province: "ON", postalCode: "M5A 2E5", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.leaning_support,   issues: ["Transit","Safety"],      notes: "Union rep. Influential in the riding." },
    { campaignId: campaign.id, householdId: h26.id,  firstName: "Fatou",    lastName: "Diallo",        email: "fatou.diallo@gmail.com",     phone: "416-555-2035", address1: "29 Beech Avenue",         city: "Toronto", province: "ON", postalCode: "M4E 3H2", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.strong_support,    issues: ["Housing","Safety"],      volunteerInterest: true },
    { campaignId: campaign.id, householdId: h26.id,  firstName: "Ibrahima", lastName: "Diallo",        email: "ibrahima.d@mail.ca",         phone: "416-555-2036", address1: "29 Beech Avenue",         city: "Toronto", province: "ON", postalCode: "M4E 3H2", ward: "Ward 12", municipalPoll: "Poll 12", supportLevel: SupportLevel.leaning_support },
    // ── Poll 15: Main / Danforth ─────────────────────────────────────────────
    { campaignId: campaign.id, householdId: h27.id,  firstName: "Dorothy",  lastName: "Chambers",      email: "d.chambers@rogers.ca",       phone: "416-555-2037", address1: "190 Main Street",         city: "Toronto", province: "ON", postalCode: "M4E 2W1", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.strong_support,    issues: ["Seniors","Transit"] },
    { campaignId: campaign.id, householdId: h27.id,  firstName: "Harold",   lastName: "Chambers",                                          phone: "416-555-2038", address1: "190 Main Street",         city: "Toronto", province: "ON", postalCode: "M4E 2W1", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.leaning_support,   issues: ["Safety"] },
    { campaignId: campaign.id, householdId: h28.id,  firstName: "Rosa",     lastName: "Delgado",       email: "rosa.delgado@hotmail.com",   phone: "416-555-2039", address1: "73 Bowood Avenue",        city: "Toronto", province: "ON", postalCode: "M4N 2Y8", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.undecided,         issues: ["Housing"],               followUpNeeded: true },
    { campaignId: campaign.id, householdId: h28.id,  firstName: "Jose",     lastName: "Delgado",       email: "jose.delgado@mail.ca",       phone: "416-555-2040", address1: "73 Bowood Avenue",        city: "Toronto", province: "ON", postalCode: "M4N 2Y8", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.leaning_opposition, issues: ["Safety"] },
    { campaignId: campaign.id, householdId: h28.id,  firstName: "Lucia",    lastName: "Delgado",       email: "lucia.d@email.ca",           phone: "416-555-2041", address1: "73 Bowood Avenue",        city: "Toronto", province: "ON", postalCode: "M4N 2Y8", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.leaning_support },
    { campaignId: campaign.id, householdId: h29.id,  firstName: "Jason",    lastName: "Wu",            email: "jason.wu@techfirm.ca",       phone: "416-555-2042", address1: "44 Hannaford Street",     city: "Toronto", province: "ON", postalCode: "M4E 3G8", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.strong_support,    issues: ["Transit","Environment"], signRequested: true, volunteerInterest: true, notes: "Works in tech. Donated $500. Wants to host fundraiser." },
    { campaignId: campaign.id, householdId: h29.id,  firstName: "Lisa",     lastName: "Wu",            email: "lwu@gmail.com",              phone: "416-555-2043", address1: "44 Hannaford Street",     city: "Toronto", province: "ON", postalCode: "M4E 3G8", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.strong_support,    issues: ["Housing"] },
    { campaignId: campaign.id, householdId: h30.id,  firstName: "Nina",     lastName: "Varga",         email: "nina.varga@accountant.ca",   phone: "416-555-2044", address1: "156 Dentonia Park Ave",   city: "Toronto", province: "ON", postalCode: "M4B 1M6", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.leaning_support,   issues: ["Housing"] },
    { campaignId: campaign.id, householdId: h30.id,  firstName: "Greg",     lastName: "Varga",                                             phone: "416-555-2045", address1: "156 Dentonia Park Ave",   city: "Toronto", province: "ON", postalCode: "M4B 1M6", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.undecided,         issues: ["Safety"],               followUpNeeded: true },
    { campaignId: campaign.id, householdId: h31.id,  firstName: "Patrick",  lastName: "Mbeki",         email: "p.mbeki@gmail.com",          phone: "416-555-2046", address1: "321 Danforth Avenue",     city: "Toronto", province: "ON", postalCode: "M4K 1P1", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.strong_support,    issues: ["Housing","Environment"], volunteerInterest: true, notes: "Speaks French and Zulu. Eager canvasser." },
    { campaignId: campaign.id, householdId: h32.id,  firstName: "Anne-Marie",lastName: "Bouchard",     email: "ambouchard@bell.ca",         phone: "416-555-2047", address1: "85 Arundel Avenue",       city: "Toronto", province: "ON", postalCode: "M4K 3A3", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.leaning_support,   issues: ["Seniors","Housing"] },
    { campaignId: campaign.id, householdId: h32.id,  firstName: "Claude",   lastName: "Bouchard",                                          phone: "416-555-2048", address1: "85 Arundel Avenue",       city: "Toronto", province: "ON", postalCode: "M4K 3A3", ward: "Ward 12", municipalPoll: "Poll 15", supportLevel: SupportLevel.undecided },
    // ── Poll 18: Victoria Park / Warden ──────────────────────────────────────
    { campaignId: campaign.id, householdId: h33.id,  firstName: "Victor",   lastName: "Aguilar",       email: "v.aguilar@contractor.ca",    phone: "416-555-2049", address1: "40 Barrington Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 4Y7", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.strong_support,    issues: ["Housing","Transit"],     signRequested: true },
    { campaignId: campaign.id, householdId: h33.id,  firstName: "Carmela",  lastName: "Aguilar",       email: "carmela.a@gmail.com",        phone: "416-555-2050", address1: "40 Barrington Avenue",    city: "Toronto", province: "ON", postalCode: "M4C 4Y7", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.leaning_support,   issues: ["Seniors"] },
    { campaignId: campaign.id, householdId: h34.id,  firstName: "Derek",    lastName: "Lin",           email: "derek.lin@fintech.ca",       phone: "416-555-2051", address1: "98 Elward Boulevard",     city: "Toronto", province: "ON", postalCode: "M1L 3L1", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.strong_support,    issues: ["Transit","Environment"], notes: "Donated $300. Wants to host a fundraiser." },
    { campaignId: campaign.id, householdId: h34.id,  firstName: "Mei",      lastName: "Lin",           email: "mei.lin@pharmacy.ca",        phone: "416-555-2052", address1: "98 Elward Boulevard",     city: "Toronto", province: "ON", postalCode: "M1L 3L1", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.leaning_support,   issues: ["Housing","Safety"] },
    { campaignId: campaign.id, householdId: h35.id,  firstName: "Charlene", lastName: "Foster",        email: "cfoster@mail.ca",            phone: "416-555-2053", address1: "237 Victoria Park Ave",   city: "Toronto", province: "ON", postalCode: "M4E 3S9", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.undecided,         issues: ["Safety"],               followUpNeeded: true },
    { campaignId: campaign.id, householdId: h35.id,  firstName: "Roy",      lastName: "Foster",                                            phone: "416-555-2054", address1: "237 Victoria Park Ave",   city: "Toronto", province: "ON", postalCode: "M4E 3S9", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.leaning_opposition, issues: ["Safety"] },
    { campaignId: campaign.id, householdId: h35.id,  firstName: "Tamara",   lastName: "Foster",        email: "t.foster@student.ca",        phone: "416-555-2055", address1: "237 Victoria Park Ave",   city: "Toronto", province: "ON", postalCode: "M4E 3S9", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.leaning_support,   issues: ["Environment","Transit"] },
    { campaignId: campaign.id, householdId: h36.id,  firstName: "Jasmine",  lastName: "Ali",           email: "jasmine.ali@hotmail.com",    phone: "416-555-2056", address1: "53 Byng Avenue",          city: "Toronto", province: "ON", postalCode: "M4L 3P2", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.strong_support,    issues: ["Housing","Environment"], volunteerInterest: true, notes: "First-time voter. Very enthusiastic." },
    { campaignId: campaign.id, householdId: h37.id,  firstName: "Tony",     lastName: "Russo",         email: "t.russo@plumbing.ca",        phone: "416-555-2057", address1: "161 Pharmacy Avenue",     city: "Toronto", province: "ON", postalCode: "M1L 3G4", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.leaning_support,   issues: ["Transit","Safety"] },
    { campaignId: campaign.id, householdId: h38.id,  firstName: "Diane",    lastName: "Brennan",       email: "diane.brennan@corp.ca",      phone: "416-555-2058", address1: "74 Birchmount Road",      city: "Toronto", province: "ON", postalCode: "M1N 3H1", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.undecided,         issues: ["Housing"],               followUpNeeded: true, notes: "HR manager. Wants to discuss tenant protection." },
    { campaignId: campaign.id, householdId: h38.id,  firstName: "Frank",    lastName: "Guo",           email: "frank.guo@email.ca",         phone: "416-555-2059", address1: "74 Birchmount Road",      city: "Toronto", province: "ON", postalCode: "M1N 3H1", ward: "Ward 12", municipalPoll: "Poll 18", supportLevel: SupportLevel.strong_support,    issues: ["Transit"] },
  ] });
  console.log("✅ 59 contacts across Polls 4, 7, 12, 15, 18");

  // ── Additional interactions on original 10 contacts ─────────────────────────
  await prisma.interaction.createMany({ data: [
    { contactId: contacts[0].id, userId: manager.id,    type: InteractionType.phone_call,      notes: "Follow-up after door visit. Confirmed sign placement, available Saturday.",       supportLevel: SupportLevel.strong_support,   createdAt: new Date(Date.now() - 4  * 86400000) },
    { contactId: contacts[4].id, userId: volunteer1.id, type: InteractionType.door_knock,       notes: "Linda confirmed sign. Wants to host a phone bank evening.",                        supportLevel: SupportLevel.strong_support,   volunteerInterest: true, createdAt: new Date(Date.now() - 8  * 86400000) },
    { contactId: contacts[6].id, userId: volunteer2.id, type: InteractionType.door_knock,       notes: "Sarah engaged on environment/transit. Volunteering with her university group.",    supportLevel: SupportLevel.strong_support,   volunteerInterest: true, createdAt: new Date(Date.now() - 6  * 86400000) },
    { contactId: contacts[3].id, userId: volunteer1.id, type: InteractionType.door_knock,       notes: "Marcus very hostile. Left lit. Do not revisit.",                                   supportLevel: SupportLevel.strong_opposition, createdAt: new Date(Date.now() - 12 * 86400000) },
    { contactId: contacts[8].id, userId: manager.id,    type: InteractionType.phone_call,       notes: "Spoke through daughter. Fatima now leaning support, interested in seniors programme.", supportLevel: SupportLevel.leaning_support, createdAt: new Date(Date.now() - 4 * 86400000) },
    { contactId: contacts[7].id, userId: volunteer2.id, type: InteractionType.door_knock,       notes: "Robert not home again (3rd attempt). Left lit with neighbour.",                    followUpNeeded: true, createdAt: new Date(Date.now() - 2  * 86400000) },
    { contactId: contacts[9].id, userId: admin.id,      type: InteractionType.field_encounter,  notes: "Coffee meeting. Discussed transit and business priorities. Donated $500 on the spot.", supportLevel: SupportLevel.leaning_support, createdAt: new Date(Date.now() - 3 * 86400000) },
  ] });

  // ── 22 additional signs (total 25) — distributed across all polls ──────────
  await prisma.sign.createMany({ data: [
    // Poll 4
    { campaignId: campaign.id, address1: "24 Woodbine Avenue",      city: "Toronto", postalCode: "M4E 2H6", status: SignStatus.installed,  installedAt: new Date(Date.now() - 4  * 86400000), lat: 43.6752, lng: -79.3295 },
    { campaignId: campaign.id, address1: "33 Clonmore Drive",        city: "Toronto", postalCode: "M4E 1S3", status: SignStatus.installed,  installedAt: new Date(Date.now() - 2  * 86400000), lat: 43.6778, lng: -79.3261 },
    { campaignId: campaign.id, address1: "118 Eastwood Road",        city: "Toronto", postalCode: "M4E 1Y4", status: SignStatus.requested,                                                     lat: 43.6741, lng: -79.3312 },
    { campaignId: campaign.id, address1: "72 Lawson Avenue",         city: "Toronto", postalCode: "M4E 3A2", status: SignStatus.requested,                                                     lat: 43.6765, lng: -79.3278 },
    { campaignId: campaign.id, address1: "441 Woodbine Avenue",      city: "Toronto", postalCode: "M4E 2H9", status: SignStatus.installed,  installedAt: new Date(Date.now() - 1  * 86400000), lat: 43.6745, lng: -79.3320 },
    // Poll 7
    { campaignId: campaign.id, address1: "262 Cedarvale Avenue",     city: "Toronto", postalCode: "M4C 4G9", status: SignStatus.installed,  installedAt: new Date(Date.now() - 3  * 86400000), lat: 43.6768, lng: -79.3395 },
    { campaignId: campaign.id, address1: "47 Roseheath Avenue",      city: "Toronto", postalCode: "M4J 1R5", status: SignStatus.installed,  installedAt: new Date(Date.now() - 5  * 86400000), lat: 43.6802, lng: -79.3348 },
    { campaignId: campaign.id, address1: "15 Swanwick Avenue",       city: "Toronto", postalCode: "M4J 1N2", status: SignStatus.requested,                                                     lat: 43.6780, lng: -79.3380 },
    { campaignId: campaign.id, address1: "58 Langford Avenue",       city: "Toronto", postalCode: "M4J 3A2", status: SignStatus.installed,  installedAt: new Date(Date.now() - 6  * 86400000), lat: 43.6772, lng: -79.3382 },
    // Poll 12
    { campaignId: campaign.id, address1: "67 Kenilworth Avenue",     city: "Toronto", postalCode: "M4L 3S5", status: SignStatus.installed,  installedAt: new Date(Date.now() - 2  * 86400000), lat: 43.6715, lng: -79.3202 },
    { campaignId: campaign.id, address1: "88 Greenwood Avenue",      city: "Toronto", postalCode: "M4L 2P6", status: SignStatus.installed,  installedAt: new Date(Date.now() - 7  * 86400000), lat: 43.6720, lng: -79.3195 },
    { campaignId: campaign.id, address1: "29 Beech Avenue",          city: "Toronto", postalCode: "M4E 3H2", status: SignStatus.requested,                                                     lat: 43.6726, lng: -79.3178 },
    { campaignId: campaign.id, address1: "183 Gerrard Street East",  city: "Toronto", postalCode: "M5A 2E5", status: SignStatus.installed,  installedAt: new Date(Date.now() - 4  * 86400000), lat: 43.6698, lng: -79.3228 },
    { campaignId: campaign.id, address1: "345 Kingston Road",        city: "Toronto", postalCode: "M4L 1T8", status: SignStatus.requested,                                                     lat: 43.6708, lng: -79.3215 },
    // Poll 15
    { campaignId: campaign.id, address1: "44 Hannaford Street",      city: "Toronto", postalCode: "M4E 3G8", status: SignStatus.installed,  installedAt: new Date(Date.now() - 1  * 86400000), lat: 43.6802, lng: -79.3098 },
    { campaignId: campaign.id, address1: "321 Danforth Avenue",      city: "Toronto", postalCode: "M4K 1P1", status: SignStatus.installed,  installedAt: new Date(Date.now() - 8  * 86400000), lat: 43.6818, lng: -79.3075 },
    { campaignId: campaign.id, address1: "190 Main Street",          city: "Toronto", postalCode: "M4E 2W1", status: SignStatus.installed,  installedAt: new Date(Date.now() - 3  * 86400000), lat: 43.6815, lng: -79.3082 },
    { campaignId: campaign.id, address1: "85 Arundel Avenue",        city: "Toronto", postalCode: "M4K 3A3", status: SignStatus.requested,                                                     lat: 43.6808, lng: -79.3089 },
    // Poll 18
    { campaignId: campaign.id, address1: "40 Barrington Avenue",     city: "Toronto", postalCode: "M4C 4Y7", status: SignStatus.installed,  installedAt: new Date(Date.now() - 2  * 86400000), lat: 43.6855, lng: -79.2945 },
    { campaignId: campaign.id, address1: "53 Byng Avenue",           city: "Toronto", postalCode: "M4L 3P2", status: SignStatus.installed,  installedAt: new Date(Date.now() - 4  * 86400000), lat: 43.6878, lng: -79.2912 },
    { campaignId: campaign.id, address1: "98 Elward Boulevard",      city: "Toronto", postalCode: "M1L 3L1", status: SignStatus.installed,  installedAt: new Date(Date.now() - 5  * 86400000), lat: 43.6869, lng: -79.2928 },
    { campaignId: campaign.id, address1: "161 Pharmacy Avenue",      city: "Toronto", postalCode: "M1L 3G4", status: SignStatus.requested,                                                     lat: 43.6862, lng: -79.2935 },
  ] });
  console.log("✅ 22 additional signs (25 total across all polls)");

  // ── 12 Donations ───────────────────────────────────────────────────────────
  await prisma.donation.createMany({ data: [
    { campaignId: campaign.id, contactId: contacts[0].id, recordedById: volunteer1.id, amount: 200,  status: DonationStatus.receipted,  method: "e-transfer", notes: "Jennifer Walsh — door donation",                    collectedAt: new Date(Date.now() - 7  * 86400000), processedAt: new Date(Date.now() - 6  * 86400000) },
    { campaignId: campaign.id, contactId: contacts[4].id, recordedById: manager.id,    amount: 500,  status: DonationStatus.receipted,  method: "cheque",     notes: "Linda Osei — mailed cheque",                        collectedAt: new Date(Date.now() - 14 * 86400000), processedAt: new Date(Date.now() - 13 * 86400000) },
    { campaignId: campaign.id, contactId: contacts[6].id, recordedById: volunteer1.id, amount: 100,  status: DonationStatus.processed,  method: "cash",       notes: "Sarah Kim — cash at door",                          collectedAt: new Date(Date.now() - 5  * 86400000), processedAt: new Date(Date.now() - 5  * 86400000) },
    { campaignId: campaign.id, contactId: contacts[9].id, recordedById: manager.id,    amount: 500,  status: DonationStatus.receipted,  method: "e-transfer", notes: "Grant Morrison — business donation after meeting",   collectedAt: new Date(Date.now() - 3  * 86400000), processedAt: new Date(Date.now() - 2  * 86400000) },
    { campaignId: campaign.id, contactId: contacts[1].id, recordedById: volunteer1.id, amount: 50,   status: DonationStatus.pledged,    method: "cash",       notes: "David Walsh — pledged at door",                     collectedAt: new Date(Date.now() - 7  * 86400000) },
    { campaignId: campaign.id, contactId: contacts[8].id, recordedById: manager.id,    amount: 150,  status: DonationStatus.processed,  method: "e-transfer", notes: "Fatima Al-Hassan — daughter helped at door",        collectedAt: new Date(Date.now() - 10 * 86400000), processedAt: new Date(Date.now() - 9  * 86400000) },
    { campaignId: campaign.id,                             recordedById: treasurer.id,  amount: 300,  status: DonationStatus.receipted,  method: "cheque",     notes: "Anonymous — walk-in at campaign office",            collectedAt: new Date(Date.now() - 20 * 86400000), processedAt: new Date(Date.now() - 19 * 86400000) },
    { campaignId: campaign.id,                             recordedById: treasurer.id,  amount: 250,  status: DonationStatus.processed,  method: "e-transfer", notes: "Online donation via website",                       collectedAt: new Date(Date.now() - 15 * 86400000), processedAt: new Date(Date.now() - 15 * 86400000) },
    { campaignId: campaign.id, contactId: contacts[0].id, recordedById: manager.id,    amount: 100,  status: DonationStatus.receipted,  method: "credit",     notes: "Jennifer Walsh — second donation for signs fund",   collectedAt: new Date(Date.now() - 2  * 86400000), processedAt: new Date(Date.now() - 1  * 86400000) },
    { campaignId: campaign.id,                             recordedById: treasurer.id,  amount: 1000, status: DonationStatus.receipted,  method: "cheque",     notes: "Max donation — neighbour referral",                 collectedAt: new Date(Date.now() - 25 * 86400000), processedAt: new Date(Date.now() - 24 * 86400000) },
    { campaignId: campaign.id, contactId: contacts[4].id, recordedById: volunteer1.id, amount: 75,   status: DonationStatus.pledged,    method: "cash",       notes: "Linda Osei — pledged at phone bank",                collectedAt: new Date(Date.now() - 1  * 86400000) },
    { campaignId: campaign.id,                             recordedById: manager.id,    amount: 400,  status: DonationStatus.processed,  method: "e-transfer", notes: "Event donation — town hall night",                  collectedAt: new Date(Date.now() - 30 * 86400000), processedAt: new Date(Date.now() - 29 * 86400000) },
  ] });
  console.log("✅ 12 donations seeded");

  // ── 4 Events (2 past completed, 2 upcoming scheduled) ──────────────────────
  await prisma.event.createMany({ data: [
    { campaignId: campaign.id, name: "Affordable Housing Forum — Ward 12",    slug: "housing-forum-mar-2026",  eventDate: new Date(Date.now() - 21 * 86400000), location: "S.H. Armstrong Community Recreation Centre", address1: "56 Woodward Avenue",    city: "Toronto", province: "ON", postalCode: "M4L 3P1", lat: 43.6710, lng: -79.3225, capacity: 80, description: "Community forum on affordable housing, tenant rights, and what Ward 12 needs from the next councillor.", eventType: "townhall",          status: EventStatus.completed,  visibility: EventVisibility.public,    isPublic: true,  isTownhall: true },
    { campaignId: campaign.id, name: "Volunteer Kickoff — Let's Win Ward 12!",slug: "vol-kickoff-feb-2026",    eventDate: new Date(Date.now() - 35 * 86400000), location: "Campaign Office — 890 Danforth Avenue",    address1: "890 Danforth Avenue",   city: "Toronto", province: "ON", postalCode: "M4J 1L7", lat: 43.6783, lng: -79.3360, capacity: 40, description: "Kickoff for the volunteer team. Training, turf assignments, and campaign introduction.",              eventType: "volunteer_training", status: EventStatus.completed,  visibility: EventVisibility.internal, isPublic: false },
    { campaignId: campaign.id, name: "Meet Sam Rivera — East Ward 12",        slug: "meet-sam-east-apr-2026",  eventDate: new Date(Date.now() + 14 * 86400000), location: "Main Square Community Centre",              address1: "150 Main Street",       city: "Toronto", province: "ON", postalCode: "M4E 2V6", lat: 43.6818, lng: -79.3080, capacity: 60, description: "Informal meet-and-greet in the east end of Ward 12. Light refreshments. All welcome.",              eventType: "meet_and_greet",    status: EventStatus.scheduled,  visibility: EventVisibility.public,    isPublic: true,  allowPublicRsvp: true },
    { campaignId: campaign.id, name: "GOTV Volunteer Training — Final Push",  slug: "gotv-training-may-2026",  eventDate: new Date(Date.now() + 28 * 86400000), location: "Campaign Office — 890 Danforth Avenue",    address1: "890 Danforth Avenue",   city: "Toronto", province: "ON", postalCode: "M4J 1L7", lat: 43.6783, lng: -79.3360, capacity: 50, description: "Final canvasser and GOTV training before the October vote. All volunteers must attend.",            eventType: "volunteer_training", status: EventStatus.scheduled,  visibility: EventVisibility.internal, isPublic: false },
  ] });
  console.log("✅ 4 events seeded");

  // ── 3 Field Assignments with poll targeting ─────────────────────────────────
  const fa1 = await prisma.fieldAssignment.create({ data: { campaignId: campaign.id, assignmentType: AssignmentType.canvass,  name: "Poll 4 & 7 — April Blitz",    description: "Eastern corridor canvass. Priority: undecided in Polls 4 and 7.",    status: AssignmentStatus.in_progress, targetWard: "Ward 12", targetPolls: ["Poll 4","Poll 7"],   assignedUserId: volunteer1.id, scheduledDate: new Date(Date.now() - 3 * 86400000), startedAt: new Date(Date.now() - 3 * 86400000), createdById: field.id } });
  const fa2 = await prisma.fieldAssignment.create({ data: { campaignId: campaign.id, assignmentType: AssignmentType.canvass,  name: "Poll 15 & 18 — West-End Run", description: "Main/Danforth and Victoria Park corridor canvass.",                  status: AssignmentStatus.published,   targetWard: "Ward 12", targetPolls: ["Poll 15","Poll 18"], assignedUserId: volunteer2.id, scheduledDate: new Date(Date.now() + 2 * 86400000),                                                    createdById: field.id } });
  const fa3 = await prisma.fieldAssignment.create({ data: { campaignId: campaign.id, assignmentType: AssignmentType.lit_drop, name: "Poll 12 — Lit Drop",          description: "Literature drop for Greenwood/Kingston Road corridor.",             status: AssignmentStatus.draft,       targetWard: "Ward 12", targetPolls: ["Poll 12"],          assignedUserId: field.id,      scheduledDate: new Date(Date.now() + 5 * 86400000),                                                    createdById: manager.id } });

  // ── Assignment stops (fa1 in-progress, fa2/fa3 queued) ─────────────────────
  await prisma.assignmentStop.createMany({ data: [
    { assignmentId: fa1.id, householdId: h9.id,   order: 1, status: StopStatus.completed, completedAt: new Date(Date.now() - 3 * 86400000), completedById: volunteer1.id },
    { assignmentId: fa1.id, householdId: h10.id,  order: 2, status: StopStatus.not_home },
    { assignmentId: fa1.id, householdId: h11.id,  order: 3, status: StopStatus.completed, completedAt: new Date(Date.now() - 3 * 86400000), completedById: volunteer1.id },
    { assignmentId: fa1.id, householdId: h12x.id, order: 4, status: StopStatus.pending },
    { assignmentId: fa1.id, householdId: h13.id,  order: 5, status: StopStatus.completed, completedAt: new Date(Date.now() - 2 * 86400000), completedById: volunteer1.id },
    { assignmentId: fa1.id, householdId: h14.id,  order: 6, status: StopStatus.pending },
    { assignmentId: fa1.id, householdId: h15.id,  order: 7, status: StopStatus.completed, completedAt: new Date(Date.now() - 3 * 86400000), completedById: volunteer1.id },
    { assignmentId: fa1.id, householdId: h16.id,  order: 8, status: StopStatus.skipped },
    { assignmentId: fa1.id, householdId: h17.id,  order: 9, status: StopStatus.pending },
    { assignmentId: fa2.id, householdId: h27.id,  order: 1, status: StopStatus.pending },
    { assignmentId: fa2.id, householdId: h28.id,  order: 2, status: StopStatus.pending },
    { assignmentId: fa2.id, householdId: h29.id,  order: 3, status: StopStatus.pending },
    { assignmentId: fa2.id, householdId: h33.id,  order: 4, status: StopStatus.pending },
    { assignmentId: fa2.id, householdId: h34.id,  order: 5, status: StopStatus.pending },
    { assignmentId: fa3.id, householdId: h21.id,  order: 1, status: StopStatus.pending },
    { assignmentId: fa3.id, householdId: h22.id,  order: 2, status: StopStatus.pending },
    { assignmentId: fa3.id, householdId: h23.id,  order: 3, status: StopStatus.pending },
    { assignmentId: fa3.id, householdId: h24.id,  order: 4, status: StopStatus.pending },
    { assignmentId: fa3.id, householdId: h25.id,  order: 5, status: StopStatus.pending },
    { assignmentId: fa3.id, householdId: h26.id,  order: 6, status: StopStatus.pending },
  ] });
  console.log("✅ 3 field assignments + 20 assignment stops");

  // ── Demo Campaign for admin@pollcity.dev ───────────────────────────────────
  const demoCampaign = await prisma.campaign.upsert({
    where: { slug: "demo-campaign-2026" },
    update: { isPublic: true, isActive: true, isDemo: true, onboardingComplete: true },
    create: {
      name: "Demo Campaign 2026",
      slug: "demo-campaign-2026",
      description: "Demo campaign for platform evaluation and testing.",
      electionType: ElectionType.municipal,
      jurisdiction: "Ward 1",
      electionDate: new Date("2026-10-26"),
      advanceVoteStart: new Date("2026-10-16"),
      advanceVoteEnd: new Date("2026-10-18"),
      candidateName: "Demo Candidate",
      candidateTitle: "Ward 1 Councillor Candidate",
      candidateBio: "Demo Candidate is running for Ward 1 council to demonstrate the full capabilities of Poll City.",
      primaryColor: "#1e40af",
      isPublic: true,
      isActive: true,
      isDemo: true,
      onboardingComplete: true, // demo campaigns skip the setup wizard
    },
  });

  // Assign admin as ADMIN on the demo campaign
  await prisma.membership.upsert({
    where: { userId_campaignId: { userId: admin.id, campaignId: demoCampaign.id } },
    update: { role: Role.ADMIN },
    create: { userId: admin.id, campaignId: demoCampaign.id, role: Role.ADMIN },
  });

  // Set admin's active campaign so they land on demo campaign after login
  await prisma.user.update({
    where: { id: admin.id },
    data: { activeCampaignId: demoCampaign.id },
  });

  console.log("✅ Demo Campaign 2026 created, admin active campaign set\n");

  console.log("════════════════════════════════════════════════════");
  console.log("🚀 Poll City ecosystem seed complete!\n");
  console.log("CAMPAIGN APP:  admin@pollcity.dev      / password123  (George Hatzis — SUPER_ADMIN)");
  console.log("               manager@pollcity.dev    / password123  (Rachel Dubois — Campaign Manager)");
  console.log("               comms@pollcity.dev      / password123  (Marcus Chen — Comms Director)");
  console.log("               field@pollcity.dev      / password123  (Priya Okonkwo — Field Director)");
  console.log("               data@pollcity.dev       / password123  (Sanjay Patel — Data Manager)");
  console.log("               volunteers@pollcity.dev / password123  (Amara Osei — Volunteer Coord)");
  console.log("               treasurer@pollcity.dev  / password123  (Linda Kowalski — Treasurer)");
  console.log("               events@pollcity.dev     / password123  (Carlos Beaumont — Events)");
  console.log("               volunteer@pollcity.dev  / password123  (Val Morrison — Volunteer)");
  console.log("               volunteer2@pollcity.dev / password123  (James Fontaine — Volunteer)");
  console.log("SOCIAL APP:    voter@pollcity.dev      / password123  (Pat Public)\n");
  console.log("3 officials · 69 contacts · 10 team members · 20 polls · 25 signs · 12 donations · 4 events · 3 field assignments");
  console.log("════════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

// This runs after main() — add to the bottom of the main function body
// Sample custom fields will be added inline below
