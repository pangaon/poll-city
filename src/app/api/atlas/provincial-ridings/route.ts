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

  const row = await prisma.ontarioRidingLayer.findFirst({
    where: { id: "ontario-ridings-2022" },
    select: { featureCollection: true, ridingCount: true, electionYear: true },
  });

  if (!row) {
    return NextResponse.json(
      { error: "Provincial riding data not yet imported. Run: npx tsx scripts/import-provincial-shapefiles.ts" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    featureCollection: row.featureCollection,
    ridingCount: row.ridingCount,
    electionYear: row.electionYear,
  });
}
