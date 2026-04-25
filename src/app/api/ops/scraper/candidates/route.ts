import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const runId     = searchParams.get("runId");
  const office    = searchParams.get("office");
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") ?? "100", 10)));
  const skip      = (page - 1) * limit;

  if (!runId) return NextResponse.json({ error: "runId is required" }, { status: 400 });

  const where = {
    runId,
    ...(office ? { office } : {}),
  };

  const [candidates, total] = await Promise.all([
    prisma.rawMuniCandidate.findMany({
      where,
      orderBy: [{ office: "asc" }, { wardNumber: "asc" }, { candidateName: "asc" }],
      skip,
      take: limit,
      select: {
        id: true, candidateName: true, office: true, ward: true,
        wardNumber: true, municipality: true, province: true, electionYear: true,
      },
    }),
    prisma.rawMuniCandidate.count({ where }),
  ]);

  // Check which candidates have already been promoted to leads
  const names = candidates.map(c => c.candidateName);
  const existingLeads = await prisma.candidateLead.findMany({
    where: { detectedNameRaw: { in: names } },
    select: { detectedNameRaw: true, id: true },
  });
  const promotedNames = new Set(existingLeads.map(l => l.detectedNameRaw));

  return NextResponse.json({
    candidates: candidates.map(c => ({
      ...c,
      promoted: promotedNames.has(c.candidateName),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
