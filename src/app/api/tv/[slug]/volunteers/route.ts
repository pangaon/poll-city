import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const revalidate = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { id: true, tvEnabled: true, tvToken: true },
  });
  if (!campaign || !campaign.tvEnabled || campaign.tvToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Leaderboard: volunteers ranked by activity count (no PII)
  const leaderboard = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: { campaignId: campaign.id },
    _count: true,
    orderBy: { userId: "asc" },
    take: 20,
  });

  // Sort by count descending in JS
  const sorted = leaderboard
    .map((e) => ({ userId: e.userId, count: (e._count as number) }))
    .sort((a, b) => b.count - a.count);

  // Get display names only (no email/phone)
  const userIds = sorted.map((l) => l.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name ?? "Volunteer"]));

  const data = sorted.map((entry, idx) => ({
    rank: idx + 1,
    name: userMap.get(entry.userId) ?? "Volunteer",
    actions: entry.count,
  }));

  return NextResponse.json({ data });
}
