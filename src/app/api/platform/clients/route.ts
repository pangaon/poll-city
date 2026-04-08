import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const ms14d = 14 * 24 * 60 * 60 * 1000;
  const ms7d = 7 * 24 * 60 * 60 * 1000;
  const ms30d = 30 * 24 * 60 * 60 * 1000;
  const ms90d = 90 * 24 * 60 * 60 * 1000;

  // Fetch all campaigns with related counts in one query
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      candidateName: true,
      electionType: true,
      electionDate: true,
      isActive: true,
      onboardingComplete: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          user: {
            select: {
              email: true,
              lastLoginAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          contacts: true,
          polls: true,
          donations: true,
          volunteerProfiles: true,
          signs: true,
          events: true,
        },
      },
    },
  });

  // Fetch last activity for each campaign in parallel
  const activityResults = await Promise.all(
    campaigns.map((c) =>
      prisma.activityLog
        .findFirst({
          where: { campaignId: c.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
        .catch(() => null),
    ),
  );

  const data = campaigns.map((c, idx) => {
    const memberCount = c.memberships.length;
    const contactCount = c._count.contacts;

    // Find admin email
    const adminMembership = c.memberships.find((m) => m.role === "ADMIN");
    const adminEmail = adminMembership?.user?.email ?? null;

    // Election date math
    let daysToElection: number | null = null;
    if (c.electionDate) {
      daysToElection = Math.ceil(
        (new Date(c.electionDate).getTime() - now) / (24 * 60 * 60 * 1000),
      );
    }

    // Last activity
    const lastActivityRaw = activityResults[idx]?.createdAt ?? null;
    const lastActivity = lastActivityRaw ? lastActivityRaw.toISOString() : null;
    const daysSinceActivity = lastActivity
      ? (now - new Date(lastActivity).getTime()) / ms7d
      : null;

    // healthIndicator
    let healthIndicator: "green" | "amber" | "red" = "green";
    const electionWithin30 =
      c.electionDate !== null &&
      c.electionDate.getTime() - now < ms30d &&
      c.electionDate.getTime() > now;
    const noActivity14d =
      c.electionDate !== null &&
      (lastActivity === null || now - new Date(lastActivity).getTime() > ms14d);
    const noActivity7d =
      lastActivity === null || now - new Date(lastActivity).getTime() > ms7d;

    if (!c.isActive || (electionWithin30 && contactCount < 100) || noActivity14d) {
      healthIndicator = "red";
    } else if (noActivity7d || contactCount < 50 || memberCount === 1) {
      healthIndicator = "amber";
    }

    // featuresUsed
    const featuresUsed: string[] = [];
    if (c._count.contacts > 0) featuresUsed.push("contacts");
    if (c._count.polls > 0) featuresUsed.push("polls");
    if (c._count.donations > 0) featuresUsed.push("donations");
    if (c._count.volunteerProfiles > 0) featuresUsed.push("volunteers");
    if (c._count.signs > 0) featuresUsed.push("signs");
    if (c._count.events > 0) featuresUsed.push("events");

    // Elections within 90d (for summary stats)
    const electionSoon =
      c.electionDate !== null &&
      c.electionDate.getTime() - now > 0 &&
      c.electionDate.getTime() - now < ms90d;

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      candidateName: c.candidateName,
      electionType: c.electionType,
      electionDate: c.electionDate ? c.electionDate.toISOString() : null,
      daysToElection,
      isActive: c.isActive,
      tier: "free" as const,
      createdAt: c.createdAt.toISOString(),
      lastActivity,
      memberCount,
      contactCount,
      adminEmail,
      onboardingComplete: c.onboardingComplete,
      healthIndicator,
      featuresUsed,
      electionSoon,
    };
  });

  return NextResponse.json({ data });
}
