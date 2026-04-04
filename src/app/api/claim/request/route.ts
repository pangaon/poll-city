import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "auth");
  if (limited) return limited;

  try {
    const { officialId, email, campaignSlug } = await req.json();

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

    // TODO: send email via your transactional email provider using verifyUrl

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
