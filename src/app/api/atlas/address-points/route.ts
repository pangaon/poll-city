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
  const municipality = searchParams.get("municipality");
  const wardId = searchParams.get("ward");

  if (!municipality) {
    return NextResponse.json({ error: "municipality query parameter required" }, { status: 400 });
  }

  // Single ward
  if (wardId) {
    const row = await prisma.addressPointLayer.findUnique({
      where: { municipality_wardId: { municipality, wardId } },
      select: { featureCollection: true, pointCount: true, wardId: true },
    });
    if (!row) {
      return NextResponse.json({ error: `No address points for ${municipality} ward ${wardId}` }, { status: 404 });
    }
    return NextResponse.json({ featureCollection: row.featureCollection, pointCount: row.pointCount, wardId: row.wardId });
  }

  // All wards for municipality — return index (ward IDs + counts, not the full geometry)
  const rows = await prisma.addressPointLayer.findMany({
    where: { municipality },
    select: { wardId: true, pointCount: true },
    orderBy: { wardId: "asc" },
  });

  if (!rows.length) {
    return NextResponse.json(
      { error: `No address points imported for ${municipality}. Run: npx tsx scripts/import-address-points.ts` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    municipality,
    wards: rows,
    totalPoints: rows.reduce((s, r) => s + r.pointCount, 0),
  });
}
