import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export const maxDuration = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.bCRidingLayer.findFirst({
    where: { id: "bc-ridings-current" },
    select: { featureCollection: true, ridingCount: true, electionYear: true },
  });

  if (!row) {
    return NextResponse.json(
      { error: "BC riding data not yet imported. Run: npx tsx scripts/import-bc-boundaries.ts --ridings <path.shp>" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    featureCollection: row.featureCollection,
    ridingCount: row.ridingCount,
    electionYear: row.electionYear,
  });
}
