import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null): session is import("next-auth").Session {
  if (!session) return false;
  const u = session.user;
  return u?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const office = searchParams.get("office");
  const jurisdiction = searchParams.get("jurisdiction");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));

  const where = {
    ...(status ? { campaignStatus: status as "announced" | "nominated" | "certified" | "withdrawn" | "elected" | "defeated" | "unknown" } : {}),
    ...(office ? { office: { contains: office, mode: "insensitive" as const } } : {}),
    ...(jurisdiction ? { jurisdictionRef: { contains: jurisdiction, mode: "insensitive" as const } } : {}),
  };

  const [total, profiles] = await Promise.all([
    prisma.candidateProfile.count({ where }),
    prisma.candidateProfile.findMany({
      where,
      orderBy: [{ lastDetectedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lead: { select: { confidenceScore: true, verificationStatus: true, sourceUrl: true, dataSource: { select: { name: true } } } },
        _count: { select: { outreachAttempts: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), profiles });
}
