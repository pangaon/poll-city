/**
 * GET /api/timeline — Campaign milestone timeline.
 *
 * Assembles the complete story of the campaign from activity logs,
 * donations, events, imports, GOTV uploads, and key metrics.
 *
 * Returns milestones in chronological order — the story a candidate
 * tells at their victory speech.
 *
 * "We started with zero contacts in March. By May we had 2,000.
 * Sarah knocked her 100th door on June 3rd. We raised $5,000
 * by August. And on October 26th, we won by 47 votes."
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

interface Milestone {
  date: Date;
  type: "metric" | "event" | "donation" | "import" | "gotv" | "volunteer" | "sign" | "system";
  title: string;
  description: string;
  value?: number;
  icon: string;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "analytics:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const milestones: Milestone[] = [];

  // Campaign creation
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true, createdAt: true, electionDate: true },
  });
  if (campaign) {
    milestones.push({
      date: campaign.createdAt, type: "system",
      title: "Campaign created", description: `${campaign.name} launched on Poll City.`,
      icon: "rocket",
    });
  }

  // First contact imported
  const firstContact = await prisma.contact.findFirst({
    where: { campaignId }, orderBy: { createdAt: "asc" }, select: { createdAt: true },
  });
  if (firstContact) {
    milestones.push({
      date: firstContact.createdAt, type: "import",
      title: "First contact added", description: "The voter list is in. The campaign has data.",
      icon: "user-plus",
    });
  }

  // Contact milestones (100, 500, 1000, 2000, 5000)
  for (const threshold of [100, 500, 1000, 2000, 5000]) {
    const contact = await prisma.contact.findFirst({
      where: { campaignId },
      orderBy: { createdAt: "asc" },
      skip: threshold - 1,
      select: { createdAt: true },
    });
    if (contact) {
      milestones.push({
        date: contact.createdAt, type: "metric", value: threshold,
        title: `${threshold.toLocaleString()} contacts`, description: `Campaign database reached ${threshold.toLocaleString()} contacts.`,
        icon: "users",
      });
    }
  }

  // First door knocked
  const firstDoor = await prisma.interaction.findFirst({
    where: { contact: { campaignId }, type: "door_knock" as any },
    orderBy: { createdAt: "asc" }, select: { createdAt: true },
  });
  if (firstDoor) {
    milestones.push({
      date: firstDoor.createdAt, type: "metric",
      title: "First door knocked", description: "Boots on the ground. The real campaign begins.",
      icon: "home",
    });
  }

  // Door milestones (100, 500, 1000, 2000)
  for (const threshold of [100, 500, 1000, 2000]) {
    const door = await prisma.interaction.findFirst({
      where: { contact: { campaignId } },
      orderBy: { createdAt: "asc" },
      skip: threshold - 1,
      select: { createdAt: true },
    });
    if (door) {
      milestones.push({
        date: door.createdAt, type: "metric", value: threshold,
        title: `${threshold.toLocaleString()} doors knocked`, description: `The campaign has knocked ${threshold.toLocaleString()} doors.`,
        icon: "activity",
      });
    }
  }

  // First donation
  const firstDonation = await prisma.donation.findFirst({
    where: { campaignId }, orderBy: { createdAt: "asc" }, select: { createdAt: true, amount: true },
  });
  if (firstDonation) {
    milestones.push({
      date: firstDonation.createdAt, type: "donation",
      title: "First donation received", description: `$${firstDonation.amount} — someone believes in this campaign.`,
      value: Number(firstDonation.amount), icon: "dollar-sign",
    });
  }

  // Donation milestones ($1000, $5000, $10000)
  const totalDonations = await prisma.donation.aggregate({
    where: { campaignId }, _sum: { amount: true },
  });
  const donationTotal = Number(totalDonations._sum.amount ?? 0);
  for (const threshold of [1000, 5000, 10000]) {
    if (donationTotal >= threshold) {
      milestones.push({
        date: new Date(), type: "donation", value: threshold,
        title: `$${threshold.toLocaleString()} raised`, description: `Campaign fundraising crossed $${threshold.toLocaleString()}.`,
        icon: "trending-up",
      });
    }
  }

  // Events
  const events = await prisma.event.findMany({
    where: { campaignId }, orderBy: { eventDate: "asc" },
    select: { name: true, eventDate: true, location: true },
    take: 20,
  });
  for (const e of events) {
    milestones.push({
      date: e.eventDate, type: "event",
      title: e.name, description: e.location,
      icon: "calendar",
    });
  }

  // First volunteer
  const firstVolunteer = await prisma.volunteerProfile.findFirst({
    where: { campaignId }, orderBy: { createdAt: "asc" },
    select: { createdAt: true, user: { select: { name: true } } },
  });
  if (firstVolunteer) {
    milestones.push({
      date: firstVolunteer.createdAt, type: "volunteer",
      title: "First volunteer joined", description: `${firstVolunteer.user?.name ?? "A volunteer"} signed up. The team is growing.`,
      icon: "heart",
    });
  }

  // Election day (future)
  if (campaign?.electionDate) {
    milestones.push({
      date: campaign.electionDate, type: "system",
      title: "Election Day", description: "Polls open 10am–8pm. Every vote counts.",
      icon: "flag",
    });
  }

  // Sort chronologically
  milestones.sort((a, b) => a.date.getTime() - b.date.getTime());

  return NextResponse.json({
    milestones,
    count: milestones.length,
    campaignAge: campaign ? Math.ceil((Date.now() - campaign.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
  });
}
