import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier") ?? "lower_and_single";

  const row = await prisma.ontarioMunicipalBoundaryLayer.findUnique({
    where: { tierType: tier },
    select: { featureCollection: true, municipalityCount: true, tierType: true },
  });

  if (!row) {
    return NextResponse.json(
      { error: `Ontario municipal boundaries not yet imported for tier: ${tier}. Run: npx tsx scripts/import-ontario-municipal-boundaries.ts` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    featureCollection: row.featureCollection,
    municipalityCount: row.municipalityCount,
    tierType: row.tierType,
  });
}
