import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/db/prisma";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret";

export async function POST(req: NextRequest) {
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
    const host = req.headers.get("origin") ?? req.headers.get("x-forwarded-host") ?? "http://localhost:3000";
    const verifyUrl = `${host}/api/claim/verify?token=${encodeURIComponent(token)}`;

    // In production this would send an email. For now, log and return the link.
    console.log(`[claim] Verify link for ${official.name} (${emailLower}): ${verifyUrl}`);

    // TODO: send email via your transactional email provider using verifyUrl

    return NextResponse.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    console.error("[claim/request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
