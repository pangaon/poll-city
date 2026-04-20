import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validatePassword } from "@/lib/auth/password-policy";
import { slugify } from "@/lib/utils";
import { Role, ElectionType, GovernmentLevel } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { seedDefaultRoles } from "@/lib/permissions/engine";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const ClaimBody = z.object({
  officialId: z.string().min(1),
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = ClaimBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422, headers: NO_STORE },
    );
  }

  const { officialId, name, email, password } = parsed.data;

  const policy = validatePassword(password);
  if (!policy.valid) {
    return NextResponse.json(
      { error: "Password requirements not met", details: policy.errors },
      { status: 422, headers: NO_STORE },
    );
  }

  // Verify official exists and hasn't already been claimed
  const official = await prisma.official.findUnique({
    where: { id: officialId },
    select: {
      id: true, name: true, title: true, district: true, level: true,
      email: true, isClaimed: true, photoUrl: true, province: true,
      _count: { select: { follows: true, questions: true } },
    },
  });

  if (!official) {
    return NextResponse.json({ error: "Official not found" }, { status: 404, headers: NO_STORE });
  }

  if (official.isClaimed) {
    return NextResponse.json(
      { error: "This profile has already been claimed. Sign in to access your campaign." },
      { status: 409, headers: NO_STORE },
    );
  }

  // Check for existing account
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409, headers: NO_STORE },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Build campaign name from official data
  const year = new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
  const campaignName = `${official.name} ${year}`;
  const baseSlug = slugify(campaignName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.campaign.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  // Single transaction: create user + campaign + mark claimed
  const { user, campaign } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.ADMIN,
        emailVerified: false,
      },
      select: { id: true, email: true, name: true },
    });

    const electionType: ElectionType =
      official.level === GovernmentLevel.federal ? ElectionType.federal
      : official.level === GovernmentLevel.provincial ? ElectionType.provincial
      : ElectionType.municipal;

    const newCampaign = await tx.campaign.create({
      data: {
        name: campaignName,
        slug,
        candidateName: official.name,
        electionType,
        jurisdiction: official.district,
        officialId: official.id,
        onboardingComplete: false,
        memberships: {
          create: { userId: newUser.id, role: Role.ADMIN },
        },
      },
      select: { id: true, name: true },
    });

    await tx.official.update({
      where: { id: official.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        claimedByUserId: newUser.id,
      },
    });

    await tx.activityLog.create({
      data: {
        campaignId: newCampaign.id,
        userId: newUser.id,
        action: "claimed_profile",
        entityType: "official",
        entityId: official.id,
        details: {
          officialName: official.name,
          district: official.district,
          source: "poll_city_social_claim",
        },
      },
    });

    return { user: newUser, campaign: newCampaign };
  });

  // Seed default permission roles (non-critical, outside transaction)
  try {
    await seedDefaultRoles(campaign.id);
    const adminRole = await prisma.campaignRole.findFirst({
      where: { campaignId: campaign.id, slug: "admin" },
    });
    if (adminRole) {
      await prisma.membership.update({
        where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
        data: { campaignRoleId: adminRole.id, trustLevel: 5 },
      });
    }
  } catch (e) {
    console.error("[Claim Profile] Failed to seed roles:", e);
  }

  return NextResponse.json(
    { data: { email: user.email, campaignId: campaign.id } },
    { status: 201, headers: NO_STORE },
  );
}
