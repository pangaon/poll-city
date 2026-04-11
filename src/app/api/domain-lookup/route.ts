import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * GET /api/domain-lookup?hostname=<hostname>
 * Public, unauthenticated — used by middleware to resolve custom domains to campaign slugs.
 * Returns { slug } on match, 404 on no match.
 */
export async function GET(req: NextRequest) {
  const hostname = req.nextUrl.searchParams.get("hostname");
  if (!hostname) return NextResponse.json({ error: "hostname required" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({
    where: { customDomain: hostname },
    select: { slug: true },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ slug: campaign.slug });
}
