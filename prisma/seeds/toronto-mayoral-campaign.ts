import {
  PrismaClient,
  Role,
  ElectionType,
  SupportLevel,
  InteractionType,
  TaskStatus,
  TaskPriority,
  SignStatus,
  DonationStatus,
  VolunteerShiftSignupStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FIRST = ["Ava", "Noah", "Liam", "Emma", "Mia", "Lucas", "Sofia", "Ethan", "Olivia", "Mason", "Zoe", "Aria", "Daniel", "Layla", "Isaac", "Leah", "Eli", "Hannah", "Nora", "Caleb"];
const LAST = ["Singh", "Chen", "Patel", "Smith", "Brown", "Khan", "Martin", "Taylor", "Wilson", "Morrison", "Lopez", "Ali", "Johnson", "Clark", "Wang", "King", "Bouchard", "Roy", "Nguyen", "Garcia"];
const STREETS = ["Bloor St", "Danforth Ave", "Yonge St", "Queen St", "King St", "Dundas St", "Eglinton Ave", "Bathurst St", "College St", "Jarvis St", "Spadina Ave", "Front St"];
const WARDS = ["Ward 1", "Ward 4", "Ward 7", "Ward 9", "Ward 11", "Ward 13", "Ward 15", "Ward 17", "Ward 19", "Ward 22", "Ward 25"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function phone(): string {
  return `416-${200 + Math.floor(Math.random() * 700)}-${1000 + Math.floor(Math.random() * 9000)}`;
}

function support(): SupportLevel {
  const x = Math.random();
  if (x < 0.3) return SupportLevel.strong_support;
  if (x < 0.52) return SupportLevel.leaning_support;
  if (x < 0.75) return SupportLevel.undecided;
  if (x < 0.9) return SupportLevel.leaning_opposition;
  return SupportLevel.strong_opposition;
}

async function ensureUser(email: string, name: string, role: Role, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  console.log("Seeding Toronto mayoral campaign dataset...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await ensureUser("admin@pollcity.dev", "Alex Admin", Role.ADMIN, passwordHash);
  const manager = await ensureUser("manager@pollcity.dev", "Mina Manager", Role.CAMPAIGN_MANAGER, passwordHash);
  const volunteerLeader = await ensureUser("lead@pollcity.dev", "Victor Lead", Role.VOLUNTEER_LEADER, passwordHash);
  const volunteer = await ensureUser("volunteer@pollcity.dev", "Val Volunteer", Role.VOLUNTEER, passwordHash);
  const publicUser = await ensureUser("voter@pollcity.dev", "Paula Public", Role.PUBLIC_USER, passwordHash);

  const campaign = await prisma.campaign.upsert({
    where: { slug: "toronto-mayor-2026" },
    update: {
      isPublic: true,
      isActive: true,
      candidateName: "Jordan Ellis",
      candidateTitle: "Candidate for Mayor of Toronto",
    },
    create: {
      name: "Toronto Mayoral Campaign 2026",
      slug: "toronto-mayor-2026",
      description: "Full-scale demo campaign for permissions, operations, and metrics validation.",
      electionType: ElectionType.municipal,
      jurisdiction: "City of Toronto",
      electionDate: new Date("2026-10-26"),
      candidateName: "Jordan Ellis",
      candidateTitle: "Candidate for Mayor of Toronto",
      candidateBio: "Jordan Ellis is running a citywide campaign focused on housing affordability, transit reliability, and safer neighborhoods.",
      candidateEmail: "jordan@torontomayor2026.ca",
      candidatePhone: "416-555-9200",
      primaryColor: "#0B3D91",
      isPublic: true,
      isActive: true,
    },
  });

  const team = [
    { userId: admin.id, role: Role.ADMIN },
    { userId: manager.id, role: Role.CAMPAIGN_MANAGER },
    { userId: volunteerLeader.id, role: Role.VOLUNTEER_LEADER },
    { userId: volunteer.id, role: Role.VOLUNTEER },
  ];

  for (const member of team) {
    await prisma.membership.upsert({
      where: { userId_campaignId: { userId: member.userId, campaignId: campaign.id } },
      update: { role: member.role },
      create: { userId: member.userId, campaignId: campaign.id, role: member.role },
    });
  }

  await prisma.user.updateMany({
    where: { id: { in: [admin.id, manager.id, volunteerLeader.id, volunteer.id] } },
    data: { activeCampaignId: campaign.id },
  });

  const contactsExisting = await prisma.contact.count({ where: { campaignId: campaign.id } });
  const contactTarget = 650;
  const toCreateContacts = Math.max(0, contactTarget - contactsExisting);

  for (let i = 0; i < toCreateContacts; i++) {
    const firstName = rand(FIRST);
    const lastName = rand(LAST);
    const ward = rand(WARDS);
    await prisma.contact.create({
      data: {
        campaignId: campaign.id,
        firstName,
        lastName,
        email: `${firstName}.${lastName}.${i}@example.com`.toLowerCase(),
        phone: phone(),
        address1: `${100 + Math.floor(Math.random() * 899)} ${rand(STREETS)}`,
        city: "Toronto",
        province: "ON",
        postalCode: "M5V 2T6",
        ward,
        riding: "Toronto Centre",
        supportLevel: support(),
        volunteerInterest: Math.random() < 0.2,
        signRequested: Math.random() < 0.14,
        followUpNeeded: Math.random() < 0.24,
        issues: Math.random() < 0.5 ? ["Housing", "Transit"] : ["Affordability"],
        importSource: "toronto_mayor_seed",
        source: "toronto_mayor_seed",
      },
    });
  }

  const contacts = await prisma.contact.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, supportLevel: true, volunteerInterest: true, signRequested: true },
  });

  const volunteerTarget = 95;
  const volunteerExisting = await prisma.volunteerProfile.count({ where: { campaignId: campaign.id } });
  let volunteerAdded = 0;

  for (const c of contacts) {
    if (volunteerExisting + volunteerAdded >= volunteerTarget) break;
    if (!c.volunteerInterest && Math.random() > 0.25) continue;
    const exists = await prisma.volunteerProfile.findUnique({ where: { contactId: c.id }, select: { id: true } });
    if (exists) continue;

    await prisma.volunteerProfile.create({
      data: {
        campaignId: campaign.id,
        contactId: c.id,
        availability: rand(["weeknights", "weekends", "mornings", "afternoons"]),
        skills: rand([["canvassing"], ["phone-bank"], ["canvassing", "data-entry"], ["driver", "sign-install"]]),
        maxHoursPerWeek: 3 + Math.floor(Math.random() * 12),
        hasVehicle: Math.random() < 0.38,
        isActive: true,
      },
    });

    volunteerAdded++;
  }

  const signTarget = 80;
  const signExisting = await prisma.sign.count({ where: { campaignId: campaign.id } });
  let signAdded = 0;

  for (const c of contacts) {
    if (signExisting + signAdded >= signTarget) break;
    if (!c.signRequested && Math.random() > 0.2) continue;

    await prisma.sign.create({
      data: {
        campaignId: campaign.id,
        contactId: c.id,
        address1: `${100 + Math.floor(Math.random() * 899)} ${rand(STREETS)}`,
        city: "Toronto",
        postalCode: "M5V 2T6",
        status: rand([SignStatus.requested, SignStatus.scheduled, SignStatus.installed]),
        quantity: 1 + Math.floor(Math.random() * 2),
      },
    });

    signAdded++;
  }

  const interactionTarget = 420;
  const interactionExisting = await prisma.interaction.count({ where: { contact: { campaignId: campaign.id } } });
  let interactionAdded = 0;

  for (const c of contacts) {
    if (interactionExisting + interactionAdded >= interactionTarget) break;

    await prisma.interaction.create({
      data: {
        contactId: c.id,
        userId: rand([volunteer.id, volunteerLeader.id, manager.id]),
        type: rand([InteractionType.door_knock, InteractionType.phone_call, InteractionType.note, InteractionType.follow_up]),
        notes: rand([
          "Door knocked, left literature.",
          "Spoke with voter, transit concerns noted.",
          "No answer, literature drop completed.",
          "Strong support, requested volunteer follow-up.",
        ]),
        supportLevel: c.supportLevel,
      },
    });

    interactionAdded++;
  }

  const taskTarget = 160;
  const taskExisting = await prisma.task.count({ where: { campaignId: campaign.id } });
  let taskAdded = 0;

  for (const c of contacts.slice(0, 280)) {
    if (taskExisting + taskAdded >= taskTarget) break;

    await prisma.task.create({
      data: {
        campaignId: campaign.id,
        contactId: c.id,
        assignedToId: rand([manager.id, volunteerLeader.id, volunteer.id]),
        createdById: rand([admin.id, manager.id]),
        title: rand([
          "Follow up by phone",
          "Re-canvass undecided voter",
          "Deliver lawn sign",
          "Volunteer recruitment ask",
          "Literature drop check",
        ]),
        status: rand([TaskStatus.pending, TaskStatus.in_progress, TaskStatus.completed]),
        priority: rand([TaskPriority.medium, TaskPriority.high, TaskPriority.urgent]),
      },
    });

    taskAdded++;
  }

  const donationTarget = 140;
  const donationExisting = await prisma.donation.count({ where: { campaignId: campaign.id } });
  let donationAdded = 0;

  for (const c of contacts.slice(0, 240)) {
    if (donationExisting + donationAdded >= donationTarget) break;

    await prisma.donation.create({
      data: {
        campaignId: campaign.id,
        contactId: c.id,
        recordedById: rand([manager.id, admin.id]),
        amount: [25, 50, 75, 100, 150, 250][Math.floor(Math.random() * 6)],
        status: rand([DonationStatus.pledged, DonationStatus.processed]),
        method: rand(["credit", "e-transfer", "cheque"]),
        notes: "Mayoral campaign donation",
      },
    });

    donationAdded++;
  }

  const volunteerProfiles = await prisma.volunteerProfile.findMany({
    where: { campaignId: campaign.id },
    select: { id: true },
    take: 60,
  });

  const eastGroup = await prisma.volunteerGroup.upsert({
    where: { campaignId_name: { campaignId: campaign.id, name: "East End Team" } },
    update: {},
    create: {
      campaignId: campaign.id,
      name: "East End Team",
      description: "Ward-based East End canvassers",
      targetWard: "Ward 14",
    },
  });

  const downtownGroup = await prisma.volunteerGroup.upsert({
    where: { campaignId_name: { campaignId: campaign.id, name: "Downtown Team" } },
    update: {},
    create: {
      campaignId: campaign.id,
      name: "Downtown Team",
      description: "Core downtown outreach team",
      targetWard: "Ward 10",
    },
  });

  for (let i = 0; i < volunteerProfiles.length; i++) {
    const groupId = i % 2 === 0 ? eastGroup.id : downtownGroup.id;
    await prisma.volunteerGroupMember.upsert({
      where: { groupId_volunteerProfileId: { groupId, volunteerProfileId: volunteerProfiles[i].id } },
      update: {},
      create: { groupId, volunteerProfileId: volunteerProfiles[i].id },
    });
  }

  const shift = await prisma.volunteerShift.create({
    data: {
      campaignId: campaign.id,
      name: "Saturday Citywide Canvass",
      shiftDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startTime: "10:00",
      endTime: "14:00",
      meetingLocation: "Campaign HQ, Toronto",
      targetTurfArea: "Citywide",
      maxVolunteers: 120,
      minVolunteers: 20,
      checkInCode: `TOR-${Date.now()}`,
    },
  });

  for (const vp of volunteerProfiles.slice(0, 45)) {
    await prisma.volunteerShiftSignup.upsert({
      where: { shiftId_volunteerProfileId: { shiftId: shift.id, volunteerProfileId: vp.id } },
      update: {},
      create: {
        shiftId: shift.id,
        volunteerProfileId: vp.id,
        status: rand([VolunteerShiftSignupStatus.signed_up, VolunteerShiftSignupStatus.attended]),
      },
    });
  }

  await prisma.activityLog.createMany({
    data: [
      {
        campaignId: campaign.id,
        userId: admin.id,
        action: "seeded_toronto_mayor_dataset",
        entityType: "campaign",
        entityId: campaign.id,
        details: { source: "prisma/seeds/toronto-mayoral-campaign.ts" },
      },
      {
        campaignId: campaign.id,
        userId: manager.id,
        action: "created_shift",
        entityType: "volunteer_shift",
        entityId: shift.id,
        details: { name: shift.name },
      },
    ],
  });

  const [contactsCount, volunteersCount, signsCount, tasksCount, interactionsCount, donationsCount] = await Promise.all([
    prisma.contact.count({ where: { campaignId: campaign.id } }),
    prisma.volunteerProfile.count({ where: { campaignId: campaign.id } }),
    prisma.sign.count({ where: { campaignId: campaign.id } }),
    prisma.task.count({ where: { campaignId: campaign.id } }),
    prisma.interaction.count({ where: { contact: { campaignId: campaign.id } } }),
    prisma.donation.count({ where: { campaignId: campaign.id } }),
  ]);

  console.log("Toronto mayoral seed complete:");
  console.log({
    campaignSlug: campaign.slug,
    contacts: contactsCount,
    volunteers: volunteersCount,
    signs: signsCount,
    tasks: tasksCount,
    interactions: interactionsCount,
    donations: donationsCount,
  });
  console.log("Team test users:", ["admin@pollcity.dev", "manager@pollcity.dev", "lead@pollcity.dev", "volunteer@pollcity.dev"]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
