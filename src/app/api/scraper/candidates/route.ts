import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const municipality = params.get("municipality");
  const province = params.get("province") ?? "ON";
  const office = params.get("office");
  const ward = params.get("ward");
  const yearParam = params.get("year");
  const limitParam = params.get("limit");
  const cursor = params.get("cursor");

  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  const limit = Math.min(parseInt(limitParam ?? "100", 10), 500);

  const candidates = await prisma.rawMuniCandidate.findMany({
    where: {
      ...(municipality ? { municipality } : {}),
      province,
      ...(office ? { office } : {}),
      ...(ward ? { ward } : {}),
      ...(year ? { electionYear: year } : {}),
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      municipality: true,
      province: true,
      electionYear: true,
      office: true,
      ward: true,
      wardNumber: true,
      candidateName: true,
      rawData: true,
      runId: true,
    },
  });

  const hasMore = candidates.length > limit;
  const page = hasMore ? candidates.slice(0, limit) : candidates;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return NextResponse.json({
    data: page,
    meta: {
      count: page.length,
      limit,
      nextCursor,
    },
  });
}
