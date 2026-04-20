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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { campaignId } = params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { intelligenceEnabled } = body as { intelligenceEnabled?: boolean };
  if (typeof intelligenceEnabled !== "boolean") {
    return NextResponse.json({ error: "intelligenceEnabled (boolean) required" }, { status: 422 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { intelligenceEnabled },
    select: { id: true, name: true, intelligenceEnabled: true },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: intelligenceEnabled ? "intelligence_enabled" : "intelligence_disabled",
      entityType: "campaign",
      entityId: campaignId,
      details: { changedBy: session!.user.email ?? session!.user.id },
    },
  });

  return NextResponse.json({ data: updated });
}
