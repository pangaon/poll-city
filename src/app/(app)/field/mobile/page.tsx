import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import MobileFieldClient, { type ActiveShiftRow } from "./mobile-client";

export default async function FieldMobilePage() {
  const [{ campaignId, campaignName }, session] = await Promise.all([
    resolveActiveCampaign(),
    getServerSession(authOptions),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [rawShifts, doorsToday] = await Promise.all([
    prisma.fieldShift.findMany({
      where: {
        campaignId,
        deletedAt: null,
        status: { in: ["open", "in_progress"] },
        scheduledDate: { gte: todayStart, lte: todayEnd },
      },
      select: {
        id: true,
        campaignId: true,
        name: true,
        shiftType: true,
        status: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        ward: true,
        pollNumber: true,
        meetingPoint: true,
        meetingAddress: true,
        notes: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { attempts: true } },
        turf: { select: { id: true, name: true } },
        route: { select: { id: true, name: true } },
        fieldProgram: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.fieldAttempt.count({
      where: {
        campaignId,
        attemptedAt: { gte: todayStart, lte: todayEnd },
        ...(session?.user?.id ? { attemptedById: session.user.id } : {}),
      },
    }),
  ]);

  const activeShifts: ActiveShiftRow[] = rawShifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <MobileFieldClient
      campaignId={campaignId}
      campaignName={campaignName}
      activeShifts={activeShifts}
      doorsToday={doorsToday}
    />
  );
}
