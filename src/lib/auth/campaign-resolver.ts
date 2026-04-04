/**
 * Campaign Resolver
 *
 * Safely resolves which campaign a user is currently working in.
 * 
 * Priority order:
 * 1. session.user.activeCampaignId (explicitly selected by user)
 * 2. First membership found (fallback for single-campaign users)
 *
 * For multi-campaign users, activeCampaignId must be set via the
 * campaign switcher UI — without it, they get their first campaign.
 *
 * This is the ONLY place that should call prisma.membership.findFirst.
 * All pages must call this helper instead of raw findFirst.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export interface ResolvedCampaign {
  campaignId: string;
  campaignName: string;
  role: string;
  userId: string;
  userName: string | null; // from session — no extra DB call
}

/**
 * Get the active campaign for the current user.
 * Redirects to /login if not authenticated.
 * Redirects to /no-campaign if no membership found.
 */
export async function resolveActiveCampaign(): Promise<ResolvedCampaign> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as typeof session.user & { activeCampaignId?: string | null };
  const userId = user.id;
  const activeCampaignId = user.activeCampaignId;

  // Build the where clause
  const where = activeCampaignId
    ? { userId, campaignId: activeCampaignId }
    : { userId };

  const membership = await prisma.membership.findFirst({
    where,
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" }, // consistent ordering for single-campaign users
  });

  if (!membership) redirect("/login");

  return {
    campaignId: membership.campaignId,
    campaignName: membership.campaign.name,
    role: membership.role,
    userId,
    userName: session.user.name ?? null,
  };
}

/**
 * Get all campaigns for the current user (for the campaign switcher).
 */
export async function getUserCampaigns(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { campaign: { select: { id: true, name: true, electionType: true } } },
    orderBy: { joinedAt: "asc" },
  });
}

/**
 * Switch the user's active campaign.
 * Updates User.activeCampaignId in the database.
 * The session is updated on next login — client should call signIn() or refresh.
 */
export async function switchCampaign(userId: string, campaignId: string): Promise<boolean> {
  // Verify user actually belongs to the target campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });

  if (!membership) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { activeCampaignId: campaignId },
  });

  return true;
}
