import {
  PrismaClient, Role, SupportLevel, ElectionType, InteractionType,
  TaskStatus, TaskPriority, GovernmentLevel, PollType, PollVisibility,
  SignStatus, SupportSignalType, DonationStatus, EventStatus, EventVisibility,
  AssignmentType, AssignmentStatus, StopStatus, EventRsvpStatus, Prisma,
  FinanceBudgetStatus, FinanceBudgetLineCategory, FinanceVendorType,
  FinanceExpenseStatus, FinancePaymentStatus, FinancePaymentMethod,
  FinanceSourceType, FinancePurchaseRequestStatus, FinancePurchaseOrderStatus,
  FinanceVendorBillStatus, FinanceReimbursementStatus, FinanceBudgetTransferStatus,
  FinanceUrgency,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

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

  // ── VOTER FILE SIMULATION — 25 polls, ~6 000 households, ~14 400 contacts ──
  // Represents a CM having just uploaded their Elections Canada voter list.
  const VOTER_FIRST_M = ["James","Robert","John","David","William","Richard","Joseph","Thomas","Charles","Daniel","Matthew","Anthony","Mark","Andrew","Paul","Joshua","Kevin","Brian","George","Samuel","Timothy","Patrick","Ryan","Eric","Jeffrey","Frank","Scott","Raymond","Gregory","Walter","Peter","Harold","Douglas","Henry","Carl","Arthur","Lawrence","Donald","Gerald","Wayne"];
  const VOTER_FIRST_F = ["Mary","Patricia","Jennifer","Linda","Barbara","Susan","Jessica","Karen","Sarah","Lisa","Nancy","Betty","Margaret","Sandra","Ashley","Dorothy","Kimberly","Emily","Donna","Michelle","Carol","Amanda","Melissa","Deborah","Stephanie","Rebecca","Sharon","Laura","Cynthia","Amy","Angela","Helen","Anna","Brenda","Virginia","Katherine","Diane","Joyce","Victoria","Julie"];
  const VOTER_LAST   = ["Smith","Brown","Johnson","Williams","Jones","Davis","Miller","Wilson","Moore","Taylor","Anderson","Jackson","White","Harris","Martin","Thompson","Garcia","Martinez","Robinson","Clark","Lewis","Walker","Hall","Allen","Young","Hernandez","King","Wright","Lopez","Hill","Scott","Green","Adams","Baker","Gonzalez","Nelson","Carter","Mitchell","Perez","Roberts","Nguyen","Kim","Patel","Singh","Chen","Zhang","Li","Tremblay","Bouchard","Roy","Gagnon","Osei","Hassan","Adeyemi","Ferreira","Santos","Kowalski","Petrov","Mensah","Diallo","Park","Lee","Guo","Russo","Aguilar","Lin","Wu","Chambers","Chang","Foster","Ali","Mbeki","Ababio","Marchetti"];
  const WARD_STREETS = ["Danforth Avenue","Broadview Avenue","Coxwell Avenue","Main Street","Woodbine Avenue","Kingston Road","Greenwood Avenue","Gerrard Street East","Pape Avenue","Jones Avenue","Logan Avenue","Carlaw Avenue","Hastings Avenue","Strathmore Boulevard","Aldwych Avenue","Glebemount Avenue","Cedarvale Avenue","Swanwick Avenue","Clonmore Drive","Eastwood Road","Lawson Avenue","Roseheath Avenue","Langford Avenue","Arundel Avenue","Bowood Avenue","Hannaford Street","Dentonia Park Avenue","Barrington Avenue","Byng Avenue","Birchmount Road","Pharmacy Avenue","Victoria Park Avenue","Elward Boulevard","Kenilworth Avenue","Beech Avenue","Courcelette Road","Eastdale Avenue","Ferrier Avenue","Mountjoy Avenue","Holborne Avenue"];
  const WARD_POSTALS = ["M4C 1A1","M4C 2B2","M4C 3C3","M4C 4D4","M4J 1A1","M4J 2B2","M4J 3C3","M4K 1A1","M4K 2B2","M4L 1A1","M4L 2B2","M4L 3C3","M4E 1A1","M4E 2B2","M4E 3C3","M4B 1A1","M4B 2B2","M1L 1A1","M1L 2B2","M1N 1A1"];

  const WARD_POLL_LIST = [
    { name: "Poll 1",  totalVoters: 611, lat: 43.6612, lng: -79.3650 },
    { name: "Poll 2",  totalVoters: 587, lat: 43.6624, lng: -79.3620 },
    { name: "Poll 3",  totalVoters: 634, lat: 43.6638, lng: -79.3590 },
    { name: "Poll 4",  totalVoters: 601, lat: 43.6752, lng: -79.3295 },
    { name: "Poll 5",  totalVoters: 578, lat: 43.6598, lng: -79.3700 },
    { name: "Poll 6",  totalVoters: 623, lat: 43.6572, lng: -79.3680 },
    { name: "Poll 7",  totalVoters: 597, lat: 43.6780, lng: -79.3380 },
    { name: "Poll 8",  totalVoters: 611, lat: 43.6645, lng: -79.3540 },
    { name: "Poll 9",  totalVoters: 584, lat: 43.6659, lng: -79.3510 },
    { name: "Poll 10", totalVoters: 628, lat: 43.6673, lng: -79.3480 },
    { name: "Poll 11", totalVoters: 593, lat: 43.6687, lng: -79.3450 },
    { name: "Poll 12", totalVoters: 609, lat: 43.6720, lng: -79.3195 },
    { name: "Poll 13", totalVoters: 576, lat: 43.6700, lng: -79.3140 },
    { name: "Poll 14", totalVoters: 621, lat: 43.6714, lng: -79.3110 },
    { name: "Poll 15", totalVoters: 599, lat: 43.6815, lng: -79.3082 },
    { name: "Poll 16", totalVoters: 617, lat: 43.6728, lng: -79.3080 },
    { name: "Poll 17", totalVoters: 582, lat: 43.6742, lng: -79.3050 },
    { name: "Poll 18", totalVoters: 608, lat: 43.6855, lng: -79.2945 },
    { name: "Poll 19", totalVoters: 591, lat: 43.6756, lng: -79.3020 },
    { name: "Poll 20", totalVoters: 625, lat: 43.6770, lng: -79.2990 },
    { name: "Poll 21", totalVoters: 603, lat: 43.6784, lng: -79.2960 },
    { name: "Poll 22", totalVoters: 579, lat: 43.6798, lng: -79.2930 },
    { name: "Poll 23", totalVoters: 618, lat: 43.6812, lng: -79.2900 },
    { name: "Poll 24", totalVoters: 594, lat: 43.6826, lng: -79.2870 },
    { name: "Poll 25", totalVoters: 607, lat: 43.6840, lng: -79.2840 },
  ];

  const bulkHouseholds: Prisma.HouseholdCreateManyInput[] = [];
  const bulkContacts:   Prisma.ContactCreateManyInput[]   = [];

  for (let pollIdx = 0; pollIdx < WARD_POLL_LIST.length; pollIdx++) {
    const poll = WARD_POLL_LIST[pollIdx];
    for (let hIdx = 0; hIdx < 240; hIdx++) {
      const houseId    = randomUUID();
      const streetIdx  = (pollIdx * 7  + hIdx * 3)  % WARD_STREETS.length;
      const postalIdx  = (pollIdx * 3  + hIdx)       % WARD_POSTALS.length;
      const houseNum   = 10 + pollIdx * 50 + hIdx * 3;
      const votersHere = hIdx % 5 < 2 ? 3 : 2; // 40% triplets, 60% pairs → avg 2.4 → ~14 400 total
      const latOff     = ((hIdx * 7)  % 100 - 50) * 0.00005;
      const lngOff     = ((hIdx * 11) % 100 - 50) * 0.00006;
      const addr       = `${houseNum} ${WARD_STREETS[streetIdx]}`;
      const postal     = WARD_POSTALS[postalIdx];
      bulkHouseholds.push({
        id: houseId,
        address1: addr,
        city: "Toronto",
        province: "ON",
        postalCode: postal,
        ward: "Ward 12",
        riding: "Toronto—Danforth",
        campaignId: campaign.id,
        totalVoters: votersHere,
        lat: poll.lat + latOff,
        lng: poll.lng + lngOff,
      });
      for (let vIdx = 0; vIdx < votersHere; vIdx++) {
        const pool = vIdx === 1 ? VOTER_FIRST_F : VOTER_FIRST_M;
        const fi   = (pollIdx * 7  + hIdx * 3 + vIdx * 5) % pool.length;
        const li   = (pollIdx * 11 + hIdx * 5 + vIdx * 3) % VOTER_LAST.length;
        bulkContacts.push({
          campaignId:   campaign.id,
          householdId:  houseId,
          firstName:    pool[fi],
          lastName:     VOTER_LAST[li],
          address1:     addr,
          city:         "Toronto",
          province:     "ON",
          postalCode:   postal,
          ward:         "Ward 12",
          municipalPoll: poll.name,
        });
      }
    }
  }

  // Batch insert — 500 households per batch, 1 000 contacts per batch
  for (let i = 0; i < bulkHouseholds.length; i += 500) {
    await prisma.household.createMany({ data: bulkHouseholds.slice(i, i + 500) });
  }
  for (let i = 0; i < bulkContacts.length; i += 1000) {
    await prisma.contact.createMany({ data: bulkContacts.slice(i, i + 1000) });
  }
  console.log(`✅ Voter file simulation: ${bulkHouseholds.length} households, ${bulkContacts.length} contacts across 25 polls`);

  // ── ENRICHMENT ── sign notes, removals, event RSVPs, interactions, tasks, logs

  // Sign install notes on all installed signs
  await prisma.sign.updateMany({
    where: { campaignId: campaign.id, status: SignStatus.installed, notes: null },
    data:  { notes: "Installed — resident home, confirmed placement. Sign facing street." },
  });
  // 2 sign removals
  await prisma.sign.updateMany({
    where: { campaignId: campaign.id, address1: "200 Danforth Ave" },
    data:  { status: SignStatus.removed, removedAt: new Date(Date.now() - 1 * 86400000), notes: "Tenant moved out. Landlord requested removal." },
  });
  await prisma.sign.updateMany({
    where: { campaignId: campaign.id, address1: "441 Woodbine Avenue" },
    data:  { status: SignStatus.removed, removedAt: new Date(Date.now() - 2 * 86400000), notes: "Homeowner changed mind after neighbour pressure." },
  });
  console.log("✅ Sign enrichment: install notes + 2 removals");

  // Event RSVPs — query events back by slug (created via createMany so no IDs captured above)
  const [evHousing, evKickoff, evMeetSam, evGotv] = await Promise.all([
    prisma.event.findFirst({ where: { slug: "housing-forum-mar-2026" } }),
    prisma.event.findFirst({ where: { slug: "vol-kickoff-feb-2026" } }),
    prisma.event.findFirst({ where: { slug: "meet-sam-east-apr-2026" } }),
    prisma.event.findFirst({ where: { slug: "gotv-training-may-2026" } }),
  ]);
  if (evHousing && evKickoff && evMeetSam && evGotv) {
    await prisma.eventRsvp.createMany({ data: [
      // Housing Forum — 12 attendees (completed)
      { eventId: evHousing.id, name: "Jennifer Walsh",     email: "jennifer.walsh@email.com",     status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 10 * 60000), source: "canvass",   contactId: contacts[0].id },
      { eventId: evHousing.id, name: "Marcus Thompson",    email: "m.thompson@work.ca",            status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 15 * 60000), source: "website" },
      { eventId: evHousing.id, name: "Priya Sharma",       email: "priya.sharma@gmail.com",        status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() +  5 * 60000), source: "canvass" },
      { eventId: evHousing.id, name: "David Osei",         email: "dosei@hotmail.com",             status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 20 * 60000), source: "canvass" },
      { eventId: evHousing.id, name: "Linda Foster",       email: "lfoster@rogers.ca",             status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() +  8 * 60000), source: "referral" },
      { eventId: evHousing.id, name: "Samuel Park",        email: "sampark@email.ca",              status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 12 * 60000), source: "website" },
      { eventId: evHousing.id, name: "Amara Diallo",       email: "amara.diallo@gmail.com",        status: EventRsvpStatus.no_show,      attended: false, source: "canvass" },
      { eventId: evHousing.id, name: "Kevin Tremblay",     email: "ktremblay@bell.ca",             status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 25 * 60000), source: "referral" },
      { eventId: evHousing.id, name: "Victoria Santos",    email: "vsantos@outlook.com",           status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 18 * 60000), source: "website" },
      { eventId: evHousing.id, name: "Thomas Mensah",      email: "t.mensah@work.ca",              status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 30 * 60000), source: "canvass" },
      { eventId: evHousing.id, name: "Helen Bouchard",     email: "hbouchard@gmail.com",           status: EventRsvpStatus.no_show,      attended: false, source: "website" },
      { eventId: evHousing.id, name: "Grant Morrison",     email: "gmorrison@business.ca",         status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evHousing.eventDate.getTime() + 35 * 60000), source: "canvass",   contactId: contacts[9].id },
      // Volunteer Kickoff — 9 attended (internal)
      { eventId: evKickoff.id, name: "Val Morrison",       email: "volunteer@pollcity.dev",        status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() +  5 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "James Fontaine",     email: "volunteer2@pollcity.dev",       status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() + 10 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Amara Osei",         email: "volunteers@pollcity.dev",       status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() +  8 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Carlos Beaumont",    email: "events@pollcity.dev",           status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() + 12 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Priya Okonkwo",      email: "field@pollcity.dev",            status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() +  3 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Rachel Dubois",      email: "manager@pollcity.dev",          status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() +  1 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Marcus Chen",        email: "comms@pollcity.dev",            status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() +  6 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Sanjay Patel",       email: "data@pollcity.dev",             status: EventRsvpStatus.checked_in,   attended: true,  checkedInAt: new Date(evKickoff.eventDate.getTime() +  9 * 60000), source: "staff" },
      { eventId: evKickoff.id, name: "Linda Kowalski",     email: "treasurer@pollcity.dev",        status: EventRsvpStatus.no_show,      attended: false, source: "staff" },
      // Meet Sam — 8 RSVPs (upcoming, some registered)
      { eventId: evMeetSam.id, name: "Patricia Singh",     email: "psingh@gmail.com",              status: EventRsvpStatus.going,        attended: false, source: "website" },
      { eventId: evMeetSam.id, name: "Robert Gagnon",      email: "r.gagnon@outlook.com",          status: EventRsvpStatus.going,        attended: false, source: "canvass" },
      { eventId: evMeetSam.id, name: "Susan Chambers",     email: "schambers@rogers.ca",           status: EventRsvpStatus.going,        attended: false, source: "website" },
      { eventId: evMeetSam.id, name: "Michael Russo",      email: "mrusso@bell.ca",                status: EventRsvpStatus.interested,   attended: false, source: "website" },
      { eventId: evMeetSam.id, name: "Angela Wu",          email: "awu@hotmail.com",               status: EventRsvpStatus.going,        attended: false, source: "canvass" },
      { eventId: evMeetSam.id, name: "Joseph Petrov",      email: "j.petrov@email.ca",             status: EventRsvpStatus.interested,   attended: false, source: "referral" },
      { eventId: evMeetSam.id, name: "Dorothy Chang",      email: "dchang@gmail.com",              status: EventRsvpStatus.going,        attended: false, source: "website" },
      { eventId: evMeetSam.id, name: "William Aguilar",    email: "waguilar@work.ca",              status: EventRsvpStatus.going,        attended: false, source: "canvass" },
      // GOTV Training — 6 registered (upcoming, internal)
      { eventId: evGotv.id,    name: "Val Morrison",       email: "volunteer@pollcity.dev",        status: EventRsvpStatus.going,        attended: false, source: "staff" },
      { eventId: evGotv.id,    name: "James Fontaine",     email: "volunteer2@pollcity.dev",       status: EventRsvpStatus.going,        attended: false, source: "staff" },
      { eventId: evGotv.id,    name: "Amara Osei",         email: "volunteers@pollcity.dev",       status: EventRsvpStatus.going,        attended: false, source: "staff" },
      { eventId: evGotv.id,    name: "Carlos Beaumont",    email: "events@pollcity.dev",           status: EventRsvpStatus.going,        attended: false, source: "staff" },
      { eventId: evGotv.id,    name: "Priya Okonkwo",      email: "field@pollcity.dev",            status: EventRsvpStatus.going,        attended: false, source: "staff" },
      { eventId: evGotv.id,    name: "New Volunteer A",    email: "newvolunteer.a@gmail.com",      status: EventRsvpStatus.interested,   attended: false, source: "website" },
    ] });
    console.log("✅ 35 event RSVPs seeded across 4 events");
  }

  // More interaction types — text, email, follow_up, field_encounter
  await prisma.interaction.createMany({ data: [
    { contactId: contacts[0].id, userId: volunteer1.id,  type: InteractionType.text,            notes: "Sent Sam's housing platform summary via text. Replied positively.", supportLevel: SupportLevel.strong_support,  createdAt: new Date(Date.now() -  3 * 86400000) },
    { contactId: contacts[1].id, userId: manager.id,     type: InteractionType.email,           notes: "Thank-you email for pledge. Sent donation receipt PDF.",            supportLevel: SupportLevel.strong_support,  createdAt: new Date(Date.now() -  6 * 86400000) },
    { contactId: contacts[3].id, userId: volunteer1.id,  type: InteractionType.follow_up,       notes: "Called back re: safety concerns. Connected with neighbourhood watch program info.", supportLevel: SupportLevel.leaning_support, createdAt: new Date(Date.now() -  4 * 86400000) },
    { contactId: contacts[5].id, userId: field.id,       type: InteractionType.field_encounter, notes: "Met at Danforth farmer's market. Enthusiastic supporter. Wants a lawn sign.", supportLevel: SupportLevel.strong_support, createdAt: new Date(Date.now() -  8 * 86400000) },
    { contactId: contacts[7].id, userId: manager.id,     type: InteractionType.email,           notes: "Invitation to Housing Forum sent. Responded — attending.",          supportLevel: SupportLevel.strong_support,  createdAt: new Date(Date.now() - 22 * 86400000) },
    { contactId: contacts[9].id, userId: manager.id,     type: InteractionType.text,            notes: "Confirmed Housing Forum logistics. Mentioned he may bring two colleagues.", supportLevel: SupportLevel.strong_support, createdAt: new Date(Date.now() - 22 * 86400000) },
    { contactId: contacts[2].id, userId: volunteer1.id,  type: InteractionType.follow_up,       notes: "Re-canvassed. Husband answered. Leaning support now. Left brochure.", supportLevel: SupportLevel.leaning_support, createdAt: new Date(Date.now() -  1 * 86400000) },
  ] });
  console.log("✅ 7 additional interactions seeded (text, email, follow_up, field_encounter)");

  // Operational tasks — 10 covering full campaign workflow
  await prisma.task.createMany({ data: [
    { campaignId: campaign.id, assignedToId: manager.id,    createdById: admin.id,    title: "Follow up with Grant Morrison on May fundraiser co-host",                 status: TaskStatus.pending,     priority: TaskPriority.high,   dueDate: new Date(Date.now() +  7 * 86400000) },
    { campaignId: campaign.id, assignedToId: field.id,      createdById: manager.id,  title: "Finalise Poll 15 & 18 canvass route in Field Ops",                        status: TaskStatus.pending,     priority: TaskPriority.high,   dueDate: new Date(Date.now() +  2 * 86400000) },
    { campaignId: campaign.id, assignedToId: volcoord.id,   createdById: manager.id,  title: "Confirm GOTV Training headcount — send reminder to all registered volunteers", status: TaskStatus.pending, priority: TaskPriority.medium, dueDate: new Date(Date.now() + 21 * 86400000) },
    { campaignId: campaign.id, assignedToId: comms.id,      createdById: manager.id,  title: "Draft social media posts for Meet Sam — East Ward 12 event",              status: TaskStatus.in_progress, priority: TaskPriority.high,   dueDate: new Date(Date.now() +  7 * 86400000) },
    { campaignId: campaign.id, assignedToId: data.id,       createdById: manager.id,  title: "Export Poll 4 contact list for canvass refresher",                        status: TaskStatus.completed,   priority: TaskPriority.medium, dueDate: new Date(Date.now() -  5 * 86400000), completedAt: new Date(Date.now() - 4 * 86400000) },
    { campaignId: campaign.id, assignedToId: treasurer.id,  createdById: admin.id,    title: "Prepare Q1 donation report for candidate review",                         status: TaskStatus.pending,     priority: TaskPriority.medium, dueDate: new Date(Date.now() + 10 * 86400000) },
    { campaignId: campaign.id, assignedToId: events.id,     createdById: manager.id,  title: "Book venue and A/V for GOTV Training — confirm with campaign office",     status: TaskStatus.in_progress, priority: TaskPriority.high,   dueDate: new Date(Date.now() + 14 * 86400000) },
    { campaignId: campaign.id, assignedToId: volunteer1.id, createdById: field.id,    title: "Complete remaining stops on Poll 4 & 7 assignment before Saturday",       status: TaskStatus.pending,     priority: TaskPriority.high,   dueDate: new Date(Date.now() +  4 * 86400000) },
    { campaignId: campaign.id, assignedToId: comms.id,      createdById: manager.id,  title: "Upload housing forum photos to campaign website gallery",                  status: TaskStatus.completed,   priority: TaskPriority.low,    dueDate: new Date(Date.now() - 14 * 86400000), completedAt: new Date(Date.now() - 13 * 86400000) },
    { campaignId: campaign.id, assignedToId: data.id,       createdById: field.id,    title: "Verify all sign installation records in Signs module are up to date",     status: TaskStatus.pending,     priority: TaskPriority.medium, dueDate: new Date(Date.now() +  3 * 86400000) },
  ] });
  console.log("✅ 10 operational tasks seeded");

  // Activity log — 14 entries covering campaign lifecycle events
  await prisma.activityLog.createMany({ data: [
    { campaignId: campaign.id, userId: volunteer1.id, action: "logged_interaction", entityType: "contact", entityId: contacts[4].id, details: { type: "door_knock", contactName: "Linda Osei", supportLevel: "strong_support" } },
    { campaignId: campaign.id, userId: volunteer1.id, action: "logged_interaction", entityType: "contact", entityId: contacts[0].id, details: { type: "door_knock", contactName: "Jennifer Walsh", supportLevel: "strong_support" } },
    { campaignId: campaign.id, userId: manager.id,    action: "donation_received",  entityType: "contact", entityId: contacts[9].id, details: { amount: 500, method: "e-transfer", contactName: "Grant Morrison" } },
    { campaignId: campaign.id, userId: manager.id,    action: "donation_received",  entityType: "contact", entityId: contacts[0].id, details: { amount: 200, method: "e-transfer", contactName: "Jennifer Walsh" } },
    { campaignId: campaign.id, userId: field.id,      action: "sign_installed",     entityType: "sign",    entityId: contacts[0].id, details: { address: "45 Danforth Ave", poll: "Poll 4" } },
    { campaignId: campaign.id, userId: field.id,      action: "sign_installed",     entityType: "sign",    entityId: contacts[4].id, details: { address: "200 Main Street", poll: "Poll 15" } },
    { campaignId: campaign.id, userId: volcoord.id,   action: "volunteer_onboarded",entityType: "user",    entityId: volunteer1.id,  details: { volunteerName: "Val Morrison", skills: ["canvassing", "phone_bank"] } },
    { campaignId: campaign.id, userId: volcoord.id,   action: "volunteer_onboarded",entityType: "user",    entityId: volunteer2.id,  details: { volunteerName: "James Fontaine", skills: ["canvassing", "data_entry"] } },
    { campaignId: campaign.id, userId: field.id,      action: "assignment_created", entityType: "assignment", entityId: fa1.id,     details: { name: "Poll 4 & 7 — April Blitz", stops: 9 } },
    { campaignId: campaign.id, userId: field.id,      action: "assignment_created", entityType: "assignment", entityId: fa2.id,     details: { name: "Poll 15 & 18 — West-End Run", stops: 5 } },
    { campaignId: campaign.id, userId: manager.id,    action: "event_created",      entityType: "event",   entityId: evHousing?.id ?? "", details: { eventName: "Affordable Housing Forum", eventDate: "2026-03-20" } },
    { campaignId: campaign.id, userId: events.id,     action: "event_created",      entityType: "event",   entityId: evMeetSam?.id ?? "", details: { eventName: "Meet Sam Rivera — East Ward 12", eventDate: "2026-04-24" } },
    { campaignId: campaign.id, userId: data.id,       action: "contact_updated",    entityType: "contact", entityId: contacts[3].id, details: { field: "supportLevel", from: "undecided", to: "leaning_support" } },
    { campaignId: campaign.id, userId: volunteer1.id, action: "assignment_stop_completed", entityType: "assignment", entityId: fa1.id, details: { householdAddress: "24 Woodbine Avenue", stopOrder: 1, outcome: "strong_support" } },
  ] });
  console.log("✅ 14 activity log entries seeded");

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

  // ─── PRINT TEMPLATES ────────────────────────────────────────────────────────
  const printTemplates = [
    {
      slug: "lawn-sign-modern",
      name: "Lawn Sign — Modern",
      category: "lawn-sign",
      width: 18,
      height: 24,
      bleed: 0.125,
      sortOrder: 1,
      htmlTemplate: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:{{PRIMARY_COLOR}};font-family:{{FONT_CSS}};display:flex;flex-direction:column}.top-bar{height:3.5vh;background:{{SECONDARY_COLOR}}}.main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4vw 6vw;text-align:center;position:relative}.logo-wrap{position:absolute;top:4vh;left:4vw}.logo-wrap img{max-height:12vh;max-width:22%;width:auto}.candidate{font-size:clamp(3rem,13vw,14rem);font-weight:900;color:#fff;line-height:.88;letter-spacing:-.02em;text-transform:uppercase;text-shadow:0 4px 32px rgba(0,0,0,.3)}.tagline{font-size:clamp(.9rem,3.2vw,3.5rem);color:rgba(255,255,255,.88);margin-top:3vh;font-weight:400;letter-spacing:.06em;text-transform:uppercase}.bottom-bar{height:10vh;background:{{SECONDARY_COLOR}};display:flex;align-items:center;justify-content:space-between;padding:0 5vw}.campaign-name{font-size:clamp(.75rem,2.2vw,2.2rem);font-weight:700;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.05em}.website{font-size:clamp(.65rem,1.8vw,1.8rem);color:{{PRIMARY_COLOR}};font-weight:600;opacity:.85}</style></head><body><div class="top-bar"></div><div class="main"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="candidate">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div><div class="bottom-bar"><div class="campaign-name">{{CAMPAIGN_NAME}}</div><div class="website">{{WEBSITE}}</div></div></body></html>`,
    },
    {
      slug: "door-hanger-classic",
      name: "Door Hanger — Classic",
      category: "door-hanger",
      width: 4.25,
      height: 11,
      bleed: 0.125,
      sortOrder: 2,
      htmlTemplate: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:#fff;font-family:{{FONT_CSS}};display:flex;flex-direction:column}.header{background:{{PRIMARY_COLOR}};padding:6vh 5vw 4vh;display:flex;flex-direction:column;align-items:center;text-align:center}.logo-wrap{margin-bottom:2vh}.logo-wrap img{max-height:10vh;max-width:60%;width:auto}.candidate{font-size:clamp(2rem,8vw,5rem);font-weight:900;color:#fff;line-height:.92;text-transform:uppercase;letter-spacing:-.02em}.tagline{font-size:clamp(.75rem,2.8vw,1.8rem);color:rgba(255,255,255,.85);margin-top:1.5vh;font-weight:400;letter-spacing:.04em}.accent-bar{height:1.2vh;background:{{SECONDARY_COLOR}}}.body{flex:1;padding:5vw;display:flex;flex-direction:column;justify-content:center;gap:3vh}.body-text{font-size:clamp(.75rem,2.5vw,1.4rem);color:#334155;line-height:1.6;text-align:center}.contact-row{display:flex;flex-direction:column;gap:1.2vh;align-items:center}.contact-item{font-size:clamp(.65rem,2vw,1.1rem);color:#475569;font-weight:600}.footer{background:{{PRIMARY_COLOR}};padding:2.5vh 5vw;text-align:center}.footer-text{font-size:clamp(.6rem,1.8vw,1rem);color:rgba(255,255,255,.9);font-weight:700;text-transform:uppercase;letter-spacing:.08em}</style></head><body><div class="header"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="candidate">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div><div class="accent-bar"></div><div class="body"><div class="body-text">A strong voice for our community. Experienced, dedicated, and ready to serve.</div><div class="contact-row"><div class="contact-item">📞 {{PHONE}}</div><div class="contact-item">🌐 {{WEBSITE}}</div></div></div><div class="footer"><div class="footer-text">{{CAMPAIGN_NAME}} · Authorised by the official agent</div></div></body></html>`,
    },
    {
      slug: "flyer-intro",
      name: "Flyer — Introduction",
      category: "flyer",
      width: 8.5,
      height: 11,
      bleed: 0.125,
      sortOrder: 3,
      htmlTemplate: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:#fff;font-family:{{FONT_CSS}};display:flex;flex-direction:column}.banner{background:linear-gradient(135deg,{{PRIMARY_COLOR}} 0%,{{SECONDARY_COLOR}} 100%);padding:5vh 5vw 4vh;position:relative}.logo-wrap{margin-bottom:2vh}.logo-wrap img{max-height:9vh;max-width:30%;width:auto}.candidate{font-size:clamp(2.5rem,7vw,6rem);font-weight:900;color:#fff;line-height:.9;text-transform:uppercase;letter-spacing:-.02em}.tagline{font-size:clamp(.9rem,2.5vw,2rem);color:rgba(255,255,255,.9);margin-top:1.5vh;font-weight:400}.content{flex:1;padding:4vh 5vw;display:flex;flex-direction:column;gap:3vh}.section-title{font-size:clamp(.85rem,2.2vw,1.5rem);font-weight:800;color:{{PRIMARY_COLOR}};text-transform:uppercase;letter-spacing:.06em;border-bottom:3px solid {{SECONDARY_COLOR}};padding-bottom:.8vh}.body-text{font-size:clamp(.75rem,2vw,1.2rem);color:#374151;line-height:1.7}.priorities{list-style:none;display:flex;flex-direction:column;gap:1.2vh}.priority-item{display:flex;align-items:flex-start;gap:1.5vw;font-size:clamp(.7rem,1.8vw,1.1rem);color:#374151}.priority-dot{width:1.2vw;height:1.2vw;min-width:8px;min-height:8px;border-radius:50%;background:{{SECONDARY_COLOR}};margin-top:.4em;flex-shrink:0}.footer{background:{{PRIMARY_COLOR}};padding:2.5vh 5vw;display:flex;justify-content:space-between;align-items:center}.footer-name{font-size:clamp(.7rem,2vw,1.2rem);font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.04em}.footer-contact{font-size:clamp(.6rem,1.6vw,1rem);color:rgba(255,255,255,.85);text-align:right}</style></head><body><div class="banner"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="candidate">{{CANDIDATE_NAME}}</div><div class="tagline">{{TAGLINE}}</div></div><div class="content"><div><div class="section-title">Why I'm Running</div><div class="body-text">Our community deserves strong, accountable leadership. I'm committed to listening to residents and delivering real results for {{CAMPAIGN_NAME}}.</div></div><div><div class="section-title">My Priorities</div><ul class="priorities"><li class="priority-item"><div class="priority-dot"></div><span>Safer streets and well-maintained infrastructure</span></li><li class="priority-item"><div class="priority-dot"></div><span>Support for local businesses and job creation</span></li><li class="priority-item"><div class="priority-dot"></div><span>Transparent, responsive city hall</span></li></ul></div></div><div class="footer"><div class="footer-name">{{CANDIDATE_NAME}}</div><div class="footer-contact"><div>{{PHONE}}</div><div>{{WEBSITE}}</div></div></div></body></html>`,
    },
    {
      slug: "palm-card-clean",
      name: "Palm Card — Clean",
      category: "palm-card",
      width: 4,
      height: 9,
      bleed: 0.125,
      sortOrder: 4,
      htmlTemplate: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:#fff;font-family:{{FONT_CSS}};display:flex;flex-direction:column}.top{background:{{PRIMARY_COLOR}};padding:5vh 5vw 3vh;display:flex;flex-direction:column;align-items:center;text-align:center}.logo-wrap{margin-bottom:1.5vh}.logo-wrap img{max-height:10vh;max-width:55%;width:auto}.name{font-size:clamp(2rem,9vw,5rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.02em}.position{font-size:clamp(.7rem,2.5vw,1.4rem);color:rgba(255,255,255,.85);margin-top:1.2vh;font-weight:600;text-transform:uppercase;letter-spacing:.08em}.stripe{height:1.5vh;background:{{SECONDARY_COLOR}}}.middle{flex:1;padding:4vw 5vw;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2vh;text-align:center}.tagline{font-size:clamp(.85rem,3vw,1.8rem);font-weight:700;color:{{PRIMARY_COLOR}};line-height:1.3}.body-copy{font-size:clamp(.65rem,2.2vw,1.1rem);color:#64748b;line-height:1.6}.footer{background:{{PRIMARY_COLOR}};padding:2.5vh 5vw;display:flex;flex-direction:column;gap:1vh;align-items:center}.contact{font-size:clamp(.6rem,2vw,1rem);color:rgba(255,255,255,.9);font-weight:600}.auth{font-size:clamp(.5rem,1.4vw,.75rem);color:rgba(255,255,255,.6);text-align:center;margin-top:1vh}</style></head><body><div class="top"><div class="logo-wrap">{{LOGO_HTML}}</div><div class="name">{{CANDIDATE_NAME}}</div><div class="position">{{CAMPAIGN_NAME}}</div></div><div class="stripe"></div><div class="middle"><div class="tagline">{{TAGLINE}}</div><div class="body-copy">Dedicated to building a stronger, safer community for all residents.</div></div><div class="footer"><div class="contact">{{PHONE}}</div><div class="contact">{{WEBSITE}}</div><div class="auth">Authorised by the official agent of {{CAMPAIGN_NAME}}</div></div></body></html>`,
    },
    {
      slug: "postcard-gotv-portrait",
      name: "Postcard — GOTV Portrait",
      category: "postcard",
      width: 6,
      height: 9,
      bleed: 0.125,
      sortOrder: 5,
      htmlTemplate: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{background:{{PRIMARY_COLOR}};font-family:{{FONT_CSS}};display:flex;flex-direction:column;position:relative}.bg-accent{position:absolute;bottom:0;right:0;width:40%;height:100%;background:{{SECONDARY_COLOR}};clip-path:polygon(30% 0%,100% 0%,100% 100%,0% 100%);opacity:.15}.content{position:relative;z-index:1;flex:1;padding:5vh 6vw;display:flex;flex-direction:column;justify-content:space-between}.logo-wrap img{max-height:9vh;max-width:40%;width:auto;filter:brightness(0) invert(1)}.headline{font-size:clamp(2.5rem,8vw,7rem);font-weight:900;color:#fff;line-height:.88;text-transform:uppercase;letter-spacing:-.03em;text-shadow:0 2px 16px rgba(0,0,0,.25)}.sub{font-size:clamp(.8rem,2.5vw,2rem);color:rgba(255,255,255,.85);margin-top:2vh;font-weight:400}.election-box{background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.4);border-radius:1vw;padding:2.5vh 4vw;display:flex;flex-direction:column;gap:1.2vh}.election-label{font-size:clamp(.65rem,1.8vw,1.2rem);color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.08em;font-weight:700}.election-date{font-size:clamp(1.2rem,4vw,3.5rem);font-weight:900;color:#fff;line-height:1}.footer{display:flex;justify-content:space-between;align-items:flex-end}.name{font-size:clamp(.8rem,2.5vw,2rem);font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.04em}.contact{font-size:clamp(.6rem,1.8vw,1.2rem);color:rgba(255,255,255,.8);text-align:right;line-height:1.6}</style></head><body><div class="bg-accent"></div><div class="content"><div class="logo-wrap">{{LOGO_HTML}}</div><div><div class="headline">Vote {{CANDIDATE_NAME}}</div><div class="sub">{{TAGLINE}}</div></div><div class="election-box"><div class="election-label">Election Day</div><div class="election-date">October 26, 2026</div></div><div class="footer"><div class="name">{{CAMPAIGN_NAME}}</div><div class="contact"><div>{{PHONE}}</div><div>{{WEBSITE}}</div></div></div></div></body></html>`,
    },
  ];

  for (const t of printTemplates) {
    await prisma.printTemplate.upsert({
      where: { slug: t.slug },
      update: { name: t.name, htmlTemplate: t.htmlTemplate, sortOrder: t.sortOrder },
      create: t,
    });
  }
  console.log(`✅ ${printTemplates.length} print templates seeded\n`);

  // ── Finance Command Center — full mature campaign data ────────────────────
  // $35,000 budget · 18 lines · 6 vendors · 5 PRs · 4 POs · 3 bills
  // 26 expenses · 4 reimbursements · 1 split expense · 1 budget transfer
  // Story: Ward 12 campaign is ~5 months in, ~47% of budget committed/spent.

  // ── Campaign Budget ──────────────────────────────────────────────────────
  const finBudget = await prisma.campaignBudget.upsert({
    where: { id: "fin-budget-w12-2026" },
    update: {},
    create: {
      id: "fin-budget-w12-2026",
      campaignId: campaign.id,
      name: "Ward 12 — 2026 Municipal Election Budget",
      electionCycle: "2026 Ontario Municipal",
      totalBudget: 35000,
      currency: "CAD",
      status: FinanceBudgetStatus.active,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-11-30"),
      notes: "Official campaign budget approved by official agent. Governed by Municipal Elections Act (Ontario).",
      createdByUserId: treasurer.id,
    },
  });

  // ── Budget Lines ─────────────────────────────────────────────────────────
  // actualAmount set to match the approved expenses seeded below.
  const blPrint = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-print" }, update: {}, create: {
      id: "fin-bl-print", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "PRNT", name: "Print Materials", category: FinanceBudgetLineCategory.print,
      description: "Door hangers, flyers, palm cards, GOTV postcards",
      plannedAmount: 4500, actualAmount: 2800, sortOrder: 1, ownerUserId: manager.id,
    },
  });
  const blSigns = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-signs" }, update: {}, create: {
      id: "fin-bl-signs", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "SIGN", name: "Signs & Display", category: FinanceBudgetLineCategory.signs,
      description: "Lawn signs, stakes, window signs, banners",
      plannedAmount: 3200, actualAmount: 1800, sortOrder: 2, ownerUserId: manager.id,
    },
  });
  const blAds = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-ads" }, update: {}, create: {
      id: "fin-bl-ads", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "ADVT", name: "Advertising", category: FinanceBudgetLineCategory.advertising,
      description: "Paid media, radio, print ads, sponsorships",
      plannedAmount: 4800, actualAmount: 3470, sortOrder: 3, ownerUserId: comms.id,
    },
  });
  const blDigital = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-digital" }, update: {}, create: {
      id: "fin-bl-digital", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "DGTL", name: "Digital & Social", category: FinanceBudgetLineCategory.digital_ads,
      description: "Social media boosts, email platform, digital tools",
      plannedAmount: 2800, actualAmount: 80, sortOrder: 4, ownerUserId: comms.id,
    },
  });
  const blLit = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-lit" }, update: {}, create: {
      id: "fin-bl-lit", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "LIT", name: "Literature Distribution", category: FinanceBudgetLineCategory.literature,
      description: "Lit drops, mail, targeted voter outreach packages",
      plannedAmount: 1500, actualAmount: 0, sortOrder: 5,
    },
  });
  const blEvents = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-events" }, update: {}, create: {
      id: "fin-bl-events", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "EVNT", name: "Events & Outreach", category: FinanceBudgetLineCategory.events,
      description: "Venues, catering, rental equipment for town halls and community events",
      plannedAmount: 2000, actualAmount: 730, sortOrder: 6, ownerUserId: events.id,
    },
  });
  const blStaff = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-staff" }, update: {}, create: {
      id: "fin-bl-staff", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "STFF", name: "Staffing", category: FinanceBudgetLineCategory.staffing,
      description: "Paid campaign coordinator, stipends, staff costs",
      plannedAmount: 4000, actualAmount: 2700, sortOrder: 7, ownerUserId: manager.id,
    },
  });
  const blContractors = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-contractors" }, update: {}, create: {
      id: "fin-bl-contractors", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "CNTR", name: "Contractors & Consultants", category: FinanceBudgetLineCategory.contractors,
      description: "Graphic design, web development, photography, video",
      plannedAmount: 2500, actualAmount: 2000, sortOrder: 8, ownerUserId: manager.id,
    },
  });
  const blTravel = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-travel" }, update: {}, create: {
      id: "fin-bl-travel", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "TRVL", name: "Travel & Transportation", category: FinanceBudgetLineCategory.travel,
      description: "Gas, TTC fares, parking for canvassing and events",
      plannedAmount: 600, actualAmount: 200, sortOrder: 9,
    },
  });
  const blOffice = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-office" }, update: {}, create: {
      id: "fin-bl-office", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "OFFC", name: "Office & Supplies", category: FinanceBudgetLineCategory.office,
      description: "Stationery, printer supplies, office equipment",
      plannedAmount: 1000, actualAmount: 237, sortOrder: 10,
    },
  });
  const blPhones = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-phones" }, update: {}, create: {
      id: "fin-bl-phones", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "PHON", name: "Phones & Communications", category: FinanceBudgetLineCategory.phones,
      description: "Campaign cell phone, calling tools, phone banking app",
      plannedAmount: 500, actualAmount: 90, sortOrder: 11,
    },
  });
  const blCompliance = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-compliance" }, update: {}, create: {
      id: "fin-bl-compliance", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "COMP", name: "Compliance & Legal", category: FinanceBudgetLineCategory.compliance,
      description: "Official agent fees, filing fees, legal review, financial reporting",
      plannedAmount: 500, actualAmount: 200, sortOrder: 12, ownerUserId: treasurer.id,
    },
  });
  const blPhoto = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-photo" }, update: {}, create: {
      id: "fin-bl-photo", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "PHTO", name: "Photography & Video", category: FinanceBudgetLineCategory.photography,
      description: "Headshots, event photography, campaign video",
      plannedAmount: 400, actualAmount: 0, sortOrder: 13,
    },
  });
  const blOutreach = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-outreach" }, update: {}, create: {
      id: "fin-bl-outreach", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "OUTR", name: "Outreach & Community", category: FinanceBudgetLineCategory.outreach,
      description: "Community sponsorships, donations in kind, outreach materials",
      plannedAmount: 800, actualAmount: 0, sortOrder: 14,
    },
  });
  const blCanvassing = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-canvassing" }, update: {}, create: {
      id: "fin-bl-canvassing", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "CNVS", name: "Canvassing Ops", category: FinanceBudgetLineCategory.canvassing,
      description: "Clipboards, weatherproof materials, door kits",
      plannedAmount: 400, actualAmount: 0, sortOrder: 15,
    },
  });
  const blFundraising = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-fundraising" }, update: {}, create: {
      id: "fin-bl-fundraising", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "FUND", name: "Fundraising", category: FinanceBudgetLineCategory.fundraising,
      description: "Donor events, cultivation costs, thank-you materials",
      plannedAmount: 600, actualAmount: 0, sortOrder: 16,
    },
  });
  const blMerch = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-merch" }, update: {}, create: {
      id: "fin-bl-merch", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "MRCH", name: "Merchandise", category: FinanceBudgetLineCategory.merchandise,
      description: "Buttons, stickers, branded merchandise",
      plannedAmount: 300, actualAmount: 0, sortOrder: 17,
    },
  });
  const blContingency = await prisma.budgetLine.upsert({
    where: { id: "fin-bl-contingency" }, update: {}, create: {
      id: "fin-bl-contingency", campaignId: campaign.id, campaignBudgetId: finBudget.id,
      code: "CTGN", name: "Contingency Reserve", category: FinanceBudgetLineCategory.contingency,
      description: "Unallocated reserve for unforeseen campaign needs",
      plannedAmount: 1000, actualAmount: 0, sortOrder: 18,
    },
  });
  console.log("✅ Finance: 1 budget + 18 budget lines seeded");

  // ── Vendors ──────────────────────────────────────────────────────────────
  const vendorPrint = await prisma.financeVendor.upsert({
    where: { id: "fin-vendor-printex" }, update: {}, create: {
      id: "fin-vendor-printex", campaignId: campaign.id,
      vendorType: FinanceVendorType.print_shop, name: "Toronto Print Express",
      contactName: "Kevin Lam", email: "kevin@torontoprintexpress.ca",
      phone: "416-555-7001", address: "1247 Danforth Ave, Toronto ON M4J 1M1",
      website: "torontoprintexpress.ca", paymentTerms: "Net 30",
      taxNumber: "BN 123456789 RT0001", isPreferred: true,
      notes: "Fast turnaround, great quality. Used for all print runs.",
    },
  });
  const vendorSigns = await prisma.financeVendor.upsert({
    where: { id: "fin-vendor-wardsigns" }, update: {}, create: {
      id: "fin-vendor-wardsigns", campaignId: campaign.id,
      vendorType: FinanceVendorType.sign_company, name: "Ward Signs & Display",
      contactName: "Mike Papadopoulos", email: "mike@wardsigns.ca",
      phone: "416-555-7002", address: "88 Eastern Ave, Toronto ON M5A 1H8",
      paymentTerms: "50% deposit, 50% on delivery", isPreferred: true,
      notes: "Handles lawn signs, window signs, and yard stakes. Always on time.",
    },
  });
  const vendorDigital = await prisma.financeVendor.upsert({
    where: { id: "fin-vendor-digitalpulse" }, update: {}, create: {
      id: "fin-vendor-digitalpulse", campaignId: campaign.id,
      vendorType: FinanceVendorType.advertising_agency, name: "Digital Pulse Media",
      contactName: "Aisha Koroma", email: "aisha@digitalpulsemedia.ca",
      phone: "416-555-7003", website: "digitalpulsemedia.ca",
      paymentTerms: "Monthly invoicing", isPreferred: true,
      notes: "Handles FB/IG/Google ads. Access shared with comms team.",
    },
  });
  const vendorDesign = await prisma.financeVendor.upsert({
    where: { id: "fin-vendor-greenleaf" }, update: {}, create: {
      id: "fin-vendor-greenleaf", campaignId: campaign.id,
      vendorType: FinanceVendorType.other, name: "GreenLeaf Design Studio",
      contactName: "Sophie Tremblay", email: "sophie@greenleafdesign.ca",
      phone: "416-555-7004", website: "greenleafdesign.ca",
      paymentTerms: "50% upfront, 50% on delivery",
      notes: "Logo, brand guide, all print-ready files. Excellent communicator.",
    },
  });
  const vendorEvents = await prisma.financeVendor.upsert({
    where: { id: "fin-vendor-eventsco" }, update: {}, create: {
      id: "fin-vendor-eventsco", campaignId: campaign.id,
      vendorType: FinanceVendorType.event_vendor, name: "Community Events Co.",
      contactName: "Terrence Williams", email: "t.williams@communityeventsco.ca",
      phone: "416-555-7005", paymentTerms: "Net 15",
      notes: "Tent, table, and chair rentals for outdoor events. Weekend availability.",
    },
  });
  const vendorOffice = await prisma.financeVendor.upsert({
    where: { id: "fin-vendor-staples" }, update: {}, create: {
      id: "fin-vendor-staples", campaignId: campaign.id,
      vendorType: FinanceVendorType.other, name: "Staples Business Centre",
      contactName: "Store Manager", email: "danforth@staples.ca",
      phone: "416-555-7006", address: "835 Danforth Ave, Toronto ON M4J 1L2",
      paymentTerms: "Immediate",
      notes: "Office supplies, print copies, binding. Receipt always obtained.",
    },
  });
  console.log("✅ Finance: 6 vendors seeded");

  // ── Purchase Requests ─────────────────────────────────────────────────────
  const pr001 = await prisma.financePurchaseRequest.upsert({
    where: { id: "fin-pr-001" }, update: {}, create: {
      id: "fin-pr-001", campaignId: campaign.id, budgetLineId: blPrint.id,
      vendorId: vendorPrint.id, requestedByUserId: manager.id, approverUserId: treasurer.id,
      title: "Door hangers — 2,000 units (two-sided, full colour)",
      description: "Standard door hanger design for the June canvassing push. 4×11in, 100lb gloss.",
      requestedAmount: 1200, approvedAmount: 1200,
      urgency: FinanceUrgency.high,
      requestStatus: FinancePurchaseRequestStatus.approved,
      requestedDate: new Date("2026-04-15"),
      decidedDate: new Date("2026-04-17"),
      notes: "Approved by Linda Kowalski. Rush order for May canvass launch.",
    },
  });
  const pr002 = await prisma.financePurchaseRequest.upsert({
    where: { id: "fin-pr-002" }, update: {}, create: {
      id: "fin-pr-002", campaignId: campaign.id, budgetLineId: blSigns.id,
      vendorId: vendorSigns.id, requestedByUserId: field.id, approverUserId: treasurer.id,
      title: "Lawn signs — 50 units (24×18in, wire H-stake)",
      description: "Initial sign deployment batch. Design approved by Rachel. Stakes included.",
      requestedAmount: 1800, approvedAmount: 1800,
      urgency: FinanceUrgency.normal,
      requestStatus: FinancePurchaseRequestStatus.approved,
      requestedDate: new Date("2026-04-10"),
      decidedDate: new Date("2026-04-12"),
    },
  });
  const pr003 = await prisma.financePurchaseRequest.upsert({
    where: { id: "fin-pr-003" }, update: {}, create: {
      id: "fin-pr-003", campaignId: campaign.id, budgetLineId: blAds.id,
      vendorId: vendorDigital.id, requestedByUserId: comms.id, approverUserId: manager.id,
      title: "Facebook & Instagram ad campaign — June–July 2026",
      description: "Targeted ad campaign to Ward 12 residents aged 25–65. Goal: 80K impressions. Two creatives.",
      requestedAmount: 2500, approvedAmount: 2500,
      urgency: FinanceUrgency.normal,
      requestStatus: FinancePurchaseRequestStatus.approved,
      requestedDate: new Date("2026-05-01"),
      decidedDate: new Date("2026-05-05"),
    },
  });
  const pr004 = await prisma.financePurchaseRequest.upsert({
    where: { id: "fin-pr-004" }, update: {}, create: {
      id: "fin-pr-004", campaignId: campaign.id, budgetLineId: blPhoto.id,
      requestedByUserId: comms.id,
      title: "Campaign photography session — headshots + 10 community photos",
      description: "Professional photographer for candidate headshots and community event coverage.",
      requestedAmount: 400,
      urgency: FinanceUrgency.low,
      requestStatus: FinancePurchaseRequestStatus.submitted,
      requestedDate: new Date("2026-06-10"),
      notes: "Still sourcing photographer options. Three quotes requested.",
    },
  });
  const pr005 = await prisma.financePurchaseRequest.upsert({
    where: { id: "fin-pr-005" }, update: {}, create: {
      id: "fin-pr-005", campaignId: campaign.id, budgetLineId: blPrint.id,
      vendorId: vendorPrint.id, requestedByUserId: manager.id, approverUserId: treasurer.id,
      title: "GOTV postcards — 1,000 units (6×9in, addressed mailer)",
      description: "Get Out The Vote mailer for strong supporters. October drop. Address list from CRM.",
      requestedAmount: 1600, approvedAmount: 1600,
      urgency: FinanceUrgency.normal,
      requestStatus: FinancePurchaseRequestStatus.approved,
      requestedDate: new Date("2026-05-20"),
      decidedDate: new Date("2026-05-22"),
    },
  });
  console.log("✅ Finance: 5 purchase requests seeded");

  // ── Purchase Orders ───────────────────────────────────────────────────────
  const po001 = await prisma.financePurchaseOrder.upsert({
    where: { campaignId_poNumber: { campaignId: campaign.id, poNumber: "PO-2026-001" } },
    update: {}, create: {
      id: "fin-po-001", campaignId: campaign.id, vendorId: vendorPrint.id,
      budgetLineId: blPrint.id, purchaseRequestId: pr001.id,
      poNumber: "PO-2026-001", totalAmount: 1200, taxAmount: 156,
      issueDate: new Date("2026-04-18"),
      expectedDate: new Date("2026-05-02"),
      status: FinancePurchaseOrderStatus.received,
      notes: "Door hangers received May 1. Quality checked by Priya. All 2,000 units accounted for.",
    },
  });
  const po002 = await prisma.financePurchaseOrder.upsert({
    where: { campaignId_poNumber: { campaignId: campaign.id, poNumber: "PO-2026-002" } },
    update: {}, create: {
      id: "fin-po-002", campaignId: campaign.id, vendorId: vendorSigns.id,
      budgetLineId: blSigns.id, purchaseRequestId: pr002.id,
      poNumber: "PO-2026-002", totalAmount: 1800, taxAmount: 234,
      issueDate: new Date("2026-04-13"),
      expectedDate: new Date("2026-04-28"),
      status: FinancePurchaseOrderStatus.received,
      notes: "50 signs received April 27. Stored at HQ. Deployment begins May long weekend.",
    },
  });
  const po003 = await prisma.financePurchaseOrder.upsert({
    where: { campaignId_poNumber: { campaignId: campaign.id, poNumber: "PO-2026-003" } },
    update: {}, create: {
      id: "fin-po-003", campaignId: campaign.id, vendorId: vendorDigital.id,
      budgetLineId: blAds.id, purchaseRequestId: pr003.id,
      poNumber: "PO-2026-003", totalAmount: 2500, taxAmount: 325,
      issueDate: new Date("2026-05-06"),
      expectedDate: new Date("2026-07-31"),
      status: FinancePurchaseOrderStatus.acknowledged,
      notes: "Digital ad campaign running June–July. Aisha sends weekly performance reports.",
    },
  });
  const po004 = await prisma.financePurchaseOrder.upsert({
    where: { campaignId_poNumber: { campaignId: campaign.id, poNumber: "PO-2026-004" } },
    update: {}, create: {
      id: "fin-po-004", campaignId: campaign.id, vendorId: vendorPrint.id,
      budgetLineId: blPrint.id, purchaseRequestId: pr005.id,
      poNumber: "PO-2026-004", totalAmount: 1600, taxAmount: 208,
      issueDate: new Date("2026-05-23"),
      expectedDate: new Date("2026-09-15"),
      status: FinancePurchaseOrderStatus.sent,
      notes: "GOTV postcard order placed. Address file to be delivered to printer by Aug 15.",
    },
  });
  console.log("✅ Finance: 4 purchase orders seeded");

  // ── Vendor Bills ──────────────────────────────────────────────────────────
  await prisma.financeVendorBill.upsert({
    where: { id: "fin-bill-001" }, update: {}, create: {
      id: "fin-bill-001", campaignId: campaign.id, vendorId: vendorPrint.id,
      purchaseOrderId: po001.id, billNumber: "TPE-INV-2026-0412",
      amount: 1200, taxAmount: 156, currency: "CAD",
      dueDate: new Date("2026-05-18"), receivedDate: new Date("2026-05-01"),
      paidDate: new Date("2026-05-15"),
      status: FinanceVendorBillStatus.paid,
      notes: "Paid by e-transfer. Confirmation #: TRX-884421.",
    },
  });
  await prisma.financeVendorBill.upsert({
    where: { id: "fin-bill-002" }, update: {}, create: {
      id: "fin-bill-002", campaignId: campaign.id, vendorId: vendorSigns.id,
      purchaseOrderId: po002.id, billNumber: "WSD-2026-0088",
      amount: 1800, taxAmount: 234, currency: "CAD",
      dueDate: new Date("2026-05-12"), receivedDate: new Date("2026-04-27"),
      paidDate: new Date("2026-05-10"),
      status: FinanceVendorBillStatus.paid,
      notes: "Paid by cheque #4412. Copy filed with official agent.",
    },
  });
  await prisma.financeVendorBill.upsert({
    where: { id: "fin-bill-003" }, update: {}, create: {
      id: "fin-bill-003", campaignId: campaign.id, vendorId: vendorDigital.id,
      purchaseOrderId: po003.id, billNumber: "DPM-INV-2026-JUN",
      amount: 1250, taxAmount: 162.50, currency: "CAD",
      dueDate: new Date("2026-07-15"), receivedDate: new Date("2026-06-30"),
      status: FinanceVendorBillStatus.approved,
      notes: "June portion of $2,500 total. July invoice expected end of July.",
    },
  });
  console.log("✅ Finance: 3 vendor bills seeded");

  // ── Expenses ──────────────────────────────────────────────────────────────
  // 26 expenses spanning all budget lines, sources, statuses, and touchpoints.
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-001" }, update: {}, create: {
      id: "fin-exp-001", campaignId: campaign.id, budgetLineId: blPrint.id,
      vendorId: vendorPrint.id, purchaseOrderId: po001.id, purchaseRequestId: pr001.id,
      amount: 1200, taxAmount: 156, currency: "CAD",
      expenseDate: new Date("2026-05-01"),
      description: "Door hangers — 2,000 units, two-sided, full colour (PO-2026-001)",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.paid, sourceType: FinanceSourceType.purchase_order,
      externalReference: "PO-2026-001", enteredByUserId: treasurer.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-002" }, update: {}, create: {
      id: "fin-exp-002", campaignId: campaign.id, budgetLineId: blPrint.id,
      vendorId: vendorPrint.id, purchaseOrderId: po004.id, purchaseRequestId: pr005.id,
      amount: 1600, taxAmount: 208, currency: "CAD",
      expenseDate: new Date("2026-05-23"),
      description: "GOTV postcards — 1,000 units, 6×9in, addressed mailer (PO-2026-004)",
      paymentMethod: FinancePaymentMethod.invoice, paymentStatus: FinancePaymentStatus.unpaid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.purchase_order,
      externalReference: "PO-2026-004", enteredByUserId: treasurer.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-003" }, update: {}, create: {
      id: "fin-exp-003", campaignId: campaign.id, budgetLineId: blSigns.id,
      vendorId: vendorSigns.id, purchaseOrderId: po002.id, purchaseRequestId: pr002.id,
      amount: 1800, taxAmount: 234, currency: "CAD",
      expenseDate: new Date("2026-04-27"),
      description: "Lawn signs — 50 units, 24×18in with wire H-stakes (PO-2026-002)",
      paymentMethod: FinancePaymentMethod.cheque, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.paid, sourceType: FinanceSourceType.purchase_order,
      externalReference: "PO-2026-002", enteredByUserId: treasurer.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-004" }, update: {}, create: {
      id: "fin-exp-004", campaignId: campaign.id, budgetLineId: blAds.id,
      vendorId: vendorDigital.id, purchaseOrderId: po003.id, purchaseRequestId: pr003.id,
      amount: 2500, taxAmount: 325, currency: "CAD",
      expenseDate: new Date("2026-06-01"),
      description: "Facebook & Instagram ad campaign — June–July 2026 (PO-2026-003)",
      paymentMethod: FinancePaymentMethod.invoice, paymentStatus: FinancePaymentStatus.unpaid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.purchase_order,
      externalReference: "PO-2026-003", enteredByUserId: comms.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-005" }, update: {}, create: {
      id: "fin-exp-005", campaignId: campaign.id, budgetLineId: blAds.id,
      vendorId: vendorDigital.id,
      amount: 850, taxAmount: 110.50, currency: "CAD",
      expenseDate: new Date("2026-06-15"),
      description: "Google Search campaign — Ward 12 voter targeting, June 2026",
      paymentMethod: FinancePaymentMethod.credit_card, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: comms.id, approvedByUserId: manager.id,
      notes: "Charged to campaign Visa. Receipt emailed by Google Ads.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-006" }, update: {}, create: {
      id: "fin-exp-006", campaignId: campaign.id, budgetLineId: blAds.id,
      amount: 120, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-03-15"),
      description: "Campaign website — domain registration + 12-month hosting (ward12sam.ca)",
      paymentMethod: FinancePaymentMethod.credit_card, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: data.id, approvedByUserId: manager.id,
      notes: "Annual renewal. Renew March 2027. Hosting: Cloudflare Pages.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-007" }, update: {}, create: {
      id: "fin-exp-007", campaignId: campaign.id, budgetLineId: blDigital.id,
      vendorId: vendorDigital.id,
      amount: 450, taxAmount: 58.50, currency: "CAD",
      expenseDate: new Date("2026-06-20"),
      description: "Instagram reel boost — platform infrastructure video, 14-day run",
      paymentMethod: FinancePaymentMethod.credit_card, paymentStatus: FinancePaymentStatus.unpaid,
      expenseStatus: FinanceExpenseStatus.submitted, sourceType: FinanceSourceType.manual,
      enteredByUserId: comms.id,
      notes: "Submitted by Marcus — awaiting Rachel's approval. Budget check needed.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-008" }, update: {}, create: {
      id: "fin-exp-008", campaignId: campaign.id, budgetLineId: blDigital.id,
      amount: 80, taxAmount: 10.40, currency: "CAD",
      expenseDate: new Date("2026-04-01"),
      description: "Mailchimp subscription — monthly, campaign plan (up to 10K contacts)",
      paymentMethod: FinancePaymentMethod.credit_card, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.recurring,
      isRecurring: true, enteredByUserId: comms.id, approvedByUserId: manager.id,
      notes: "Recurring monthly. $80/month × 8 months campaign cycle.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-009" }, update: {}, create: {
      id: "fin-exp-009", campaignId: campaign.id, budgetLineId: blEvents.id,
      vendorId: vendorEvents.id,
      amount: 200, taxAmount: 26, currency: "CAD",
      expenseDate: new Date("2026-05-30"),
      description: "Broadview Community Centre — room booking, Town Hall, June 12",
      paymentMethod: FinancePaymentMethod.cheque, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.event,
      enteredByUserId: events.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-010" }, update: {}, create: {
      id: "fin-exp-010", campaignId: campaign.id, budgetLineId: blEvents.id,
      vendorId: vendorEvents.id,
      amount: 350, taxAmount: 45.50, currency: "CAD",
      expenseDate: new Date("2026-06-08"),
      description: "Tent (20×20), 10 tables, 60 chairs — Community BBQ, June 22",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.event,
      enteredByUserId: events.id, approvedByUserId: manager.id,
      notes: "Event had ~85 attendees. Positive coverage in Danforth East Community News.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-011" }, update: {}, create: {
      id: "fin-exp-011", campaignId: campaign.id, budgetLineId: blEvents.id,
      amount: 180, taxAmount: 23.40, currency: "CAD",
      expenseDate: new Date("2026-06-22"),
      description: "Catering supplies — Community BBQ (burgers, drinks, condiments)",
      paymentMethod: FinancePaymentMethod.debit, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.event,
      enteredByUserId: events.id, approvedByUserId: manager.id,
      notes: "Purchased at Costco Danforth. Receipt retained.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-012" }, update: {}, create: {
      id: "fin-exp-012", campaignId: campaign.id, budgetLineId: blStaff.id,
      amount: 1200, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-06-30"),
      description: "Campaign coordinator — Rachel Dubois, June 2026",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: treasurer.id, approvedByUserId: admin.id,
      notes: "Paid to registered contractor. HST number on file.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-013" }, update: {}, create: {
      id: "fin-exp-013", campaignId: campaign.id, budgetLineId: blStaff.id,
      amount: 1200, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-07-31"),
      description: "Campaign coordinator — Rachel Dubois, July 2026",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.unpaid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: treasurer.id, approvedByUserId: admin.id,
      notes: "Approved, scheduled for payment Aug 1.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-014" }, update: {}, create: {
      id: "fin-exp-014", campaignId: campaign.id, budgetLineId: blStaff.id,
      amount: 300, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-06-30"),
      description: "Data entry volunteer stipend — Sanjay Patel, Q2",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.volunteer_expense,
      enteredByUserId: treasurer.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-015" }, update: {}, create: {
      id: "fin-exp-015", campaignId: campaign.id, budgetLineId: blContractors.id,
      vendorId: vendorDesign.id,
      amount: 800, taxAmount: 104, currency: "CAD",
      expenseDate: new Date("2026-03-20"),
      description: "Campaign brand package — logo, colour system, typography, brand guide PDF",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.paid, sourceType: FinanceSourceType.manual,
      enteredByUserId: manager.id, approvedByUserId: admin.id,
      notes: "Delivered March 18. Files in Google Drive /Brand. Approved by candidate.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-016" }, update: {}, create: {
      id: "fin-exp-016", campaignId: campaign.id, budgetLineId: blContractors.id,
      vendorId: vendorDesign.id,
      amount: 1200, taxAmount: 156, currency: "CAD",
      expenseDate: new Date("2026-04-05"),
      description: "Campaign website design and build — ward12sam.ca, responsive, bilingual",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.paid, sourceType: FinanceSourceType.manual,
      enteredByUserId: manager.id, approvedByUserId: admin.id,
      notes: "Launched April 1. Includes donation page integration and CMS for issues page.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-017" }, update: {}, create: {
      id: "fin-exp-017", campaignId: campaign.id, budgetLineId: blTravel.id,
      amount: 120, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-06-15"),
      description: "Gas reimbursement — Priya Okonkwo, canvassing routes June 7–14",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.volunteer_expense,
      enteredByUserId: field.id, approvedByUserId: manager.id,
      notes: "Receipts submitted. 6 canvassing sessions, ~340 doors knocked.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-018" }, update: {}, create: {
      id: "fin-exp-018", campaignId: campaign.id, budgetLineId: blTravel.id,
      amount: 80, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-06-01"),
      description: "TTC Presto fare cards — canvassing team (5 × $16 reload)",
      paymentMethod: FinancePaymentMethod.debit, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: volcoord.id, approvedByUserId: manager.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-019" }, update: {}, create: {
      id: "fin-exp-019", campaignId: campaign.id, budgetLineId: blOffice.id,
      vendorId: vendorOffice.id,
      amount: 145, taxAmount: 18.85, currency: "CAD",
      expenseDate: new Date("2026-04-08"),
      description: "Office supplies — printer paper (4 reams), toner, clipboards, folders",
      paymentMethod: FinancePaymentMethod.debit, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: manager.id, approvedByUserId: treasurer.id,
      notes: "Staples Danforth. Receipt #STP-20260408-441.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-020" }, update: {}, create: {
      id: "fin-exp-020", campaignId: campaign.id, budgetLineId: blOffice.id,
      vendorId: vendorOffice.id,
      amount: 92, taxAmount: 11.96, currency: "CAD",
      expenseDate: new Date("2026-05-12"),
      description: "Canada Post postage stamps — 200-pack (bulk rate, community mail)",
      paymentMethod: FinancePaymentMethod.debit, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: manager.id, approvedByUserId: treasurer.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-021" }, update: {}, create: {
      id: "fin-exp-021", campaignId: campaign.id, budgetLineId: blPhones.id,
      amount: 45, taxAmount: 5.85, currency: "CAD",
      expenseDate: new Date("2026-06-01"),
      description: "Campaign cell phone plan — June 2026 (WIND Mobile, campaign number)",
      paymentMethod: FinancePaymentMethod.credit_card, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.recurring,
      isRecurring: true, enteredByUserId: manager.id, approvedByUserId: treasurer.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-022" }, update: {}, create: {
      id: "fin-exp-022", campaignId: campaign.id, budgetLineId: blPhones.id,
      amount: 45, taxAmount: 5.85, currency: "CAD",
      expenseDate: new Date("2026-07-01"),
      description: "Campaign cell phone plan — July 2026",
      paymentMethod: FinancePaymentMethod.credit_card, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.recurring,
      isRecurring: true, enteredByUserId: manager.id, approvedByUserId: treasurer.id,
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-023" }, update: {}, create: {
      id: "fin-exp-023", campaignId: campaign.id, budgetLineId: blCompliance.id,
      amount: 200, taxAmount: 0, currency: "CAD",
      expenseDate: new Date("2026-03-05"),
      description: "Official agent appointment registration — City of Toronto filing fee",
      paymentMethod: FinancePaymentMethod.cheque, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      enteredByUserId: treasurer.id, approvedByUserId: admin.id,
      notes: "Cheque #4401 to Receiver General. Receipt #MEA-2026-00441.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-024" }, update: {}, create: {
      id: "fin-exp-024", campaignId: campaign.id, budgetLineId: blCompliance.id,
      amount: 350, taxAmount: 45.50, currency: "CAD",
      expenseDate: new Date("2026-06-25"),
      description: "Election law review — compliance checklist and advertising rules (1.5h)",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.unpaid,
      expenseStatus: FinanceExpenseStatus.needs_review, sourceType: FinanceSourceType.manual,
      enteredByUserId: manager.id,
      notes: "Submitted for review. Linda to confirm scope of legal work before approving.",
    },
  });
  await prisma.financeExpense.upsert({
    where: { id: "fin-exp-025" }, update: {}, create: {
      id: "fin-exp-025", campaignId: campaign.id, budgetLineId: blPhoto.id,
      amount: 200, taxAmount: 26, currency: "CAD",
      expenseDate: new Date("2026-07-01"),
      description: "Photography session deposit — headshots + community event coverage",
      paymentMethod: FinancePaymentMethod.etransfer, paymentStatus: FinancePaymentStatus.unpaid,
      expenseStatus: FinanceExpenseStatus.draft, sourceType: FinanceSourceType.manual,
      enteredByUserId: comms.id,
      notes: "PR-004 still in approval. Do not pay until PR approved.",
      missingReceipt: true,
    },
  });

  // ── Split Expense (shows split line feature) ──────────────────────────────
  // Campaign kickoff event costs split across Events and Canvassing lines.
  const expSplit = await prisma.financeExpense.upsert({
    where: { id: "fin-exp-split" }, update: {}, create: {
      id: "fin-exp-split", campaignId: campaign.id,
      amount: 280, taxAmount: 36.40, currency: "CAD",
      expenseDate: new Date("2026-05-15"),
      description: "Campaign kickoff supplies (split: events + canvassing)",
      paymentMethod: FinancePaymentMethod.debit, paymentStatus: FinancePaymentStatus.paid,
      expenseStatus: FinanceExpenseStatus.approved, sourceType: FinanceSourceType.manual,
      isSplit: true, enteredByUserId: manager.id, approvedByUserId: treasurer.id,
      notes: "Refreshments + door-knocking kits purchased same Costco run — split accordingly.",
    },
  });
  await prisma.financeExpenseSplit.upsert({
    where: { id: "fin-split-a" }, update: {}, create: {
      id: "fin-split-a", expenseId: expSplit.id, budgetLineId: blEvents.id,
      amount: 160, notes: "Refreshments for kickoff event",
    },
  });
  await prisma.financeExpenseSplit.upsert({
    where: { id: "fin-split-b" }, update: {}, create: {
      id: "fin-split-b", expenseId: expSplit.id, budgetLineId: blCanvassing.id,
      amount: 120, notes: "Door-knocking kits and clipboards",
    },
  });
  console.log("✅ Finance: 26 expenses + 1 split expense seeded");

  // ── Reimbursements ────────────────────────────────────────────────────────
  await prisma.financeReimbursement.upsert({
    where: { id: "fin-reimb-001" }, update: {}, create: {
      id: "fin-reimb-001", campaignId: campaign.id, budgetLineId: blTravel.id,
      userId: volunteer1.id, approverUserId: manager.id,
      title: "Gas reimbursement — canvassing May 24–June 7",
      amountRequested: 48.50, amountApproved: 48.50,
      status: FinanceReimbursementStatus.paid,
      submittedDate: new Date("2026-06-08"), decidedDate: new Date("2026-06-10"),
      payoutMethod: "e-transfer", notes: "Gas receipts attached. 4 weekend canvassing sessions.",
    },
  });
  await prisma.financeReimbursement.upsert({
    where: { id: "fin-reimb-002" }, update: {}, create: {
      id: "fin-reimb-002", campaignId: campaign.id, budgetLineId: blOffice.id,
      userId: field.id, approverUserId: manager.id,
      title: "Field supplies — weatherproof sheet protectors, markers, lanyards",
      amountRequested: 127.30, amountApproved: 127.30,
      status: FinanceReimbursementStatus.approved,
      submittedDate: new Date("2026-06-20"), decidedDate: new Date("2026-06-22"),
      payoutMethod: "e-transfer", notes: "Dollarama + Staples receipts. For canvassing binders.",
    },
  });
  await prisma.financeReimbursement.upsert({
    where: { id: "fin-reimb-003" }, update: {}, create: {
      id: "fin-reimb-003", campaignId: campaign.id, budgetLineId: blEvents.id,
      userId: events.id,
      title: "Catering run — last-minute supplies, Community BBQ June 22",
      amountRequested: 89.75,
      status: FinanceReimbursementStatus.submitted,
      submittedDate: new Date("2026-06-23"),
      notes: "Nofrills receipt + Shoppers receipt. Waiting for approval.",
    },
  });
  await prisma.financeReimbursement.upsert({
    where: { id: "fin-reimb-004" }, update: {}, create: {
      id: "fin-reimb-004", campaignId: campaign.id, budgetLineId: blTravel.id,
      userId: volunteer2.id,
      title: "TTC fares — June canvassing (8 trips × $4.00)",
      amountRequested: 32.00,
      status: FinanceReimbursementStatus.draft,
      notes: "Draft — James to add Presto card screenshot before submitting.",
    },
  });
  console.log("✅ Finance: 4 reimbursements seeded");

  // ── Budget Transfer ───────────────────────────────────────────────────────
  // Advertising ran over — transferred $200 from Digital Ads to Advertising.
  await prisma.budgetTransfer.upsert({
    where: { id: "fin-transfer-001" }, update: {}, create: {
      id: "fin-transfer-001", campaignId: campaign.id,
      campaignBudgetId: finBudget.id,
      fromBudgetLineId: blDigital.id, toBudgetLineId: blAds.id,
      amount: 200,
      reason: "Advertising line is approaching threshold due to strong Google Ads performance. Transferring underutilised Digital balance to cover additional placement buys.",
      requestedByUserId: comms.id, approvedByUserId: treasurer.id,
      status: FinanceBudgetTransferStatus.approved,
      transferDate: new Date("2026-06-28"),
      notes: "Approved by Linda Kowalski. Reflects reallocation from underutilised Digital Ads.",
    },
  });
  console.log("✅ Finance: 1 budget transfer seeded");

  console.log("════════════════════════════════════════════════════");
  console.log("💰 Finance Command Center seeded:\n");
  console.log("   Budget: $35,000 active · 18 lines covering all categories");
  console.log("   Vendors: 6 (print, signs, advertising, design, events, office)");
  console.log("   Purchase Requests: 5 (3 approved · 1 submitted · 1 draft)");
  console.log("   Purchase Orders: 4 (1 received · 1 received · 1 acknowledged · 1 sent)");
  console.log("   Vendor Bills: 3 (2 paid · 1 approved)");
  console.log("   Expenses: 26 (paid/approved/submitted/needs_review/draft across all lines)");
  console.log("   Reimbursements: 4 (paid/approved/submitted/draft)");
  console.log("   Budget Transfer: 1 (Digital → Advertising, $200, approved)");
  console.log("   ~$16,500 committed/spent of $35,000 (~47% through budget)");

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
  console.log("3 officials · ~14 500 contacts · 6 069 households · 25 polls · 10 team members · 25 signs · 12 donations · 4 events · 3 field assignments · 35 RSVPs · 10 tasks · 14 activity logs");
  console.log("════════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

// This runs after main() — add to the bottom of the main function body
// Sample custom fields will be added inline below
