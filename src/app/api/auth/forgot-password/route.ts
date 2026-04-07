import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { enforceLimit, checkLimit } from "@/lib/rate-limit-redis";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const ipLimited = await enforceLimit(req, "forgotPassword");
    if (ipLimited) return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE_HEADERS });

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const emailOutcome = await checkLimit("forgotPassword", `email:${email}`);
    if (!emailOutcome.success) {
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: expiry,
      },
    });

    const origin = req.headers.get("origin");
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
    const baseUrl = origin ?? (forwardedHost ? `${forwardedProto}://${forwardedHost}` : process.env.NEXTAUTH_URL ?? "http://localhost:3000");
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to: user.email,
        subject: "Reset your Poll City password",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a8a;">Reset your Poll City password</h2>
            <p>Hi ${user.name ?? "there"},</p>
            <p>Someone requested a password reset for your Poll City account.</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, ignore this email — your password won't change.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">— Poll City Team</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  }
}
