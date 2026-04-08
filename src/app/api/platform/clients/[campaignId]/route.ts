import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { campaignId } = params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
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
      description: true,
      jurisdiction: true,
      candidateEmail: true,
      candidatePhone: true,
      websiteUrl: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memberships = await prisma.membership.findMany({
    where: { campaignId },
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          lastLoginAt: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const members = memberships.map((m) => ({
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    lastLogin: m.user.lastLoginAt ? m.user.lastLoginAt.toISOString() : null,
    joinedAt: m.joinedAt.toISOString(),
  }));

  return NextResponse.json({ campaign, members });
}
