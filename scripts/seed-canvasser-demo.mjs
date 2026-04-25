#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assignmentIdForTurf(turfId) {
  return `demo-fa-${turfId}`;
}

async function pickAssignee(campaignId) {
  const memberships = await prisma.membership.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, email: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });

  if (!memberships.length) return null;

  const preferred = memberships.find((m) => m.role === "VOLUNTEER")
    ?? memberships.find((m) => m.role === "ADMIN")
    ?? memberships[0];

  const creator = memberships.find((m) => m.role === "ADMIN") ?? memberships[0];

  return {
    assignedUserId: preferred.userId,
    createdById: creator.userId,
    assigneeEmail: preferred.user.email,
  };
}

async function contactsForTurf(campaignId, turfId) {
  const turfStops = await prisma.turfStop.findMany({
    where: { turfId },
    orderBy: { order: "asc" },
    select: { contactId: true },
  });

  const fromTurfStops = turfStops.map((s) => s.contactId).filter(Boolean);
  if (fromTurfStops.length) return fromTurfStops;

  const fallbackContacts = await prisma.contact.findMany({
    where: { campaignId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true },
  });
  return fallbackContacts.map((c) => c.id);
}

async function seedCampaignAssignments(campaign) {
  const turfs = await prisma.turf.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, ward: true },
  });

  if (!turfs.length) {
    console.log(`⚠ ${campaign.candidateName}: no turfs, skipping`);
    return;
  }

  const assignee = await pickAssignee(campaign.id);
  if (!assignee) {
    console.log(`⚠ ${campaign.candidateName}: no memberships, skipping`);
    return;
  }

  let created = 0;
  for (const turf of turfs) {
    const assignmentId = assignmentIdForTurf(turf.id);
    const contactIds = await contactsForTurf(campaign.id, turf.id);
    if (!contactIds.length) continue;

    await prisma.fieldAssignment.upsert({
      where: { id: assignmentId },
      update: {
        campaignId: campaign.id,
        assignmentType: "canvass",
        name: `Canvass: ${turf.name}`,
        status: "assigned",
        fieldUnitId: turf.id,
        targetWard: turf.ward ?? null,
        assignedUserId: assignee.assignedUserId,
        createdById: assignee.createdById,
      },
      create: {
        id: assignmentId,
        campaignId: campaign.id,
        assignmentType: "canvass",
        name: `Canvass: ${turf.name}`,
        status: "assigned",
        fieldUnitId: turf.id,
        targetWard: turf.ward ?? null,
        assignedUserId: assignee.assignedUserId,
        createdById: assignee.createdById,
      },
    });

    await prisma.assignmentStop.deleteMany({ where: { assignmentId } });

    await prisma.assignmentStop.createMany({
      data: contactIds.map((contactId, idx) => ({
        assignmentId,
        contactId,
        order: idx + 1,
        status: "pending",
      })),
    });

    created += 1;
  }

  console.log(`✅ ${campaign.candidateName}: ${created} missions seeded (assignee ${assignee.assigneeEmail})`);
}

async function main() {
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, candidateName: true },
    orderBy: { createdAt: "asc" },
  });

  if (!campaigns.length) {
    console.log("No campaigns found.");
    return;
  }

  for (const campaign of campaigns) {
    await seedCampaignAssignments(campaign);
  }

  console.log("\nDone. Reload Expo Go and open Canvassing tab.");
}

main()
  .catch((e) => {
    console.error("❌ seed-canvasser-demo failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
