import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { province: string; municipality: string } }
) {
  const results = await prisma.liveResult.findMany({
    where: {
      province: decodeURIComponent(params.province),
      municipality: decodeURIComponent(params.municipality),
      isVerified: true,
    },
    orderBy: [{ ward: "asc" }, { votes: "desc" }],
  });

  return NextResponse.json({
    data: results,
    meta: {
      province: decodeURIComponent(params.province),
      municipality: decodeURIComponent(params.municipality),
      totalResults: results.length,
    },
  });
}
