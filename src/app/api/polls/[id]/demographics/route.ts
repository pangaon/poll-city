import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { visibility: true, campaignId: true },
  });

  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (poll.visibility === "campaign_only" && poll.campaignId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session.user.id, campaignId: poll.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byWardRaw, byRidingRaw, recent] = await Promise.all([
    prisma.pollResponse.groupBy({
      by: ["ward"],
      where: { pollId: params.id, ward: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    }),
    prisma.pollResponse.groupBy({
      by: ["riding"],
      where: { pollId: params.id, riding: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    }),
    prisma.pollResponse.findMany({
      where: { pollId: params.id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const byWard = byWardRaw.map((r) => ({ ward: r.ward!, count: r._count.id }));
  const byRiding = byRidingRaw.map((r) => ({ riding: r.riding!, count: r._count.id }));

  const buckets: Record<string, number> = {};
  for (const r of recent) {
    const day = r.createdAt.toISOString().split("T")[0];
    buckets[day] = (buckets[day] ?? 0) + 1;
  }
  const trend = Object.entries(buckets).map(([day, count]) => ({ day, count }));

  return NextResponse.json({ byWard, byRiding, trend });
}
