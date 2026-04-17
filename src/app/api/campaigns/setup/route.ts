import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { getComplianceDefaults } from "@/lib/fundraising/compliance";

export const dynamic = "force-dynamic";

const SetupBody = z.object({
  // Step 1 — candidate identity
  candidateName: z.string().min(1).max(100).optional(),
  candidateTitle: z.string().max(100).optional().nullable(),
  jurisdiction: z.string().max(100).optional().nullable(),
  // Step 2 — election dates
  electionType: z.enum(["municipal", "provincial", "federal", "other"]).optional(),
  electionDate: z.string().datetime({ offset: true }).optional().nullable(),
  advanceVoteStart: z.string().datetime({ offset: true }).optional().nullable(),
  advanceVoteEnd: z.string().datetime({ offset: true }).optional().nullable(),
  // Step 3 — HQ
  officeAddress: z.string().max(200).optional().nullable(),
  candidatePhone: z.string().max(30).optional().nullable(),
  candidateEmail: z.string().email().max(200).optional().nullable(),
  // Step 4 — socials
  websiteUrl: z.string().max(300).optional().nullable(),
  twitterHandle: z.string().max(30).optional().nullable(),
  instagramHandle: z.string().max(30).optional().nullable(),
  facebookUrl: z.string().max(300).optional().nullable(),
  // Step 5 — email voice
  fromEmailName: z.string().max(100).optional().nullable(),
  replyToEmail: z.string().email().max(200).optional().nullable(),
  // Marks wizard complete
  complete: z.boolean().optional(),
});

/** GET — returns current onboarding status for the active campaign */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  if (!campaignId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  // Only ADMIN/CAMPAIGN_MANAGER roles see the wizard
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ onboardingComplete: true }); // volunteers skip wizard
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      onboardingComplete: true,
      candidateName: true,
      candidateTitle: true,
      jurisdiction: true,
      electionType: true,
      electionDate: true,
      advanceVoteStart: true,
      advanceVoteEnd: true,
      officeAddress: true,
      candidatePhone: true,
      candidateEmail: true,
      websiteUrl: true,
      twitterHandle: true,
      instagramHandle: true,
      facebookUrl: true,
      fromEmailName: true,
      replyToEmail: true,
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(campaign);
}

/** PATCH — saves wizard step data, optionally marks onboardingComplete */
export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  if (!campaignId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  // Only ADMIN/CAMPAIGN_MANAGER may submit setup
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = SetupBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const b = parsed.data;
  const patch: Record<string, unknown> = {};

  if (b.candidateName !== undefined) patch.candidateName = b.candidateName;
  if (b.candidateTitle !== undefined) patch.candidateTitle = b.candidateTitle;
  if (b.jurisdiction !== undefined) patch.jurisdiction = b.jurisdiction;
  if (b.electionType !== undefined) patch.electionType = b.electionType;
  if (b.electionDate !== undefined) patch.electionDate = b.electionDate ? new Date(b.electionDate) : null;
  if (b.advanceVoteStart !== undefined) patch.advanceVoteStart = b.advanceVoteStart ? new Date(b.advanceVoteStart) : null;
  if (b.advanceVoteEnd !== undefined) patch.advanceVoteEnd = b.advanceVoteEnd ? new Date(b.advanceVoteEnd) : null;
  if (b.officeAddress !== undefined) patch.officeAddress = b.officeAddress;
  if (b.candidatePhone !== undefined) patch.candidatePhone = b.candidatePhone;
  if (b.candidateEmail !== undefined) patch.candidateEmail = b.candidateEmail;
  if (b.websiteUrl !== undefined) patch.websiteUrl = b.websiteUrl;
  if (b.twitterHandle !== undefined) patch.twitterHandle = b.twitterHandle;
  if (b.instagramHandle !== undefined) patch.instagramHandle = b.instagramHandle;
  if (b.facebookUrl !== undefined) patch.facebookUrl = b.facebookUrl;
  if (b.fromEmailName !== undefined) patch.fromEmailName = b.fromEmailName;
  if (b.replyToEmail !== undefined) patch.replyToEmail = b.replyToEmail;
  if (b.complete) patch.onboardingComplete = true;

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: patch,
    select: { id: true, onboardingComplete: true, electionType: true },
  });

  // On wizard completion: auto-initialize fundraising compliance config with the
  // correct election-type rules if one hasn't been configured yet.
  // This ensures federal campaigns get $1,675 limits, not the $1,200 municipal default.
  if (b.complete && campaign.electionType) {
    const existing = await prisma.fundraisingComplianceConfig.findUnique({
      where: { campaignId },
    });
    if (!existing) {
      const defaults = getComplianceDefaults(campaign.electionType);
      await prisma.fundraisingComplianceConfig.create({
        data: {
          campaignId,
          annualLimitPerDonor: defaults.annualLimitPerDonor,
          anonymousLimit: defaults.anonymousLimit,
          allowCorporate: defaults.allowCorporate,
          allowUnion: defaults.allowUnion,
          blockMode: defaults.blockMode,
          warningThreshold: defaults.warningThreshold,
          updatedByUserId: session!.user.id,
        },
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: b.complete ? "onboarding_complete" : "onboarding_step_saved",
      entityType: "Campaign",
      entityId: campaignId,
      details: patch as object,
    },
  });

  return NextResponse.json(campaign);
}
