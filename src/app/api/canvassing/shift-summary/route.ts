/**
 * GET /api/canvassing/shift-summary — End-of-shift celebration for canvassers.
 *
 * From the Bible: "Celebrate the wins publicly. Debrief after every shift."
 *
 * When a canvasser finishes, this endpoint tells them:
 * - How many doors they knocked tonight
 * - How many supporters they found
 * - Their conversion rate
 * - Their all-time rank on the leaderboard
 * - A personalised message of encouragement
 * - How they compare to the campaign average
 *
 * This is the screen that makes volunteers come back for a second shift.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth as apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const userId = session!.user.id;

  // Verify caller is a member of this campaign before returning any campaign data
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  // This shift's interactions (last 4 hours or today, whichever is more recent)
  const shiftStart = fourHoursAgo > today ? fourHoursAgo : today;

  const [shiftInteractions, allTimeInteractions, campaignTotalInteractions, campaignVolunteers] = await Promise.all([
    prisma.interaction.findMany({
      where: { userId, contact: { campaignId }, createdAt: { gte: shiftStart } },
      select: { supportLevel: true, type: true, createdAt: true },
    }),
    prisma.interaction.count({ where: { userId, contact: { campaignId } } }),
    prisma.interaction.count({ where: { contact: { campaignId } } }),
    prisma.interaction.groupBy({
      by: ["userId"],
      where: { contact: { campaignId } },
      _count: true,
    }),
  ]);

  const doorsThisShift = shiftInteractions.length;
  const supportersFound = shiftInteractions.filter((i) =>
    (i.supportLevel as string) === "strong_support" || (i.supportLevel as string) === "leaning_support"
  ).length;
  const conversionRate = doorsThisShift > 0 ? Math.round((supportersFound / doorsThisShift) * 100) : 0;

  // Leaderboard rank
  const sortedVolunteers = campaignVolunteers.sort((a, b) => b._count - a._count);
  const rank = sortedVolunteers.findIndex((v) => v.userId === userId) + 1;
  const totalVolunteers = sortedVolunteers.length;

  // Campaign averages
  const avgDoorsPerVolunteer = totalVolunteers > 0 ? Math.round(campaignTotalInteractions / totalVolunteers) : 0;

  // Time on shift
  const firstInteraction = shiftInteractions[0]?.createdAt;
  const lastInteraction = shiftInteractions[shiftInteractions.length - 1]?.createdAt;
  const shiftMinutes = firstInteraction && lastInteraction
    ? Math.round((lastInteraction.getTime() - firstInteraction.getTime()) / 60000)
    : 0;
  const doorsPerHour = shiftMinutes > 0 ? Math.round((doorsThisShift / shiftMinutes) * 60) : 0;

  // Personalised message
  let message: string;
  let emoji: string;
  if (doorsThisShift === 0) {
    message = "Ready to head out? Your turf is waiting.";
    emoji = "🚪";
  } else if (doorsThisShift >= 50) {
    message = `${doorsThisShift} doors is incredible. You are making a real difference in this campaign.`;
    emoji = "🏆";
  } else if (doorsThisShift >= 30) {
    message = `${doorsThisShift} doors — strong shift. Every conversation counts.`;
    emoji = "💪";
  } else if (doorsThisShift >= 15) {
    message = `${doorsThisShift} doors tonight. Good work out there. See you next time.`;
    emoji = "👏";
  } else {
    message = `${doorsThisShift} doors — every single one matters. Thank you for showing up.`;
    emoji = "❤️";
  }

  if (supportersFound >= 5) {
    message += ` And ${supportersFound} new supporters — that is what winning looks like.`;
  }

  // Milestones hit this shift
  const milestones: string[] = [];
  const milestoneThresholds = [10, 25, 50, 100, 200, 500, 1000];
  for (const t of milestoneThresholds) {
    if (allTimeInteractions >= t && (allTimeInteractions - doorsThisShift) < t) {
      milestones.push(`You just hit ${t} all-time doors knocked!`);
    }
  }

  return NextResponse.json({
    shift: {
      doors: doorsThisShift,
      supportersFound,
      conversionRate,
      minutesOnShift: shiftMinutes,
      doorsPerHour,
    },
    allTime: {
      totalDoors: allTimeInteractions,
      rank,
      totalVolunteers,
      avgDoorsPerVolunteer,
      aboveAverage: allTimeInteractions > avgDoorsPerVolunteer,
    },
    message,
    emoji,
    milestones,
    volunteerName: session!.user.name?.split(" ")[0] ?? "there",
  });
}
