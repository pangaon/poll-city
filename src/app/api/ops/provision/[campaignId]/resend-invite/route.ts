import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { campaignId } = params;

  // Verify campaign exists
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, candidateName: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Find the ADMIN membership for this campaign
  const adminMembership = await prisma.membership.findFirst({
    where: { campaignId, role: "ADMIN" },
    include: { user: { select: { id: true, email: true, name: true, lastLoginAt: true } } },
  });
  if (!adminMembership) {
    return NextResponse.json({ error: "No admin found for this campaign" }, { status: 404 });
  }

  const user = adminMembership.user;

  // If they've already logged in, no invite needed — they have a real account
  if (user.lastLoginAt) {
    return NextResponse.json(
      { error: "This user has already activated their account. They can sign in directly." },
      { status: 409 }
    );
  }

  // Revoke any existing pending tokens for this user + campaign
  await prisma.clientInviteToken.updateMany({
    where: { campaignId, userId: user.id, status: "pending" },
    data: { status: "revoked" },
  });

  // Issue a new token (7-day expiry)
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.clientInviteToken.create({
    data: {
      token: rawToken,
      campaignId,
      userId: user.id,
      invitedBy: session!.user.id,
      email: user.email,
      isNewUser: true,
      status: "pending",
      expiresAt,
    },
  });

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "https://app.poll.city";
  const inviteUrl = `${origin}/accept-invite?token=${rawToken}`;

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: user.email,
        subject: `Reminder: Activate your Poll City account for ${campaign.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <div style="background: #0A2342; padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Poll City</h1>
              <p style="color: #93c5fd; margin: 8px 0 0; font-size: 14px;">Campaign Operations Platform</p>
            </div>
            <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #0A2342; margin: 0 0 16px;">Your invite has been resent</h2>
              <p style="color: #6b7280; line-height: 1.6; margin: 0 0 24px;">
                Your Poll City campaign <strong style="color: #1f2937;">${campaign.name}</strong> is ready and waiting.
                Click below to activate your account. This link expires in 7 days.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}"
                   style="background: #1D9E75; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  Activate My Account
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0; border-top: 1px solid #f3f4f6; padding-top: 24px;">
                <a href="${inviteUrl}" style="color: #1D9E75; word-break: break-all;">${inviteUrl}</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">Poll City — Canadian Campaign Technology</p>
            </div>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("[ops/provision/resend-invite] Email send failed:", emailErr);
    }
  }

  await audit(prisma, "client.invite_resent", {
    userId: session!.user.id,
    campaignId,
    entityId: user.id,
    entityType: "User",
    ip: req.headers.get("x-forwarded-for"),
    details: { adminEmail: user.email, emailSent },
  });

  return NextResponse.json({
    data: { emailSent, inviteUrl: emailSent ? null : inviteUrl },
  });
}
