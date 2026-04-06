import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

function parseTimeToMinutes(value: string): number | null {
  const text = value.trim();
  const m24 = text.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
    return null;
  }

  const m12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = Number(m12[1]);
    const m = Number(m12[2]);
    const meridiem = m12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (h === 12) h = 0;
    if (meridiem === "PM") h += 12;
    return h * 60 + m;
  }

  return null;
}

function shiftDurationHours(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return 0;
  const raw = end >= start ? end - start : 24 * 60 - start + end;
  return Math.round((raw / 60) * 100) / 100;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [activeCount, profileAggregate, pendingExpensesAggregate, upcomingShiftCount, activeGroupsCount, weekSignups] =
    await Promise.all([
      prisma.volunteerProfile.count({ where: { campaignId, isActive: true } }),
      prisma.volunteerProfile.aggregate({ where: { campaignId }, _sum: { totalHours: true } }),
      prisma.volunteerExpense.aggregate({ where: { campaignId, status: "pending" }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.volunteerShift.count({ where: { campaignId, shiftDate: { gte: new Date() } } }),
      prisma.volunteerGroup.count({ where: { campaignId } }),
      prisma.volunteerShiftSignup.findMany({
        where: {
          status: "attended",
          checkedInAt: { gte: weekAgo },
          shift: { campaignId },
        },
        select: {
          shift: { select: { startTime: true, endTime: true } },
        },
      }),
    ]);

  const hoursThisWeek = Math.round(
    weekSignups.reduce((sum, row) => sum + shiftDurationHours(row.shift.startTime, row.shift.endTime), 0) * 100
  ) / 100;

  return NextResponse.json({
    data: {
      activeVolunteers: activeCount,
      totalHours: Math.round((profileAggregate._sum.totalHours ?? 0) * 100) / 100,
      hoursThisWeek,
      pendingExpensesCount: pendingExpensesAggregate._count._all,
      pendingExpensesTotal: Math.round((pendingExpensesAggregate._sum.amount ?? 0) * 100) / 100,
      upcomingShifts: upcomingShiftCount,
      activeGroups: activeGroupsCount,
    },
  });
}
