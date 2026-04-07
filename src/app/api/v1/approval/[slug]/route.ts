import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const official = await prisma.official.findFirst({
    where: {
      OR: [{ id: params.slug }, { externalId: params.slug }],
    },
    include: {
      approvalRating: true,
    },
  });

  if (!official || !official.approvalRating) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rating = official.approvalRating;

  return NextResponse.json({
    officialId: official.id,
    name: official.name,
    approvalScore: Math.round(rating.score * 10) / 10,
    sampleSize: rating.totalSignals,
    velocity: Math.round(rating.velocity * 100) / 100,
    marginOfError: Math.round(rating.marginOfError * 10) / 10,
    updatedAt: rating.updatedAt,
  });
}
