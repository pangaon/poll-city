import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const emailRateStore = new Map<string, number[]>();

function hitEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const timestamps = (emailRateStore.get(email) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (timestamps.length >= MAX_PER_WINDOW) {
    emailRateStore.set(email, timestamps);
    return true;
  }
  timestamps.push(now);
  emailRateStore.set(email, timestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json({ success: true });
    }

    if (hitEmailRateLimit(email)) {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
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
            <h2 style="color: #1e3a8a;">Reset Your Password</h2>
            <p>Hello ${user.name ?? "there"},</p>
            <p>We received a request to reset your password.</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ success: true });
  }
}
