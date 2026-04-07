/**
 * GET /api/volunteers/performance — Volunteer performance leaderboard.
 *
 * From the SUBJECT-MATTER-BIBLE: "The leaderboard on TV Mode is not vanity.
 * It is recognition. It is why people come back."
 *
 * Returns ranked volunteers with doors knocked, supporters found,
 * conversion rate, streak info, and engagement status.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "volunteers:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const today = new Date(now); today.setHours(0, 0, 0, 0);

  // Get all interactions grouped by user
  const interactions = await prisma.interaction.findMany({
    where: { contact: { campaignId } },
    select: { userId: true, createdAt: true, supportLevel: true },
  });

  // Group by user
  const userStats = new Map<string, { total: number; thisWeek: number; today: number; supportersFound: number; lastActive: Date | null }>();

  for (const i of interactions) {
    if (!i.userId) continue;
    if (!userStats.has(i.userId)) {
      userStats.set(i.userId, { total: 0, thisWeek: 0, today: 0, supportersFound: 0, lastActive: null });
    }
    const s = userStats.get(i.userId)!;
    s.total++;
    if (i.createdAt >= weekAgo) s.thisWeek++;
    if (i.createdAt >= today) s.today++;
    if (i.supportLevel === "strong_support" || i.supportLevel === "leaning_support") s.supportersFound++;
    if (!s.lastActive || i.createdAt > s.lastActive) s.lastActive = i.createdAt;
  }

  // Get user names
  const userIds = Array.from(userStats.keys());
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Build leaderboard
  const leaderboard = Array.from(userStats.entries())
    .map(([userId, stats]) => {
      const user = userMap.get(userId);
      const conversionRate = stats.total > 0 ? Math.round((stats.supportersFound / stats.total) * 100) : 0;
      const isActive = stats.lastActive && stats.lastActive >= tenDaysAgo;
      const isQuiet = stats.lastActive && stats.lastActive < tenDaysAgo;
      const isNew = stats.total <= 20;

      let status: "star" | "active" | "new" | "quiet" | "inactive";
      if (stats.thisWeek >= 30) status = "star";
      else if (isActive) status = isNew ? "new" : "active";
      else if (isQuiet) status = "quiet";
      else status = "inactive";

      return {
        userId,
        name: user?.name ?? user?.email?.split("@")[0] ?? "Unknown",
        doorsTotal: stats.total,
        doorsThisWeek: stats.thisWeek,
        doorsToday: stats.today,
        supportersFound: stats.supportersFound,
        conversionRate,
        lastActive: stats.lastActive,
        status,
      };
    })
    .sort((a, b) => b.doorsTotal - a.doorsTotal);

  const stars = leaderboard.filter((v) => v.status === "star").length;
  const active = leaderboard.filter((v) => v.status === "active" || v.status === "star").length;
  const quiet = leaderboard.filter((v) => v.status === "quiet").length;
  const newVolunteers = leaderboard.filter((v) => v.status === "new").length;

  return NextResponse.json({
    leaderboard: leaderboard.slice(0, 50),
    summary: { total: leaderboard.length, stars, active, quiet, newVolunteers },
    topPerformer: leaderboard[0] ?? null,
    needsEncouragement: leaderboard.filter((v) => v.status === "quiet").slice(0, 5),
  });
}
