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
  const edIdParam = searchParams.get("edId");

  if (!edIdParam) {
    return NextResponse.json({ error: "edId query parameter required" }, { status: 400 });
  }

  const edId = parseInt(edIdParam, 10);
  if (isNaN(edId)) {
    return NextResponse.json({ error: "edId must be a number" }, { status: 400 });
  }

  const row = await prisma.ontarioPollingDivisionLayer.findUnique({
    where: { edId_electionYear: { edId, electionYear: 2025 } },
    select: { featureCollection: true, pdCount: true, edNameEnglish: true },
  });

  if (!row) {
    return NextResponse.json(
      { error: `No polling divisions found for riding ${edId}. Run the import script first.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    featureCollection: row.featureCollection,
    pdCount: row.pdCount,
    edNameEnglish: row.edNameEnglish,
    edId,
  });
}
