import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * Placeholder reminder worker endpoint.
 * Intended to be triggered by cron every hour.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { campaignId?: string };

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  const where: { campaignId?: string; shiftDate?: { gte: Date; lte: Date } } = {};
  if (body.campaignId) where.campaignId = body.campaignId;

  const [upcoming24, upcoming1] = await Promise.all([
    prisma.volunteerShift.findMany({ where: { ...where, shiftDate: { gte: now, lte: in24h } }, include: { signups: true } }),
    prisma.volunteerShift.findMany({ where: { ...where, shiftDate: { gte: now, lte: in1h } }, include: { signups: true } }),
  ]);

  return NextResponse.json({
    data: {
      simulated: true,
      reminders24h: upcoming24.reduce((acc, s) => acc + s.signups.length, 0),
      reminders1h: upcoming1.reduce((acc, s) => acc + s.signups.length, 0),
      provider: "email_or_twilio",
    },
  });
}
