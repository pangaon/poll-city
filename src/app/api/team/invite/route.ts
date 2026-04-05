import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";

const inviteSchema = z.object({
  campaignId: z.string().min(1),
  email: z.string().email().toLowerCase(),
  role: z.enum(["ADMIN", "CAMPAIGN_MANAGER", "VOLUNTEER_LEADER", "VOLUNTEER"]),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, email, role } = parsed.data;

  // Verify inviter is admin
  const inviter = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    include: { campaign: { select: { name: true } } },
  });
  if (!inviter) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (inviter.role !== "ADMIN" && inviter.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only campaign admins can invite members" }, { status: 403 });
  }

  try {
    // Find or create the user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Placeholder password hash — user will set it via password reset on first login
      const placeholderHash = randomBytes(32).toString("hex");
      user = await prisma.user.create({
        data: { email, name: null, role: Role.VOLUNTEER, passwordHash: placeholderHash },
      });
    }

    // Check for existing membership
    const existing = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: user.id, campaignId } },
    });
    if (existing) {
      return NextResponse.json({ error: "This user is already a member of the campaign" }, { status: 409 });
    }

    // Create membership
    await prisma.membership.create({
      data: { userId: user.id, campaignId, role: role as Role },
    });

    // Send invitation email
    if (process.env.RESEND_API_KEY) {
      const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "https://www.poll.city";
      const signInUrl = `${origin}/login?email=${encodeURIComponent(email)}`;
      try {
        await sendEmail({
          to: email,
          subject: `You've been invited to join ${inviter.campaign.name} on Poll City`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a8a;">You're invited to Poll City</h2>
              <p>Hi,</p>
              <p>${session!.user.name || session!.user.email} has invited you to join <strong>${inviter.campaign.name}</strong> on Poll City as <strong>${roleLabel(role)}</strong>.</p>
              <p style="text-align: center; margin: 32px 0;">
                <a href="${signInUrl}" style="background-color: #1e40af; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Sign in to Poll City
                </a>
              </p>
              <p style="color: #6b7280; font-size: 14px;">If you don't have an account yet, signing in with this email will create one automatically.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">Poll City — Canadian Campaign Technology</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[team/invite] Email send failed:", emailErr);
        // Don't fail the request — membership was still created
      }
    } else {
      console.log("[team/invite] RESEND_API_KEY not set — email skipped for", email);
    }

    return NextResponse.json({ data: { invited: true, userId: user.id } });
  } catch (e) {
    console.error("[team/invite]", e);
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "Admin",
    CAMPAIGN_MANAGER: "Manager",
    VOLUNTEER_LEADER: "Volunteer Leader",
    VOLUNTEER: "Canvasser",
  };
  return map[role] ?? role;
}

export const dynamic = "force-dynamic";
