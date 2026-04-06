import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:read");
  if (permError) return permError;

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

  // Door knocks per canvasser — get contactIds for campaign first, then group
  const campaignContactIds = await prisma.contact.findMany({
    where: { campaignId },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  const doorKnocks = await prisma.interaction.groupBy({
    by: ["userId"],
    where: {
      userId: { in: memberUserIds },
      type: "door_knock",
      contactId: { in: campaignContactIds },
    },
    _count: true,
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
      contactId: { in: campaignContactIds },
      supportLevel: { not: null },
    },
    _count: true,
  });

  const leaderboard = members.map((m) => {
    const userId = m.user.id;
    const dk = doorKnocks.find((d) => d.userId === userId);
    const doorKnockCount = typeof dk?._count === "number" ? dk._count : ((dk?._count as unknown as Record<string, number>)?._all ?? 0);
    const su = supportUpdates.find((s) => s.userId === userId);
    const supportCount = typeof su?._count === "number" ? su._count : ((su?._count as unknown as Record<string, number>)?._all ?? 0);
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
