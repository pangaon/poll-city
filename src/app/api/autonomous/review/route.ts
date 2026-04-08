import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session.user as typeof session.user & { role?: string };
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const skip = (page - 1) * pageSize;

  const [total, items] = await Promise.all([
    prisma.autonomousContent.count({ where: { status: "pending" } }),
    prisma.autonomousContent.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        source: { select: { name: true, geography: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    items: items.map((item) => ({
      id: item.id,
      sourceName: item.source.name,
      sourceGeography: item.source.geography,
      headline: item.headline,
      sourceUrl: item.sourceUrl,
      extractedPoll: item.extractedPoll,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
