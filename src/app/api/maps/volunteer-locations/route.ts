import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { ensureCampaignMapAccess } from "@/lib/maps/auth";

function initials(name: string | null | undefined, fallback: string): string {
  const base = name?.trim() || fallback;
  return base
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const access = await ensureCampaignMapAccess(session!.user.id, campaignId);
  if (access.error) return access.error;

  const canSeeFullName = ([Role.ADMIN, Role.SUPER_ADMIN, Role.CAMPAIGN_MANAGER] as string[]).includes(access.membership!.role as string);
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const rows = await prisma.volunteerLocation.findMany({
    where: { campaignId, updatedAt: { gte: cutoff } },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      userId: row.userId,
      lat: row.lat,
      lng: row.lng,
      accuracy: row.accuracy,
      updatedAt: row.updatedAt,
      volunteerName: canSeeFullName ? row.user.name ?? row.user.email ?? "Volunteer" : initials(row.user.name, row.user.email ?? "Volunteer"),
      turfName: null,
    })),
  });
}
