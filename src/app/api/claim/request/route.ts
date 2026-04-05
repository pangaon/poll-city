import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";

const SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;

  if (!SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const { officialId, email, campaignSlug, captchaToken } = await req.json();

    const captchaValid = await verifyTurnstileToken(req, captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        {
          error: isTurnstileEnabled()
            ? "Captcha verification failed"
            : "Captcha token missing",
        },
        { status: 400 }
      );
    }

    if (!officialId || !email || !campaignSlug) {
      return NextResponse.json({ error: "officialId, email, and campaignSlug are required" }, { status: 400 });
    }

    const emailLower = (email as string).toLowerCase().trim();

    const official = await prisma.official.findUnique({
      where: { id: officialId as string },
      select: { id: true, name: true, isClaimed: true },
    });

    if (!official) {
      return NextResponse.json({ error: "Official not found" }, { status: 404 });
    }

    if (official.isClaimed) {
      return NextResponse.json({ error: "This profile has already been claimed" }, { status: 409 });
    }

    // Generate a time-limited signed token
    const timestamp = Math.floor(Date.now() / 1000); // seconds
    const payload = Buffer.from(
      JSON.stringify({ officialId: official.id, email: emailLower, campaignSlug, ts: timestamp })
    ).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
    const token = `${payload}.${sig}`;

    // Build the verification URL
    const origin = req.headers.get("origin");
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
    const baseUrl = origin ?? (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "http://localhost:3000");
    const verifyUrl = `${baseUrl}/api/claim/verify?token=${encodeURIComponent(token)}`;

    // Send verification email via Resend
    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to: emailLower,
        subject: `Verify your Poll City profile — ${official.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a8a;">Claim Your Poll City Profile</h2>
            <p>Hi,</p>
            <p>Someone requested to claim the official profile for <strong>${official.name}</strong> on Poll City using this email address.</p>
            <p>Click the button below to verify your identity and claim your profile:</p>
            <p style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="background-color: #1e40af; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Verify &amp; Claim Profile
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">Poll City — Canadian Campaign Technology</p>
          </div>
        `,
      });
    } else {
      console.log("[claim/request] RESEND_API_KEY not set — verify URL:", verifyUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
      ...(process.env.NODE_ENV !== "production" ? { verifyUrl } : {}),
    });
  } catch (err) {
    console.error("[claim/request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
