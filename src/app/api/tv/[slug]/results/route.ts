import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const revalidate = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { id: true, tvEnabled: true, tvToken: true, jurisdiction: true },
  });
  if (!campaign || !campaign.tvEnabled || campaign.tvToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!campaign.jurisdiction) {
    return NextResponse.json({ data: [] });
  }

  const results = await prisma.electionResult.findMany({
    where: { jurisdiction: campaign.jurisdiction },
    orderBy: [{ electionDate: "desc" }, { votesReceived: "desc" }],
    take: 50,
    select: {
      id: true,
      electionDate: true,
      jurisdiction: true,
      electionType: true,
      candidateName: true,
      votesReceived: true,
      won: true,
    },
  });

  return NextResponse.json({ data: results });
}
