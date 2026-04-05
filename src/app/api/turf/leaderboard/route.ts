import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get all team members
  const members = await prisma.membership.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const memberUserIds = members.map((m) => m.user.id);

  // Door knocks per canvasser (filter by team member IDs for this campaign)
  const doorKnocks = await prisma.interaction.groupBy({
    by: ["userId"],
    where: {
      userId: { in: memberUserIds },
      type: "door_knock",
      contact: { campaignId },
    },
    _count: { id: true },
  });

  // Turf stats per canvasser
  const turfs = await prisma.turf.findMany({
    where: { campaignId, assignedUserId: { not: null } },
    select: {
      assignedUserId: true,
      status: true,
      completedStops: true,
      totalStops: true,
    },
  });

  // Support levels recorded per canvasser
  const supportUpdates = await prisma.interaction.groupBy({
    by: ["userId"],
    where: {
      userId: { in: memberUserIds },
      contact: { campaignId },
      supportLevel: { not: null },
    },
    _count: { id: true },
  });

  const leaderboard = members.map((m) => {
    const userId = m.user.id;
    const doorKnockCount = doorKnocks.find((d) => d.userId === userId)?._count.id ?? 0;
    const supportCount = supportUpdates.find((s) => s.userId === userId)?._count.id ?? 0;
    const userTurfs = turfs.filter((t) => t.assignedUserId === userId);
    const completedTurfs = userTurfs.filter((t) => t.status === "completed").length;
    const totalTurfs = userTurfs.length;
    const stopsCompleted = userTurfs.reduce((sum, t) => sum + t.completedStops, 0);
    const stopsTotal = userTurfs.reduce((sum, t) => sum + t.totalStops, 0);
    const completionPct = stopsTotal > 0 ? Math.round((stopsCompleted / stopsTotal) * 100) : 0;

    // Score: doors × 1 + support updates × 2 + completed turfs × 10
    const score = doorKnockCount + supportCount * 2 + completedTurfs * 10;

    return {
      userId,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      doorKnocks: doorKnockCount,
      supportUpdates: supportCount,
      turfsAssigned: totalTurfs,
      turfsCompleted: completedTurfs,
      stopsCompleted,
      stopsTotal,
      completionPct,
      score,
    };
  });

  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score);

  return NextResponse.json({ data: leaderboard });
}
