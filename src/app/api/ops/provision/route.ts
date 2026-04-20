import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { sendEmail } from "@/lib/email";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { Role, ElectionType } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ProvisionBody = z.object({
  candidateName: z.string().min(2).max(100).trim(),
  campaignName: z.string().min(2).max(150).trim(),
  adminEmail: z.string().email().toLowerCase().trim(),
  electionType: z.nativeEnum(ElectionType).default(ElectionType.municipal),
  electionDate: z.string().datetime({ offset: true }).optional().nullable(),
  jurisdiction: z.string().max(100).optional(),
  officialId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ProvisionBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { candidateName, campaignName, adminEmail, electionType, electionDate, jurisdiction, officialId } = parsed.data;

  // Verify official exists if provided
  if (officialId) {
    const official = await prisma.official.findUnique({
      where: { id: officialId },
      select: { id: true, isClaimed: true },
    });
    if (!official) {
      return NextResponse.json({ error: "Official not found" }, { status: 404 });
    }
  }
  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "https://app.poll.city";

  // ── 1. Find or create the user ─────────────────────────────────────────────
  let user = await prisma.user.findUnique({ where: { email: adminEmail } });
  const isNewUser = !user;

  if (!user) {
    // Placeholder hash — user will set their real password via the invite link
    const placeholderHash = await bcrypt.hash(randomBytes(32).toString("hex"), 4);
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: candidateName,
        passwordHash: placeholderHash,
        role: Role.ADMIN,
        emailVerified: false,
      },
    });
  }

  // ── 2. Build a unique campaign slug ────────────────────────────────────────
  const baseSlug = slugify(campaignName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.campaign.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  // ── 3. Create the campaign ─────────────────────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      name: campaignName,
      slug,
      candidateName,
      electionType,
      electionDate: electionDate ? new Date(electionDate) : null,
      jurisdiction: jurisdiction ?? null,
      officialId: officialId ?? null,
      isActive: true,
      onboardingComplete: false,
    },
  });

  // Mark official as claimed when George provisions concierge-style
  if (officialId) {
    await prisma.official.update({
      where: { id: officialId },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        claimedByUserId: user.id,
      },
    });
  }

  // ── 4. Check for duplicate membership ─────────────────────────────────────
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: user.id, campaignId: campaign.id } },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: { userId: user.id, campaignId: campaign.id, role: Role.ADMIN, status: "active" },
    });
  }

  // ── 5. Set activeCampaignId for new users ──────────────────────────────────
  if (isNewUser) {
    await prisma.user.update({
      where: { id: user.id },
      data: { activeCampaignId: campaign.id },
    });
  }

  // ── 6. Create invite token (7-day expiry) ──────────────────────────────────
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.clientInviteToken.create({
    data: {
      token: rawToken,
      campaignId: campaign.id,
      userId: user.id,
      invitedBy: session!.user.id,
      email: adminEmail,
      isNewUser,
      status: "pending",
      expiresAt,
    },
  });

  const inviteUrl = `${origin}/accept-invite?token=${rawToken}`;

  // ── 7. Send invite email ───────────────────────────────────────────────────
  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: adminEmail,
        subject: `Your Poll City campaign is ready — activate your account`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <div style="background: #0A2342; padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Poll City</h1>
              <p style="color: #93c5fd; margin: 8px 0 0; font-size: 14px;">Campaign Operations Platform</p>
            </div>
            <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #0A2342; margin: 0 0 16px;">Welcome to Poll City, ${candidateName}</h2>
              <p style="color: #6b7280; line-height: 1.6; margin: 0 0 16px;">
                Your campaign <strong style="color: #1f2937;">${campaignName}</strong> has been set up and is ready for you.
              </p>
              <p style="color: #6b7280; line-height: 1.6; margin: 0 0 24px;">
                Click the button below to activate your account and get started. This link expires in 7 days.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}"
                   style="background: #1D9E75; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  Activate My Account
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0; border-top: 1px solid #f3f4f6; padding-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${inviteUrl}" style="color: #1D9E75; word-break: break-all;">${inviteUrl}</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">
                Poll City — Canadian Campaign Technology
              </p>
            </div>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("[ops/provision] Email send failed:", emailErr);
      // Provision still succeeds — return invite URL for manual sharing
    }
  }

  // ── 8. Audit log ───────────────────────────────────────────────────────────
  await audit(prisma, "client.provisioned", {
    userId: session!.user.id,
    campaignId: campaign.id,
    entityId: campaign.id,
    entityType: "Campaign",
    ip: req.headers.get("x-forwarded-for"),
    details: { adminEmail, campaignName, isNewUser, emailSent, officialId: officialId ?? null },
  });

  return NextResponse.json({
    data: {
      campaign: { id: campaign.id, name: campaign.name, slug: campaign.slug },
      user: { id: user.id, email: user.email, isNewUser },
      emailSent,
      inviteUrl: emailSent ? null : inviteUrl, // only expose if email failed — use for manual sharing
    },
  });
}
