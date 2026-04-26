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

  const row = await prisma.bCMunicipalBoundaryLayer.findFirst({
    where: { id: "bc-municipal-current" },
    select: { featureCollection: true, municipalityCount: true },
  });

  if (!row) {
    return NextResponse.json(
      { error: "BC municipal data not yet imported. Run: npx tsx scripts/import-bc-boundaries.ts --municipal <path.shp>" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    featureCollection: row.featureCollection,
    municipalityCount: row.municipalityCount,
  });
}
