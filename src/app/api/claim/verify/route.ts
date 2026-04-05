import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/db/prisma";

const SECRET = process.env.NEXTAUTH_SECRET;
const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export async function GET(req: NextRequest) {
  if (!SECRET) {
    return new NextResponse(
      "<html><body><h2>Server configuration error.</h2></body></html>",
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 2) throw new Error("Malformed token");

    const [payload, sig] = parts;
    const expectedSig = createHmac("sha256", SECRET).update(payload).digest("hex");

    if (sig !== expectedSig) {
      return new NextResponse(
        "<html><body><h2>Invalid or expired verification link.</h2><p><a href='/'>Go home</a></p></body></html>",
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    const { officialId, email, campaignSlug, ts } = decoded;

    // Check token expiry
    const age = Math.floor(Date.now() / 1000) - ts;
    if (age > TOKEN_TTL_SECONDS) {
      return new NextResponse(
        "<html><body><h2>Verification link has expired.</h2><p>Please <a href='/claim/" + campaignSlug + "'>request a new one</a>.</p></body></html>",
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const official = await prisma.official.findUnique({
      where: { id: officialId },
      select: { id: true, isClaimed: true },
    });

    if (!official) {
      return new NextResponse(
        "<html><body><h2>Official not found.</h2></body></html>",
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    if (!official.isClaimed) {
      // Mark the official as claimed
      await prisma.official.update({
        where: { id: officialId },
        data: {
          isClaimed: true,
          claimedAt: new Date(),
          // Store email in subscriptionStatus for now (would be linked to a User in full implementation)
          subscriptionStatus: `pending:${email}`,
        },
      });
    }

    // Redirect to pricing to choose a plan
    return NextResponse.redirect(new URL("/pricing?claimed=1&campaign=" + campaignSlug, req.url));
  } catch (err) {
    console.error("[claim/verify]", err);
    return new NextResponse(
      "<html><body><h2>Verification failed.</h2><p>The link may be malformed. <a href='/'>Go home</a></p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }
}
