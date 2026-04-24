import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { TurfStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  const turfs = await prisma.turf.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      ward: true,
      streets: true,
      status: true,
      totalDoors: true,
      estimatedMinutes: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: turfs });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  let body: {
    name: string;
    ward?: string;
    streets?: string[];
    totalDoors?: number;
    estimatedMinutes?: number;
    notes?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const turf = await prisma.turf.create({
    data: {
      campaignId,
      name: body.name.trim(),
      ward: body.ward ?? null,
      streets: body.streets ?? [],
      status: TurfStatus.draft,
      totalStops: 0,
      totalDoors: body.totalDoors ?? 0,
      estimatedMinutes: body.estimatedMinutes ?? null,
      notes: body.notes ?? null,
    } as Prisma.TurfUncheckedCreateInput,
    select: {
      id: true,
      name: true,
      ward: true,
      streets: true,
      status: true,
      totalDoors: true,
      estimatedMinutes: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: turf }, { status: 201 });
}
